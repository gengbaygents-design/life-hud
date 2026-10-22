// Redirect home-derived Qoder state for this child only.
const os = require('node:os');
const path = require('node:path');
os.homedir = () => path.resolve(__dirname, '..', '.local', 'qoder', 'home');
