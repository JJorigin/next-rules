/* Check known IP routes and DNS side effects for domain-only and Fake-IP requests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const variant = process.argv[2] || '1.19.34';
const resources = path.join(root, '.cache/resources');
const manifest = require(path.join(resources, 'manifest.json'));
const binary = manifest.cores[variant];
const exe = path.join(resources, binary.file);
assert.equal(createHash('sha256').update(fs.readFileSync(exe)).digest('hex'), binary.sha256);
const home = fs.mkdtempSync(path.join(root, '.cache/ip-resolution-' + variant + '-'));
const h = require('./harness.cjs')({flavor: variant === 'flclash' ? 'flclash' : 'verge', exe, home});
const {host, bind, closers, close, udpServer, fakeOutbound, requestThrough} = h;
const context = vm.createContext({});
const released = process.argv.includes('--released');
const observing = process.argv.includes('--observe');
const code = released ? execFileSync('git', ['show', 'v2.1:v2/next-rules.js'], {cwd: root, encoding: 'utf8'}) : fs.readFileSync(path.join(root, 'v2/next-rules.js'), 'utf8');
vm.runInContext(code, context);
const fragment = JSON.parse(JSON.stringify(context.remoteFragment()));
const cache = released
  ? JSON.parse(execFileSync('git', ['show', 'v2.1:v2/data/source-cache.json'], {cwd: root, encoding: 'utf8'})).providers
  : require('../v2/data/source-cache.json').providers;
const group = require('../tools/v2-policy.cjs').group;
const results = [];
const metadb = process.argv.includes('--metadb');
const ipv6 = process.argv.includes('--ipv6');
let checks = 0;
// Public vendor/resolver addresses below are simulated destinations, never contacted.
const targets = {
  'late-voice.audit.iana.org': {ip: released ? '20.194.216.119' : cache['ai-voice'].payload.find(prefix=>!prefix.includes(':')).split('/')[0], wanted: released ? 'ai' : 'default'},
  'late-telegram.audit.iana.org': {ip: '149.154.160.1', wanted: 'telegram'},
  'late-netflix.audit.iana.org': {ip: '45.57.0.1', wanted: 'media'},
  'late-google.audit.iana.org': {ip: '74.125.250.129', wanted: 'google'},
  'domestic-ip.audit.iana.org': {ip: '223.5.5.5', wanted: 'direct'},
  'foreign-ip.audit.iana.org': {ip: '9.9.9.9', wanted: 'default'},
  'private-ip.audit.iana.org': {ip: '192.168.1.1', wanted: 'direct'}
};
if (ipv6) {
  const netflix = JSON.parse(fs.readFileSync(path.join(resources, 'netflix-fixture.json'), 'utf8'));
  // The IPv6 path uses a dedicated AI network. The current voice list is IPv4.
  delete targets['late-voice.audit.iana.org'];
  targets['late-ai-network.audit.iana.org'] = {
    ip: cache['ai-context'].payload.find(row => row.startsWith('IP-CIDR6,')).split(',')[1].split('/')[0],
    wanted: 'ai'
  };
  targets['late-telegram.audit.iana.org'].ip = '2001:b28:f23d::1';
  targets['late-netflix.audit.iana.org'].ip = netflix.ipv6;
  targets['late-google.audit.iana.org'].ip = '2001:4860:4860::8888';
  targets['domestic-ip.audit.iana.org'].ip = '2400:3200::1';
  targets['foreign-ip.audit.iana.org'].ip = '2606:4700:4700::1111';
  targets['private-ip.audit.iana.org'].ip = 'fd00::1';
}
const providerDomain = 'provider-ip.audit.iana.org';
if (!released) {
  targets[providerDomain] = {ip: ipv6 ? '2606:4700:4700::1001' : '1.0.0.1', wanted: 'mediaAsia'};
}
function ipv6Bytes(address) {
  const halves = address.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const words = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  const bytes = Buffer.alloc(16);words.forEach((word, index) => bytes.writeUInt16BE(parseInt(word, 16), index * 2));return bytes;
}

async function fakeAnswer(port, domain) {
  const question = Buffer.concat([
    Buffer.from([0x12, 0x34, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0]),
    ...domain.split('.').map(label => Buffer.concat([Buffer.from([label.length]), Buffer.from(label)])),
    Buffer.from([0, 0, ipv6 ? 28 : 1, 0, 1])
  ]);
  const socket = udpServer();
  await bind(socket, 'bind');
  try {
    const answer = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Fake-IP DNS listener timed out')), 3500);
      socket.once('message', message => {clearTimeout(timer);resolve(message);});
      socket.once('error', error => {clearTimeout(timer);reject(error);});
      socket.send(question, port, host);
    });
    assert.ok(answer.length > question.length && answer.readUInt16BE(0) === 0x1234 && answer.readUInt16BE(6) === 1,
      'expected one address from the Fake-IP listener');
    if (!ipv6) {
      const bytes = answer.subarray(-4);
      assert.deepEqual([...bytes.subarray(0, 2)], [198, 18], 'an IPv4 fake address was returned');
      return [...bytes].join('.');
    }
    const bytes = answer.subarray(-16);
    assert.equal(bytes.subarray(0, 8).toString('hex'), 'fdfedcba98760000', 'an IPv6 fake address was returned');
    const sections = [];
    for (let index = 0; index < bytes.length; index += 2) sections.push(bytes.readUInt16BE(index).toString(16));
    return '[' + sections.join(':') + ']';
  } finally {
    await close(socket);
  }
}

async function run() {
  for (const file of ['geoip.dat', 'geosite.dat', metadb ? 'geoip.metadb' : 'Country.mmdb', 'ASN.mmdb']) fs.copyFileSync(path.join(resources, file), path.join(home, file));
  const controller = variant === 'flclash' ? await h.flController() : await h.vergeController();
  const labels = ['default', 'ai', 'media', 'mediaAsia', 'telegram', 'google', 'direct'];
  const nodes = [];
  const mocks = {};
  for (const label of labels) {
    const mock = mocks[label] = await fakeOutbound(label);
    nodes.push({name: 'Probe ' + label, type: 'socks5', server: host, port: mock.port, udp: true});
  }
  const mixedPort = await h.reserveMixed();
  const health = http.createServer((_req, res) => {res.writeHead(204);res.end();});
  const healthPort = await bind(health, 'listen');
  closers.push(() => close(health));
  const dns = udpServer();
  const dnsPort = await bind(dns, 'bind');
  closers.push(() => close(dns));
  const fakeDnsPort = released ? null : await h.reserve(udpServer, 'bind');
  const lookups = [];
  dns.on('message', (query, remote) => {
    let offset = 12, domain = '';
    while (query[offset]) {const length = query[offset++];domain += (domain ? '.' : '') + query.subarray(offset, offset + length).toString();offset += length;}
    offset++;
    const kind = query.readUInt16BE(offset);
    lookups.push(domain);
    const head = Buffer.alloc(12);query.copy(head, 0, 0, 2);head.writeUInt16BE(0x8180, 2);head.writeUInt16BE(1, 4);
    let answer = Buffer.alloc(0);
    const item = targets[domain.replace(/^fake-/, '')];
    if (kind === (ipv6 ? 28 : 1) && item) {
      head.writeUInt16BE(1, 6);
      const address = ipv6 ? ipv6Bytes(item.ip) : Buffer.from(item.ip.split('.').map(Number));
      answer = Buffer.concat([Buffer.from([0xc0, 0x0c, 0, kind, 0, 1, 0, 0, 0, 0, 0, address.length]), address]);
    }
    dns.send(Buffer.concat([head, query.subarray(12, offset + 4), answer]), remote.port, remote.address);
  });
  for (const geodata of metadb ? [false] : [true, false]) {
    const config = {...JSON.parse(JSON.stringify(fragment)), proxies: nodes, 'mixed-port': mixedPort,
      mode: 'rule', tun: {enable: false}, 'allow-lan': false, 'log-level': 'error',
      'find-process-mode': 'off', 'geo-auto-update': false, 'geodata-mode': geodata, ipv6,
      dns: {enable: true, ipv6, 'use-hosts': false, 'use-system-hosts': false,
        ...(fakeDnsPort ? {listen: host + ':' + fakeDnsPort, 'enhanced-mode': 'fake-ip',
          'fake-ip-range': '198.18.0.1/16', 'fake-ip-range6': 'fdfe:dcba:9876::1/64'} : {}),
        nameserver: [host + ':' + dnsPort], 'default-nameserver': [host + ':' + dnsPort]}};
    config.rules = config.rules.map(rule => rule.replace(/,DIRECT(?=,|$)/g, ',Probe direct'));
    config['proxy-groups'].find(item => item.name === group.auto).url = 'http://' + host + ':' + healthPort;
    for (const [name, provider] of Object.entries(config['rule-providers'])) {
      if (provider.type !== 'http') continue;
      provider.type = 'file';provider.path = path.join(home, name + '.' + provider.format);
      if (provider.format === 'mrs') fs.copyFileSync(path.join(resources, 'telegram.mrs'), provider.path);
      else {
        const rows = [...cache[name.replace('next-rules-v2-', '')].payload];
        // Simulate a future media source adding an IP rule without its own no-resolve flag.
        if (!released && name === 'next-rules-v2-media-linetv') {
          rows.push((ipv6 ? 'IP-CIDR6,' : 'IP-CIDR,') + targets[providerDomain].ip + (ipv6 ? '/128' : '/32'));
        }
        fs.writeFileSync(provider.path, provider.format === 'text' ? rows.join('\n') + '\n' : 'payload:\n' + rows.map(row => '  - ' + JSON.stringify(row)).join('\n') + '\n');
      }
      delete provider.url;delete provider.interval;delete provider.proxy;delete provider.payload;
    }
    await controller.setup(config);
    if (controller.providers || controller.api) {
      let loaded;
      for (let attempt = 0; attempt < 100; attempt++) {
        loaded = controller.api ? Object.values((await controller.api('/providers/rules')).json().providers) : await controller.providers();
        if (loaded.every(item => (item.ruleCount ?? item.count ?? item.Count) > 0)) break;
        await h.wait(50);
      }
      assert.ok(loaded.every(item => (item.ruleCount ?? item.count ?? item.Count) > 0), 'file rule providers must finish loading');
    }
    for (const label of labels.filter(label => label !== 'direct' && (!released || label !== 'mediaAsia'))) {
      await controller.select(group[label], 'Probe ' + label);
    }
    if (!released) {
      for (const [domain, wanted] of [['api.openai.com', 'ai'], ['www.youtube.com', 'google'], ['www.baidu.com', 'direct']]) {
        const start = lookups.length;
        assert.equal(await requestThrough(mixedPort, domain), wanted, 'known service routes by domain');checks++;
        assert.equal(lookups.slice(start).includes(domain), false, 'known service needs no routing DNS query');checks++;
      }
    }
    const routes = {};
    for (const [domain, item] of Object.entries(targets)) {
      const byIP = await requestThrough(mixedPort, ipv6 ? '[' + item.ip + ']' : item.ip);
      const start = lookups.length;
      const byDomain = await requestThrough(mixedPort, domain);
      const queried = lookups.slice(start).includes(domain);
      routes[domain] = {byIP, byDomain, wanted: item.wanted, queried};
      if (!observing) {
        assert.equal(byIP, item.wanted, 'known IP ' + domain + '/geodata=' + geodata);checks++;
        assert.equal(byDomain, released ? item.wanted : 'default', 'domain-only route ' + domain + '/geodata=' + geodata);checks++;
        if (!released) {
          assert.equal(queried, false, 'unclassified name cannot trigger routing DNS ' + domain);checks++;
        }
      }
      if (fakeDnsPort) {
        const fakeDomain = 'fake-' + domain;
        const previousLookups = lookups.length;
        const address = await fakeAnswer(fakeDnsPort, fakeDomain);
        if (!observing) {
          assert.ok(!lookups.slice(previousLookups).includes(fakeDomain), 'Fake-IP response requires no upstream query');checks++;
        }
        const fakeRoute = await requestThrough(mixedPort, address);
        const fakeQueried = lookups.slice(previousLookups).includes(fakeDomain);
        Object.assign(routes[domain], {fakeRoute, fakeQueried});
        if (!observing) {
          assert.equal(fakeRoute, 'default', 'route for an unclassified Fake-IP domain');checks++;
          assert.equal(fakeQueried, false, 'unclassified Fake-IP domain cannot trigger upstream DNS');checks++;
          assert.ok(mocks.default.domains.has(fakeDomain), 'the selected proxy receives the original hostname');checks++;
        }
      }
    }
    results.push({geodata, backend: geodata ? 'GeoIP.dat' : metadb ? 'MetaDB' : 'MMDB', routes});
  }
}
run().catch(error => {process.exitCode = 1;fs.writeFileSync(path.join(home,'failure.log'),h.logs());console.error(error.stack);console.error(h.logs().split(/\r?\n/).slice(-16).join('\n'));}).finally(async () => {
  await h.cleanup();
  const report = {variant, ipv6, source: process.argv.includes('--released') ? 'v2.1' : 'working', checks, failed: Boolean(process.exitCode), results};
  fs.writeFileSync(path.join(root, '.cache/ip-resolution-' + variant + (metadb ? '-metadb' : '') + (ipv6 ? '-ipv6' : '') + (process.argv.includes('--released') ? '-released' : '') + '.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
});
