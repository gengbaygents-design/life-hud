// Project-local Qoder invocation. This is tooling, not application code.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const local = path.join(root, '.local', 'qoder');
const runtime = 'E:/Qoder/resources/app.asar.unpacked/node_modules/@qoder-ai/qoder-agent-sdk/dist/_worker/qoder-worker-runtime.obf.mjs';
let args = process.argv.slice(2);
const probe = args.length === 1 && args[0] === '--probe';
const promptFile = args.length === 2 && args[0] === '--prompt-file';
const login = args.length === 1 && args[0] === 'login';
const loginHelp = args.length === 2 && args[0] === 'login' && args[1] === '--help';
if (!probe && !promptFile && !login && !loginHelp && !(args.length === 1 && ['--help', '--version'].includes(args[0]))) {
  console.error('Usage: node scripts/run-qoder.cjs --help | --version | --probe | login | --prompt-file <project-local file>');
  process.exit(2);
}
if (probe || promptFile) {
  let prompt = 'Reply with OK only. This is a connectivity check with no project data.';
  if (promptFile) {
    try {
      const requested = path.resolve(root, args[1]);
      const requestedRelative = path.relative(root, requested);
      if (requestedRelative === '..' || requestedRelative.startsWith('..' + path.sep) || path.isAbsolute(requestedRelative)) {
        throw new Error('Prompt file must be inside LIFE HUD.');
      }
      const source = fs.realpathSync(requested);
      const relative = path.relative(fs.realpathSync(root), source);
      if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
        throw new Error('Prompt file must resolve inside LIFE HUD.');
      }
      const segments = relative.toLowerCase().split(path.sep);
      if (segments.includes('.git') || segments[0] === '.local' && segments[1] !== 'prompts' || !/\.(md|txt)$/i.test(source)) {
        throw new Error('Use a .md/.txt prompt; private state is prohibited except prepared .local/prompts files.');
      }
      if (!fs.statSync(source).isFile()) throw new Error('Prompt must be a regular file.');
      prompt = fs.readFileSync(source, 'utf8');
    } catch (e) {
      console.error(e.code === 'ENOENT' ? 'Prompt file does not exist.' : e.message);
      process.exit(2);
    }
  }
  args = ['--print', '--output-format', 'json', '--no-session-persistence',
    '--permission-mode', 'dont_ask', '--tools', '', '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}', '--setting-sources', '',
    '--settings', '{"general":{"enableAutoUpdate":false},"autoMemoryEnabled":false,"hooks":{},"enabledPlugins":{}}',
    '--max-model-request-retries', '0', '--max-output-tokens', probe ? '64' : '4096',
    '--system-prompt', 'Review only the supplied text. Return a draft for human review. Do not use tools or access files.',
    '--', prompt];
}
if (!fs.existsSync(runtime)) {
  console.error(`Qoder bundled runtime not found: ${runtime}`);
  process.exit(1);
}
for (const name of ['config', 'home', 'tmp', 'cache', 'data', 'logs']) fs.mkdirSync(path.join(local, name), { recursive: true });
const child = spawn(process.execPath, ['--require', path.join(__dirname, 'qoder-isolation.cjs'), runtime, ...args], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: {
    ...process.env,
    QODER_CONFIG_DIR: path.join(local, 'config'),
    QODER_USER_CONFIG_DIR: path.join(local, 'config'),
    QODER_ENV_HOME: path.join(local, 'home'),
    QODER_WORKING_DIR: root,
    QODER_EXTERNAL_COMMAND_DATA_DIR: path.join(local, 'data'),
    QODER_EXTERNAL_COMMAND_CACHE_DIR: path.join(local, 'cache'),
    QODER_OOM_DIAG_DIR: path.join(local, 'logs'),
    QODER_MEMORY: '0',
    TEMP: path.join(local, 'tmp'), TMP: path.join(local, 'tmp'),
    APPDATA: path.join(local, 'data'), LOCALAPPDATA: path.join(local, 'data'),
    XDG_CACHE_HOME: path.join(local, 'cache'), XDG_DATA_HOME: path.join(local, 'data'), XDG_STATE_HOME: path.join(local, 'data'),
  },
});
child.on('error', e => { console.error(e.message); process.exitCode = 1; });
const timeout = login ? 600000 : probe || promptFile ? 180000 : 30000;
const timer = setTimeout(() => { console.error(`Qoder invocation timed out after ${timeout / 1000} seconds.`); child.kill(); }, timeout);
timer.unref();
child.on('exit', (code, signal) => { clearTimeout(timer); process.exitCode = code ?? (signal ? 1 : 0); });
