const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
for (const name of ['tmp', 'cache', 'pnpm-store', 'pnpm-state', 'pnpm-config', 'pnpm-home', 'logs']) fs.mkdirSync(path.join(root, '.local', name), { recursive: true });
const localCli = path.join(root, '.local/runtime/pnpm/bin/pnpm.mjs');
const cli = fs.existsSync(localCli) ? localCli : 'C:/Users/35889/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs';
const args = process.argv.slice(2);
process.env.BETTER_AUTH_TELEMETRY = 'false';
const child = cp.spawn(process.execPath, [cli, ...args], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, TEMP: path.join(root, '.local/tmp'), TMP: path.join(root, '.local/tmp'), XDG_CACHE_HOME: path.join(root, '.local/cache'), XDG_CONFIG_HOME: path.join(root, '.local/pnpm-config'), XDG_DATA_HOME: path.join(root, '.local/pnpm-state'), XDG_STATE_HOME: path.join(root, '.local/pnpm-state'), PNPM_HOME: path.join(root, '.local/pnpm-home'), pnpm_config_store_dir: path.join(root, '.local/pnpm-store'), pnpm_config_cache_dir: path.join(root, '.local/cache/pnpm'), pnpm_config_state_dir: path.join(root, '.local/pnpm-state'), pnpm_config_config_dir: path.join(root, '.local/pnpm-config'), NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --use-system-ca --dns-result-order=ipv4first`.trim(), PLAYWRIGHT_BROWSERS_PATH: path.join(root, '.local/playwright-browsers'), NEXT_TELEMETRY_DISABLED: '1', TURBO_TELEMETRY_DISABLED: '1' },
});
child.on('error', e => { console.error(e.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
