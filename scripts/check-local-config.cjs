const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const compose=JSON.parse(fs.readFileSync(path.join(root,'compose.yaml')));
assert.deepEqual(Object.keys(compose.services).sort(),['garage','mailpit','postgres']);
for(const service of Object.values(compose.services)){
 assert.match(service.image,/:[a-z0-9.-]+$/i);assert.ok(!service.image.endsWith(':latest'));
 assert.ok(service.ports.every(port=>/^127\.0\.0\.1:\d+:\d+$/.test(port)));
 for(const volume of service.volumes){const bind=volume.split(':')[0];const target=path.resolve(root,bind);const rel=path.relative(path.join(root,'.local','infra'),target);assert.ok(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));}
 assert.ok(service.healthcheck&&service.logging.options['max-size']);
}
assert.ok(!fs.existsSync(path.join(root,'apps','worker')));
for(const file of ['apps/api/package.json','apps/web/package.json']){
 const p=JSON.parse(fs.readFileSync(path.join(root,file)));for(const name of ['next','fastify','bullmq'])assert.ok(!p.dependencies[name]);
}
console.log(JSON.stringify({status:'PASS',services:3,loopbackOnly:true,projectBindData:true,singleActiveStack:true,runtimeVerified:false}));
