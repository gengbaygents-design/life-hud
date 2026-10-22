import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { databaseClient } from '../src/db';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { rawDb } from '../src/db';
import { sql } from 'drizzle-orm';

const base=process.env.API_URL!;
const origin=process.env.WEB_URL!;
const token=randomUUID();
const users:{id:string;cookie:string;email:string;password:string}[]=[];
const objects:string[]=[];
const mailIds=new Set<string>();
let phase='readiness';
let lastResponse:{path:string;status:number}|undefined;
const s3=new S3Client({endpoint:process.env.CLOUD_STORAGE_ENDPOINT,region:'garage',forcePathStyle:true,maxAttempts:1,credentials:{accessKeyId:process.env.CLOUD_STORAGE_ACCESS_KEY_ID!,secretAccessKey:process.env.CLOUD_STORAGE_SECRET_ACCESS_KEY!}});
async function request(path:string,body?:unknown,cookie?:string,method=body?'POST':'GET',retried=false):Promise<Response>{
 const response=await fetch(base+path,{method,headers:{Origin:origin,...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10_000)});
 lastResponse={path:path.replace(/[a-f0-9-]{32,}/gi,'[id]'),status:response.status};
 if(response.status===429&&path.startsWith('/api/auth/')&&!retried){
  const seconds=Number(response.headers.get('x-retry-after')||response.headers.get('retry-after'));
  if(Number.isFinite(seconds)&&seconds>0&&seconds<=10){await response.body?.cancel();await new Promise(resolve=>setTimeout(resolve,seconds*1000+250));return request(path,body,cookie,method,true);}
 }
 return response;
}
async function main(){
 const ready=await request('/health/ready').catch(()=>null);
 if(!ready?.ok){console.error('PENDING_LOCAL_SERVICES: no acceptance data was written.');process.exitCode=1;return;}
 await rawDb.execute(sql`select 1`);
 phase='signup and password login';
 for(const suffix of ['a','b']){
  const email=`foundation-${token}-${suffix}@local.invalid`,password=randomBytes(24).toString('base64url');
  const response=await request('/api/auth/sign-up/email',{email,password,name:'Foundation verification'});
  assert.equal(response.status,200,'real signup');const data=await response.json();
  const cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');assert.ok(cookie);
  users.push({id:data.user.id,cookie,email,password});
  if(suffix==='a'){const login=await request('/api/auth/sign-in/email',{email,password});assert.equal(login.status,200,'real password login');assert.equal((await login.json()).user.id,data.user.id);}
 }
 const [a,b]=users;
 phase='server identity and owner isolation';
 const identity=await request('/users/current',undefined,a.cookie);assert.equal(identity.status,200);assert.equal((await identity.json()).id,a.id);
 const unauthenticated=await request('/ai-chats');assert.equal(unauthenticated.status,401);
 const wrongOrigin=await fetch(base+'/ai-chats',{method:'POST',headers:{Origin:'http://127.0.0.1:3999',Cookie:a.cookie,'Content-Type':'application/json'},body:JSON.stringify({title:'Must not be created'}),signal:AbortSignal.timeout(5000)});assert.equal(wrongOrigin.status,403,'authenticated cross-origin mutation rejected');
 const created=await request('/ai-chats',{title:'Foundation verification',userId:b.id},a.cookie);assert.equal(created.status,200);const chat=await created.json();
 const foreign=await request('/ai-chats/'+chat.id+'/messages',undefined,b.cookie);assert.equal(foreign.status,404);
 const own=await request('/ai-chats/'+chat.id+'/messages',undefined,a.cookie);assert.equal(own.status,200);
 const persisted=await rawDb.execute(sql`select user_id from ai_chats where id = ${chat.id}`);assert.equal(persisted[0]?.user_id,a.id);
 const otherList=await request('/ai-chats',undefined,b.cookie);assert.equal(otherList.status,200);assert.ok(!(await otherList.json()).some((item:{id:string})=>item.id===chat.id));
 phase='private storage roundtrip';
 const file=new FormData();const original='original-'+token;file.set('file',new File([original],'foundation.txt',{type:'text/plain'}));
 const uploaded=await request('/files/upload',file,a.cookie);assert.equal(uploaded.status,200);const object=await uploaded.json();objects.push(object.key);
 const read=await s3.send(new GetObjectCommand({Bucket:process.env.CLOUD_STORAGE_BUCKET,Key:object.key}),{abortSignal:AbortSignal.timeout(5000)});assert.equal(await read.Body!.transformToString(),original);
 const denied=await request('/files/get-url',{key:object.key},b.cookie);assert.equal(denied.status,404);
 const signed=await request('/files/get-url',{key:object.key},a.cookie);assert.equal(signed.status,200);const download=await fetch((await signed.json()).url,{signal:AbortSignal.timeout(5000)});assert.equal(download.status,200);assert.equal(await download.text(),original);
 const anonymous=await fetch(process.env.CLOUD_STORAGE_ENDPOINT+'/'+process.env.CLOUD_STORAGE_BUCKET+'/'+object.key,{signal:AbortSignal.timeout(5000)});assert.equal(anonymous.status,403);
 const otherDelete=await request('/files/remove',{key:object.key,confirm:true},b.cookie);assert.equal(otherDelete.status,404);
 const noConfirm=await request('/files/remove',{key:object.key},a.cookie);assert.equal(noConfirm.status,400);
 phase='absent provider and destructive authorization';
 if(!process.env.GOOGLE_GENERATIVE_AI_API_KEY){const ai=await request('/ai-chats/'+chat.id+'/messages',{content:'No provider should be called.'},a.cookie);assert.equal(ai.status,503);const after=await request('/ai-chats/'+chat.id+'/messages',undefined,a.cookie);assert.deepEqual(await after.json(),[]);}
 assert.equal((await request('/ai-chats/'+chat.id,{confirm:true},b.cookie,'DELETE')).status,404);
 assert.equal((await request('/ai-chats/'+chat.id,{},a.cookie,'DELETE')).status,400);
 assert.equal((await request('/ai-chats/'+chat.id,{confirm:true},a.cookie,'DELETE')).status,200);
 assert.equal((await request('/ai-chats/'+chat.id+'/messages',undefined,a.cookie)).status,404);
 phase='local reset mail and session revocation';
 assert.equal((await request('/api/auth/request-password-reset',{email:a.email,redirectTo:origin+'/reset-password'})).status,200);
 let messageId:string|undefined;
 for(let attempt=0;attempt<10&&!messageId;attempt++){
  const messages=await fetch('http://127.0.0.1:8025/api/v1/search?query='+encodeURIComponent('to:'+a.email),{signal:AbortSignal.timeout(5000)});
  assert.equal(messages.status,200);const found=await messages.json();
  for(const item of found.messages || []){assert.ok(item.To?.some((recipient:{Address:string})=>recipient.Address===a.email));mailIds.add(item.ID);messageId=item.ID;}
  if(!messageId)await new Promise(resolve=>setTimeout(resolve,500));
 }
 assert.ok(messageId,'local reset email delivered');
 const mailResponse=await fetch('http://127.0.0.1:8025/api/v1/message/'+messageId,{signal:AbortSignal.timeout(5000)});assert.equal(mailResponse.status,200);const mail=await mailResponse.json();
 assert.ok(String(mail.HTML).includes('LIFE HUD'));assert.ok(!/(?:src|href)=["']https?:\/\/(?!127\.0\.0\.1[:/])/i.test(String(mail.HTML)),'local email has no external resources or links');
 const resetLink=[...String(mail.HTML).matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&')).find(href=>href.startsWith(base+'/api/auth/reset-password/'));
 assert.ok(resetLink,'auth reset link in local email');const resetToken=new URL(resetLink).pathname.split('/').at(-1);assert.ok(resetToken);
 const newPassword=randomBytes(24).toString('base64url');
 assert.equal((await request('/api/auth/reset-password',{token:resetToken,newPassword})).status,200);
 assert.equal((await request('/users/current',undefined,a.cookie)).status,401,'old session revoked');
 assert.equal((await request('/api/auth/sign-in/email',{email:a.email,password:a.password})).status,401,'old password rejected');
 const login=await request('/api/auth/sign-in/email',{email:a.email,password:newPassword});assert.equal(login.status,200);assert.equal((await login.json()).user.id,a.id);
 const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');assert.ok(cookie);
 assert.equal((await request('/api/auth/sign-out',{},cookie)).status,200);assert.equal((await request('/users/current',undefined,cookie)).status,401);
 assert.equal((await request('/api/auth/reset-password',{token:resetToken,newPassword:randomBytes(24).toString('base64url')})).status,400,'reset token single use');
 console.log('PASS: PostgreSQL persistence, real password login, server owner isolation, private S3 bytes and signed URL, confirmation gates, local reset mail, revoked sessions and single-use reset token. No configured AI provider was called.');
}
async function cleanup(){
 const failures:unknown[]=[];
 if(mailIds.size){try{const response=await fetch('http://127.0.0.1:8025/api/v1/messages',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({IDs:[...mailIds]}),signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('mail cleanup');}catch(error){failures.push(error);}}
 for(const key of objects){try{await s3.send(new DeleteObjectCommand({Bucket:process.env.CLOUD_STORAGE_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(5000)});}catch(error){failures.push(error);}}
 for(const user of users){try{await rawDb.transaction(async tx=>{
  await tx.execute(sql`delete from ai_messages where chat_id in (select id from ai_chats where user_id = ${user.id})`);
  await tx.execute(sql`delete from ai_chats where user_id = ${user.id}`);
  await tx.execute(sql`delete from sessions where user_id = ${user.id}`);
  await tx.execute(sql`delete from accounts where user_id = ${user.id}`);
  await tx.execute(sql`delete from verifications where value = ${user.id}`);
  await tx.execute(sql`delete from users where id = ${user.id}`);
 });}catch(error){failures.push(error);}}
 s3.destroy();await databaseClient.end({timeout:2});if(failures.length)throw new Error('Verification cleanup failed; inspect only this run’s foundation test records.');
}
main().catch(error=>{console.error('Local foundation verification failed at '+phase+'; no secrets or auth cookies are printed.');console.error(JSON.stringify({lastResponse,errorType:error instanceof Error?error.name:typeof error,...(typeof error?.actual==='number'&&typeof error?.expected==='number'?{actualStatus:error.actual,expectedStatus:error.expected}:{})}));process.exitCode=1;}).finally(()=>cleanup().catch(()=>{console.error('Local verification cleanup failed.');process.exitCode=1;}));
