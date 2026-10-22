const fs = require('node:fs');

// Avoid notifying live file watchers when derived configuration has not changed.
function writeIfChanged(file, content) {
  const bytes = Buffer.from(content, 'utf8');
  try {
    if (fs.readFileSync(file).equals(bytes)) return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  fs.writeFileSync(file, bytes);
  return true;
}

module.exports = { writeIfChanged };
