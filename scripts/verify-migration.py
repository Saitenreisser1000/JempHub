from pathlib import Path
import hashlib,json,subprocess,os
root=Path.cwd();snap=json.loads((root/'migration/source-snapshot.json').read_text());history=json.loads((root/'migration/history-map.json').read_text())
env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'}
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as s:
  for b in iter(lambda:s.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
changes={}
for name,data in snap.items():
 src=root.parent/name;dst=root/data['target'];changed=[]
 for rel,sha in data['files'].items():
  assert digest(src/rel)==sha,f'Original modified: {name}/{rel}'
  if not (dst/rel).exists() or digest(dst/rel)!=sha:changed.append(rel)
 if data['status'] is not None:
  current=subprocess.check_output(['git','-C',str(src),'status','--porcelain'],env=env,text=True)
  assert current==data['status'],f'Original Git status changed: {name}'
 if name in history:
  head=subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True).strip();assert head==history[name]['head']
  subprocess.run(['git','merge-base','--is-ancestor',head,'HEAD'],check=True)
  slug=history[name]['history_branch'].split('/')[-1]
  for ref in history[name]['archived_refs']:
   orig=subprocess.check_output(['git','-C',str(src),'rev-parse',ref],text=True).strip()
   archived=subprocess.check_output(['git','rev-parse','refs/archive/'+slug+'/'+ref.removeprefix('refs/')],text=True).strip()
   assert orig==archived,ref
 changes[name]=changed
report={'original_files_and_git_states_unchanged':True,'all_original_heads_are_ancestors':True,'all_original_refs_preserved':True,'intentional_changes_to_copied_files':changes}
(root/'migration/verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
