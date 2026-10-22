'use strict';
const fs = require('node:fs');
const path = require('node:path');

function createContainerEnvironment(root, parent = process.env) {
  if (!path.isAbsolute(root)) throw new Error('Absolute project root required');
  const overrides = {
    DOCKER_CONFIG: path.join(root, '.local', 'docker'),
    LOCALAPPDATA: path.join(root, '.local', 'docker-profile', 'Local'),
    TEMP: path.join(root, '.local', 'tmp'),
    TMP: path.join(root, '.local', 'tmp'),
  };
  for (const dir of Object.values(overrides)) fs.mkdirSync(dir, { recursive: true });
  const bin = path.join(root, '.local', 'docker-desktop', 'resources', 'bin');
  if (fs.existsSync(bin)) {
    const pathKey = Object.keys(parent).find(key => key.toLowerCase() === 'path') || 'PATH';
    overrides[pathKey] = bin + path.delimiter + (parent[pathKey] || '');
  }
  const plugins = path.join(root, '.local', 'docker-desktop', 'resources', 'cli-plugins');
  if (fs.existsSync(plugins)) {
    const file = path.join(overrides.DOCKER_CONFIG, 'config.json');
    const config = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    config.cliPluginsExtraDirs = [...new Set([...(config.cliPluginsExtraDirs || []), plugins])];
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  }
  return { ...parent, ...overrides };
}

module.exports = { createContainerEnvironment };
