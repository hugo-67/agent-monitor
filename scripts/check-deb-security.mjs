import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

// Validate generated Ubuntu DEB without installing or running it.
const deb=resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Provide a .deb to inspect');
const dir=mkdtempSync(join(tmpdir(),'agent-monitor-deb-check-'));
try {
  execFileSync('dpkg-deb',['-e',deb,join(dir,'control')]);
  const contents=execFileSync('dpkg-deb',['-c',deb],{encoding:'utf8',maxBuffer:10*1024*1024});
  if (!contents.includes('/opt/Agent Monitor/agent-monitor')) {
    throw new Error('Expected Agent Monitor binary path was not packaged');
  }
  console.log('DEB AppArmor paths:', contents.split('
').filter(line => /apparmor/i.test(line)));
  console.log('DEB control files:', readdirSync(join(dir,'control')));
  const postDbg = join(dir,'control','postinst');
  try { console.log('DEB postinst:', readFileSync(postDbg,'utf8').slice(0,5500)); } catch {}
  if (!contents.includes('/etc/apparmor.d/')) {
    throw new Error('Expected installed AppArmor profile is missing');
  }
  const available=readdirSync(join(dir,'control'));
  if (!available.includes('postinst')) throw new Error('Missing post-install script');
  const post=readFileSync(join(dir,'control','postinst'),'utf8');
  if (!post.toLowerCase().includes('apparmor')) {
    throw new Error('Post-install script does not mention AppArmor');
  }
  for (const script of ['postinst','prerm','postrm']) {
    if (available.includes(script)) execFileSync('sh',['-n',join(dir,'control',script)]);
  }
  console.log('Verified DEB application files, AppArmor profile, and package maintainer-script syntax.');
} finally {
  rmSync(dir,{recursive:true,force:true});
}
