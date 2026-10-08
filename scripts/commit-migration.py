from pathlib import Path
import subprocess,json
root=Path.cwd()
def git(*args):return subprocess.check_output(['git','-c','user.name=JempHub Migration','-c','user.email=migration@localhost',*args],text=True)
assert json.loads((root/'migration/verification.json').read_text())['original_files_and_git_states_unchanged']
git('add','.')
# Preserve files already tracked by the source even when its ignore rules match them.
for name,data in json.loads((root/'migration/source-snapshot.json').read_text()).items():
 src=root.parent/name
 if not (src/'.git').exists():continue
 tracked=subprocess.check_output(['git','-C',str(src),'ls-files','-z']).decode().split('\0')
 for rel in filter(None,tracked):
  path=Path(data['target'])/rel
  if not path.is_file():continue
  parts=path.parts
  if any(x in parts for x in ['node_modules','dist','.git','.DS_Store','.eslintcache']):continue
  if path.name.startswith('.env') and not path.name.endswith('.example'):continue
  if str(path).startswith(('apps/stemplayer/audio/','apps/stemplayer/releases/','apps/stemplayer/backend/uploads/')):continue
  git('add','-f','--',str(path))
files=git('diff','--cached','--name-only','-z').split('\0')
large=[]
for f in filter(None,files):
 p=root/f
 assert not f.startswith(('apps/stemplayer/audio/','apps/stemplayer/releases/','apps/stemplayer/backend/uploads/')),f
 assert not any(part in ['node_modules','dist','.git'] for part in Path(f).parts),f
 assert not (p.name.startswith('.env') and not p.name.endswith('.example')),f
 if p.stat().st_size>10*1024*1024:large.append(f)
assert large==['apps/ear/src/assets/audio/pianoSounds.mp3'],large
print('Staged',len(list(filter(None,files))),'files; large-file and environment-file checks passed')
print(git('commit','-m','Import six JempHub projects with workspaces, preserved local changes and validated builds'))
print(git('status','--short','--branch'))
