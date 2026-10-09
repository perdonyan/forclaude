import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';
import { FleetStore } from '../server/database.mjs';

test('authenticated LAN server: permissions, save acknowledgement, sockets and restart',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-api-'));
  const runtime=path.join(root,'runtime'),password='Test-password-12345';
  const hash=await bcrypt.hash(password,4),now=new Date().toISOString();
  const state={drones:[{id:'d1',droneName:'Drone',droneSN:'SN1',status:'ACTIVE'}],batteries:[],accessories:[],streamingDevices:[],checkouts:[],handoverForms:[],incidentReports:[],confiscatedDrones:[],notifications:[],auditLogs:[],users:[{id:'admin',employeeId:'1001',qatarId:'ID1',name:'Admin',userRole:'ADMIN',passwordHash:hash,accountStatus:'ACTIVE',lastPasswordChange:now},{id:'officer',employeeId:'1002',qatarId:'ID2',name:'Officer',userRole:'OFFICER',passwordHash:hash,accountStatus:'ACTIVE',lastPasswordChange:now}],groupPrivileges:{ADMIN:{},OFFICER:{VIEW_TAB_INVENTORY:true,VIEW_TAB_USERS:true,VIEW_TAB_NOTIFICATIONS:true,INVENTORY_EDIT_DETAILS:true},USER:{}}};
  const db=new FleetStore(runtime);db.initialize(path.join(root,'missing.json'),state);db.close();
  const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
  const base=`http://127.0.0.1:${port}`,secret=crypto.randomBytes(48).toString('hex');
  let child,logs='';
  async function start(){
    child=spawn(process.execPath,['--import','tsx','server.ts'],{cwd:path.resolve(new URL('..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),env:{...process.env,NODE_ENV:'production',DATA_DIR:runtime,LEGACY_DATA_FILE:path.join(root,'missing.json'),BACKUP_DIR:path.join(root,'backups'),JWT_SECRET:secret,PORT:String(port)},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
    for(let i=0;i<150;i++){
      if(child.exitCode!==null)throw new Error(`Server exited before startup: ${logs}`);
      try{if((await fetch(`${base}/api/health`)).ok)return;}catch{}
      await new Promise(r=>setTimeout(r,100));
    }
    throw new Error(`Server startup timed out: ${logs}`);
  }
  async function stop(){if(child && child.exitCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}}
  t.after(async()=>{await stop();fs.rmSync(root,{recursive:true,force:true});});
  await start();
  async function csrf(){return (await (await fetch(`${base}/api/auth/csrf-token`)).json()).csrfToken;}
  async function request(route,method='GET',body,token){return fetch(base+route,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json','x-csrf-token':await csrf()}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  async function login(employeeId,sessionId){const res=await request('/api/auth/login','POST',{employeeId,password,sessionId});assert.equal(res.status,200);return res.json();}
  await t.test('anonymous clients cannot read, modify, reset or kick',async()=>{
    for(const route of ['/api/fleet/state','/api/auth/active-sessions','/api/users'])assert.equal((await request(route)).status,401);
    for(const route of ['/api/fleet/mutate','/api/fleet/reset','/api/auth/kick'])assert.equal((await request(route,'POST',{})).status,401);
    assert.equal((await request('/api/confiscated-drones','POST',{id:'injected'})).status,404);
  });
  const admin=await login('1001','admin-session'),officer=await login('1002','officer-session');
  await t.test('non-admin views exclude audit/session data and reject admin operations',async()=>{
    const res=await request('/api/fleet/state','GET',undefined,officer.token),data=await res.json();
    assert.equal(res.status,200);assert.deepEqual(data.auditLogs,[]);assert.deepEqual(data.activeSessions,[]);assert.ok(data.users.every(u=>!u.passwordHash));
    assert.equal((await request('/api/auth/kick','POST',{employeeId:'1001'},officer.token)).status,403);
    assert.equal((await request('/api/auth/active-sessions','GET',undefined,officer.token)).status,403);
  });
  await t.test('backup management is administrator-only and restores are staged',async()=>{
    assert.equal((await request('/api/admin/backups')).status,401);
    assert.equal((await request('/api/admin/backups','GET',undefined,officer.token)).status,403);
    for(const route of ['/api/admin/backups','/api/admin/backups/upload','/api/admin/backups/invalid/restore'])
      assert.equal((await request(route,'POST',{confirmation:'RESTORE'},officer.token)).status,403);
    const created=await request('/api/admin/backups','POST',{},admin.token);
    assert.equal(created.status,200);const {name}=await created.json();
    assert.ok((await (await request('/api/admin/backups','GET',undefined,admin.token)).json()).backups.some(b=>b.name===name&&!b.hasConfiguration));
    const downloaded=await request('/api/admin/backups/'+name+'/download','GET',undefined,admin.token);
    assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('cache-control'),'no-store');
    assert.equal((await request('/api/admin/backups/'+name+'/restore','POST',{confirmation:'wrong'},admin.token)).status,400);
    const prepared=await request('/api/admin/backups/'+name+'/restore','POST',{confirmation:'RESTORE'},admin.token);
    assert.equal(prepared.status,200);const result=await prepared.json();
    assert.notEqual(result.directory,runtime);assert.ok(fs.existsSync(path.join(result.directory,'fleet.sqlite')));
    fs.rmSync(result.directory,{recursive:true,force:true});
    assert.equal((await request('/api/fleet/state','GET',undefined,admin.token)).status,200);
    assert.equal((await request('/api/admin/backups?type=configuration','GET',undefined,officer.token)).status,403);
    assert.equal((await request('/api/admin/backups','POST',{type:'configuration'},officer.token)).status,403);
    const configResponse=await request('/api/admin/backups','POST',{type:'configuration'},admin.token);
    assert.equal(configResponse.status,200);const configName=(await configResponse.json()).name;
    assert.ok(configName.startsWith('configuration-backup-'));
    const history=(await (await request('/api/admin/backups?type=configuration','GET',undefined,admin.token)).json()).backups;
    assert.ok(history.some(item=>item.name===configName));
    assert.ok(history.every(item=>item.configuration===undefined));
    assert.equal((await request('/api/admin/backups/'+configName+'/download','GET',undefined,officer.token)).status,403);
    assert.equal((await request('/api/admin/backups/'+configName+'/restore','POST',{confirmation:'RESTORE'},officer.token)).status,403);
    const configDownload=await request('/api/admin/backups/'+configName+'/download','GET',undefined,admin.token);
    assert.equal(configDownload.status,200);assert.equal(configDownload.headers.get('cache-control'),'no-store');
    const configRestore=await request('/api/admin/backups/'+configName+'/restore','POST',{confirmation:'RESTORE'},admin.token);
    assert.equal(configRestore.status,200);const configResult=await configRestore.json();
    assert.equal(configResult.backupType,'configuration');assert.ok(fs.existsSync(configResult.configurationFile));
    assert.ok(!fs.existsSync(path.join(configResult.directory,'fleet.sqlite')));
    fs.rmSync(configResult.directory,{recursive:true,force:true});
  });
  await t.test('administrator creates groups, assigns members and controls independent permissions',async()=>{
    assert.equal((await request('/api/user-groups','POST',{name:'Blocked'},officer.token)).status,403);
    assert.equal((await request('/api/user-groups','POST',{name:'ADMIN'},admin.token)).status,409);
    assert.equal((await request('/api/user-groups','POST',{name:'Elevated',baseRole:'ADMIN'},admin.token)).status,400);
    const response=await request('/api/user-groups','POST',{name:'Flight Team'},admin.token);
    assert.equal(response.status,201);const data=await response.json(),group=data.group;
    assert.equal((await request('/api/user-groups','POST',{name:'flight team'},admin.token)).status,409);
    assert.equal((await request('/api/users/officer','PUT',{groupId:group.id},officer.token)).status,403);
    assert.equal((await request('/api/users/officer','PUT',{groupId:'unknown'},admin.token)).status,400);
    assert.equal((await request('/api/users/admin','PUT',{groupId:group.id},admin.token)).status,409);
    assert.equal((await request('/api/users/officer','PUT',{groupId:group.id},admin.token)).status,200);
    assert.equal(data.groupPrivileges['GROUP:'+group.id].APPROVE_REQUESTS,false);
    assert.equal((await request('/api/user-groups','POST',{name:'Old Selector',baseRole:'OFFICER'},admin.token)).status,400);
    const privileges=data.groupPrivileges;privileges['GROUP:'+group.id].VIEW_TAB_INVENTORY=false;
    assert.equal((await request('/api/groups/permissions','PUT',{privileges},admin.token)).status,200);
    const view=await (await request('/api/fleet/state','GET',undefined,officer.token)).json();
    assert.deepEqual(view.drones,[]);assert.equal(view.groupPrivileges['GROUP:'+group.id].VIEW_TAB_INVENTORY,false);
    const created=await request('/api/users','POST',{employeeId:'group-member',qatarId:'group-id',name:'Group Member',groupId:group.id,userRole:'ADMIN'},admin.token);
    assert.equal(created.status,201);assert.equal((await created.json()).user.userRole,'USER');
    assert.equal((await request('/api/users/officer','PUT',{groupId:'',userRole:'OFFICER'},admin.token)).status,200);
  });


  await t.test('groups own independent permissions and obsolete roles are unavailable',async()=>{
    assert.equal((await request('/api/permission-roles','GET',undefined,admin.token)).status,404);
    assert.equal((await request('/api/permission-roles','POST',{name:'Old Role'},admin.token)).status,404);
    const first=await (await request('/api/user-groups','POST',{name:'Logistics Group'},admin.token)).json();
    const second=await (await request('/api/user-groups','POST',{name:'Flight Group'},admin.token)).json();
    const group=first.group;
    assert.equal(group.roleId,undefined);
    assert.equal((await request('/api/user-groups','POST',{name:'Obsolete',roleId:'USER'},admin.token)).status,400);
    assert.equal((await request('/api/user-groups/'+group.id+'/role','PATCH',{roleId:'USER'},admin.token)).status,404);
    let state=await (await request('/api/fleet/state','GET',undefined,admin.token)).json();
    assert.equal(state.permissionRoles,undefined);
    const originalSecond={...state.groupPrivileges['GROUP:'+second.group.id]};
    state.groupPrivileges['GROUP:'+group.id].VIEW_TAB_INVENTORY=true;
    state.groupPrivileges['GROUP:'+group.id].INVENTORY_EDIT_DETAILS=false;
    assert.equal((await request('/api/groups/permissions','PUT',{privileges:state.groupPrivileges},officer.token)).status,403);
    assert.equal((await request('/api/groups/permissions','PUT',{privileges:state.groupPrivileges},admin.token)).status,200);
    state=await (await request('/api/fleet/state','GET',undefined,admin.token)).json();
    assert.deepEqual(state.groupPrivileges['GROUP:'+second.group.id],originalSecond);
    assert.equal((await request('/api/users/officer','PUT',{groupId:group.id},admin.token)).status,200);
    state=await (await request('/api/fleet/state','GET',undefined,officer.token)).json();
    assert.equal(state.authenticatedUser.userRole,'USER');
    assert.equal(state.groupPrivileges['GROUP:'+group.id].VIEW_TAB_INVENTORY,true);
    assert.equal((await request('/api/user-groups/'+group.id,'PATCH',{name:'Renamed Logistics'},admin.token)).status,200);
    state=await (await request('/api/fleet/state','GET',undefined,officer.token)).json();
    assert.equal(state.authenticatedUser.userRole,'USER');
    assert.equal(state.groupPrivileges['GROUP:'+group.id].VIEW_TAB_INVENTORY,true);
    assert.equal(state.groupPrivileges['GROUP:'+group.id].INVENTORY_EDIT_DETAILS,false);
    assert.equal((await request('/api/user-groups/'+group.id,'DELETE',undefined,admin.token)).status,409);
    assert.equal((await request('/api/users/officer','PUT',{groupId:'',userRole:'OFFICER'},admin.token)).status,200);
  });
  await t.test('group editing and deletion are admin-only and preserve references',async()=>{
    const created=await (await request('/api/user-groups','POST',{name:'Disposable Group'},admin.token)).json();
    const id=created.group.id,route='/api/user-groups/'+id;
    assert.equal((await request(route,'PATCH',{name:'Blocked'},officer.token)).status,403);
    assert.equal((await request(route,'DELETE',undefined,officer.token)).status,403);
    assert.equal((await request(route,'DELETE')).status,401);
    assert.equal((await request(route,'PATCH',{name:'Renamed Group'},admin.token)).status,200);
    assert.equal((await request(route,'DELETE',undefined,admin.token)).status,200);
    const state=await (await request('/api/fleet/state','GET',undefined,admin.token)).json();
    assert.ok(!state.userGroups.some(g=>g.id===id));
    assert.equal((await request('/api/user-groups/ADMIN','DELETE',undefined,admin.token)).status,404);
  });
  await t.test('account classification is canonical and defaults to User without officer authority',async()=>{
    assert.equal((await request('/api/users','POST',{employeeId:'invalid-role',qatarId:'invalid-role-id',name:'Invalid',userRole:'OLD_CLASS'},admin.token)).status,400);
    const created=await request('/api/users','POST',{employeeId:'default-user',qatarId:'default-user-id',name:'Default',userClass:'OFFICER'},admin.token);
    assert.equal(created.status,201);
    const account=(await created.json()).user;assert.equal(account.userRole,'USER');assert.equal(account.userClass,'TECHNICIAN');assert.equal(account.canApproveRequests,false);
    const edited=await request('/api/users/'+account.id,'PUT',{userRole:'OFFICER',userClass:'TECHNICIAN'},admin.token);
    assert.equal(edited.status,200);assert.equal((await edited.json()).user.userClass,'OFFICER');
    await request('/api/users/'+account.id,'DELETE',undefined,admin.token);
  });
  await t.test('initial setup requires identity confirmation and cannot overwrite an existing password',async()=>{
    assert.equal((await request('/api/auth/initial-password-setup','POST',{employeeId:'1002',newPassword:'New-password-123'})).status,400);
    assert.equal((await request('/api/auth/initial-password-setup','POST',{employeeId:'1002',qatarId:'ID2',newPassword:'New-password-123'})).status,400);
  });
  await t.test('administrator can correct Qatar ID, and self updates cannot elevate roles',async()=>{
    assert.equal((await request('/api/users/officer','PUT',{qatarId:'ID2-corrected'},admin.token)).status,200);
    assert.equal((await request('/api/users/officer','PUT',{userRole:'ADMIN'},officer.token)).status,403);
    assert.equal((await request('/api/users/officer','PUT',{mobileNumber:'updated'},officer.token)).status,200);
  });
  await t.test('authorized record commits are durable and old versions conflict',async()=>{
    const op={entity:'drones',id:'d1',version:1,record:{...state.drones[0],notes:'persisted'}};
    assert.equal((await request('/api/fleet/mutate','POST',{operations:[op]},officer.token)).status,200);
    assert.equal((await request('/api/fleet/mutate','POST',{operations:[op]},officer.token)).status,409);
    const check=new FleetStore(runtime);try{assert.equal(check.load().drones[0].notes,'persisted');}finally{check.close();}
  });
  await t.test('WebSocket sends state only after a valid matching session is identified',async()=>{
    const ws=new WebSocket(`ws://127.0.0.1:${port}/api/ws`);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    let unsolicited=false;ws.onmessage=()=>unsolicited=true;await new Promise(r=>setTimeout(r,80));assert.equal(unsolicited,false);
    const first=new Promise(resolve=>ws.onmessage=e=>resolve(JSON.parse(e.data)));ws.send(JSON.stringify({type:'IDENTIFY_SESSION',sessionId:'officer-session',token:officer.token}));
    const data=await first;assert.equal(data.type,'INIT_STATE');assert.deepEqual(data.state.activeSessions,[]);assert.deepEqual(data.state.auditLogs,[]);
    const rejected=new Promise(resolve=>ws.onmessage=e=>resolve(JSON.parse(e.data)));ws.send(JSON.stringify({type:'MUTATE',entity:'drones',data:[]}));assert.equal((await rejected).type,'ERROR');ws.close();
  });
  await t.test('restart preserves personnel passwords, committed data and sessions',async()=>{
    await stop();await start();const res=await request('/api/fleet/state','GET',undefined,officer.token);assert.equal(res.status,200);assert.equal((await res.json()).drones[0].notes,'persisted');
    const check=new FleetStore(runtime);try{assert.equal(check.load().users.find(u=>u.id==='officer').passwordHash,hash);}finally{check.close();}
  });
  await t.test('administrator kick revokes access and remains effective after restart',async()=>{
    assert.equal((await request('/api/auth/kick','POST',{employeeId:'1002'},admin.token)).status,200);assert.equal((await request('/api/fleet/state','GET',undefined,officer.token)).status,401);
    await stop();await start();assert.equal((await request('/api/fleet/state','GET',undefined,officer.token)).status,401);
  });
});
