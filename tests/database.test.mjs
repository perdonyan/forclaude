import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FleetStore, PersistentMap } from '../server/database.mjs';
import { restoreBackup } from '../server/backup.mjs';
import { authorizeOperation, projectState, authenticateToken } from '../server/access.mjs';

export function fixture() {
  return {drones:[{id:'d1',droneName:'Drone 1',droneSN:'SN1',status:'ACTIVE'},{id:'d2',droneName:'Drone 2',droneSN:'SN2',status:'ACTIVE'}],batteries:[],accessories:[],streamingDevices:[],checkouts:[],handoverForms:[],incidentReports:[],confiscatedDrones:[],notifications:[],auditLogs:[],users:[{id:'admin',employeeId:'1001',qatarId:'ID1',name:'Admin',userRole:'ADMIN',passwordHash:'existing-hash',accountStatus:'ACTIVE',lastPasswordChange:'2026-01-01T00:00:00Z'},{id:'officer',employeeId:'1002',qatarId:'ID2',name:'Officer',userRole:'OFFICER',passwordHash:'officer-hash',accountStatus:'ACTIVE'},{id:'user',employeeId:'1003',qatarId:'ID3',name:'Technician',userRole:'USER',accountStatus:'ACTIVE'}],groupPrivileges:{ADMIN:{},OFFICER:{VIEW_TAB_INVENTORY:true,VIEW_TAB_IN_OUT_FORM:true,VIEW_TAB_NOTIFICATIONS:true,INVENTORY_EDIT_DETAILS:true,INVENTORY_ADD_DRONE:true,INVENTORY_DELETE_DRONE:true,INVENTORY_BATCH_UPLOAD:true},USER:{VIEW_TAB_INVENTORY:true,VIEW_TAB_INCIDENT_REPORT:true,INCIDENT_CREATE_REPORT:true,VIEW_TAB_NOTIFICATIONS:true}}};
}
function setup(t,state=fixture()) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-test-'));
  let store=new FleetStore(path.join(root,'runtime'));
  store.initialize(path.join(root,'missing.json'),state);
  t.after(()=>{store?.close();fs.rmSync(root,{recursive:true,force:true});});
  return {root,get store(){return store;},restart(){store.close();store=new FleetStore(path.join(root,'runtime'));return store;}};
}
const actor={id:'admin',employeeId:'1001',name:'Admin',userRole:'ADMIN'};
const apply=(store,operations,user=actor)=>store.apply(operations,user,(op,previous,state,all)=>authorizeOperation(user,op,previous,state,all));
const update=(store,id,notes,version=store.versions().drones[id])=>({entity:'drones',id,version,record:{...store.load().drones.find(d=>d.id===id),notes}});

