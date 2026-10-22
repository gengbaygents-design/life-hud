import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { RPCHandler } from '@orpc/server/fetch';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { ORPCError } from '@orpc/server';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import config from '@/config';
import { router } from '@/router';
import serverConfig from '@/server-config';
import type { HonoEnv, ORPCContext } from '@/types';
import { checkReadiness } from '@/readiness';

const app = new Hono<HonoEnv>();
app.use(secureHeaders());
app.use(cors({ origin: config.WEB_URL, credentials: true }));
app.use(async(c,next) => { c.header('Cache-Control','no-store'); await next(); });
app.use(bodyLimit({ maxSize: 21 * 1024 * 1024, onError: c => c.json({ error: 'Payload too large' },413) }));
app.get('/health/live', c => c.json({ status: 'alive' }));
app.get('/health/ready', async c => { const state=await checkReadiness();return c.json(state,state.status==='ready'?200:503); });
app.all('/api/auth/*', c => serverConfig.authHandler!(c.req.raw));
// Mutating transports share the same origin gate, including file and chat routes.
app.use(async(c,next) => {
  if (!['GET','HEAD','OPTIONS'].includes(c.req.method) && c.req.header('Origin') !== config.WEB_URL) return c.json({ error:'Forbidden origin' },403);
  const ctx: ORPCContext = {
    headers:Object.fromEntries(c.req.raw.headers),rawRequest:c.req.raw,
    getCookie:name=>getCookie(c,name),
    setCookie:(name,value,options)=>setCookie(c,name,value,{...options,sameSite:'Lax'}),
    deleteCookie:(name,options)=>deleteCookie(c,name,options),secure:false,
  };
  try { await serverConfig.resolveUser(ctx); }
  catch { return c.json({ error:'Local database is unavailable' },503); }
  c.set('ctx',ctx);await next();
});
const interceptors = [async <T>({next}:{next:()=>Promise<T>}):Promise<T> => {
  try{return await next();}catch(error){
    if(error instanceof ORPCError)throw error;
    throw new ORPCError('INTERNAL_SERVER_ERROR',{message:'Request failed'});
  }
}];
const rpc = new RPCHandler(router,{interceptors});
const openapi = new OpenAPIHandler(router,{interceptors});
app.all('/*',async c=>{
  const options={context:c.var.ctx};
  const result=await openapi.handle(c.req.raw,options);if(result.matched)return result.response;
  const second=await rpc.handle(c.req.raw,options);if(second.matched)return second.response;
  return c.json({error:'Not found'},404);
});
app.onError((_error,c)=>c.json({error:'Local service unavailable'},503));
export default app;
