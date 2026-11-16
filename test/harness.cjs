/* Isolated loopback harness. No system proxy, TUN or user profiles are modified. */
module.exports = function createHarness(options) {
const assert = require('node:assert/strict');
const dgram = require('node:dgram');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const {createHash, randomBytes} = require('node:crypto');
const {spawn} = require('node:child_process');
const {setTimeout: wait} = require('node:timers/promises');

const host = '127.0.0.1';
const flavor = options.flavor;
assert.ok(['verge', 'flclash'].includes(flavor));
const home = options.home;
fs.mkdirSync(home, {recursive:true});
const exe = options.exe;
if(flavor==='flclash') assert.equal(createHash('sha256').update(fs.readFileSync(exe)).digest('hex').toUpperCase(),'D5097D4EA34F2975A7A7188DAC9554D6B309C2ABBF21A94C0A4111ACA23BB8D0');
const closers = [];
const children = [];
let logs = '';
const receiveTimeout = 450;
const dialNames = ['stun-one.test', 'stun-two.test', 'ordinary.test', 'service.test', 'unclassified.test'];

function bind(socket, method, port=0) {
  return new Promise((resolve,reject) => {
    socket.once('error', reject);
    socket[method](port,host,() => resolve(socket.address().port));
  });
}
async function reserve(create, method) {
  const socket = create();
  const port = await bind(socket,method);
  await new Promise(resolve=>socket.close(resolve));
  return port;
}
async function reserveMixed() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const port = 15000 + Math.floor(Math.random() * 25000);
    const tcp = net.createServer(), udp = udpServer();
    let tcpBound = false, udpBound = false;
    try {
      await bind(tcp, 'listen', port);tcpBound = true;
      await bind(udp, 'bind', port);udpBound = true;
      return port;
    } catch (_) {
      // Windows can reserve a UDP range even when TCP accepts the same port.
    } finally {
      if (tcpBound) await close(tcp);
      if (udpBound) await close(udp);
    }
  }
  throw Error('No free TCP/UDP pair for isolated mixed port');
}
function start(args) {
  const child = spawn(exe,args,{cwd:home,windowsHide:true,stdio:['ignore','pipe','pipe']});
  children.push(child);
  child.stdout.on('data',c=>{logs += c;});
  child.stderr.on('data',c=>{logs += c;});
  return child;
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const done = new Promise(resolve=>child.once('close',resolve));
  child.kill();
  await Promise.race([done,wait(1300)]);
}
async function vergeController() {
  const port = await reserve(()=>http.createServer(),'listen');
  let child, version;
  async function api(endpoint, method='GET', value) {
    return new Promise((resolve,reject)=>{const req=http.request({hostname:host,port,path:endpoint,method,agent:false,headers:{'Content-Type':'application/json'},timeout:5000},res=>{let body='';res.on('data',part=>body+=part);res.on('end',()=>resolve({ok:res.statusCode<300,status:res.statusCode,json:()=>JSON.parse(body)}));});req.on('error',reject);req.on('timeout',()=>req.destroy(Error('local controller timeout')));req.end(value===undefined?undefined:JSON.stringify(value));});
  }
  return {
    async setup(cfg) {
      if(child) await stop(child);
      const file = path.join(home,'config.json');
      fs.writeFileSync(file,JSON.stringify({...cfg,'external-controller':host+':'+port, profile:{'store-selected':false}}));
      child = start(['-d',home,'-f',file]);
      const logStart = logs.length;
      for(let i=0;i<500;i++) {
        try {
          const response=await api('/version');
          if(response.ok){
            version=(await response.json()).version;
            if (cfg['mixed-port']) {
              const ready = await new Promise(resolve => {
                const probe = net.createConnection({host, port: cfg['mixed-port']});
                probe.once('connect', () => {probe.destroy();resolve(true);});
                probe.once('error', () => resolve(false));
                probe.setTimeout(500, () => {probe.destroy();resolve(false);});
              });
              if (!ready) {await wait(80);continue;}
            }
            return;
          }
        } catch {}
        if(child.exitCode!==null)break;
        if (/Start Mixed.*server error|level=fatal/.test(logs.slice(logStart))) break;
        await wait(80);
      }
      throw Error('isolated controller unavailable');
    },
    api,
    async all() { return (await (await api('/proxies')).json()).proxies; },
    async get(name) { return (await (await api('/proxies/'+encodeURIComponent(name))).json()).now; },
    async select(name,item) { assert.equal((await api('/proxies/'+encodeURIComponent(name),'PUT',{name:item})).status,204); assert.equal(await this.get(name),item); },
    version() {return version;},
  };
}
async function flController() {
  const pipe = '\\\\.\\pipe\\next-rules-combined-'+process.pid+'-'+Date.now();
  let peer, buf=Buffer.alloc(0), seq=0;
  const pending=new Map();
  let connected;
  const handshake = new Promise(resolve=>{connected=resolve;});
  const server=net.createServer(socket=>{
    peer=socket;
    socket.on('data',bytes=>{
      buf=Buffer.concat([buf,bytes]);
      while(buf.length>=4 && buf.length>=4+buf.readUInt32LE(0)){
        const len=buf.readUInt32LE(0);
        let msg=JSON.parse(buf.subarray(4,4+len).toString()); buf=buf.subarray(4+len);
        if(msg.file) msg=JSON.parse(fs.readFileSync(msg.file,'utf8'));
        const cb=pending.get(String(msg.id));
        if(!cb)continue;
        pending.delete(String(msg.id));clearTimeout(cb.timer);
        msg.error?cb.reject(Error(JSON.stringify(msg.error))):cb.resolve(msg.result);
      }
    });
    connected(true);
  });
  await new Promise((resolve,reject)=>server.once('error',reject).listen(pipe,resolve));
  closers.push(()=>{peer?.destroy();return new Promise(resolve=>server.close(resolve));});
  start([pipe]);
  assert.equal(await Promise.race([handshake,wait(4500).then(()=>false)]),true,'isolated pipe setup');
  function call(method,args) {
    const id=String(++seq),body=Buffer.from(JSON.stringify({id,method,arguments:args})),h=Buffer.alloc(4); h.writeUInt32LE(body.length);
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},20000);
      pending.set(id,{resolve,reject,timer});peer.write(Buffer.concat([h,body]));
    });
  }
  assert.equal(await call('core.init',{'home-dir':home,version:0}),null);
  return {
    async setup(cfg) {
      const file=path.join(home,'config.json');
      fs.writeFileSync(file,JSON.stringify(cfg));
      assert.equal(await call('config.setup',{base:{path:file,overlay:JSON.stringify(cfg)},'selected-map':{},options:{'test-url':'http://127.0.0.1:1/','skip-cert-verify':false}}),null);
      assert.equal(await call('listener.start',null),null);
    },
    async all() { return (await call('proxy.list',null)).proxies; },
    async get(name) { return (await call('proxy.list',null)).proxies[name].now; },
    async select(name,item) {
      assert.equal((await call('proxy.select',{'group-name':name,'proxy-name':item})).message,'');
      assert.equal(await this.get(name),item);
    },
    version() { return 'FlClash Windows 0.9.3 release core'; },
  };
}
function udpServer() { return dgram.createSocket('udp4'); }
function close(socket) { return new Promise(resolve=>socket.close(resolve)); }
async function udpDestination(portToBind = 0) {
  const socket=udpServer();
  const port=await bind(socket,'bind',portToBind);
  closers.push(()=>close(socket));
  return {socket,port};
}
async function sendDatagram(dstPort, packet) {
  const client=udpServer();
  await bind(client,'bind');
  closers.push(()=>close(client));
  return new Promise((resolve,reject)=>{
    client.send(packet,dstPort,host,err=>{if(err)reject(err);else resolve();});
  });
}

