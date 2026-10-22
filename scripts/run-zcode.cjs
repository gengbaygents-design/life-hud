// Project-local ZCode invocation. This is initialization tooling, not app code.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const projectRoot = path.resolve(__dirname, '..');
const localRoot = path.join(projectRoot, '.local');
const storageRoot = path.join(localRoot, 'home', '.zcode');
const cliPath = 'E:/cc/ZCode/resources/glm/zcode.cjs';
if (!fs.existsSync(cliPath)) throw new Error(`ZCode CLI not found: ${cliPath}`);
for (const dir of ['tmp', 'logs', 'cache', 'appdata', 'home/.zcode/cli', 'home/.zcode/v2']) {
  fs.mkdirSync(path.join(localRoot, dir), { recursive: true });
}
let args = process.argv.slice(2);
// Read prompts as data. Avoid shell interpolation of natural-language content.
if (args[0] === '--prompt-file') {
  if (!args[1]) throw new Error('Usage: node scripts/run-zcode.cjs --prompt-file <project-local file> [options]');
  const promptPath = path.resolve(projectRoot, args[1]);
  const relative = path.relative(projectRoot, promptPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Prompt file must be inside LIFE HUD');
  args = ['--prompt', fs.readFileSync(promptPath, 'utf8'), ...args.slice(2)];
}
const child = spawn(process.execPath, ['--require', path.join(__dirname, 'zcode-isolation.cjs'), cliPath, ...args], {
  cwd: projectRoot,
  env: {
    ...process.env,
    ZCODE_STORAGE_DIR: storageRoot,
    ZCODE_HOME: storageRoot,
    ZCODE_DATA_BASE_DIR: path.join(localRoot, 'home'),
    ZCODE_LOG_DIR: path.join(localRoot, 'logs'),
    ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: path.join(storageRoot, 'v2', 'zcode-builtin.json'),
    ZCODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE: 'E:/cc/ZCode/resources/config/provider/zcode-builtin.json',
    ZCODE_PERSONAL_PROVIDER_CONFIG_FILE: path.join(storageRoot, 'v2', 'provider_config.json'),
    // Preserve the existing credential cipher context when isolating home paths.
    ZCODE_CREDENTIAL_SECRET: process.env.ZCODE_CREDENTIAL_SECRET?.trim()
      || `zcode-credential-fallback:${os.platform()}:${os.homedir()}:${os.userInfo().username}`,
    ZCODE_MODEL_TELEMETRY_ENABLED: '0',
    TEMP: path.join(localRoot, 'tmp'),
    TMP: path.join(localRoot, 'tmp'),
    LOCALAPPDATA: path.join(localRoot, 'appdata'),
    APPDATA: path.join(localRoot, 'appdata'),
    XDG_CACHE_HOME: path.join(localRoot, 'cache'),
    XDG_DATA_HOME: path.join(localRoot, 'home'),
  },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
const timeout = setTimeout(() => {
  console.error('Project ZCode invocation exceeded 180 seconds; stopping this child process.');
  child.kill();
}, 180000);
timeout.unref();
child.on('exit', (code, signal) => {
  clearTimeout(timeout);
  process.exitCode = code ?? (signal ? 1 : 0);
});
