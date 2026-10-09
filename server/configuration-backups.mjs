import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync,gunzipSync } from 'node:zlib';

export const CONFIGURATION_NAME=/^configuration-backup-\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9-]{36}$/;
const LIMIT=1024*1024;
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const configurationBytes=configuration=>{
  if (!configuration || typeof configuration!=='object' || Array.isArray(configuration)) throw new Error('Invalid configuration.');
  const data=Buffer.from(JSON.stringify(configuration,null,2));
  if (data.length>LIMIT) throw new Error('Configuration backup exceeds 1 MB.');
  return data;
};
export function configurationPath(root,name) {
  if (typeof name!=='string' || !CONFIGURATION_NAME.test(name)) throw new Error('Invalid configuration backup name.');
  const directory=path.join(root,name);
  if (fs.lstatSync(directory).isSymbolicLink() || !fs.statSync(directory).isDirectory()) throw new Error('Invalid configuration backup directory.');
  return directory;
}
export function verifyConfiguration(directory) {
  for (const name of ['manifest.json','configuration.json']) {
    const file=path.join(directory,name);
    if (fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile() || fs.statSync(file).size>LIMIT) throw new Error('Invalid configuration backup file.');
  }
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
  const data=fs.readFileSync(path.join(directory,'configuration.json'));
  if (manifest.schemaVersion!==1 || manifest.backupType!=='configuration' || !Number.isFinite(Date.parse(manifest.createdAt)) || manifest.sha256!==digest(data)) throw new Error('Configuration backup verification failed.');
  const configuration=JSON.parse(data.toString('utf8'));configurationBytes(configuration);
  return {manifest,configuration};
}
export function listConfigurationBackups(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter(name=>CONFIGURATION_NAME.test(name)).flatMap(name=>{
    try { const {manifest}=verifyConfiguration(configurationPath(root,name));return [{name,createdAt:manifest.createdAt,backupType:'configuration',scheduleKind:manifest.schedule?.kind || 'manual',sha256:manifest.sha256,schedule:manifest.schedule,completedAt:fs.statSync(path.join(root,name,'manifest.json')).mtimeMs}]; }
    catch {return [];}
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.completedAt-a.completedAt);
}
export function configurationDue(history,configuration,day,timeZone) {
  const changed=history[0]?.sha256!==digest(configurationBytes(configuration));
  const daily=!history.some(item=>item.schedule?.kind?.includes('daily') && item.schedule.day===day && item.schedule.timeZone===timeZone);
  return {changed,daily};
}
export function createConfigurationBackup(root,configuration,schedule={kind:'manual'}) {
  const data=configurationBytes(configuration),name='configuration-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID(),directory=path.join(root,name);
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  try {
    fs.writeFileSync(path.join(directory,'configuration.json'),data,{mode:0o600,flag:'wx'});
    const manifest={schemaVersion:1,backupType:'configuration',createdAt:new Date().toISOString(),sha256:digest(data),schedule};
    fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});
    verifyConfiguration(directory);
    return directory;
  } catch(error) {fs.rmSync(directory,{recursive:true,force:true});throw error;}
}
export function pruneConfigurationBackups(root,retentionDays,keep) {
  const cutoff=Date.now()-retentionDays*86400000;
  for (const item of listConfigurationBackups(root)) {
    const directory=configurationPath(root,item.name);
    if (directory!==keep && Date.parse(item.createdAt)<cutoff) fs.rmSync(directory,{recursive:true});
  }
}
export function exportConfigurationBackup(root,name) {
  const directory=configurationPath(root,name);verifyConfiguration(directory);
  const files=['configuration.json','manifest.json'].map(name=>({name,data:fs.readFileSync(path.join(directory,name)).toString('base64')}));
  return gzipSync(JSON.stringify({format:'fleet-configuration-v1',files}));
}
export function importConfigurationBackup(root,buffer) {
  const bundle=JSON.parse(gunzipSync(buffer,{maxOutputLength:3*LIMIT}).toString('utf8'));
  if (bundle.format!=='fleet-configuration-v1' || !Array.isArray(bundle.files) || bundle.files.length!==2) throw new Error('Invalid configuration backup package.');
  const name='configuration-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID(),directory=path.join(root,name);
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  try {
    const seen=new Set();
    for (const file of bundle.files) {
      if (!['configuration.json','manifest.json'].includes(file.name) || seen.has(file.name) || typeof file.data!=='string') throw new Error('Invalid configuration backup file.');
      seen.add(file.name);const data=Buffer.from(file.data,'base64');
      if (data.length>LIMIT) throw new Error('Configuration backup exceeds 1 MB.');
      fs.writeFileSync(path.join(directory,file.name),data,{mode:0o600,flag:'wx'});
    }
    verifyConfiguration(directory);return name;
  } catch(error) {fs.rmSync(directory,{recursive:true,force:true});throw error;}
}
export function prepareConfigurationRestore(root,name,runtimeDirectory) {
  const source=configurationPath(root,name);verifyConfiguration(source);
  const directory=runtimeDirectory+'-configuration-restore-'+crypto.randomUUID();
  fs.mkdirSync(directory,{mode:0o700});
  for (const file of ['configuration.json','manifest.json']) fs.copyFileSync(path.join(source,file),path.join(directory,file));
  return directory;
}
