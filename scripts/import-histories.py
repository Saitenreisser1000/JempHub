from pathlib import Path
import subprocess,json
root=Path.cwd()
def git(*args,cwd=root):
 return subprocess.check_output(['git','-c','user.name=JempHub Migration','-c','user.email=migration@localhost',*args],cwd=cwd,text=True).strip()
git('commit','--allow-empty','-m','Initialize local JempHub monorepo')
report={}
for name,slug in [('GuitarJemp','guitar'),('earjemp-master','ear'),('NoteJemp','note'),('StemPlayer','stemplayer')]:
 src=root.parent/name
 refs=git('for-each-ref','--format=%(refname)',cwd=src).splitlines()
 specs=[f'{ref}:refs/archive/{slug}/{ref.removeprefix("refs/")}' for ref in refs]
 git('fetch','--no-tags',str(src),*specs)
 head=git('rev-parse','HEAD',cwd=src)
 git('update-ref',f'refs/heads/history/{slug}',head)
 git('merge','--allow-unrelated-histories','-s','ours','--no-edit',f'history/{slug}','-m',f'Preserve original {name} history; files imported under apps/{slug}')
 report[name]={'head':head,'history_branch':f'history/{slug}','archived_refs':refs}
 print(name,head,'preserved')
(root/'migration/history-map.json').write_text(json.dumps(report,indent=2)+'\n')
