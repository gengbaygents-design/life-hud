import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { writeIfChanged } = require('./write-if-changed.cjs') as { writeIfChanged: (file: string, text: string) => boolean };
const base = path.resolve('.local/tmp');
fs.mkdirSync(base, { recursive: true });
const directories: string[] = [];
function fixture() {
  const dir = fs.mkdtempSync(path.join(base, 'config-write-'));
  directories.push(dir);
  return path.join(dir, '.env');
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of directories.splice(0)) {
    if (!path.resolve(dir).startsWith(base + path.sep)) throw new Error('Unsafe test cleanup');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
describe('derived configuration does not restart live watchers unnecessarily', () => {
  it('creates missing configuration and updates actual changes', () => {
    const file = fixture();
    expect(writeIfChanged(file, 'URL=first\n')).toBe(true);
    expect(writeIfChanged(file, 'URL=second\n')).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe('URL=second\n');
  });
  it('preserves mtime for byte-identical configuration across repeated calls', () => {
    const file = fixture();
    fs.writeFileSync(file, 'NAME=航行\n');
    fs.utimesSync(file, 1000000000, 1000000000);
    const mtime = fs.statSync(file).mtimeMs;
    for (let i = 0; i < 3; i++) expect(writeIfChanged(file, 'NAME=航行\n')).toBe(false);
    expect(fs.statSync(file).mtimeMs).toBe(mtime);
  });
  it('propagates read/permission errors without overwriting the file', () => {
    const file = fixture();
    fs.writeFileSync(file, 'existing\n');
    const error = Object.assign(new Error('read denied'), { code: 'EACCES' });
    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => { throw error; });
    const write = vi.spyOn(fs, 'writeFileSync');
    expect(() => writeIfChanged(file, 'replacement\n')).toThrow(error);
    expect(write).not.toHaveBeenCalled();
    expect(fs.readFileSync(file, 'utf8')).toBe('existing\n');
  });
});