async function fakeOutbound(label) {
  const udp = await udpDestination();
  const packets = new Set();
  udp.socket.on('message', (data) => packets.add(data.subarray(-16).toString('hex')));
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => socket.destroy());
    let buffer = Buffer.alloc(0);
    let greeted = false;
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!greeted) {
        if (buffer.length < 2 || buffer.length < 2 + buffer[1]) return;
        buffer = buffer.subarray(2 + buffer[1]);
        socket.write(Buffer.from([5, 0]));
        greeted = true;
      }
      if (buffer.length < 4) return;
      const requestLength = buffer[3] === 1 ? 10 : buffer[3] === 4 ? 22 : 7 + buffer[4];
      if (buffer.length < requestLength) return;
      const command = buffer[1];
      buffer = buffer.subarray(requestLength);
      const accepted = Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]);
      if (command === 3) {
        accepted.writeUInt16BE(udp.port, 8);
        socket.write(accepted);
        socket.removeAllListeners('data');
        return;
      }
      if (command !== 1) {
        socket.destroy();
        return;
      }
      socket.write(accepted);
      socket.removeAllListeners('data');
      let request = buffer;
      const answer = () => {
        if (!request.includes('\r\n\r\n')) return;
        if (request.subarray(0, request.indexOf('\r\n')).includes('/unavailable')) {
          socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
          return;
        }
        socket.end('HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Length: ' + label.length + '\r\n\r\n' + label);
      };
      socket.on('data', (part) => {
        request = Buffer.concat([request, part]);
        answer();
      });
      answer();
    });
  });
  const port = await bind(server, 'listen');
  closers.push(() => {
    for (const socket of sockets) socket.destroy();
    return close(server);
  });
  return { port, packets };
}

function requestThrough(port, target, executable) {
  if (executable) {
    const program = `const http = require('node:http');
      const request = http.get({hostname:'127.0.0.1',port:${port},path:${JSON.stringify('http://' + target + '/audit')},headers:{Host:${JSON.stringify(target)},Connection:'close'},timeout:4000}, response => {
        let body=''; response.on('data',chunk=>body+=chunk); response.on('end',()=>process.stdout.write(body));
      });
      request.on('timeout',()=>request.destroy()); request.on('error',()=>process.stdout.write('blocked'));`;
    return new Promise((resolve) => {
      const child = spawn(executable, ['-e', program], { cwd: home, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      children.push(child);
      let result = '';
      child.stdout.on('data', (data) => result += data);
      child.on('error', () => resolve('launch-error'));
      child.on('close', () => resolve(result || 'blocked'));
    });
  }
  return new Promise((resolve) => {
    const request = http.get({ hostname: host, port, path: 'http://' + target + '/audit',
      headers: { Host: target, Connection: 'close' }, timeout: 4000 }, (response) => {
      let body = '';
      response.on('data', (chunk) => body += chunk);
      response.on('end', () => resolve(body || 'blocked'));
    });
    request.on('error', () => resolve('blocked'));
    request.on('timeout', () => request.destroy());
  });
}


return {host, home, closers, children, bind, reserve, reserveMixed, start, stop, wait, udpServer, close,
  udpDestination, sendDatagram, fakeOutbound, requestThrough, vergeController, flController,
  logs: () => logs,
  async cleanup() { for (const child of children) await stop(child); for (const closer of closers.reverse()) await closer(); }
};
};
