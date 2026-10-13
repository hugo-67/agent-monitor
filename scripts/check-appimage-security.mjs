/**
 * Validate an AppImage without starting its Electron GUI. CI fails if
 * electron-builder reintroduces --no-sandbox in .desktop Exec or the
 * packaged main process no longer contains the fail-closed startup check.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { extractFile } from '@electron/asar';

const image = resolve(process.argv[2] || '');
if (!process.argv[2] || !statSync(image).isFile()) throw new Error('Pass AppImage path');
const tmp = mkdtempSync(join(tmpdir(), 'agent-monitor-verify-'));
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const full = join(dir, e.name);
  return e.isDirectory() ? walk(full) : [full];
});
try {
  const result = spawnSync(image, ['--appimage-extract'], {cwd:tmp, encoding:'utf8', timeout:120000, maxBuffer:5*1024*1024});
  if (result.status !== 0) throw new Error('AppImage extraction failed: ' + (result.stderr || result.error?.message));
  const files = walk(join(tmp, 'squashfs-root'));
  const desktops = files.filter(f => f.endsWith('.desktop'));
  if (!desktops.length) throw new Error('No desktop launcher found in AppImage');
  for (const entry of desktops) {
    const exec = readFileSync(entry,'utf8').split(/\r?\n/).filter(line=>/^Exec=/.test(line));
    if (!exec.length) throw new Error('Missing Exec in ' + entry);
    if (exec.some(line=>/(?:^|\s)--(?:no-sandbox|disable-sandbox)(?:\s|$|=)/.test(line))) {
      throw new Error('Unsafe Chromium sandbox bypass in desktop entry: ' + exec.join('; '));
    }
    console.log('Verified desktop launcher:', exec.join('; '));
  }
  const archive = files.find(f => f.endsWith('/resources/app.asar'));
  if (!archive) throw new Error('Electron app.asar not found');
  const main = extractFile(archive, 'dist-electron/index.cjs').toString('utf8');
  if (!main.includes('refuses to start without the Chromium sandbox')
      || !main.includes('no-sandbox') || !main.includes('disable-sandbox')) {
    throw new Error('Packaged main process lacks mandatory sandbox bypass rejection');
  }
  const html = extractFile(archive,'dist/index.html').toString('utf8');
  if (!html.includes("connect-src 'none'")) throw new Error('Production CSP must disallow connections');
  console.log('Verified bundled Chromium sandbox guard and offline CSP.');
  console.log('Note: AppRun may append --no-sandbox if namespaces are unavailable; the main process then refuses to start.');
} finally {
  rmSync(tmp, {recursive:true,force:true});
}
