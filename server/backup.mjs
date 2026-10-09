import { configurationDue,createConfigurationBackup,listConfigurationBackups,pruneConfigurationBackups } from './configuration-backups.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { FleetStore } from './database.mjs';

const BACKUP_NAME=/^fleet-backup-\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9-]{36}$/;

/** @param {number} now @param {string} timeZone */
export function backupDay(now,timeZone) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
}

export function scheduledBackupHistory(destination) {
  const result=[];
  if (!fs.existsSync(destination)) return result;
  for (const name of fs.readdirSync(destination)) {
    if (!BACKUP_NAME.test(name)) continue;
    try {
      const directory=path.join(destination,name);
      if (fs.lstatSync(directory).isSymbolicLink() || !fs.statSync(directory).isDirectory()) continue;
      const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
      if (manifest.schemaVersion===1 && Number.isFinite(Date.parse(manifest.createdAt)) && ['interval','daily','interval+daily'].includes(manifest.schedule?.kind)) result.push(manifest);
    } catch { /* Ignore incomplete or malformed snapshots; retry due work. */ }
  }
  return result;
}

/** @param {any[]} history @param {number} now @param {number} intervalMs @param {string} timeZone */
export function backupDue(history,now,intervalMs,timeZone) {
  const day=backupDay(now,timeZone);
  const intervals=history.filter(item=>item.schedule.kind.includes('interval')).map(item=>Date.parse(item.createdAt)).filter(created=>created<=now);
  const interval=!intervals.length || now-Math.max(...intervals)>=intervalMs;
  const daily=!history.some(item=>item.schedule.kind.includes('daily') && item.schedule.day===day && item.schedule.timeZone===timeZone);
  return {interval,daily,day};
}

/** @param {any} store @param {string} destination @param {{intervalMs?:number,retentionDays?:number,timeZone?:string,configuration?:Record<string,unknown>|(()=>Record<string,unknown>)|null,configurationDestination?:string}} options */
export function startBackups(store,destination,{intervalMs=14400000,retentionDays=30,timeZone='Asia/Riyadh',configuration=null,configurationDestination=path.join(destination,'configuration')}={}) {
  if (!Number.isFinite(intervalMs) || intervalMs<60000 || !Number.isFinite(retentionDays) || retentionDays<1) throw new Error('Invalid backup interval or retention.');
  backupDay(Date.now(),timeZone); // Validate configured time zone before starting.
  let running=null;
  const run=()=>{
    if (running) return running;
    running=(async()=>{
      try {
        const due=backupDue(scheduledBackupHistory(destination),Date.now(),intervalMs,timeZone);
        if (due.interval || due.daily) {
        const complete=await store.backup(destination);
        const manifestPath=path.join(complete,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
        manifest.schedule={kind:due.interval && due.daily ? 'interval+daily' : due.daily ? 'daily' : 'interval',day:due.day,timeZone};
        fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2),{mode:0o600});
        console.log('[Backup] Verified '+manifest.schedule.kind+' database and attachment backup:',complete);
        const cutoff=Date.now()-retentionDays*86400000;
        for (const name of fs.readdirSync(destination)) {
          if (!BACKUP_NAME.test(name)) continue;
          const target=path.resolve(destination,name),root=path.resolve(destination)+path.sep;
          if (!target.startsWith(root) || target===complete || fs.lstatSync(target).isSymbolicLink()) continue;
          if (fs.statSync(target).mtimeMs<cutoff && fs.existsSync(path.join(target,'manifest.json'))) fs.rmSync(target,{recursive:true});
        }
        }
      } catch(error) { console.error('[Backup] FAILED: an administrator must investigate:',error.message); }
      // Configuration failures are independent: data snapshots still proceed.
      if (configuration) try {
        const current=typeof configuration==='function' ? configuration() : configuration;
        const day=backupDay(Date.now(),timeZone),history=listConfigurationBackups(configurationDestination);
        const due=configurationDue(history,current,day,timeZone);
        if (due.changed || due.daily) {
          const complete=createConfigurationBackup(configurationDestination,current,{kind:due.changed && due.daily?'daily+change':due.daily?'daily':'change',day,timeZone});
          pruneConfigurationBackups(configurationDestination,retentionDays,complete);
          console.log('[Backup] Verified separate configuration backup:',complete);
        }
      } catch(error) { console.error('[Configuration Backup] FAILED: an administrator must investigate:',error.message); }
    })().finally(()=>{running=null;});
    return running;
  };
  // Wall-clock checks recover missed backups after restart. Daily time is midnight
  // in the configured zone, and overlapping schedules share one full snapshot.
  const timer=setInterval(run,60000);timer.unref();
  return {run,stop:()=>clearInterval(timer)};
}

// Restore into a NEW directory only, so an existing live database cannot be replaced.
export function restoreBackup(source,destination) {
  if (fs.existsSync(destination)) throw new Error('Restore destination must not exist. Stop the application and restore into a new directory.');
  const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));
  if (manifest.schemaVersion!==1 || !manifest.createdAt) throw new Error('Backup has no valid completion manifest.');
  const db=new DatabaseSync(path.join(source,'fleet.sqlite'),{readOnly:true});
  let hashes;
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Backup failed integrity verification.');
    hashes=db.prepare('SELECT hash FROM attachments').all().map(row=>row.hash);
    for (const digest of hashes) {
      if (!/^[a-f0-9]{64}$/.test(digest) || crypto.createHash('sha256').update(fs.readFileSync(path.join(source,'attachments',digest))).digest('hex')!==digest) throw new Error('Backup attachment is missing or damaged.');
    }
  } finally { db.close(); }
  fs.mkdirSync(destination,{recursive:true,mode:0o700});
  fs.mkdirSync(path.join(destination,'attachments'),{mode:0o700});
  fs.copyFileSync(path.join(source,'fleet.sqlite'),path.join(destination,'fleet.sqlite'));
  for (const digest of hashes) fs.copyFileSync(path.join(source,'attachments',digest),path.join(destination,'attachments',digest));
  const restored=new DatabaseSync(path.join(destination,'fleet.sqlite'));
  try { restored.prepare("DELETE FROM security_state WHERE scope='activeSessions'").run(); } finally { restored.close(); }
  console.log('Verified backup restored to',path.resolve(destination));
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [command,source,destination]=process.argv.slice(2);
  if (command==='restore' && source && destination) restoreBackup(source,destination);
  else if (command==='create' && source && destination) { const store=new FleetStore(source); try { console.log(await store.backup(destination)); } finally { store.close(); } }
  else { console.error('Usage: node server/backup.mjs create <runtime-directory> <backup-directory> | restore <backup-directory> <new-runtime-directory>'); process.exitCode=1; }
}
