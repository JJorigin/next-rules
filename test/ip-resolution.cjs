/* Classify the same dedicated addresses before and after controlled DNS resolution. */
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
const code = process.argv.includes('--released') ? execFileSync('git', ['show', 'v2.1:v2/next-rules.js'], {cwd: root, encoding: 'utf8'}) : fs.readFileSync(path.join(root, 'v2/next-rules.js'), 'utf8');
vm.runInContext(code, context);
const fragment = JSON.parse(JSON.stringify(context.remoteFragment()));
const cache = require('../v2/data/source-cache.json').providers;
const group = require('../tools/v2-policy.cjs').group;
const results = [];
const metadb = process.argv.includes('--metadb');
const ipv6 = process.argv.includes('--ipv6');
let checks = 0;
// Public vendor/resolver addresses below are simulated destinations, never contacted.
const targets = {
  'late-voice.audit.iana.org': {ip: '20.194.216.119', wanted: 'ai'},
  'late-telegram.audit.iana.org': {ip: '149.154.160.1', wanted: 'telegram'},
  'late-netflix.audit.iana.org': {ip: '45.57.0.1', wanted: 'media'},
  'domestic-ip.audit.iana.org': {ip: '223.5.5.5', wanted: 'direct'},
  'foreign-ip.audit.iana.org': {ip: '9.9.9.9', wanted: 'default'},
  'private-ip.audit.iana.org': {ip: '192.168.1.1', wanted: 'direct'}
};
if (ipv6) {
  const netflix = JSON.parse(fs.readFileSync(path.join(resources, 'netflix-fixture.json'), 'utf8'));
  targets['late-voice.audit.iana.org'].ip = cache.ai.payload.find(row => row.startsWith('IP-CIDR6,')).split(',')[1].split('/')[0];
  targets['late-telegram.audit.iana.org'].ip = '2001:b28:f23d::1';
  targets['late-netflix.audit.iana.org'].ip = netflix.ipv6;
  targets['domestic-ip.audit.iana.org'].ip = '2400:3200::1';
  targets['foreign-ip.audit.iana.org'].ip = '2606:4700:4700::1111';
  targets['private-ip.audit.iana.org'].ip = 'fd00::1';
}
function ipv6Bytes(address) {
  const halves = address.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const words = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  const bytes = Buffer.alloc(16);words.forEach((word, index) => bytes.writeUInt16BE(parseInt(word, 16), index * 2));return bytes;
}
async function run() {
  for (const file of ['geoip.dat', 'geosite.dat', metadb ? 'geoip.metadb' : 'Country.mmdb', 'ASN.mmdb']) fs.copyFileSync(path.join(resources, file), path.join(home, file));
  const controller = variant === 'flclash' ? await h.flController() : await h.vergeController();
  const labels = ['default', 'ai', 'media', 'telegram', 'direct'];
  const nodes = [];
  for (const label of labels) {
    const mock = await fakeOutbound(label);
    nodes.push({name: 'Probe ' + label, type: 'socks5', server: host, port: mock.port, udp: true});
  }
  const mixedPort = await h.reserveMixed();
  const health = http.createServer((_req, res) => {res.writeHead(204);res.end();});
  const healthPort = await bind(health, 'listen');
  closers.push(() => close(health));
  const dns = udpServer();
  const dnsPort = await bind(dns, 'bind');
  closers.push(() => close(dns));
  const lookups = [];
  dns.on('message', (query, remote) => {
    let offset = 12, domain = '';
    while (query[offset]) {const length = query[offset++];domain += (domain ? '.' : '') + query.subarray(offset, offset + length).toString();offset += length;}
    offset++;
    const kind = query.readUInt16BE(offset);
    lookups.push(domain);
    const head = Buffer.alloc(12);query.copy(head, 0, 0, 2);head.writeUInt16BE(0x8180, 2);head.writeUInt16BE(1, 4);
    let answer = Buffer.alloc(0);
    if (kind === (ipv6 ? 28 : 1) && targets[domain]) {
      head.writeUInt16BE(1, 6);
      const address = ipv6 ? ipv6Bytes(targets[domain].ip) : Buffer.from(targets[domain].ip.split('.').map(Number));
      answer = Buffer.concat([Buffer.from([0xc0, 0x0c, 0, kind, 0, 1, 0, 0, 0, 0, 0, address.length]), address]);
    }
    dns.send(Buffer.concat([head, query.subarray(12, offset + 4), answer]), remote.port, remote.address);
  });
  for (const geodata of metadb ? [false] : [true, false]) {
    const config = {...JSON.parse(JSON.stringify(fragment)), proxies: nodes, 'mixed-port': mixedPort,
      mode: 'rule', tun: {enable: false}, 'allow-lan': false, 'log-level': 'error',
      'find-process-mode': 'off', 'geo-auto-update': false, 'geodata-mode': geodata, ipv6,
      dns: {enable: true, ipv6, 'use-hosts': false, 'use-system-hosts': false,
        nameserver: [host + ':' + dnsPort], 'default-nameserver': [host + ':' + dnsPort]}};
    config.rules = config.rules.map(rule => rule.replace(/,DIRECT(?=,|$)/g, ',Probe direct'));
    config['proxy-groups'].find(item => item.name === group.auto).url = 'http://' + host + ':' + healthPort;
    for (const [name, provider] of Object.entries(config['rule-providers'])) {
      if (provider.type !== 'http') continue;
      provider.type = 'file';provider.path = path.join(home, name + '.' + provider.format);
      if (provider.format === 'mrs') fs.copyFileSync(path.join(resources, 'telegram.mrs'), provider.path);
      else {
        const rows = cache[name.replace('next-rules-v2-', '')].payload;
        fs.writeFileSync(provider.path, provider.format === 'text' ? rows.join('\n') + '\n' : 'payload:\n' + rows.map(row => '  - ' + JSON.stringify(row)).join('\n') + '\n');
      }
      delete provider.url;delete provider.interval;delete provider.proxy;delete provider.payload;
    }
    await controller.setup(config);
    if (controller.providers) {
      let loaded;
      for (let attempt = 0; attempt < 100; attempt++) {
        loaded = await controller.providers();
        if (loaded.every(item => (item.count ?? item.Count) > 0)) break;
        await h.wait(50);
      }
      assert.ok(loaded.every(item => (item.count ?? item.Count) > 0), 'file rule providers must finish loading');
    }
    for (const label of labels.filter(label => label !== 'direct')) await controller.select(group[label], 'Probe ' + label);
    const routes = {};
    for (const [domain, item] of Object.entries(targets)) {
      const byIP = await requestThrough(mixedPort, ipv6 ? '[' + item.ip + ']' : item.ip);
      const byDomain = await requestThrough(mixedPort, domain);
      routes[domain] = {byIP, byDomain, wanted: item.wanted};
      if (!process.argv.includes('--observe')) {
        assert.equal(byIP, item.wanted, 'known IP ' + domain + '/geodata=' + geodata);checks++;
        assert.equal(byDomain, item.wanted, 'DNS-resolved IP ' + domain + '/geodata=' + geodata);checks++;
      }
    }
    results.push({geodata, backend: geodata ? 'GeoIP.dat' : metadb ? 'MetaDB' : 'MMDB', routes});
  }
}
run().catch(error => {process.exitCode = 1;console.error(error.stack);console.error(h.logs().split(/\r?\n/).slice(-8).join('\n'));}).finally(async () => {
  await h.cleanup();
  const report = {variant, ipv6, source: process.argv.includes('--released') ? 'v2.1' : 'working', checks, failed: Boolean(process.exitCode), results};
  fs.writeFileSync(path.join(root, '.cache/ip-resolution-' + variant + (metadb ? '-metadb' : '') + (ipv6 ? '-ipv6' : '') + (process.argv.includes('--released') ? '-released' : '') + '.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
});
