// Build fault-injection preview separately from the live application's assets.
const cp = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const cli = path.join(__dirname, 'run-pnpm.cjs');
if (process.env.LIFE_HUD_E2E !== '1') throw new Error('E2E environment required');
const build = cp.spawnSync(process.execPath, [cli, '--filter', 'web', 'exec', 'vite', 'build', '--mode', 'e2e'], {cwd:root,env:process.env,stdio:'inherit',windowsHide:true});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
const preview = cp.spawn(process.execPath, [cli, '--filter', 'web', 'exec', 'vite', 'preview', '--mode', 'e2e', '--host', '127.0.0.1', '--port', '3202', '--strictPort'], {cwd:root,env:process.env,stdio:'inherit',windowsHide:true});
preview.on('error', error => { console.error(error); process.exitCode = 1; });
preview.on('exit', code => { process.exitCode = code ?? 1; });
