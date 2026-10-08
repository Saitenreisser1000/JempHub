from pathlib import Path
import shutil,hashlib,json,subprocess
root=Path.cwd(); sources={'Jemphub':'apps/hub','GuitarJemp':'apps/guitar','earjemp-master':'apps/ear','NoteJemp':'apps/note','StemPlayer':'apps/stemplayer','jemp-design-system':'packages/design-system'}
ignored={'.git','node_modules','dist','.DS_Store','.eslintcache'}
manifest={}
for name,target in sources.items():
 src=root.parent/name;dst=root/target
 shutil.copytree(src,dst,ignore=lambda p,n:[v for v in n if v in ignored],symlinks=True)
 hashes={}
 for f in dst.rglob('*'):
  if f.is_file() and not f.is_symlink():
   rel=f.relative_to(dst); h=hashlib.sha256();o=hashlib.sha256()
   for path,digest in [(f,h),(src/rel,o)]:
    with path.open('rb') as stream:
     for b in iter(lambda:stream.read(1024*1024),b''):digest.update(b)
   assert h.digest()==o.digest(),str(f)
   hashes[str(rel)]=h.hexdigest()
 git=src/'.git';status=subprocess.check_output(['git','-C',str(src),'status','--porcelain'],text=True) if git.exists() else None
 manifest[name]={'target':target,'status':status,'files':hashes}
 print(name,len(hashes),'files copied and verified')
(root/'migration/source-snapshot.json').write_text(json.dumps(manifest,indent=2)+'\n')
