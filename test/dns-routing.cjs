/* Exercise the generated DNS policy through real cores, TLS DoH and loopback proxies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const variant = process.argv[2] || '1.19.34';
const resources = path.join(root, '.cache/resources');
const manifest = require(path.join(resources, 'manifest.json'));
const binary = manifest.cores[variant];
const exe = path.join(resources, binary.file);
assert.equal(createHash('sha256').update(fs.readFileSync(exe)).digest('hex'), binary.sha256);
const home = fs.mkdtempSync(path.join(root, '.cache/dns-routing-' + variant + '-'));
const h = require('./harness.cjs')({flavor: variant === 'flclash' ? 'flclash' : 'verge', exe, home});
const group = require('../tools/v2-policy.cjs').group;
const cache = require('../v2/data/source-cache.json').providers;
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'next-rules.js'), 'utf8'), ctx);
const plain = value => JSON.parse(JSON.stringify(value));
const events = [], forwards = new Map(), observations = [];
let checks = 0;
function check(condition, description) {assert.ok(condition, description);checks++;}
function question(message) {
  let offset = 12, domain = '';
  while (message[offset]) {const size = message[offset++];domain += (domain ? '.' : '') + message.subarray(offset, offset + size).toString();offset += size;}
  offset++;
  return {domain, type: message.readUInt16BE(offset), end: offset + 4};
}
function dnsAnswer(message) {
  const q = question(message);
  const head = Buffer.alloc(12);message.copy(head, 0, 0, 2);head.writeUInt16BE(0x8180, 2);head.writeUInt16BE(1, 4);
  let ip = '9.9.9.9'; // Simulated public destinations are never contacted.
  if (q.domain === 'resolver.audit.iana.org' || q.domain === 'node.audit.iana.org' || q.domain.endsWith('.baidu.com') || q.domain === 'chatgpt.com' || q.domain.endsWith('.lan')) ip = h.host;
  if (q.domain.includes('late-domestic')) ip = '223.5.5.5';
  if (q.domain.includes('late-telegram')) ip = '149.154.160.1';
  if (q.domain.includes('late-google')) ip = '74.125.250.129';
  let answer = Buffer.alloc(0);
  if (q.type === 1) {
    head.writeUInt16BE(1, 6);
    answer = Buffer.concat([Buffer.from([0xc0,0x0c,0,1,0,1,0,0,0,0,0,4]), Buffer.from(ip.split('.').map(Number))]);
  }
  if (q.type === 28 && ip !== h.host) {
    head.writeUInt16BE(1,6);
    const words = ip === '223.5.5.5' ? [0x2400,0x3200,0,0,0,0,0,1] : ip === '149.154.160.1' ? [0x2001,0xb28,0xf23d,0,0,0,0,1] : ip === '74.125.250.129' ? [0x2001,0x4860,0x4860,0,0,0,0,0x8888] : [0x2606,0x4700,0x4700,0,0,0,0,0x1111];
    const address=Buffer.alloc(16);words.forEach((word,index)=>address.writeUInt16BE(word,index*2));
    answer=Buffer.concat([Buffer.from([0xc0,0x0c,0,28,0,1,0,0,0,0,0,16]),address]);
  }
  return Buffer.concat([head, message.subarray(12, q.end), answer]);
}
async function query(port, domain, type = 1) {
  const client = h.udpServer();await h.bind(client, 'bind');
  const labels = domain.split('.').flatMap(part => [Buffer.from([part.length]), Buffer.from(part)]);
  const head = Buffer.from([0x12,0x34,1,0,0,1,0,0,0,0,0,0]);
  const body = Buffer.concat([head, ...labels, Buffer.from([0, type >> 8, type & 255, 0, 1])]);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {client.close();reject(Error('isolated DNS response timeout'));}, 4500);
    client.once('message', message => {clearTimeout(timer);client.close();resolve(message);});
    client.once('error', error => {clearTimeout(timer);client.close();reject(error);});
    client.send(body, port, h.host);
  });
}
function firstAddress(message) {
  let offset = question(message).end;
  if (!message.readUInt16BE(6)) return null;
  if ((message[offset] & 0xc0) === 0xc0) offset += 2;
  else {while (message[offset]) offset += message[offset] + 1;offset++;}
  const type=message.readUInt16BE(offset),size=message.readUInt16BE(offset+8);
  if(type===1&&size===4)return [...message.subarray(offset+10,offset+14)].join('.');
  if(type===28&&size===16)return Array.from({length:8},(_,index)=>message.readUInt16BE(offset+10+index*2).toString(16)).join(':');
  return null;
}
async function run() {
  execFileSync(path.join(root, '.cache/dns-cert.exe'), [home], {windowsHide: true});
  const cert = fs.readFileSync(path.join(home, 'cert.pem'), 'utf8');
  const key = fs.readFileSync(path.join(home, 'key.pem'), 'utf8');
  for (const file of ['geosite.dat', 'geoip.dat', 'Country.mmdb', 'ASN.mmdb']) fs.copyFileSync(path.join(resources, file), path.join(home, file));
  const controller = variant === 'flclash' ? await h.flController() : await h.vergeController();
  async function doh(role) {
    const server = https.createServer({key, cert}, (req, res) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = req.method === 'GET' ? Buffer.from(new URL(req.url, 'https://audit.invalid').searchParams.get('dns'), 'base64url') : Buffer.concat(chunks);
        events.push({role, domain: question(body).domain, transport: forwards.has(req.socket.remotePort) ? 'proxy' : 'direct', via:forwards.get(req.socket.remotePort)||'direct'});
        res.writeHead(200, {'Content-Type':'application/dns-message'});res.end(dnsAnswer(body));
      });
    });
    const port = await h.bind(server, 'listen');h.closers.push(() => {server.closeAllConnections();return h.close(server);});
    return port;
  }
  const overseas = [await doh('overseas'), await doh('overseas')];
  const domestic = await doh('domestic');
  const privateDNS = await doh('private');
  const bootstrap = h.udpServer();
  const bootstrapPort = await h.bind(bootstrap, 'bind');h.closers.push(() => h.close(bootstrap));
  bootstrap.on('message', (body, remote) => {events.push({role:'bootstrap',domain:question(body).domain,transport:'direct'});bootstrap.send(dnsAnswer(body),remote.port,remote.address);});
  const sockets = new Set();
  async function forwardingProxy(label) {
  const socks = net.createServer(socket => {
    sockets.add(socket);socket.once('close', () => sockets.delete(socket));socket.on('error', () => socket.destroy());
    let buffer = Buffer.alloc(0), greeted = false;
    socket.on('data', function receive(chunk) {
      buffer = Buffer.concat([buffer,chunk]);
      if (!greeted) {if (buffer.length < 2 || buffer.length < 2 + buffer[1]) return;buffer = buffer.subarray(2 + buffer[1]);socket.write(Buffer.from([5,0]));greeted = true;}
      if (buffer.length < 5) return;
      const length = buffer[3] === 1 ? 10 : buffer[3] === 4 ? 22 : 7 + buffer[4];
      if (buffer.length < length) return;
      const target = buffer[3] === 1 ? [...buffer.subarray(4,8)].join('.') : buffer[3] === 3 ? buffer.subarray(5,5 + buffer[4]).toString() : '::';
      const port = buffer.readUInt16BE(length - 2);buffer = buffer.subarray(length);socket.removeListener('data', receive);
      const accepted = Buffer.from([5,0,0,1,127,0,0,1,0,0]);
      if (target === h.host && overseas.includes(port)) {
        const peer = net.createConnection({host:h.host,port});sockets.add(peer);
        let relayPort;
        peer.on('error', () => socket.destroy());
        peer.once('close', () => {
          if (relayPort !== undefined) forwards.delete(relayPort);
          sockets.delete(peer);
          socket.destroy();
        });
        socket.once('close', () => peer.destroy());
        peer.once('connect', () => {
          relayPort = peer.localPort;
          forwards.set(relayPort, label);
          socket.write(accepted);
          if (buffer.length) peer.write(buffer);
          socket.pipe(peer);
          peer.pipe(socket);
        });
      } else {
        socket.write(accepted);
        let request = buffer;
        const answer = () => {if(request.includes('\r\n\r\n')) socket.end('HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Length: '+label.length+'\r\n\r\n'+label);};
        socket.on('data', chunk=>{request=Buffer.concat([request,chunk]);answer();});answer();
      }
    });
  });
  const socksPort = await h.bind(socks, 'listen');h.closers.push(()=>{for(const socket of sockets)socket.destroy();return h.close(socks);});
  return socksPort;
  }
  const socksPort=await forwardingProxy('default');
  const web = http.createServer((_req,res)=>{res.end('direct');});
  const webPort = await h.bind(web,'listen');h.closers.push(()=>h.close(web));
  const health = http.createServer((_req,res)=>{res.writeHead(204);res.end();});
  const healthPort = await h.bind(health,'listen');h.closers.push(()=>h.close(health));
  const labels = ['ai','google','youtube','media','mediaAsia','telegram','apple','microsoft','crypto','software','direct'];
  const nodes = [{name:'DNS proxy',type:'socks5',server:'node.audit.iana.org',port:socksPort,udp:true}];
  for(const label of labels){const port=label==='direct'?(await h.fakeOutbound(label)).port:await forwardingProxy(label);nodes.push({name:'DNS '+label,type:'socks5',server:h.host,port,udp:true});}
  const unused = await h.reserve(()=>net.createServer(),'listen');
  nodes.push({name:'Unavailable',type:'socks5',server:h.host,port:unused,udp:true});
  const mixedPort = await h.reserveMixed();
  const dnsPort = await h.reserve(()=>h.udpServer(),'bind');
  const privateUDP=h.udpServer(), received=new Set();
  const privateUDPPort=await h.bind(privateUDP,'bind');h.closers.push(()=>h.close(privateUDP));
  privateUDP.on('message',body=>received.add(body.toString('hex')));
  const privateTunnel=await h.reserve(()=>h.udpServer(),'bind');
  const hostileDNS = {enable:false,nameserver:[h.host+':'+bootstrapPort],fallback:[h.host+':'+bootstrapPort],
    'nameserver-policy':{'MATCH':h.host+':'+bootstrapPort},'proxy-server-nameserver-policy':{'+.org':h.host+':'+bootstrapPort}};
  let lastConfig, lastSelector;
  for(const entry of ['panel','local','local-collision']) for(const mode of ['fake-ip','redir-host']) {
    let cfg;
    if(entry==='panel') {
      const output=path.join(home,'panel.json');execFileSync(path.join(root,'.cache/panel-merge.exe'),[path.join(root,'.cache/fragment.json'),output],{windowsHide:true});
      cfg=JSON.parse(fs.readFileSync(output,'utf8'));cfg.proxies=nodes;
      cfg['proxy-groups'].find(item=>item.name==='PROXY').proxies=['DNS proxy','DIRECT'];
    } else {
      const input = {proxies: nodes, dns: hostileDNS};
      if (entry === 'local-collision') {
        input.proxies = [...nodes, ...[group.default, group.ai].map(name => ({name,type:'socks5',server:h.host,port:unused}))];
        input['rule-providers'] = {'next-rules-v2-ai-domain': {type: 'inline', behavior: 'classical', payload: ['DOMAIN,existing-private.invalid']}};
      }
      cfg = plain(ctx.main(input));
    }
    const defaultSelector=decodeURIComponent(cfg.dns.nameserver[0].split('#')[1]);
    const aiSelector = entry === 'local-collision' ? group.ai + ' · Next-Rules' : group.ai;
    check(cfg.dns.enable && !cfg.dns.fallback.length && !cfg.dns['nameserver-policy'].MATCH,'managed upstreams replace unsafe inherited DNS');
    cfg.rules=cfg.rules.map(rule=>rule==='GEOIP,CN,DIRECT'?'GEOIP,CN,DNS direct':rule);
    Object.assign(cfg,{'mixed-port':mixedPort,mode:'rule',tun:{enable:false},ipv6:true,'log-level':'debug','find-process-mode':'off','geo-auto-update':false,'geodata-mode':true,
      // Mihomo 1.19.x spells this public configuration key "certifactes".
      tls:{'custom-certifactes':[cert]}});
    const localServers=servers=>servers[0].endsWith('#DIRECT')?['https://resolver.audit.iana.org:'+domestic+'/dns-query#DIRECT']:servers.map((server,index)=>'https://'+h.host+':'+overseas[index]+'/dns-query#'+server.split('#')[1]);
    const mappedPolicy=Object.fromEntries(Object.entries(cfg.dns['nameserver-policy']).map(([key,servers])=>[key,key==='geosite:private'?['https://'+h.host+':'+privateDNS+'/dns-query#DIRECT']:localServers(servers)]));
    const knownDomestic='prefetch-'+entry+'-'+mode+'.baidu.com';
    cfg.dns={...cfg.dns,listen:h.host+':'+dnsPort,ipv6:true,'use-hosts':false,'use-system-hosts':false,'enhanced-mode':mode,
      'fake-ip-filter':[...cfg.dns['fake-ip-filter'],knownDomestic,'anthropic.com.cn','www.bilibili.tv','www.youtube.com','accounts.google.com','tv.apple.com'],
      nameserver:localServers(cfg.dns.nameserver),
      'default-nameserver':[h.host+':'+bootstrapPort],
      'nameserver-policy':mappedPolicy,
      'direct-nameserver':['https://resolver.audit.iana.org:'+domestic+'/dns-query#DIRECT'],
      'proxy-server-nameserver':['https://resolver.audit.iana.org:'+domestic+'/dns-query#DIRECT']};
    const privateName='device-'+entry+'-'+mode+'.lan';
    cfg.tunnels=[{network:['udp'],address:h.host+':'+privateTunnel,target:privateName+':'+privateUDPPort}];
    cfg['proxy-groups'].find(item=>item.name===group.auto).url='http://'+h.host+':'+healthPort;
    for(const [name,provider]of Object.entries(cfg['rule-providers'])) if(provider.type==='http') {
      provider.type='file';provider.path=path.join(home,name+'.'+provider.format);
      if(provider.format==='mrs')fs.copyFileSync(path.join(resources,'telegram.mrs'),provider.path);
      else {
        const original = name === 'next-rules-v2-ai-domain-2' ? 'ai-domain' : name.replace('next-rules-v2-','');
        const rows = cache[original].payload;
        const body = provider.format === 'text' ? rows.join('\n') + '\n'
          : 'payload:\n' + rows.map(row => '  - ' + JSON.stringify(row)).join('\n') + '\n';
        fs.writeFileSync(provider.path, body);
      }
      for(const key of ['url','interval','proxy','payload','path-in-bundle'])delete provider[key];
    }
    await controller.setup(cfg);
    for(let attempt=0;attempt<100;attempt++){
      const loaded=controller.api?Object.values((await controller.api('/providers/rules')).json().providers):await controller.providers();
      if(loaded.every(item=>(item.ruleCount??item.count??item.Count)>0))break;
      if(attempt===99)throw Error('source providers not ready');await h.wait(50);
    }
    await controller.select(defaultSelector,'DNS proxy');
    for(const label of labels.filter(label=>label!=='direct'))await controller.select(label === 'ai' ? aiSelector : group[label],'DNS '+label);
    const start=events.length;
    const foreign='opaque-'+entry+'-'+mode+'.audit.iana.org';
    const reply=await query(dnsPort,foreign);const ip=firstAddress(reply);check(Boolean(ip),'DNS returns an A answer');
    const proxyResult=await h.requestThrough(mixedPort,mode==='fake-ip'?ip:foreign);check(proxyResult==='default','unknown foreign traffic keeps default route');
    const afterForeign=events.slice(start).filter(event=>event.domain===foreign);
    check(afterForeign.some(event=>event.role==='overseas'),'foreign lookup reached encrypted overseas upstream');
    check(afterForeign.every(event=>event.role==='overseas'&&event.transport==='proxy'),'foreign lookup never reaches direct/domestic/bootstrap DNS');
    await query(dnsPort,knownDomestic);
    const domesticPrefetch=events.filter(event=>event.domain===knownDomestic);
    check(domesticPrefetch.length>0&&domesticPrefetch.every(event=>event.role==='domestic'&&event.transport==='direct'),'known domestic DNS is direct before any connection, including real-IP filters');
    const aiQueryStart=events.length;await query(dnsPort,'anthropic.com.cn');
    const aiDNS=events.slice(aiQueryStart).filter(event=>event.domain==='anthropic.com.cn');
    check(aiDNS.length>0&&aiDNS.every(event=>event.role==='overseas'&&event.via==='ai'),'precise AI DNS precedes the broad domestic classification');
    const apacStart=events.length;await query(dnsPort,'www.bilibili.tv');
    const apacDNS=events.slice(apacStart).filter(event=>event.domain==='www.bilibili.tv');
    check(apacDNS.length>0&&apacDNS.every(event=>event.role==='overseas'&&event.via==='mediaAsia'),'international media DNS follows its existing scene exception');
    for(const qtype of [28,65]) {
      const name='type-'+qtype+'-'+entry+'-'+mode+'.audit.iana.org';
      const response=await query(dnsPort,name,qtype);
      if (qtype === 28 && mode === 'fake-ip') {
        const address = firstAddress(response);
        assert.ok(address && address.startsWith('fdfe:dcba:9876:'), 'expected the isolated IPv6 Fake-IP answer, got ' + address);
        const exit = await h.requestThrough(mixedPort, '[' + address + ']');
        check(exit === 'default', 'IPv6 Fake-IP restores hostname and proxy route, got ' + exit);
      }
      const records=events.filter(event=>event.domain===name);
      check(records.every(event=>event.role==='overseas'&&event.transport==='proxy'),'AAAA and HTTPS queries never use domestic/bootstrap resolvers');
      if(mode==='redir-host')check(records.length>0,'real-IP queries reach the proxy DNS upstream');
    }
    const domesticStart=events.length;
    check(await h.requestThrough(mixedPort,'www.baidu.com:'+webPort)==='direct','known domestic traffic uses actual direct adapter');
    const domesticEvents=events.slice(domesticStart).filter(event=>event.domain==='www.baidu.com');
    check(domesticEvents.length>0&&domesticEvents.every(event=>event.role==='domestic'&&event.transport==='direct'),'domestic direct adapter uses separate direct DNS');
    check(await h.requestThrough(mixedPort,privateName+':'+webPort)==='direct','private hostname TCP remains direct');
    const marker=Buffer.from(entry+'-'+mode);await h.sendDatagram(privateTunnel,marker);await h.wait(180);
    check(received.has(marker.toString('hex')),'private hostname UDP follows the private DNS policy');
    const privateEvents=events.filter(event=>event.domain===privateName);
    check(privateEvents.length>0&&privateEvents.every(event=>event.role==='private'&&event.transport==='direct'),'private names use only their local resolver');
    for(const [target,wanted]of [['late-domestic.audit.iana.org','direct'],['late-telegram.audit.iana.org','telegram'],['late-google.audit.iana.org','google'],['chatgpt.com','ai'],['www.youtube.com','youtube']]) {
      check(await h.requestThrough(mixedPort,target)===wanted,'route retained: '+target);
    }
    await controller.select(aiSelector,'DIRECT');
    check(await h.requestThrough(mixedPort,'chatgpt.com:'+webPort)==='direct','explicit scene DIRECT remains usable');
    await controller.select(aiSelector,'DNS ai');
    check(events.filter(event=>event.role==='bootstrap').every(event=>event.domain==='resolver.audit.iana.org'),'bootstrap only resolves resolver hostname');
    check(events.filter(event=>event.domain==='node.audit.iana.org').every(event=>event.role==='domestic'&&event.transport==='direct'),'node hostname uses independent direct resolver');
    check(events.some(event=>event.domain==='node.audit.iana.org'),'hostname proxy bootstrapped successfully');
    const blocked='blocked-'+entry+'-'+mode+'.audit.iana.org';await controller.select(defaultSelector,'Unavailable');
    const failure=await h.requestThrough(mixedPort,blocked);check(failure==='blocked','unavailable proxy fails closed');
    check(!events.some(event=>event.domain===blocked&&event.role!=='overseas'),'proxy failure never falls back to direct DNS');
    for (const [domain, wanted] of [['www.youtube.com','youtube'],['accounts.google.com','google'],['tv.apple.com','media']]) {
      const start = events.length;
      check(Boolean(firstAddress(await query(dnsPort,domain))), 'scene DNS still works with default proxy down: ' + domain);
      const records = events.slice(start).filter(event => event.domain === domain);
      check(records.length > 0 && records.every(event => event.role === 'overseas' && event.via === wanted), 'DNS uses its own scene even with default proxy down: ' + domain);
    }
    await controller.select(aiSelector,'DIRECT');
    check(await h.requestThrough(mixedPort,'chatgpt.com:'+webPort)==='direct','manual scene DIRECT remains usable when default proxy is unavailable');
    const offlineDomestic='offline-'+entry+'-'+mode+'.baidu.com';
    check(await h.requestThrough(mixedPort,offlineDomestic+':'+webPort)==='direct','domestic service remains usable while default proxy is unavailable');
    const offlineDNS=events.filter(event=>event.domain===offlineDomestic);
    check(offlineDNS.length>0&&offlineDNS.every(event=>event.role==='domestic'&&event.transport==='direct'),'domestic access never depends on a working default proxy');
    observations.push({entry,mode,foreignDNS:'proxy-only',domesticDNS:'direct-only',nodeBootstrap:'independent',proxyFailure:'no-direct-fallback'});
    lastConfig=cfg;lastSelector=defaultSelector;
  }
  // No cached HTTP data: common AI still has the native classification safety net.
  for(const provider of Object.values(lastConfig['rule-providers']))if(provider.type==='file'){
    provider.type='inline';provider.payload=[];
    for(const key of ['path','format','url','interval','proxy'])delete provider[key];
  }
  await controller.setup(lastConfig);
  await controller.select(lastSelector,'DNS proxy');
  await controller.select(group.ai + ' · Next-Rules', 'DNS ai');
  for(let attempt=0;attempt<100;attempt++){
    const entries=controller.api?Object.entries((await controller.api('/providers/rules')).json().providers):
      (await controller.providers()).map(item=>[item.name??item.Name,item]);
    if(entries.filter(([name])=>/^next-rules-v2-dns-\d+/.test(name)).every(([,item])=>(item.ruleCount??item.count??item.Count)>0))break;
    if(attempt===99)throw Error('native DNS providers not ready');await h.wait(50);
  }
  const coldStart=events.length;await query(dnsPort,'claude.ai');
  const coldAI=events.slice(coldStart).filter(event=>event.domain==='claude.ai');
  check(coldAI.length>0&&coldAI.every(event=>event.role==='overseas'&&event.via==='ai'),'native AI DNS exception survives missing remote lists');
  check(await h.requestThrough(mixedPort,'claude.ai')==='ai','native AI traffic exception survives missing remote lists');
  // Native categories are not a substitute for the complete external source.
  // Record this boundary explicitly rather than calling an empty source ready.
  const missingStart=events.length;await query(dnsPort,'anthropic.com.cn');
  const sourceOnly=events.slice(missingStart).filter(event=>event.domain==='anthropic.com.cn');
  observations.push({entry:'cold-start',classificationReady:false,safeToDeploy:false,
    nativeBrandFallback:'verified',sourceOnlyExceptionProtected:sourceOnly.length>0&&sourceOnly.every(event=>event.role==='overseas'&&event.transport==='proxy')});
}
run().catch(error=>{
  process.exitCode=1;
  console.error(error.stack);
  console.error(h.logs().trim().split(/\r?\n/).slice(-24).join('\n'));
}).finally(async()=>{
  await h.cleanup();fs.writeFileSync(path.join(home,'core.log'),h.logs());
  const report={core:variant,checks,failed:Boolean(process.exitCode),tlsVerification:true,allDestinationsLoopback:true,observations,events};
  fs.writeFileSync(path.join(root,'.cache/dns-routing-'+variant+'.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({core:variant,checks,failed:report.failed,observations}));
});
