/* Real-core routing tests with public classification data and loopback mock outbounds. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const vm = require('node:vm');
const {createHash, randomBytes} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const resources = path.join(root, '.cache/resources');
const manifest = require(path.join(resources, 'manifest.json'));
const variant = process.argv[2] || '1.19.34';
const binary = manifest.cores[variant];
assert.ok(binary, 'unknown core variant');
const exe = path.join(resources, binary.file);
assert.equal(createHash('sha256').update(fs.readFileSync(exe)).digest('hex'), binary.sha256);
const home = fs.mkdtempSync(path.join(root, '.cache/run-' + variant + '-'));
const harness = require('./harness.cjs')({flavor: variant === 'flclash' ? 'flclash' : 'verge', home, exe});
const {host, bind, reserve, close, wait, closers, udpServer, sendDatagram, fakeOutbound, requestThrough} = harness;
const normalize = value => JSON.parse(JSON.stringify(value));
const group = require('../tools/v2-policy.cjs').group;
const sourceCache = require('../v2/data/source-cache.json');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'v2/next-rules.js'), 'utf8'), ctx);
const panelFile = path.join(home, 'panel.json');
const merger = process.env.NEXT_RULES_MERGER || path.join(root, '.cache/panel-merge.exe');
execFileSync(merger, [path.join(root, '.cache/fragment.json'), panelFile], {windowsHide: true});
const panel = JSON.parse(fs.readFileSync(panelFile, 'utf8'));
assert.deepEqual(panel.rules, normalize(ctx.remoteFragment()).rules);
const observations = [];
const labels = ['default', 'ai', 'google', 'youtube', 'media', 'apac', 'telegram', 'apple', 'microsoft', 'crypto', 'software', 'direct'];
const nodeName = label => 'Test ' + label;
// These public resolver addresses are simulated targets. They are never contacted.
const ips = {cn: '223.5.5.5', foreign: '9.9.9.9', cn6: '2400:3200::1', foreign6: '2606:4700:4700::1111'};
let checks = 0;
function check(actual, expected, description) {
  assert.deepEqual(actual, expected, description);
  checks++;
}

async function localDNS() {
  const socket = udpServer();
  const port = await bind(socket, 'bind');
  closers.push(() => close(socket));
  socket.on('message', (query, remote) => {
    let offset = 12, domain = '';
    while (query[offset]) {
      const length = query[offset++];
      domain += (domain ? '.' : '') + query.subarray(offset, offset + length).toString();
      offset += length;
    }
    offset++;
    const type = query.readUInt16BE(offset);
    const question = query.subarray(12, offset + 4);
    const header = Buffer.alloc(12);
    query.copy(header, 0, 0, 2); header.writeUInt16BE(0x8180, 2); header.writeUInt16BE(1, 4);
    let answer = Buffer.alloc(0);
    if (type === 1) {
      header.writeUInt16BE(1, 6);
      const address = domain.includes('domestic-probe') || domain.includes('sentry-domestic') || domain.includes('auditcn') || domain === 'gemini.google.com' ? ips.cn : ips.foreign;
      answer = Buffer.from([0xc0, 0x0c, 0, 1, 0, 1, 0, 0, 0, 30, 0, 4, ...address.split('.').map(Number)]);
    }
    socket.send(Buffer.concat([header, question, answer]), remote.port, remote.address);
  });
  return port;
}

function requestAt(port, domain) {
  return new Promise(resolve => {
    const socket = net.createConnection({host, port});
    let body = '';
    socket.setTimeout(4000);
    socket.on('connect', () => socket.write('GET /audit HTTP/1.1\r\nHost: ' + domain + '\r\nConnection: close\r\n\r\n'));
    socket.on('data', data => body += data);
    socket.on('error', () => resolve('blocked'));
    socket.on('timeout', () => { socket.destroy(); resolve('timeout'); });
    socket.on('close', () => resolve(body.split('\r\n\r\n').slice(1).join('\r\n\r\n') || 'blocked'));
  });
}

async function run() {
  for (const [file, entry] of Object.entries(manifest.files)) {
    const data = fs.readFileSync(path.join(resources, file));
    check(createHash('sha256').update(data).digest('hex'), entry.sha256, file + ' provenance');
    fs.writeFileSync(path.join(home, file), data);
  }
  const controller = variant === 'flclash' ? await harness.flController() : await harness.vergeController();
  const mocks = {};
  for (const label of labels) mocks[label] = await fakeOutbound(label);
  const nodes = labels.map(label => ({name: nodeName(label), type: 'socks5', server: host, port: mocks[label].port, udp: true}));
  nodes.push({name: 'TCP-only', type: 'http', server: host, port: 1});
  nodes.push({name: 'Manual direct alias', type: 'direct'});
  nodes.push({name: '剩余流量：0', type: 'socks5', server: host, port: 1});
  nodes.push({...nodes[0], name:'Official HK 01'});
  nodes.push({...nodes[0], name:'官方 HK 01'});
  const mixedPort = await harness.reserveMixed();
  const dnsPort = await localDNS();
  const health = http.createServer((_req, res) => {res.writeHead(204);res.end();});
  const healthPort = await bind(health, 'listen');
  closers.push(() => close(health));
  const tcpInlets = {}, udpInlets = {}, tunnels = [];
  function address(value, port) { return (net.isIP(value) === 6 ? '[' + value + ']' : value) + ':' + port; }
  for (const [key, value] of Object.entries(ips)) {
    const port = await reserve(() => net.createServer(), 'listen');
    tcpInlets[key] = port;
    tunnels.push({network: ['tcp'], address: host + ':' + port, target: address(value, 80)});
  }
  const voice = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/openai-voice.json'), 'utf8'));
  const voiceAddresses = [];
  function collect(value) {
    if (Array.isArray(value)) return value.forEach(collect);
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (key === 'ipv4Prefix' || key === 'ipv6Prefix') voiceAddresses.push(child.split('/')[0]);
      else collect(child);
    }
  }
  collect(voice);
  const ipCases = {voiceFirst: voiceAddresses[0], voiceLast: voiceAddresses.at(-1), voiceMiddle: voiceAddresses[Math.floor(voiceAddresses.length / 2)], telegram: '149.154.160.1', google: '74.125.250.129'};
  const tcpOwner = key => key.startsWith('voice') ? 'default' : key;
  for (const [key, value] of Object.entries(ipCases)) {
    const port = await reserve(() => net.createServer(), 'listen');
    tcpInlets[key] = port;
    tunnels.push({network: ['tcp'], address: host + ':' + port, target: address(value, 80)});
  }
  const udpTargets = {
    'www.youtube.com': ['youtube', 443], 'probe.googlevideo.com': ['youtube', 443],
    'tv.apple.com': ['media', 443], 'www.max.com': ['media', 443], 'www.hulu.jp': ['apac', 443],
    'chatgpt.com': ['ai', 443], 'audit-default.iana.org': ['default', 443],
    ...Object.fromEntries(Object.entries(ipCases).map(([key, value]) => [value, key.startsWith('voice') ? ['ai', 3478] : [key, 443]]))
  };
  for (const [target, [, targetPort]] of Object.entries(udpTargets)) {
    const port = await reserve(udpServer, 'bind');
    udpInlets[target] = port;
    tunnels.push({network: ['udp'], address: host + ':' + port, target: address(target, targetPort)});
  }
  const unrelatedVoicePort = await reserve(udpServer, 'bind');
  udpInlets['voice-other-port'] = unrelatedVoicePort;
  tunnels.push({network: ['udp'], address: host + ':' + unrelatedVoicePort, target: address(ipCases.voiceFirst, 9999)});
  const processExecutables = {};
  for (const name of ['Cursor', 'cursor', 'Steam', 'steam', 'Discord', 'discord', 'WhatsApp', 'whatsapp', 'EpicGamesLauncher', 'epicgameslauncher']) {
    const directory = path.join(home, 'process-' + Object.keys(processExecutables).length);
    fs.mkdirSync(directory);
    const file = path.join(directory, name + '.exe');
    fs.copyFileSync(process.execPath, file);
    processExecutables[name] = file;
  }

  function profile(source, empty = false) {
    const runtime = {
      proxies: empty ? nodes.filter(node => node.type === 'direct') : nodes,
      mode: 'rule', 'allow-lan': false, 'mixed-port': mixedPort, 'log-level': 'error',
      'find-process-mode': 'always', 'geo-auto-update': false, 'geodata-mode': true,
      ipv6: true, tun: {enable: false},
      dns: {enable: true, ipv6: false, 'use-hosts': false, 'use-system-hosts': false,
        nameserver: [host + ':' + dnsPort], 'default-nameserver': [host + ':' + dnsPort]},
      tunnels, sniffer: {enable: true, 'parse-pure-ip': true, 'force-dns-mapping': true,
        'override-destination': false, sniff: {HTTP: {ports: [80], 'override-destination': false}}}
    };
    const config = source === 'js' ? normalize(ctx.main(normalize(runtime))) : {...normalize(panel), ...runtime};
    check(config.dns, runtime.dns, source + ': original DNS is used by the core');
    if (source === 'panel') config['proxy-groups'].find(g => g.name === 'PROXY').proxies = [...runtime.proxies.map(p => p.name), 'DIRECT'];
    if (!empty) config.rules = config.rules.map(rule => rule.replace(/,DIRECT(?=,|$)/g, ',' + nodeName('direct')));
    config['proxy-groups'].find(g => g.name === group.auto).url = 'http://' + host + ':' + healthPort;
    for (const [name, provider] of Object.entries(config['rule-providers'])) {
      if (provider.type !== 'http') continue;
      provider.type = 'file';
      provider.path = path.join(home, name + '.' + provider.format);
      if (provider.format === 'mrs') fs.copyFileSync(path.join(resources, 'telegram.mrs'), provider.path);
      else {
        const entry = sourceCache.providers[name.replace('next-rules-v2-', '')];
        assert.ok(entry, 'missing snapshot');
        fs.writeFileSync(provider.path, provider.format === 'text' ? entry.payload.join('\n') + '\n' : 'payload:\n' + entry.payload.map(row => '  - ' + JSON.stringify(row)).join('\n') + '\n');
      }
      delete provider.url; delete provider.interval; delete provider.proxy;
    }
    return config;
  }
  async function selectAll() {
    for (const key of labels.filter(key => !['youtube', 'apac', 'direct'].includes(key))) await controller.select(group[key], nodeName(key));
    await controller.select(group.mediaAsia, nodeName('apac'));
  }
  async function datagram(target) {
    const marker = randomBytes(16);
    await sendDatagram(udpInlets[target], marker);
    await wait(180);
    return labels.filter(label => mocks[label].packets.has(marker.toString('hex')));
  }
  async function ruleStates() {
    if (controller.api) return (await controller.api('/providers/rules')).json().providers;
    return Object.fromEntries((await controller.providers()).map(item => [item.name ?? item.Name, {ruleCount: item.count ?? item.Count}]));
  }
  async function loadedFileRules(skip = []) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const loaded = await ruleStates();
      if (Object.entries(sourceCache.providers).filter(([id, item]) => item.payload.length && !skip.includes(id)).every(([id]) => loaded['next-rules-v2-' + id]?.ruleCount > 0)) return loaded;
      await wait(50);
    }
    throw Error('file rule providers did not finish loading');
  }
  for (const source of ['panel', 'js']) {
    await controller.setup(profile(source));
    const loaded = await loadedFileRules();
    for (const [id, entry] of Object.entries(sourceCache.providers)) {
      if (entry.payload.length) check(loaded['next-rules-v2-' + id].ruleCount, entry.payload.length, source + ': all source rows parsed ' + id);
    }
    const state = await controller.all();
    for(const [key,name]of Object.entries(group))if(key!=='ads'){
      for(const candidate of ['Official HK 01','官方 HK 01'])check(state[name].all.includes(candidate),true,source+': legitimate official-named node '+name);
    }
    for (const key of Object.keys(group).filter(key => !['ads', 'auto'].includes(key))) {
      const candidates = state[group[key]].all;
      check(candidates.includes(nodeName('media')), true, source + ': ordinary names visible in ' + key);
      check(candidates.includes('剩余流量：0'), false, source + ': metadata excluded in ' + key);
      check(candidates.includes('DIRECT'), key !== 'default', source + ': manual DIRECT ' + key);
      check(candidates.includes('Manual direct alias'), key !== 'default', source + ': manual alias ' + key);
    }
    check(state[group.auto].all.includes('Manual direct alias'), false, 'auto excludes direct aliases');
    await selectAll();
    check(await controller.get(group.youtube), group.google, 'YouTube follows Google by default');
    const tests = {...require('./media-cases.cjs'),
      'api.openai.com': 'ai', 'api.anthropic.com': 'ai', 'storage.googleapis.com': 'google',
      'www.msn.cn': 'direct', 'api.msn.com': 'microsoft', 'assets.msn.com': 'microsoft',
      'img-s-msn-com.akamaized.net': 'microsoft', 'challenges.cloudflare.com': 'default',
      'odc.officeapps.live.com': 'microsoft', 'login.microsoftonline.com': 'microsoft',
      'audit.awsapps.com': 'default', 'codewhisperer.us-east-1.amazonaws.com': 'ai',
      'browser-intake-us5-datadoghq.com': 'default', 'audit.byteoversea.com': 'default',
      'auth0.openai.com': 'ai',
      '104.131.0.1': 'default',
      'copilot.microsoft.com': 'ai', 'api.binance.com': 'crypto',
      'telegram.org': 'telegram', 'outlook.live.com': 'microsoft',
      'sentry-domestic.audit.iana.org': 'direct', 'domestic-probe.audit.iana.org': 'direct',
      'audit-unknown.iana.org': 'default',
      'ad.qq.com': 'blocked', 'sdk.e.qq.com': 'blocked', 'ad.mi.com': 'blocked', 'ad.xiaomi.com': 'blocked'};
    const tcp = {};
    for (const [target, expected] of Object.entries(tests)) {
      tcp[target] = await requestThrough(mixedPort, target);
      check(tcp[target], expected, source + ': ' + target);
    }
    await controller.select(group.youtube, nodeName('youtube'));
    for (const [target, expected] of [
      ['www.youtube.com', 'youtube'], ['probe.googlevideo.com', 'youtube'], ['i.ytimg.com', 'youtube'],
      ['youtubei.googleapis.com', 'youtube'], ['yt3.googleusercontent.com', 'youtube'],
      ['accounts.google.com', 'google'], ['gemini.google.com', 'ai']
    ]) {
      check(await requestThrough(mixedPort, target), expected, source + ': independent ' + target);
    }
    const known = {};
    for (const [target, expected] of [['www.youtube.com', 'youtube'], ['accounts.google.com', 'google'], ['chatgpt.com', 'ai'], ['tv.apple.com', 'media'], ['www.max.com', 'media'], ['www.viu.com', 'apac'], ['www.baidu.com', 'direct'], ['audit-unknown.iana.org', null]]) {
      for (const key of ['cn', 'foreign', 'cn6', 'foreign6']) {
        const actual = await requestAt(tcpInlets[key], target);
        const wanted = expected || (key.startsWith('cn') ? 'direct' : 'default');
        check(actual, wanted, source + ': sniffed ' + target + '/' + key);
        known[target + '/' + key] = actual;
      }
    }
    for (const key of Object.keys(ipCases)) check(await requestAt(tcpInlets[key], ips.foreign), tcpOwner(key), source + ': owned IP ' + key);
    const processResults = {};
    for (const [name, executable] of Object.entries(processExecutables)) {
      for (const [target, expected] of [['www.baidu.com', 'direct'], ['domestic-probe.audit.iana.org', 'direct'], ['sentry-domestic.audit.iana.org', 'direct'], [ips.cn, 'direct'], ['audit-unknown.iana.org', name.toLowerCase() === 'cursor' ? 'ai' : 'software'], ['www.youtube.com', 'youtube']]) {
        const result = await requestThrough(mixedPort, target, executable);
        check(result, expected, source + ': actual process ' + name + '/' + target);
        processResults[name + '/' + target] = result;
      }
    }
    for (const [target, [expected]] of Object.entries(udpTargets)) check(await datagram(target), [expected], source + ': UDP ' + target);
    check(await datagram('voice-other-port'), ['default'], source + ': an unrelated UDP port does not use the voice route');
    for (const name of [group.ai, group.google, group.youtube, group.media, group.mediaAsia, group.telegram, group.default]) await controller.select(name, 'TCP-only');
    for (const target of Object.keys(udpTargets)) check(await datagram(target), [], source + ': unsupported UDP must reject ' + target);
    await controller.setup(profile(source, true));
    const empty = await controller.all();
    check(empty[group.auto].all, ['REJECT'], source + ': empty auto');
    check(empty[group.auto].now, 'REJECT', source + ': empty auto exit');
    check(empty[group.default].all, [group.auto], source + ': empty default');
    // Native domain classification keeps recognized AI on its scene when the precise view is unavailable.
    const partial = profile(source);
    const missingView = partial['rule-providers']['next-rules-v2-ai-domain'];
    missingView.type = 'http';missingView.url = 'http://' + host + ':' + healthPort + '/unavailable';
    missingView.proxy = group.default;missingView.path = path.join(home, 'partial-' + source + '-ai-domain.yaml');
    await controller.setup(partial);
    const partialState = await loadedFileRules(['ai-domain']);
    check(partialState['next-rules-v2-ai-domain'].ruleCount, 0, source + ': precise AI view is missing');
    await selectAll();
    for (const target of ['auditcn.chatgpt.com', 'gemini.google.com', 'copilot.microsoft.com', 'www.baidu.com', 'www.deepseek.com', 'www.kimi.com', 'auditcn.kimi.ai', 'auditcn.moonshot.ai']) {
      check(await requestThrough(mixedPort, target), ['www.baidu.com','www.deepseek.com','www.kimi.com','auditcn.kimi.ai','auditcn.moonshot.ai'].includes(target) ? 'direct' : 'ai', source + ': native fallback with missing precise view ' + target);
    }
    // Pure remote references have no built-in data: record empty providers on a failed cold start.
    const cold = profile(source);
    for (const [name, provider] of Object.entries(cold['rule-providers'])) {
      if (provider.type !== 'file') continue;
      provider.type = 'http'; provider.url = 'http://' + host + ':' + healthPort + '/unavailable';
      provider.proxy = group.default; provider.interval = 86400;
      provider.path = path.join(home, 'cold-' + source + '-' + name + '.' + provider.format);
    }
    await controller.setup(cold);
    await selectAll();
    const unavailable = await ruleStates();
    for (const id of Object.keys(sourceCache.providers).filter(id => sourceCache.providers[id].payload.length)) {
      check(unavailable['next-rules-v2-' + id].ruleCount, 0, source + ': failed first download leaves provider empty ' + id);
    }
    check(await requestThrough(mixedPort, 'domestic-probe.audit.iana.org'), 'direct', source + ': domestic direct still works after failed downloads');
    check(await requestAt(tcpInlets.telegram, ips.foreign), 'telegram', source + ': cold start Telegram GeoIP backup');
    const degraded = {};
    for (const target of ['chatgpt.com', 'gemini.google.com', 'copilot.microsoft.com', 'api.binance.com', 'www.linetv.tw']) degraded[target] = await requestThrough(mixedPort, target);
    check(degraded['chatgpt.com'], 'ai', source + ': native ChatGPT fallback after failed downloads');
    check(degraded['gemini.google.com'], 'ai', source + ': native Gemini fallback after failed downloads');
    check(degraded['copilot.microsoft.com'], 'ai', source + ': native Copilot fallback after failed downloads');
    check(degraded['api.binance.com'], 'crypto', source + ': native crypto fallback after failed downloads');
    observations.push({source, tcp, known, processResults, failedColdStart: {providersEmpty: Object.keys(sourceCache.providers), classificationReady: false, observedRoutes: degraded}});
  }
  const supplied = profile('js');
  const providerFile = path.join(home, 'node-provider.json');
  fs.writeFileSync(providerFile, JSON.stringify({proxies: supplied.proxies}));
  const providerInput = {...supplied, proxies: [nodes.find(node => node.name === nodeName('direct'))], 'proxy-groups': [], rules: [], 'rule-providers': {},
    'proxy-providers': {subscription: {type: 'file', path: providerFile}}};
  const withProvider = normalize(ctx.main(providerInput));
  check(withProvider.dns, supplied.dns, 'local DNS is preserved with file node providers');
  withProvider.rules = withProvider.rules.map(row => row.replace(/,DIRECT(?=,|$)/g, ',' + nodeName('direct')));
  for (const [name, provider] of Object.entries(withProvider['rule-providers'])) {
    withProvider['rule-providers'][name] = supplied['rule-providers'][name];
  }
  withProvider['proxy-groups'].find(g => g.name === group.auto).url = 'http://' + host + ':' + healthPort;
  withProvider['log-level'] = 'debug';
  await controller.setup(withProvider);
  await loadedFileRules();
  const providerState = await controller.all();
  check(providerState[group.ai].all.includes(nodeName('ai')), true, 'file node provider visible');
  check(providerState[group.auto].all.includes('Manual direct alias'), false, 'provider direct alias excluded from auto');
  check(providerState[group.ai].all.includes('DIRECT'), true, 'provider scene retains manual DIRECT');
  await controller.select(group.ai, nodeName('ai'));
  check(await requestThrough(mixedPort, 'chatgpt.com'), 'ai', 'file node provider usable');
  return controller.version();
}
let version;
run().then(value => {version = value;}).catch(error => {
  process.exitCode = 1;
  console.error(error.stack);
  console.error(harness.logs().split(/\r?\n/).slice(-20).join('\n'));
}).finally(async () => {
  await harness.cleanup();
  const result = {variant, version, checks, failed: Boolean(process.exitCode), observations,
    scope: 'Loopback rule selection and UDP rejection, actual process names, controlled DNS and known-IP sniffing. No system TUN, public exit, login, playback or comprehensive WebRTC guarantee.'};
  fs.writeFileSync(path.join(root, '.cache/results-' + variant + '.json'), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(path.join(home, 'core.log'), harness.logs());
  console.log(JSON.stringify({variant, version, checks, failed: result.failed}));
});
