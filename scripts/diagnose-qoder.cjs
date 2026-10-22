// Report allowlisted Qoder error categories without printing logs or credentials.
const fs = require('node:fs');
const path = require('node:path');
const root = fs.realpathSync(path.resolve(__dirname, '..'));
const logRoot = path.join(root, '.local', 'qoder', 'config', 'logs', 'runs');
const categories = {
  dnsFailure: /\bENOTFOUND\b/g,
  connectionReset: /\bECONNRESET\b/g,
  connectionRefused: /\bECONNREFUSED\b/g,
  networkTimeout: /\bETIMEDOUT\b|\bUND_ERR_CONNECT_TIMEOUT\b/g,
  deviceFlowTimeout: /Device flow timed out/g,
  pollingFailure: /poll(?:ing)?[^\n]{0,60}(?:failed|error)|(?:failed|error)[^\n]{0,60}poll/gi,
};
function insideProject(file) {
  const resolved = fs.realpathSync(file);
  const relative = path.relative(root, resolved);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
const counts = Object.fromEntries(Object.keys(categories).map(name => [name, 0]));
let scannedRuns = 0;
let skippedFiles = 0;
if (fs.existsSync(logRoot) && insideProject(logRoot)) {
  const runs = fs.readdirSync(logRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort().slice(-20);
  for (const run of runs) {
    const file = path.join(logRoot, run, 'qodercli.log');
    if (!fs.existsSync(file)) continue;
    if (!insideProject(file)) { skippedFiles++; continue; }
    const content = fs.readFileSync(file, 'utf8');
    scannedRuns++;
    for (const [name, pattern] of Object.entries(categories)) counts[name] += [...content.matchAll(pattern)].length;
  }
}
console.log(JSON.stringify({
  scope: 'Historical error counts only; does not prove current authentication or connectivity.',
  scannedRuns, skippedFiles, counts,
  environment: {
    personalAccessTokenPresent: Boolean(process.env.QODER_PERSONAL_ACCESS_TOKEN),
    proxyVariablePresent: Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy),
  },
  guidance: counts.dnsFailure && counts.pollingFailure ? 'Verify authentication-domain connectivity in the same execution environment as login. A browser confirmation cannot finish CLI login while polling requests fail.' : 'Use the CLI login result and a successful model probe to establish availability.',
}));
