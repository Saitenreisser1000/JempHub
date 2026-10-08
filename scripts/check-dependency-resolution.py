import json
from pathlib import Path
root=json.loads(Path('package-lock.json').read_text())['packages'];drift={}
for app in ['guitar','ear','note','stemplayer/backend']:
 old=json.loads((Path('apps')/app/'package-lock.json').read_text())['packages'];pkg=json.loads((Path('apps')/app/'package.json').read_text());changes=[]
 for kind in ['dependencies','devDependencies']:
  for name in pkg.get(kind,{}):
   if name=='jemp-design-system':continue
   original=old.get('node_modules/'+name,{}).get('version');current=root.get('apps/'+app+'/node_modules/'+name,root.get('node_modules/'+name,{})).get('version')
   if original!=current:changes.append({'package':name,'original':original,'workspace':current})
 drift[app]=changes
Path('migration/dependency-resolution.json').write_text(json.dumps(drift,indent=2)+'\n');print(json.dumps(drift,indent=2))
assert not any(drift.values()),'Unintended direct dependency changes'