test('one-time migration preserves empty collections, credentials and restart state',t=>{
  const env=setup(t); apply(env.store,[update(env.store,'d1','saved')]);
  const reopened=env.restart();
  const state=reopened.initialize('does-not-exist',fixture());
  assert.equal(state.users[1].passwordHash,'officer-hash');
  assert.equal(state.drones.find(d=>d.id==='d1').notes,'saved');
  assert.deepEqual(state.incidentReports,[]); assert.deepEqual(state.confiscatedDrones,[]);
});
test('independent workstation edits survive and same-record stale edits fail',t=>{
  const {store}=setup(t); const a=update(store,'d1','A',1), b=update(store,'d2','B',1), stale=update(store,'d1','stale',1);
  apply(store,[a]); apply(store,[b]);
  assert.throws(()=>apply(store,[stale]),error=>error.code==='STALE_RECORD');
  assert.deepEqual(store.load().drones.map(d=>d.notes),['A','B']);
});
test('a conflicting multi-entity transaction rolls back all records and its audit event',t=>{
  const {store}=setup(t); apply(store,[update(store,'d1','first')]);
  const auditCount=store.load().auditLogs.length;
  const handover={id:'h1',srNumber:'H1',status:'DRAFT',equipment:[],accessories:[]};
  assert.throws(()=>apply(store,[{entity:'handoverForms',id:'h1',version:0,record:handover},update(store,'d1','stale',1)]));
  assert.equal(store.load().handoverForms.length,0);assert.equal(store.load().auditLogs.length,auditCount);
});
test('uniqueness, record schema and relationship constraints reject invalid writes',t=>{
  const {store}=setup(t);
  assert.throws(()=>apply(store,[{entity:'drones',id:'d3',version:0,record:{id:'d3',droneName:'Duplicate',droneSN:'SN1',status:'ACTIVE'}}]),e=>e.code==='DUPLICATE_RECORD');
  assert.throws(()=>apply(store,[{entity:'drones',id:'d1',version:1,record:{id:'d1'}}]));
  assert.throws(()=>apply(store,[{entity:'checkouts',id:'c1',version:0,record:{id:'c1',droneId:'unknown',status:'CHECKED_OUT'}}]));
  assert.throws(()=>apply(store,[{entity:'users',id:'admin',version:1,record:null}]));
  assert.equal(store.load().auditLogs.length,0);
});
test('permissions and designated-officer approval are enforced by the server',t=>{
  const state=fixture(); const notice={id:'n1',type:'CHANGE_APPROVAL_REQUEST',status:'PENDING',senderId:'user',targetOfficerId:'officer',changeDetails:{itemId:'d1',proposedData:{status:'ACTIVE'}}};state.notifications=[notice];
  const {store}=setup(t,state);
  assert.throws(()=>apply(store,[update(store,'d1','unauthorized')],state.users[2]),e=>e.status===403);
  assert.throws(()=>apply(store,[update(store,'d1','without review')],state.users[1]),e=>e.status===403);
  const review={entity:'notifications',id:'n1',version:1,record:{...notice,status:'APPROVED'}};
  assert.throws(()=>apply(store,[review],actor),e=>e.status===403);
  apply(store,[update(store,'d1','approved'),review],state.users[1]);
  assert.equal(store.load().notifications[0].status,'APPROVED');
});
test('non-admin state excludes audit events, password hashes and unowned notifications',t=>{
  const state=fixture(); state.auditLogs=[{id:'a',action:'LOGIN',timestamp:new Date().toISOString()}];state.notifications=[{id:'n',type:'SYSTEM_MESSAGE',status:'READ',senderId:'admin',targetOfficerId:'officer'}];
  const {store}=setup(t,state);const projected=projectState(state.users[2],store.load(),store.versions());
  assert.deepEqual(projected.auditLogs,[]);assert.deepEqual(projected.users,[]);assert.deepEqual(projected.notifications,[]);assert.equal(projected.recordVersions.auditLogs,undefined);
});
test('revocation and sessions survive restart, and missing/expired sessions fail authentication',t=>{
  const env=setup(t); const sessions=new PersistentMap(env.store,'sessions'),revoked=new PersistentMap(env.store,'revoked');
  const now=new Date().toISOString();sessions.set('s1',{userId:'admin',loginTime:now,lastActiveTime:now});revoked.set('old',true);
  env.restart();const persisted=new PersistentMap(env.store,'sessions'),blocked=new PersistentMap(env.store,'revoked');
  const verify=()=>({sessionId:'s1',userId:'admin',employeeId:'1001'});
  assert.equal(authenticateToken('valid',verify,env.store.load(),persisted,t=>blocked.has(t)).id,'admin');
  assert.throws(()=>authenticateToken('old',verify,env.store.load(),persisted,t=>blocked.has(t)));
  persisted.delete('s1');assert.throws(()=>authenticateToken('valid',verify,env.store.load(),persisted,()=>false));
});
test('audit history exceeds 500 events and existing audit records cannot be replaced',t=>{
  const state=fixture();state.auditLogs=Array.from({length:510},(_,i)=>({id:`a${i}`,timestamp:new Date().toISOString(),action:'TEST'}));
  const {store}=setup(t,state);apply(store,[update(store,'d1','audit')]);assert.equal(store.load().auditLogs.length,511);
  const tampered=store.load();tampered.auditLogs[0].action='CHANGED';assert.throws(()=>store.save(tampered));
});
test('legacy duplicate identity records are preserved but suspended for correction',t=>{
  const state=fixture();state.users[2].qatarId='ID2';const {store}=setup(t,state);
  for(const user of store.load().users.slice(1)){assert.equal(user.identityConflict,true);assert.equal(user.accountStatus,'SUSPENDED');}
  assert.equal(store.load().users.length,3);
});
test('malformed legacy data stops migration and leaves the source unchanged',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-bad-'));const file=path.join(root,'legacy.json');fs.writeFileSync(file,'invalid JSON');
  const store=new FleetStore(path.join(root,'runtime'));t.after(()=>{store.close();fs.rmSync(root,{recursive:true,force:true});});
  assert.throws(()=>store.initialize(file,fixture()));assert.equal(fs.readFileSync(file,'utf8'),'invalid JSON');assert.equal(store.db.prepare("SELECT value FROM settings WHERE key='initialized'").get(),undefined);
});
test('backup restores data and attachment bytes into a new directory and rejects damaged files',async t=>{
  const state=fixture();state.incidentReports=[{id:'i1',srReference:'I1',status:'DRAFT',droneId:'d1',photos:[{dataUrl:'data:image/png;base64,aGVsbG8='}]}];
  const {root,store}=setup(t,state);const url=store.load().incidentReports[0].photos[0].dataUrl;assert.match(url,/^\/api\/attachments\//);
  const destination=await store.backup(path.join(root,'backups')),restored=path.join(root,'restored');
  restoreBackup(destination,restored);const reopened=new FleetStore(restored);try{assert.equal(reopened.load().incidentReports[0].photos[0].dataUrl,url);}finally{reopened.close();}
  assert.throws(()=>restoreBackup(destination,restored));
  fs.writeFileSync(path.join(destination,'attachments',url.split('/').pop()),'damaged');assert.throws(()=>restoreBackup(destination,path.join(root,'damaged')));
});

test('CRASHED is permanent for every inventory type and role, and remains locked after restart',t=>{
  const state=fixture();
  state.drones[0].status='CRASHED';
  state.batteries=[{id:'b1',serialNumber:'B1',status:'CRASHED'}];
  state.accessories=[{id:'a1',name:'Accessory',status:'CRASHED'}];
  state.streamingDevices=[{id:'s1',deviceName:'Streamer',serialNumber:'S1',status:'CRASHED'}];
  for(const role of ['OFFICER','USER']) state.groupPrivileges[role]={VIEW_TAB_INVENTORY:true,INVENTORY_EDIT_DETAILS:true};
  const env=setup(t,state);
  for(const user of state.users) for(const entity of ['drones','batteries','accessories','streamingDevices']) {
    const record=env.store.load()[entity][0];
    const count=env.store.load().auditLogs.length;
    assert.throws(()=>apply(env.store,[{entity,id:record.id,version:env.store.versions()[entity][record.id],record:{...record,status:'ACTIVE'}}],user),error=>error.code==='PERMANENT_CRASHED_STATUS');
    assert.equal(env.store.load()[entity][0].status,'CRASHED');
    assert.equal(env.store.load().auditLogs.length,count);
  }
  const drone=env.store.load().drones[0];
  apply(env.store,[{entity:'drones',id:drone.id,version:env.store.versions().drones[drone.id],record:{...drone,notes:'Details remain editable'}}]);
  assert.equal(env.store.load().drones[0].notes,'Details remain editable');
  // Automatic and legacy server persistence must obey the same rule.
  assert.throws(()=>env.store.writeRecord('drones',{...drone,status:'MISSING'}),error=>error.code==='PERMANENT_CRASHED_STATUS');
  const active=env.store.load().drones[1];
  apply(env.store,[{entity:'drones',id:active.id,version:env.store.versions().drones[active.id],record:{...active,status:'CRASHED'}}]);
  env.restart();
  const auditCount=env.store.load().auditLogs.length;
  assert.throws(()=>apply(env.store,[{entity:'drones',id:drone.id,version:env.store.versions().drones[drone.id],record:{...drone,status:'UNDER REPAIR'}}]),error=>error.code==='PERMANENT_CRASHED_STATUS');
  assert.equal(env.store.load().auditLogs.length,auditCount);
  assert.equal(env.store.load().drones[1].status,'CRASHED');
});
test('attempting to clear CRASHED rolls back related approval and record changes',t=>{
  const state=fixture();state.drones[0].status='CRASHED';
  state.notifications=[{id:'crash-review',type:'CHANGE_APPROVAL_REQUEST',status:'PENDING',senderId:'user',targetOfficerId:'officer',changeDetails:{itemId:'d1',proposedData:{status:'ACTIVE'}}}];
  const {store}=setup(t,state),notice=state.notifications[0];
  assert.throws(()=>apply(store,[
    {entity:'notifications',id:notice.id,version:1,record:{...notice,status:'APPROVED'}},
    {entity:'drones',id:'d1',version:1,record:{...state.drones[0],status:'ACTIVE'}}
  ],state.users[1]),error=>error.code==='PERMANENT_CRASHED_STATUS');
  assert.equal(store.load().notifications[0].status,'PENDING');
  assert.equal(store.load().drones[0].status,'CRASHED');
});

test('custom group permissions persist and replace base-role grants without granting administrator powers',async t=>{
  const {store,root,restart}=setup(t),state=store.load();
  state.userGroups=[{id:'flight-team',name:'Flight Team',baseRole:'OFFICER'}];
  state.groupPrivileges['GROUP:flight-team']={VIEW_TAB_INVENTORY:true,INVENTORY_EDIT_DETAILS:false};
  state.users[1].groupId='flight-team';
  store.save(state);
  assert.equal(store.load().userGroups[0].name,'Flight Team');
  const member=store.load().users[1];
  assert.throws(()=>apply(store,[update(store,'d1','blocked')],member),error=>error.status===403);
  const granted=store.load();granted.groupPrivileges['GROUP:flight-team'].INVENTORY_EDIT_DETAILS=true;store.save(granted);
  apply(store,[update(store,'d1','permitted')],member);
  assert.equal(store.load().drones[0].notes,'permitted');
  assert.throws(()=>store.writeRecord('users',{...member,groupId:'unknown'}));
  assert.throws(()=>store.writeRecord('users',{...member,userRole:'ADMIN'}));
  const projected=projectState(member,store.load(),store.versions());
  assert.ok(projected.groupPrivileges['GROUP:flight-team']);
  assert.equal(projected.groupPrivileges.ADMIN,undefined);
  assert.deepEqual(projected.auditLogs,[]);
  const backup=await store.backup(path.join(root,'custom-backups')),destination=path.join(root,'custom-restored');
  restoreBackup(backup,destination);
  const restored=new FleetStore(destination);
  try{assert.equal(restored.load().users[1].groupId,'flight-team');assert.equal(restored.load().groupPrivileges['GROUP:flight-team'].INVENTORY_EDIT_DETAILS,true);}finally{restored.close();}
  assert.equal(restart().load().userGroups[0].name,'Flight Team');
});


test('groups own independent permissions across restart and backup',async t=>{
  const env=setup(t),state=env.store.load();
  state.userGroups=[{id:'a',name:'Team A',baseRole:'OFFICER'},{id:'b',name:'Team B',baseRole:'OFFICER'}];
  state.groupPrivileges['GROUP:a']={VIEW_TAB_INVENTORY:true,INVENTORY_EDIT_DETAILS:true};
  state.groupPrivileges['GROUP:b']={VIEW_TAB_INVENTORY:true,INVENTORY_EDIT_DETAILS:true};
  state.users[1].groupId='a';env.store.save(state);
  let next=env.store.load();next.groupPrivileges['GROUP:a'].INVENTORY_EDIT_DETAILS=false;env.store.save(next);
  next=env.restart().load();
  assert.equal(next.groupPrivileges['GROUP:a'].INVENTORY_EDIT_DETAILS,false);
  assert.equal(next.groupPrivileges['GROUP:b'].INVENTORY_EDIT_DETAILS,true);
  assert.equal(next.permissionRoles,undefined);
  assert.throws(()=>apply(env.store,[update(env.store,'d1','blocked')],next.users[1]),error=>error.status===403);
  const backup=await env.store.backup(path.join(env.root,'direct-backups')),destination=path.join(env.root,'direct-restored');
  restoreBackup(backup,destination);const restored=new FleetStore(destination);
  try{assert.equal(restored.load().groupPrivileges['GROUP:a'].INVENTORY_EDIT_DETAILS,false);assert.equal(restored.load().userGroups[0].roleId,undefined);}finally{restored.close();}
});
test('role migration copies effective grants to each group without changing membership',async t=>{
  const env=setup(t),state=env.store.load();
  state.userGroups=[{id:'a',name:'Team A',baseRole:'OFFICER'},{id:'b',name:'Team B',baseRole:'OFFICER'},{id:'c',name:'Team C',baseRole:'USER'},{id:'d',name:'Team D',baseRole:'USER'}];
  state.groupPrivileges['GROUP:a']={VIEW_TAB_INVENTORY:false};
  state.groupPrivileges['GROUP:d']={VIEW_TAB_USERS:true,INVENTORY_EDIT_DETAILS:false};
  state.users[1].groupId='a';env.store.save(state);
  env.store.db.exec(`ALTER TABLE user_groups ADD COLUMN role_id TEXT;
    CREATE TABLE permission_roles(id TEXT PRIMARY KEY,name TEXT NOT NULL,base_role TEXT NOT NULL);
    CREATE TABLE custom_role_permissions(role_id TEXT NOT NULL REFERENCES permission_roles(id),privilege TEXT NOT NULL,allowed INTEGER NOT NULL,PRIMARY KEY(role_id,privilege));
    INSERT INTO permission_roles VALUES('shared','Shared Role','OFFICER');
    INSERT INTO custom_role_permissions VALUES('shared','VIEW_TAB_INVENTORY',1),('shared','INVENTORY_EDIT_DETAILS',0);
    UPDATE user_groups SET role_id='ROLE:shared' WHERE id IN ('a','b');
    UPDATE user_groups SET role_id='USER' WHERE id='c';
    DELETE FROM schema_migrations WHERE version IN (4,6);`);
  const expectedBuiltin={...env.store.load().groupPrivileges.USER};
  const oldBackup=await env.store.backup(path.join(env.root,'before-direct-permissions'));
  const restoredPath=path.join(env.root,'restored-old-roles');
  restoreBackup(oldBackup,restoredPath);
  const restored=new FleetStore(restoredPath);
  try {
    assert.deepEqual(restored.load().groupPrivileges['GROUP:a'],{VIEW_TAB_INVENTORY:true,INVENTORY_EDIT_DETAILS:false,APPROVE_REQUESTS:true});
    assert.equal(restored.load().users[1].groupId,'a');
    assert.equal(restored.load().permissionRoles,undefined);
  } finally {restored.close();}
  const migrated=env.restart().load();
  assert.equal(migrated.users[1].groupId,'a');
  assert.deepEqual(migrated.groupPrivileges['GROUP:a'],{VIEW_TAB_INVENTORY:true,INVENTORY_EDIT_DETAILS:false,APPROVE_REQUESTS:true});
  assert.deepEqual(migrated.groupPrivileges['GROUP:b'],migrated.groupPrivileges['GROUP:a']);
  assert.deepEqual(migrated.groupPrivileges['GROUP:c'],expectedBuiltin);
  assert.deepEqual(migrated.groupPrivileges['GROUP:d'],{VIEW_TAB_USERS:true,INVENTORY_EDIT_DETAILS:false,APPROVE_REQUESTS:false});
  assert.equal(migrated.permissionRoles,undefined);
  assert.ok(!env.store.db.prepare('PRAGMA table_info(user_groups)').all().some(column=>column.name==='role_id'));
  assert.equal(env.store.db.prepare("SELECT name FROM sqlite_master WHERE name='permission_roles'").get(),undefined);
  const next=env.store.load();next.groupPrivileges['GROUP:a'].INVENTORY_EDIT_DETAILS=true;env.store.save(next);
  assert.equal(env.restart().load().groupPrivileges['GROUP:b'].INVENTORY_EDIT_DETAILS,false);
});
test('group deletion is durable and rejects dangling memberships atomically',t=>{
  const env=setup(t),state=env.store.load();
  state.userGroups=[{id:'delete-group',name:'Delete Group',baseRole:'OFFICER'}];
  state.groupPrivileges['GROUP:delete-group']={VIEW_TAB_INVENTORY:true};
  state.users[1].groupId='delete-group';env.store.save(state);
  let next=env.store.load();next.userGroups=[];
  assert.throws(()=>env.store.save(next));assert.equal(env.store.load().userGroups.length,1);
  next=env.store.load();delete next.users[1].groupId;next.userGroups=[];
  delete next.groupPrivileges['GROUP:delete-group'];env.store.save(next);
  assert.deepEqual(env.restart().load().userGroups,[]);
});

test('inventory deletion permissions are independent for every asset type and survive restart',async t=>{
  const keys={drones:'INVENTORY_DELETE_DRONE',streamingDevices:'INVENTORY_DELETE_STREAMING_DEVICE',accessories:'INVENTORY_DELETE_ACCESSORY',batteries:'INVENTORY_DELETE_BATTERY'};
  for (const [permitted,key] of Object.entries(keys)) await t.test(permitted,()=>{
    const state=fixture();
    state.streamingDevices=[{id:'s1',deviceName:'Streamer',serialNumber:'S1',status:'OFFLINE'}];
    state.accessories=[{id:'a1',name:'Accessory',status:'AVAILABLE'}];
    state.batteries=[{id:'b1',serialNumber:'B1',status:'READY'}];
    state.userGroups=[{id:'delete-team',name:'Delete Team',baseRole:'OFFICER'}];
    state.users[1].groupId='delete-team';
    state.groupPrivileges['GROUP:delete-team']={VIEW_TAB_INVENTORY:true,...Object.fromEntries(Object.values(keys).map(k=>[k,k===key]))};
    const env=setup(t,state),member=env.store.load().users[1];
    for(const entity of Object.keys(keys)){
      const record=env.store.load()[entity][0],op={entity,id:record.id,version:env.store.versions()[entity][record.id],record:null};
      if(entity!==permitted)assert.throws(()=>apply(env.store,[op],member),error=>error.status===403);
      else apply(env.store,[op],member);
    }
    const restarted=env.restart().load();
    assert.equal(restarted.groupPrivileges['GROUP:delete-team'][key],true);
    for(const other of Object.values(keys).filter(k=>k!==key))assert.equal(restarted.groupPrivileges['GROUP:delete-team'][other],false);
  });
});
test('asset delete migration preserves legacy access and explicit independent overrides',t=>{
  const env=setup(t),state=env.store.load();
  state.userGroups=[{id:'allowed',name:'Allowed',baseRole:'OFFICER'},{id:'denied',name:'Denied',baseRole:'USER'}];
  state.groupPrivileges['GROUP:allowed']={INVENTORY_DELETE_DRONE:true};
  state.groupPrivileges['GROUP:denied']={INVENTORY_DELETE_DRONE:false};
  env.store.save(state);
  env.store.db.exec(`DELETE FROM schema_migrations WHERE version=5;
    DELETE FROM role_permissions WHERE privilege IN ('INVENTORY_DELETE_STREAMING_DEVICE','INVENTORY_DELETE_ACCESSORY','INVENTORY_DELETE_BATTERY');
    DELETE FROM group_permissions WHERE privilege IN ('INVENTORY_DELETE_STREAMING_DEVICE','INVENTORY_DELETE_ACCESSORY','INVENTORY_DELETE_BATTERY');
    INSERT INTO group_permissions VALUES('allowed','INVENTORY_DELETE_BATTERY',0);`);
  const loaded=env.restart().load();
  assert.equal(loaded.groupPrivileges['GROUP:allowed'].INVENTORY_DELETE_STREAMING_DEVICE,true);
  assert.equal(loaded.groupPrivileges['GROUP:allowed'].INVENTORY_DELETE_ACCESSORY,true);
  assert.equal(loaded.groupPrivileges['GROUP:allowed'].INVENTORY_DELETE_BATTERY,false);
  for(const key of ['INVENTORY_DELETE_STREAMING_DEVICE','INVENTORY_DELETE_ACCESSORY','INVENTORY_DELETE_BATTERY']){
    assert.equal(loaded.groupPrivileges['GROUP:denied'][key],false);
    assert.equal(loaded.groupPrivileges.OFFICER[key],true);
  }
  const next=env.store.load();next.groupPrivileges['GROUP:allowed'].INVENTORY_DELETE_ACCESSORY=false;env.store.save(next);
  assert.equal(env.restart().load().groupPrivileges['GROUP:allowed'].INVENTORY_DELETE_ACCESSORY,false);
});

test('approval permission overrides legacy classification and revocation blocks pending reviews',t=>{
  const state=fixture();
  state.userGroups=[{id:'reviewers',name:'Reviewers',baseRole:'USER'},{id:'former',name:'Former Reviewers',baseRole:'OFFICER'}];
  state.users[2].groupId='reviewers';state.users[1].groupId='former';
  state.groupPrivileges['GROUP:reviewers']={VIEW_TAB_NOTIFICATIONS:true,APPROVE_REQUESTS:true};
  state.groupPrivileges['GROUP:former']={VIEW_TAB_NOTIFICATIONS:true,APPROVE_REQUESTS:false};
  const notice={id:'permission-review',type:'CHANGE_APPROVAL_REQUEST',status:'PENDING',senderId:'officer',targetOfficerId:'user'};
  state.notifications=[notice];
  const env=setup(t,state);
  const reviewer=state.users[2],former=state.users[1];
  const op={entity:'notifications',id:notice.id,version:1,record:{...notice,status:'APPROVED'}};
  assert.throws(()=>apply(env.store,[op],former),e=>e.status===403);
  const next=env.store.load();next.groupPrivileges['GROUP:reviewers'].APPROVE_REQUESTS=false;env.store.save(next);
  for(const status of ['APPROVED','REJECTED'])assert.throws(()=>apply(env.store,[{...op,record:{...notice,status}}],{...reviewer,canApproveRequests:true}),e=>e.status===403);
  assert.equal(env.store.load().notifications[0].status,'PENDING');
  next.groupPrivileges['GROUP:reviewers'].APPROVE_REQUESTS=true;env.store.save(next);
  apply(env.store,[op],reviewer);
  assert.equal(env.store.load().notifications[0].status,'APPROVED');
  assert.equal(projectState(former,env.store.load(),{}).users.length,0);
  const projected=projectState({...former,userRole:'ADMIN'},env.store.load(),{});
  assert.equal(projected.users.find(u=>u.id==='user').canApproveRequests,true);
  assert.equal(projected.users.find(u=>u.id==='officer').canApproveRequests,false);
});

test('approval migration preserves existing reviewers and explicit grants across restarts',t=>{
  const env=setup(t),state=env.store.load();
  state.userGroups=[{id:'old-officer',name:'Old Officer',baseRole:'OFFICER'},{id:'old-user',name:'Old User',baseRole:'USER'},{id:'explicit',name:'Explicit',baseRole:'OFFICER'}];
  for(const group of state.userGroups)state.groupPrivileges['GROUP:'+group.id]={};
  env.store.save(state);
  env.store.db.exec("DELETE FROM schema_migrations WHERE version=6; DELETE FROM role_permissions WHERE privilege='APPROVE_REQUESTS'; DELETE FROM group_permissions WHERE privilege='APPROVE_REQUESTS'; INSERT INTO group_permissions VALUES('explicit','APPROVE_REQUESTS',0)");
  const migrated=env.restart().load();
  assert.equal(migrated.groupPrivileges.ADMIN.APPROVE_REQUESTS,true);
  assert.equal(migrated.groupPrivileges.OFFICER.APPROVE_REQUESTS,true);
  assert.equal(migrated.groupPrivileges.USER.APPROVE_REQUESTS,false);
  assert.equal(migrated.groupPrivileges['GROUP:old-officer'].APPROVE_REQUESTS,true);
  assert.equal(migrated.groupPrivileges['GROUP:old-user'].APPROVE_REQUESTS,false);
  assert.equal(migrated.groupPrivileges['GROUP:explicit'].APPROVE_REQUESTS,false);
  env.store.save(migrated);
  assert.equal(env.restart().load().groupPrivileges['GROUP:explicit'].APPROVE_REQUESTS,false);
});

test('legacy classification migration preserves accounts while correcting group metadata',t=>{
  const env=setup(t),state=env.store.load();
  state.userGroups=[{id:'legacy',name:'Legacy Team',baseRole:'USER'}];
  state.groupPrivileges['GROUP:legacy']={VIEW_TAB_INVENTORY:true,APPROVE_REQUESTS:true};
  env.store.save(state);
  const old={...state.users[1],groupId:'legacy',userRole:'OFFICER',userClass:'OFFICER',archivedAt:'2026-01-02T00:00:00Z'};
  env.store.db.prepare('UPDATE users SET payload=?,deleted_at=? WHERE id=?').run(JSON.stringify(old),old.archivedAt,old.id);
  env.store.db.exec('DELETE FROM schema_migrations WHERE version=7');
  env.restart();
  const migrated=JSON.parse(env.store.db.prepare('SELECT payload FROM users WHERE id=?').get(old.id).payload);
  assert.equal(migrated.userRole,'USER');assert.equal(migrated.userClass,'TECHNICIAN');
  assert.equal(migrated.groupId,'legacy');assert.equal(migrated.passwordHash,old.passwordHash);
  assert.equal(migrated.archivedAt,old.archivedAt);
  assert.equal(env.store.load().groupPrivileges['GROUP:legacy'].APPROVE_REQUESTS,true);
  assert.equal(env.store.db.prepare('SELECT deleted_at FROM users WHERE id=?').get(old.id).deleted_at,old.archivedAt);
});

test('missing approval grant cannot revive authority from old Officer metadata',t=>{
  const state=fixture();state.userGroups=[{id:'old',name:'Old',baseRole:'OFFICER'}];
  state.groupPrivileges['GROUP:old']={APPROVE_REQUESTS:true,VIEW_TAB_NOTIFICATIONS:true};
  const env=setup(t,state),next=env.store.load();
  delete next.groupPrivileges['GROUP:old'].APPROVE_REQUESTS;env.store.save(next);
  assert.equal(env.restart().load().groupPrivileges['GROUP:old'].APPROVE_REQUESTS,false);
});

test('obsolete personnel requests cannot falsely approve a failed account mutation',t=>{
  const state=fixture(),notice={id:'old-personnel',type:'CHANGE_APPROVAL_REQUEST',status:'PENDING',senderId:'user',targetOfficerId:'officer',changeDetails:{itemType:'USER',action:'CREATE',itemId:'missing'}};
  state.notifications=[notice];const env=setup(t,state);
  const op={entity:'notifications',id:notice.id,version:1,record:{...notice,status:'APPROVED'}};
  assert.throws(()=>apply(env.store,[op],state.users[1]),e=>e.status===403);
  assert.equal(env.store.load().notifications[0].status,'PENDING');
  assert.throws(()=>apply(env.store,[{entity:'notifications',id:'new-personnel',version:0,record:{...notice,id:'new-personnel'}}],state.users[2]),e=>e.status===403);
  apply(env.store,[{...op,record:{...notice,status:'REJECTED'}}],state.users[1]);
  assert.equal(env.store.load().notifications[0].status,'REJECTED');
});

test('classification migration tolerates archived membership in a deleted group',t=>{
  const env=setup(t),old={...env.store.load().users[2],groupId:'deleted-group',archivedAt:'2026-01-01T00:00:00Z'};
  env.store.db.prepare('UPDATE users SET payload=?,deleted_at=? WHERE id=?').run(JSON.stringify(old),old.archivedAt,old.id);
  env.store.db.exec('DELETE FROM schema_migrations WHERE version=7');
  env.restart();
  const row=env.store.db.prepare('SELECT payload,deleted_at FROM users WHERE id=?').get(old.id);
  assert.equal(JSON.parse(row.payload).groupId,'deleted-group');
  assert.equal(row.deleted_at,old.archivedAt);
  assert.ok(!env.store.load().users.some(u=>u.id===old.id));
});
