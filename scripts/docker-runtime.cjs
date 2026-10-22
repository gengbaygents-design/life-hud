const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function dockerExecutable(root) {
  const local = path.join(root, '.local', 'docker-desktop', 'resources', 'bin', 'docker.exe');
  return process.platform === 'win32' && fs.existsSync(local) ? local : 'docker';
}

async function ensureDocker(root, env) {
  const executable = dockerExecutable(root);
  const probe = () => {
    const result = cp.spawnSync(executable, ['info', '--format', '{{.OSType}}'], {
      env, windowsHide: true, encoding: 'utf8', timeout: 5000,
    });
    return !result.error && result.status === 0 && result.stdout.trim() === 'linux';
  };
  if (probe()) return;
  const desktop = path.join(root, '.local', 'docker-desktop', 'Docker Desktop.exe');
  if (process.platform !== 'win32' || !fs.existsSync(desktop)) {
    throw new Error('DOCKER_NOT_AVAILABLE: install/start a Linux container runtime.');
  }
  console.log('Starting the project Docker Desktop installation; waiting for the Linux engine.');
  const child = cp.spawn(desktop, [], { cwd: root, env, windowsHide: true, detached: true, stdio: 'ignore' });
  let launchError = false;
  child.on('error', () => { launchError = true; });
  child.unref();
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline && !launchError) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (probe()) return;
  }
  throw new Error('DOCKER_NOT_READY: inspect Docker Desktop; no application services were started.');
}

module.exports = { dockerExecutable, ensureDocker };
