import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { FleetStore } from '../server/database.mjs';
import { listBackups, exportBackup, importBackup, prepareRestore, backupPath } from '../server/admin-backups.mjs';
test('download/upload restore round-trip preserves settings and records without replacing live data',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'admin-backup-'));
  const runtime=path.join(root,'runtime'), backups=path.join(root,'backups');
  const store=new FleetStore(runtime);t.after(()=>{store.close();fs.rmSync(root,{recursive:true,force:true});});
  store.initialize(path.join(root,'missing.json'),{drones:[],batteries:[],accessories:[],streamingDevices:[],checkouts:[],handoverForms:[],incidentReports:[],confiscatedDrones:[],users:[],notifications:[],auditLogs:[],groupPrivileges:{ADMIN:{INVENTORY_ADD_DRONE:true}}});
  const directory=await store.backup(backups), name=path.basename(directory);
  fs.writeFileSync(path.join(directory,'configuration.json'),JSON.stringify({PORT:3000,JWT_SECRET:'private-test-secret'}));
  assert.equal(listBackups(backups)[0].hasConfiguration,true);
  const bundle=exportBackup(backups,name), imported=importBackup(backups,bundle);
  const destination=prepareRestore(backups,imported,runtime);
  const restored=new FleetStore(destination);
  try{assert.deepEqual(restored.load().groupPrivileges,store.load().groupPrivileges);}finally{restored.close();}
  assert.equal(JSON.parse(fs.readFileSync(path.join(destination,'configuration.json'),'utf8')).PORT,3000);
  assert.ok(fs.existsSync(path.join(runtime,'fleet.sqlite')));
  assert.throws(()=>backupPath(backups,'../runtime'),/Invalid/);
  const corrupted=JSON.parse(gunzipSync(bundle));corrupted.files.push({name:'../../escape',data:'eA=='});
  assert.throws(()=>importBackup(backups,gzipSync(JSON.stringify(corrupted))),/Invalid backup file/);
  const damaged=JSON.parse(gunzipSync(bundle));damaged.files.find(file=>file.name==='fleet.sqlite').data='eA==';
  assert.throws(()=>importBackup(backups,gzipSync(JSON.stringify(damaged))));
  assert.equal(listBackups(backups).length,2);
});
