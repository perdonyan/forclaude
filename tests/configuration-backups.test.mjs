import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync,gunzipSync } from 'node:zlib';
import { FleetStore } from '../server/database.mjs';
import { startBackups,backupDay } from '../server/backup.mjs';
import { listBackups,exportBackup,importBackup,prepareRestore } from '../server/admin-backups.mjs';
import { createConfigurationBackup,verifyConfiguration,listConfigurationBackups,configurationDue,exportConfigurationBackup,importConfigurationBackup,prepareConfigurationRestore,pruneConfigurationBackups } from '../server/configuration-backups.mjs';

test('database/document and configuration backups restore independently without leaking configuration into data exports',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-split-')),runtime=path.join(root,'runtime'),dataRoot=path.join(root,'data-backups'),configRoot=path.join(root,'config-backups');
  const store=new FleetStore(runtime);t.after(()=>{store.close();fs.rmSync(root,{recursive:true,force:true});});
  store.initialize(path.join(root,'missing.json'),{drones:[{id:'d',droneName:'Drone',droneSN:'SN',status:'ACTIVE',photo:'data:image/png;base64,aGVsbG8='}],batteries:[],accessories:[],streamingDevices:[],checkouts:[],handoverForms:[],incidentReports:[],confiscatedDrones:[],users:[],notifications:[],auditLogs:[],groupPrivileges:{ADMIN:{}}});
  const configuration={PORT:3000,JWT_SECRET:'private-test-secret',DATA_DIR:runtime};
  const schedule=startBackups(store,dataRoot,{configuration,configurationDestination:configRoot});
  try{await schedule.run();}finally{schedule.stop();}
  const data=listBackups(dataRoot)[0],config=listConfigurationBackups(configRoot)[0];
  assert.equal(data.hasConfiguration,false);
  const packageData=JSON.parse(gunzipSync(exportBackup(dataRoot,data.name)));
  assert.ok(!packageData.files.some(file=>file.name==='configuration.json'));
  const importedData=importBackup(dataRoot,exportBackup(dataRoot,data.name)),restoredData=prepareRestore(dataRoot,importedData,runtime);
  const restored=new FleetStore(restoredData);try{assert.equal(restored.load().drones[0].droneName,'Drone');assert.equal(fs.readdirSync(path.join(restoredData,'attachments')).length,1);}finally{restored.close();}
  assert.ok(!fs.existsSync(path.join(restoredData,'configuration.json')));
  const encoded=exportConfigurationBackup(configRoot,config.name),packageConfig=JSON.parse(gunzipSync(encoded));
  assert.deepEqual(packageConfig.files.map(file=>file.name).sort(),['configuration.json','manifest.json']);
  const importedConfig=importConfigurationBackup(configRoot,encoded),staged=prepareConfigurationRestore(configRoot,importedConfig,runtime);
  assert.equal(JSON.parse(fs.readFileSync(path.join(staged,'configuration.json'),'utf8')).JWT_SECRET,configuration.JWT_SECRET);
  assert.ok(!fs.existsSync(path.join(staged,'fleet.sqlite')));
  assert.ok(fs.existsSync(path.join(runtime,'fleet.sqlite')));
  const corrupt=structuredClone(packageConfig);corrupt.files.find(file=>file.name==='configuration.json').data=Buffer.from('{"PORT":1234}').toString('base64');
  assert.throws(()=>importConfigurationBackup(configRoot,gzipSync(JSON.stringify(corrupt))),/verification/);
  const traversal=structuredClone(packageConfig);traversal.files[0].name='../escape';
  assert.throws(()=>importConfigurationBackup(configRoot,gzipSync(JSON.stringify(traversal))),/Invalid/);
  assert.throws(()=>prepareConfigurationRestore(configRoot,'../runtime',runtime),/Invalid/);
});

test('unchanged configuration does not duplicate on restart and a change triggers its own snapshot',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-config-schedule-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  let count=0,configuration={PORT:3000};
  const fake={async backup(destination){count++;const directory=path.join(destination,'fleet-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID());fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({schemaVersion:1,createdAt:new Date().toISOString()}));return directory;}};
  let schedule=startBackups(fake,root,{configuration:()=>configuration});await schedule.run();schedule.stop();
  assert.equal(listConfigurationBackups(path.join(root,'configuration')).length,1);
  schedule=startBackups(fake,root,{configuration:()=>configuration});
  try {
    await schedule.run();assert.equal(count,1);assert.equal(listConfigurationBackups(path.join(root,'configuration')).length,1);
    configuration={PORT:3001};await schedule.run();assert.equal(count,1);
    assert.equal(listConfigurationBackups(path.join(root,'configuration')).length,2);
    await schedule.run();assert.equal(listConfigurationBackups(path.join(root,'configuration')).length,2);
  }finally{schedule.stop();}
  const history=listConfigurationBackups(path.join(root,'configuration'));
  assert.equal(configurationDue(history,configuration,'2099-01-01','Asia/Riyadh').daily,true);
  assert.equal(configurationDue(history,configuration,backupDay(Date.now(),'Asia/Riyadh'),'Asia/Riyadh').daily,false);
});

test('configuration backup succeeds even if database backup fails; retention preserves invalid and current copies',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-config-failure-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const schedule=startBackups({async backup(){throw new Error('simulated disk failure');}},root,{configuration:{PORT:3000}});
  try{await schedule.run();}finally{schedule.stop();}
  const configRoot=path.join(root,'configuration'),current=listConfigurationBackups(configRoot)[0];
  assert.ok(current);
  const old=createConfigurationBackup(configRoot,{PORT:2000});
  const manifest=verifyConfiguration(old).manifest;manifest.createdAt='2000-01-01T00:00:00Z';
  fs.writeFileSync(path.join(old,'manifest.json'),JSON.stringify(manifest));
  const incomplete=path.join(configRoot,'configuration-backup-2000-01-01T00-00-00-000Z-'+crypto.randomUUID());fs.mkdirSync(incomplete);
  pruneConfigurationBackups(configRoot,30,path.join(configRoot,current.name));
  assert.ok(!fs.existsSync(old));assert.ok(fs.existsSync(incomplete));assert.ok(fs.existsSync(path.join(configRoot,current.name)));
});
