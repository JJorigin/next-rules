/* Exercise real HTTP provider downloads through an explicit loopback SOCKS proxy. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const resources = path.join(root, '.cache/resources');
const manifest = require(path.join(resources, 'manifest.json'));
const variant = process.argv[2] || '1.19.34';
assert.ok(['1.19.33', '1.19.34'].includes(variant));
const exe = path.join(resources, manifest.cores[variant].file);
assert.equal(createHash('sha256').update(fs.readFileSync(exe)).digest('hex'), manifest.cores[variant].sha256);
const home = fs.mkdtempSync(path.join(root, '.cache/http-' + variant + '-'));
const harness = require('./harness.cjs')({flavor: 'verge', home, exe});
const {host, closers, bind, reserve, close, fakeOutbound, requestThrough} = harness;
const cache = require('../v2/data/source-cache.json').providers;
const group = require('../tools/v2-policy.cjs').group;
const aiDomain = 'next-rules-v2-ai-domain';
const aiVoice = 'next-rules-v2-ai-voice';
const media = 'next-rules-v2-media-crunchyroll';
const telegram = 'next-rules-v2-telegram-ip';
const entries = {
  [aiDomain]: cache['ai-domain'],
  [aiVoice]: cache['ai-voice'],
  [media]: cache['media-crunchyroll']
};
const state = {mode: 'valid', suffix: 'one', voiceUpdated: false, hits: 0, relays: 0};
let checks = 0;
function check(actual, expected, description) { assert.deepEqual(actual, expected, description);checks++; }

async function run() {
  for (const file of ['geoip.dat', 'geosite.dat', 'ASN.mmdb', 'Country.mmdb']) fs.copyFileSync(path.join(resources, file), path.join(home, file));
  const fixtures = http.createServer((req, res) => {
    state.hits++;
    const id = req.url.slice(1);
    if (state.mode === 'error') {res.writeHead(503);res.end();return;}
    if (state.mode === 'bad-yaml' && [aiDomain, aiVoice].includes(id)) {res.end('payload: [');return;}
    if (id === telegram) {res.end(fs.readFileSync(path.join(resources, 'telegram.mrs')));return;}
    const source = entries[id];
    if (!source) {res.writeHead(404);res.end();return;}
    const rows = [...source.payload];
    if (id === aiDomain) rows.push('DOMAIN,remote-' + state.suffix + '.audit.iana.org');
    if (id === aiVoice && state.voiceUpdated) rows.pop();
    res.end(source.format === 'text' ? rows.join('\n') + '\n' : 'payload:\n' + rows.map(row => '  - ' + JSON.stringify(row)).join('\n') + '\n');
  });
  const fixturePort = await bind(fixtures, 'listen');
  closers.push(() => close(fixtures));
  const sockets = new Set();
  const relay = net.createServer(socket => {
    sockets.add(socket);socket.on('close', () => sockets.delete(socket));socket.on('error', () => socket.destroy());
    let bytes = Buffer.alloc(0), greeted = false;
    function receive(part) {
      bytes = Buffer.concat([bytes, part]);
      if (!greeted) {
        if (bytes.length < 2 || bytes.length < 2 + bytes[1]) return;
        bytes = bytes.subarray(2 + bytes[1]);socket.write(Buffer.from([5, 0]));greeted = true;
      }
      if (bytes.length < 4) return;
      const length = bytes[3] === 1 ? 10 : bytes[3] === 4 ? 22 : 7 + bytes[4];
      if (bytes.length < length) return;
      // The relay accepts only the local fixture server; it cannot contact a public target.
      if (bytes[1] !== 1 || bytes[3] !== 1 || bytes.subarray(4, 8).join('.') !== host || bytes.readUInt16BE(8) !== fixturePort) {socket.destroy();return;}
      socket.removeListener('data', receive);
      const upstream = net.createConnection({host, port: fixturePort});
      sockets.add(upstream);upstream.on('close', () => sockets.delete(upstream));
      upstream.on('error', () => socket.destroy());socket.on('close', () => upstream.destroy());
      upstream.on('connect', () => {
        state.relays++;
        socket.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]));
        if (bytes.length > length) upstream.write(bytes.subarray(length));
        socket.pipe(upstream);upstream.pipe(socket);
      });
    }
    socket.on('data', receive);
  });
  const relayPort = await bind(relay, 'listen');
  closers.push(() => {for (const socket of sockets) socket.destroy();return close(relay);});
  const ai = await fakeOutbound('ai');
  const fallback = await fakeOutbound('default');
  const mixedPort = await harness.reserveMixed();
  const config = JSON.parse(fs.readFileSync(path.join(root, '.cache/fragment.json'), 'utf8'));
  config.rules = config.rules.map(row => row.replace(/,DIRECT(?=,|$)/g, ',Test default'));
  Object.assign(config, {proxies: [
    {name: 'Download relay', type: 'socks5', server: host, port: relayPort},
    {name: 'Test AI', type: 'socks5', server: host, port: ai.port, udp: true},
    {name: 'Test default', type: 'socks5', server: host, port: fallback.port, udp: true}
  ], mode: 'rule', 'mixed-port': mixedPort, 'log-level': 'error', 'find-process-mode': 'off',
  'geodata-mode': true, 'geo-auto-update': false, tun: {enable: false},
  dns: {enable: true, 'use-hosts': true, 'use-system-hosts': false, nameserver: [host + ':1'], 'default-nameserver': [host + ':1']},
  hosts: {
    'remote-one.audit.iana.org': '9.9.9.9',
    'remote-two.audit.iana.org': '9.9.9.9',
    'remote-stale.audit.iana.org': '9.9.9.9'
  }});
  const auto = config['proxy-groups'].find(item => item.name === group.auto);
  auto.url = 'http://' + host + ':' + fixturePort + '/health';
  auto.proxies = ['Download relay'];delete auto['include-all'];
  const defaultGroup = config['proxy-groups'].find(item => item.name === group.default);
  defaultGroup['default-selected'] = 'Download relay';defaultGroup.proxies.unshift('Download relay');
  const downloaded = [...Object.keys(entries), telegram];
  // Seed a fresh cache written by the released template in the same Mihomo home.
  const legacyPath = path.join(home, 'providers', aiDomain + '.yaml');
  fs.mkdirSync(path.dirname(legacyPath), {recursive: true});
  fs.writeFileSync(legacyPath, 'payload:\n  - "DOMAIN,remote-stale.audit.iana.org"\n');
  for (const [name, provider] of Object.entries(config['rule-providers'])) {
    if (provider.type !== 'http') continue;
    provider.path = path.resolve(home, provider.path);
    fs.mkdirSync(path.dirname(provider.path), {recursive: true});
    if (downloaded.includes(name)) provider.url = 'http://' + host + ':' + fixturePort + '/' + name;
    else {
      provider.type = 'file';delete provider.url;delete provider.proxy;delete provider.interval;
      const rows = cache[name.replace('next-rules-v2-', '')].payload;
      fs.writeFileSync(provider.path, provider.format === 'text' ? rows.join('\n') + '\n' : 'payload:\n' + rows.map(row => '  - ' + JSON.stringify(row)).join('\n') + '\n');
    }
  }
  const controller = await harness.vergeController();
  await controller.setup(config);
  await controller.select(group.ai, 'Test AI');
  const providers = async () => (await controller.api('/providers/rules')).json().providers;
  const expected = {
    [aiDomain]: cache['ai-domain'].payload.length + 1,
    [aiVoice]: cache['ai-voice'].payload.length,
    [media]: cache['media-crunchyroll'].payload.length
  };
  // The listener can be ready while asynchronous initial provider updates are finishing.
  for (let attempt = 0; attempt < 100; attempt++) {
    const loaded = await providers();
    if (Object.entries(expected).every(([id, count]) => loaded[id]?.ruleCount === count) && loaded[telegram]?.ruleCount > 0) break;
    await harness.wait(50);
  }
  const loaded = await providers();
  for (const [id, count] of Object.entries(expected)) check(loaded[id]?.ruleCount, count, id + ': downloaded data parses every row');
  check(loaded[telegram]?.ruleCount > 0, true, 'downloaded Telegram MRS parses');
  check(state.relays >= downloaded.length, true, 'all HTTP providers download via configured proxy');
  for (const name of downloaded) check(fs.existsSync(config['rule-providers'][name].path), true, 'download is cached');
  async function requestProbe(domain, wanted) {
    await controller.select(group.default, 'Test default');
    check(await requestThrough(mixedPort, domain), wanted, 'live route ' + domain);
    await controller.select(group.default, 'Download relay');
  }
  await requestProbe('remote-one.audit.iana.org', 'ai');
  await requestProbe('remote-stale.audit.iana.org', 'default');
  const file = config['rule-providers'][aiDomain].path;
  const voiceFile = config['rule-providers'][aiVoice].path;
  const first = fs.readFileSync(file);
  const firstVoice = fs.readFileSync(voiceFile);
  state.mode = 'error';
  await controller.api('/providers/rules/' + aiDomain, 'PUT');
  check(fs.readFileSync(file).equals(first), true, 'HTTP error retains cache');
  await requestProbe('remote-one.audit.iana.org', 'ai');
  state.mode = 'bad-yaml';
  await controller.api('/providers/rules/' + aiDomain, 'PUT');
  await controller.api('/providers/rules/' + aiVoice, 'PUT');
  check(fs.readFileSync(file).equals(first), true, 'malformed YAML retains cache');
  check(fs.readFileSync(voiceFile).equals(firstVoice), true, 'malformed voice list retains cache');
  check((await providers())[aiVoice].ruleCount, expected[aiVoice], 'malformed voice list retains active paths');
  await requestProbe('remote-one.audit.iana.org', 'ai');
  state.mode = 'valid';state.suffix = 'two';
  check((await controller.api('/providers/rules/' + aiDomain, 'PUT')).status, 204, 'valid refresh');
  check(fs.readFileSync(file).equals(first), false, 'valid new data replaces cache');
  await requestProbe('remote-two.audit.iana.org', 'ai');
  await requestProbe('remote-one.audit.iana.org', 'default');
  state.voiceUpdated = true;
  check((await controller.api('/providers/rules/' + aiVoice, 'PUT')).status, 204, 'valid voice refresh');
  check(fs.readFileSync(voiceFile).equals(firstVoice), false, 'valid voice list replaces cache');
  check((await providers())[aiVoice].ruleCount, expected[aiVoice] - 1, 'voice refresh updates the active list');
  return controller.version();
}
let version;
run().then(value => {version = value;}).catch(error => {
  process.exitCode = 1;console.error(error.stack);console.error(harness.logs().split(/\r?\n/).slice(-12).join('\n'));
}).finally(async () => {
  await harness.cleanup();
  const result = {variant, version, checks, failed: Boolean(process.exitCode), downloads: state.hits, proxyRelays: state.relays};
  fs.writeFileSync(path.join(root, '.cache/http-results-' + variant + '.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
});
