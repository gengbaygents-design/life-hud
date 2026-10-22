const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { writeIfChanged } = require('./write-if-changed.cjs');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const local = path.join(root, '.local');
for (const name of ['tmp','logs','docker','infra/postgres','infra/garage/meta','infra/garage/data','infra/mailpit']) fs.mkdirSync(path.join(local,name),{recursive:true});
process.env.TEMP=process.env.TMP=path.join(local,'tmp');
process.env.DOCKER_CONFIG=path.join(local,'docker');
Object.assign(process.env,require('./container-environment.cjs').createContainerEnvironment(root));
const {dockerExecutable:resolveDocker,ensureDocker}=require('./docker-runtime.cjs');
const dockerExecutable=resolveDocker(root);
process.env.APP_ENV='development';process.env.NODE_ENV='development';
const mode=process.argv[2] || 'start';
function initialize() {
  const envFile=path.join(root,'.env');
  if(!fs.existsSync(envFile)){
    const token=()=>crypto.randomBytes(32).toString('hex');const password=token();
    fs.writeFileSync(envFile,[
      'APP_ENV=development','PORT=3001','API_URL=http://127.0.0.1:3001','WEB_URL=http://127.0.0.1:3002',
      'POSTGRES_USER=life_hud','POSTGRES_DB=life_hud','POSTGRES_PASSWORD='+password,
      'DATABASE_URL=postgresql://life_hud:'+password+'@127.0.0.1:5433/life_hud','BETTER_AUTH_SECRET='+token(),
      'CLOUD_STORAGE_ENDPOINT=http://127.0.0.1:3900','CLOUD_STORAGE_REGION=garage','CLOUD_STORAGE_BUCKET=life-hud',
      'CLOUD_STORAGE_ACCESS_KEY_ID=GK'+crypto.randomBytes(12).toString('hex'),'CLOUD_STORAGE_SECRET_ACCESS_KEY='+token(),
      'GARAGE_RPC_SECRET='+token(),'GARAGE_ADMIN_TOKEN='+token(),'GOOGLE_GENERATIVE_AI_API_KEY=','AI_MODEL=gemini-2.5-flash',''
    ].join('\n'),{flag:'wx'});
  }
  process.loadEnvFile(envFile);
  const apiKeys=['APP_ENV','PORT','API_URL','WEB_URL','DATABASE_URL','BETTER_AUTH_SECRET','CLOUD_STORAGE_ENDPOINT','CLOUD_STORAGE_REGION','CLOUD_STORAGE_BUCKET','CLOUD_STORAGE_ACCESS_KEY_ID','CLOUD_STORAGE_SECRET_ACCESS_KEY','GOOGLE_GENERATIVE_AI_API_KEY','AI_MODEL','AI_PROVIDER','AI_BASE_URL','OPENAI_API_KEY'];
  writeIfChanged(path.join(root,'apps/api/.env'),apiKeys.map(key=>key+'='+(process.env[key] || '')).join('\n')+'\n');
  const webEnv=['VITE_APP_ENV=development','VITE_API_URL='+process.env.API_URL,'VITE_WEB_URL='+process.env.WEB_URL,''].join('\n');
  for(const name of ['.env','.env.development.local','.env.production.local'])writeIfChanged(path.join(root,'apps/web',name),webEnv);
  process.env.VITE_APP_ENV='development';process.env.VITE_API_URL=process.env.API_URL;process.env.VITE_WEB_URL=process.env.WEB_URL;
  writeIfChanged(path.join(local,'infra/garage.toml'),[
    'metadata_dir = "/var/lib/garage/meta"','data_dir = "/var/lib/garage/data"','db_engine = "sqlite"','replication_factor = 1',
    'rpc_bind_addr = "[::]:3901"','rpc_public_addr = "garage:3901"','rpc_secret = "'+process.env.GARAGE_RPC_SECRET+'"',
    '[s3_api]','s3_region = "garage"','api_bind_addr = "[::]:3900"','root_domain = ".s3.garage.localhost"',
    '[admin]','api_bind_addr = "[::]:3903"','admin_token = "'+process.env.GARAGE_ADMIN_TOKEN+'"',''
  ].join('\n'));
}
function run(command,args,options={}) {
  const result=cp.spawnSync(command,args,{cwd:root,env:process.env,stdio:'inherit',windowsHide:true,...options});
  if(result.error)throw new Error(command==='docker'?'DOCKER_NOT_AVAILABLE: install/start a Docker runtime before local service acceptance.':command+' could not start');
  if(result.status!==0)throw new Error(command+' failed (exit '+result.status+')');
}
const pnpm=args=>run(process.execPath,[path.join(__dirname,'run-pnpm.cjs'),...args]);
const docker=args=>run(dockerExecutable,['compose','--project-name','life-hud','--env-file','.env','-f','compose.yaml',...args]);
async function main(){
  initialize();
  if(mode==='init'){console.log('Local configuration prepared; secrets are not printed.');return;}
  if(mode==='infra-down'){docker(['down']);return;}
  if(mode==='verify'){pnpm(['--filter','api','exec','tsx','--env-file=.env','scripts/verify-local.ts']);return;}
  if(!['start','setup','infra-up','apps'].includes(mode))throw new Error('Unknown local command');
  if(mode!=='apps'){
    await ensureDocker(root,process.env);
    run(dockerExecutable,['info','--format','{{.OSType}}']);
    docker(['config','--quiet']);docker(['up','-d','--wait','--quiet-pull']);
    await require('./setup-garage.cjs')();
    if(mode==='infra-up')return;
    pnpm(['db:migrate']);pnpm(['db:seed']);
    if(mode==='setup')return;
  }
  const cli=path.join(root,'scripts/run-pnpm.cjs');
  const specs=[['--filter','api','start'],['--filter','web','dev'],['--filter','api','schedule']];
  const children=specs.map(args=>cp.spawn(process.execPath,[cli,...args],{cwd:root,env:process.env,stdio:'inherit',windowsHide:true}));
  let closing=false;
  const stop=code=>{if(closing)return;closing=true;for(const child of children){if(!child.pid)continue;if(process.platform==='win32')cp.spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else child.kill('SIGTERM');}process.exitCode=code;};
  for(const child of children){child.on('error',()=>stop(1));child.on('exit',code=>stop(code || 0));}
  process.once('SIGINT',()=>stop(0));process.once('SIGTERM',()=>stop(0));
  console.log('LIFE HUD: '+process.env.WEB_URL+' (Ctrl+C stops application processes; infra:down stops services)');
  if(mode==='start' && !process.argv.includes('--no-open') && process.platform==='win32' && /^http:\/\/127\.0\.0\.1:\d+\/?$/.test(process.env.WEB_URL || '')){
    void (async()=>{for(let attempt=0;attempt<30&&!closing;attempt++){
      const ready=await Promise.all([process.env.WEB_URL,new URL('/health/ready',process.env.API_URL).href].map(async url=>{try{const response=await fetch(url,{signal:AbortSignal.timeout(1000)});await response.body?.cancel();return response.ok;}catch{return false;}})).then(states=>states.every(Boolean));
      if(ready){const browser=cp.spawn('explorer.exe',[process.env.WEB_URL],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>console.warn('Open the printed local Web URL in your browser.'));browser.unref();return;}
      await new Promise(resolve=>setTimeout(resolve,1000));
    }})();
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
