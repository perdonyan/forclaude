import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveUserRole,normalizeLegacyAccount,defaultGroupPermissions } from '../src/utils/accountIdentity.mjs';

test('frontend and server resolve canonical membership before legacy classifications',()=>{
  assert.equal(resolveUserRole({userRole:'USER',userClass:'OFFICER',role:'ADMIN'}),'USER');
  assert.equal(resolveUserRole({userRole:'OFFICER',userClass:'TECHNICIAN'}),'OFFICER');
  for(const user of [null,{}, {userRole:'OLD_ROLE'}, {role:'Administration Clerk'},{role:'Drone Fleet System Administrator',userClass:'TECHNICIAN'}])assert.equal(resolveUserRole(user),'USER');
  assert.equal(resolveUserRole({userClass:'officer'}),'OFFICER');
});

test('legacy import preserves known administrators without turning positions into authority',()=>{
  const legacy={id:'admin',role:'Drone Fleet System Administrator',passwordHash:'keep'};
  assert.equal(normalizeLegacyAccount(legacy).userRole,'ADMIN');
  assert.equal(normalizeLegacyAccount({...legacy,userRole:'USER'}).userRole,'USER');
  assert.equal(normalizeLegacyAccount({id:'unknown',role:'Admin Support'}).userRole,'USER');
  assert.equal(normalizeLegacyAccount({...legacy,userRole:'USER'}).passwordHash,'keep');
  assert.throws(()=>normalizeLegacyAccount({id:'orphan',groupId:'missing'}),/missing group/);
});

test('custom group reset uses User baseline independent of legacy officer classification',()=>{
  const defaults={ADMIN:{APPROVE_REQUESTS:true},OFFICER:{APPROVE_REQUESTS:true},USER:{APPROVE_REQUESTS:false}};
  const custom=defaultGroupPermissions(defaults,'GROUP:old-officer');
  assert.equal(custom.APPROVE_REQUESTS,false);
  custom.APPROVE_REQUESTS=true;assert.equal(defaults.USER.APPROVE_REQUESTS,false);
  assert.equal(defaultGroupPermissions(defaults,'OFFICER').APPROVE_REQUESTS,true);
});

test('archived accounts retain historical membership after their empty group was deleted',()=>{
  const archived={id:'archived',groupId:'removed',archivedAt:'2026-01-01',userRole:'OFFICER',passwordHash:'keep'};
  const migrated=normalizeLegacyAccount(archived);
  assert.equal(migrated.groupId,'removed');assert.equal(migrated.archivedAt,archived.archivedAt);assert.equal(migrated.passwordHash,'keep');
});
