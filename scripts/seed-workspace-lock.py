from pathlib import Path
import json
root=json.loads(Path('package.json').read_text())
lock={'name':root['name'],'version':root['version'],'lockfileVersion':3,'requires':True,'packages':{'':{'name':root['name'],'version':root['version'],'workspaces':root['workspaces'],'engines':root['engines']}}}
for workspace in ['apps/hub','apps/guitar','apps/ear','apps/note','apps/stemplayer','apps/stemplayer/backend','packages/design-system']:
 p=Path(workspace);pkg=json.loads((p/'package.json').read_text());entry={k:v for k,v in pkg.items() if k in ['name','version','dependencies','devDependencies','engines','optionalDependencies','peerDependencies']}
 lock['packages'][workspace]=entry
 lock['packages']['node_modules/'+pkg['name']]={'resolved':workspace,'link':True}
 old=p/'package-lock.json'
 if old.exists():
  for key,value in json.loads(old.read_text()).get('packages',{}).items():
   if key.startswith('node_modules/') and key!='node_modules/jemp-design-system':lock['packages'][(('' if workspace == 'apps/stemplayer/backend' else workspace+'/')+key)]=value
Path('package-lock.json').write_text(json.dumps(lock,indent=2)+'\n')
print('Seeded root lockfile with exact original dependency trees')
