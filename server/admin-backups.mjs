import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { restoreBackup } from './backup.mjs';
export const BACKUP_NAME = /^fleet-backup-\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9-]{36}$/;
const LIMIT = 64 * 1024 * 1024;
export function backupPath(root, name) {
  if (typeof name !== 'string' || !BACKUP_NAME.test(name)) throw new Error('Invalid backup name.');
  const target = path.join(root, name);
  if (fs.lstatSync(target).isSymbolicLink() || !fs.statSync(target).isDirectory()) throw new Error('Invalid backup directory.');
  return target;
}
export function listBackups(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter(name=>BACKUP_NAME.test(name)).flatMap(name=>{
    try {
      const dir=backupPath(root,name), manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
      if(manifest.schemaVersion!==1) return [];
      return [{backupType:'database',name,createdAt:manifest.createdAt,hasConfiguration:fs.existsSync(path.join(dir,'configuration.json')),scheduleKind:manifest.schedule?.kind || 'manual'}];
    } catch { return []; }
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export function exportBackup(root,name) {
  const dir=backupPath(root,name);
  const names=['fleet.sqlite','manifest.json',...(fs.existsSync(path.join(dir,'configuration.json'))?['configuration.json']:[]),
    ...fs.readdirSync(path.join(dir,'attachments')).map(hash=>'attachments/'+hash)];
  let total=0;
  const files=names.map(file=>{
    if(!/^(fleet.sqlite|manifest.json|configuration.json|attachments\/[a-f0-9]{64})$/.test(file)) throw new Error('Invalid backup file.');
    const target=path.join(dir,file);
    if(fs.lstatSync(target).isSymbolicLink()) throw new Error('Invalid backup file.');
    total+=fs.statSync(target).size;
    if(total>LIMIT) throw new Error('Browser downloads support backups up to 64 MB. Copy this backup directory directly on the server.');
    return {name:file,data:fs.readFileSync(target).toString('base64')};
  });
  return gzipSync(JSON.stringify({format:'fleet-backup-v1',files}));
}
export function importBackup(root,buffer) {
  const bundle=JSON.parse(gunzipSync(buffer,{maxOutputLength:96*1024*1024}).toString('utf8'));
  if(bundle.format!=='fleet-backup-v1' || !Array.isArray(bundle.files) || bundle.files.length>10000) throw new Error('Invalid backup package.');
  const name='fleet-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID(), dir=path.join(root,name);
  fs.mkdirSync(path.join(dir,'attachments'),{recursive:true,mode:0o700});
  try {
    const seen=new Set();let total=0;
    for(const file of bundle.files) {
      if(typeof file.name!=='string' || !/^(fleet.sqlite|manifest.json|configuration.json|attachments\/[a-f0-9]{64})$/.test(file.name) || seen.has(file.name) || typeof file.data!=='string') throw new Error('Invalid backup file.');
      seen.add(file.name);const data=Buffer.from(file.data,'base64');total+=data.length;
      if(total>LIMIT) throw new Error('Uploaded backups must be no larger than 64 MB uncompressed.');
      fs.writeFileSync(path.join(dir,file.name),data,{mode:0o600,flag:'wx'});
    }
    if(!seen.has('fleet.sqlite')||!seen.has('manifest.json')) throw new Error('Incomplete backup.');
    const verify=path.join(root,'.verify-'+crypto.randomUUID());
    try { restoreBackup(dir,verify); } finally { fs.rmSync(verify,{recursive:true,force:true}); }
    return name;
  } catch(error) { fs.rmSync(dir,{recursive:true,force:true}); throw error; }
}
export function prepareRestore(root,name,runtimeDirectory) {
  const source=backupPath(root,name), destination=runtimeDirectory+'-restore-'+crypto.randomUUID();
  restoreBackup(source,destination);
  if(fs.existsSync(path.join(source,'configuration.json'))) fs.copyFileSync(path.join(source,'configuration.json'),path.join(destination,'configuration.json'));
  return destination;
}
