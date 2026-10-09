import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { backupDay,backupDue,startBackups,scheduledBackupHistory } from '../server/backup.mjs';

const interval=4*60*60*1000,zone='Asia/Riyadh';
const marker=(createdAt,kind,day=backupDay(Date.parse(createdAt),zone))=>({schemaVersion:1,createdAt,schedule:{kind,day,timeZone:zone}});
test('four-hour backup and Qatar midnight daily backup are independent and can coincide',()=>{
  const before=Date.parse('2026-10-09T20:59:00Z'),after=Date.parse('2026-10-09T21:00:00Z');
  assert.equal(backupDay(before,zone),'2026-10-09');assert.equal(backupDay(after,zone),'2026-10-10');
  const history=[marker('2026-10-09T19:00:00Z','interval+daily')];
  assert.deepEqual(backupDue(history,before,interval,zone),{interval:false,daily:false,day:'2026-10-09'});
  assert.deepEqual(backupDue(history,after,interval,zone),{interval:false,daily:true,day:'2026-10-10'});
  history.push(marker('2026-10-09T21:00:00Z','daily'));
  assert.deepEqual(backupDue(history,Date.parse('2026-10-09T23:00:00Z'),interval,zone),{interval:true,daily:false,day:'2026-10-10'});
  assert.deepEqual(backupDue([marker('2026-10-09T17:00:00Z','interval+daily')],after,interval,zone),{interval:true,daily:true,day:'2026-10-10'});
});

test('schedule survives restart, avoids duplicate snapshots and ignores manual/incomplete copies',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-schedule-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  let calls=0;
  const fakeStore={async backup(destination){
    calls++;const directory=path.join(destination,'fleet-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID());
    fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({schemaVersion:1,createdAt:new Date().toISOString()}));
    return directory;
  }};
  await fakeStore.backup(root); // manual snapshots do not fulfill automatic schedules
  const backup=startBackups(fakeStore,root,{configuration:{PORT:3000}});
  await Promise.all([backup.run(),backup.run()]);
  assert.equal(calls,2);
  const history=scheduledBackupHistory(root);assert.equal(history.length,1);assert.equal(history[0].schedule.kind,'interval+daily');
  backup.stop();
  const restarted=startBackups(fakeStore,root);try{await restarted.run();assert.equal(calls,2);}finally{restarted.stop();}
  const incomplete=path.join(root,'fleet-backup-2026-10-09T00-00-00-000Z-'+crypto.randomUUID());fs.mkdirSync(incomplete);
  assert.equal(scheduledBackupHistory(root).length,1);
});

test('failed backups do not advance schedule and the next check retries',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-schedule-fail-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  let calls=0;const store={async backup(){calls++;throw new Error('simulated disk failure');}};
  const backup=startBackups(store,root);try{await backup.run();await backup.run();assert.equal(calls,2);assert.deepEqual(scheduledBackupHistory(root),[]);}finally{backup.stop();}
  assert.throws(()=>startBackups(store,root,{timeZone:'Invalid/Zone'}));
});
