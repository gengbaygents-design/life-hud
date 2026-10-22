// Keep ZCode's home-derived files inside the project without changing HOME.
const os = require('node:os');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
os.homedir = () => path.join(projectRoot, '.local', 'home');
