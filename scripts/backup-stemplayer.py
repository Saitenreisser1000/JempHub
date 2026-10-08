from pathlib import Path
import tarfile,subprocess,hashlib,json
root=Path('/Users/stefanleutgeb/Projects');src=root/'StemPlayer'; dest=root/'JempHub-Migration-Backup'
archive=dest/'StemPlayer.tar.gz';bundle=dest/'StemPlayer.bundle'
if archive.exists() or bundle.exists(): raise SystemExit('Backup already exists; refusing overwrite')
with tarfile.open(archive,'w:gz') as tar: tar.add(src,arcname='StemPlayer',filter=lambda info: None if 'node_modules' in Path(info.name).parts else info)
subprocess.run(['git','-C',str(src),'bundle','create',str(bundle),'--all'],check=True)
subprocess.run(['git','-C',str(src),'bundle','verify',str(bundle)],check=True)
checks={}
for f in [archive,bundle]:
 h=hashlib.sha256()
 with f.open('rb') as stream:
  for block in iter(lambda:stream.read(1024*1024),b''):h.update(block)
 checks[f.name]=h.hexdigest()
with (dest/'SHA256SUMS').open('a') as stream:
 for name,sha in checks.items():stream.write(f'{sha}  {name}\n')
metadata={'head':subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True).strip(),'status':subprocess.check_output(['git','-C',str(src),'status','--porcelain'],text=True),'target':'apps/stemplayer','sha256':checks}
(dest/'StemPlayer-manifest.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
