import { resolveUserRole } from '../src/utils/accountIdentity.mjs';
import { DataError } from './database.mjs';

export const entityView = Object.freeze({ drones:'VIEW_TAB_INVENTORY', batteries:'VIEW_TAB_INVENTORY', accessories:'VIEW_TAB_INVENTORY', streamingDevices:'VIEW_TAB_INVENTORY', checkouts:'VIEW_TAB_IN_OUT_FORM', handoverForms:'VIEW_TAB_IN_OUT_FORM', incidentReports:'VIEW_TAB_INCIDENT_REPORT', confiscatedDrones:'VIEW_TAB_CONFISCATED_DRONE', notifications:'VIEW_TAB_NOTIFICATIONS', users:'VIEW_TAB_USERS' });
/** @returns {'ADMIN'|'OFFICER'|'USER'} */
export const roleOf = resolveUserRole;
export const allowed = (user,state,key) => roleOf(user)==='ADMIN' || state.groupPrivileges?.[user.groupId ? 'GROUP:'+user.groupId : roleOf(user)]?.[key]===true;
export const canRead = (user,state,entity) => ['auditLogs','activeSessions'].includes(entity) ? roleOf(user)==='ADMIN' : ['groupPrivileges','userGroups'].includes(entity) || allowed(user,state,entityView[entity]);
const designated = (user,record) => record.targetOfficerId===user.id || record.targetOfficerId===user.employeeId;
const actorMatches = (user,id) => id===user.id || id===user.employeeId;
const assert = (condition,message) => { if (!condition) throw new DataError(message,403,'FORBIDDEN'); };

export function authorizeOperation(user,op,previous,state,operations) {
  assert(canRead(user,state,op.entity),'You do not have access to this section.');
  const creating=!previous, deleting=op.record===null, role=roleOf(user);
  if (op.entity==='notifications') {
    if (deleting) { assert(allowed(user,state,'NOTIFICATIONS_DISMISS_MESSAGE'),'You cannot dismiss notifications.'); return; }
    if (creating) {
      assert(actorMatches(user,op.record.senderId),'Notification sender must match the signed-in account.');
      if (/APPROVAL_REQUEST$/.test(op.record.type)) {
        assert(op.record.changeDetails?.itemType!=='USER','Account changes must be made directly by an administrator in Users.');
        assert(op.record.status==='PENDING','New approval requests must be pending.');
        const target=state.users.find(u=>u.id===op.record.targetOfficerId || u.employeeId===op.record.targetOfficerId);
        assert(target && allowed(target,state,'APPROVE_REQUESTS') && !target.archivedAt && target.accountStatus!=='SUSPENDED','Select an active approving officer.');
      } else assert(allowed(user,state,'APPROVE_REQUESTS'),'Only officers can create approval confirmations.');
    } else {
      assert(previous.senderId===op.record.senderId && previous.targetOfficerId===op.record.targetOfficerId && previous.type===op.record.type,'Notification ownership cannot change.');
      if (['APPROVED','REJECTED'].includes(op.record.status) && previous.status!==op.record.status) {
        assert(op.record.status!=='APPROVED' || previous.changeDetails?.itemType!=='USER','This legacy account request cannot be approved. Manage the account in Users and reject the old request.');
        assert(previous.status==='PENDING' && designated(user,previous) && allowed(user,state,'APPROVE_REQUESTS'),'Only the designated officer can review a pending request.');
        assert(JSON.stringify(previous.changeDetails)===JSON.stringify(op.record.changeDetails) && JSON.stringify(previous.handoverForm)===JSON.stringify(op.record.handoverForm) && JSON.stringify(previous.incidentReport)===JSON.stringify(op.record.incidentReport),'An approval proposal cannot change during review.');
      } else assert(designated(user,previous) || actorMatches(user,previous.senderId) || role==='ADMIN','You cannot update another user’s notification.');
    }
    return;
  }
  const inventory=['drones','batteries','accessories','streamingDevices'].includes(op.entity);
  let privilege;
  if (inventory) {
    privilege=deleting?({drones:'INVENTORY_DELETE_DRONE',streamingDevices:'INVENTORY_DELETE_STREAMING_DEVICE',accessories:'INVENTORY_DELETE_ACCESSORY',batteries:'INVENTORY_DELETE_BATTERY'}[op.entity]):creating?'INVENTORY_ADD_DRONE':'INVENTORY_EDIT_DETAILS';
    if (creating && operations.filter(o=>['drones','batteries','accessories','streamingDevices'].includes(o.entity) && o.version===0 && o.record).length>1) assert(allowed(user,state,'INVENTORY_BATCH_UPLOAD'),'Batch registration is restricted for your group.');
  }
  if (op.entity==='handoverForms' || op.entity==='checkouts') {
    assert(allowed(user,state,'APPROVE_REQUESTS') || (!deleting && (op.entity==='checkouts' || !['ISSUED','ARCHIVED'].includes(op.record.status))),'Only officers can issue or archive handovers.');
    privilege=deleting?'IN_OUT_DELETE_RECORD':entityView[op.entity];
  }
  if (op.entity==='incidentReports') privilege=deleting?'INCIDENT_DELETE_REPORT':'INCIDENT_CREATE_REPORT';
  if (op.entity==='confiscatedDrones') privilege=deleting?'CONFISCATED_DELETE_REPORT':creating?'CONFISCATED_CREATE_REPORT':'CONFISCATED_EDIT_REPORT';
  assert(privilege && allowed(user,state,privilege),'Your group does not have permission for this change.');
  // A record linked to a pending approval may only be finalized together with its
  // designated officer's review, in this same database transaction.
  const pending=state.notifications.filter(n=>n.status==='PENDING' && (n.changeDetails?.itemId===op.id || n.handoverForm?.id===op.id || n.incidentReport?.id===op.id));
  for (const notice of pending) {
    const review=operations.find(o=>o.entity==='notifications' && o.id===notice.id && ['APPROVED','REJECTED'].includes(o.record?.status));
    assert(review && designated(user,notice) && allowed(user,state,'APPROVE_REQUESTS'),'Review the pending request as its designated officer before changing this record.');
  }
}

export function projectState(user,state,versions) {
  /** @type {Record<string, any>} */
  const result={};
  for (const [entity,data] of Object.entries(state)) {
    if (entity==='groupPrivileges') result[entity]=roleOf(user)==='ADMIN'?data:{[roleOf(user)]:data[roleOf(user)],...(user.groupId?{['GROUP:'+user.groupId]:data['GROUP:'+user.groupId]}:{})};
    else if (canRead(user,state,entity)) result[entity]=entity==='users'?data.filter(user=>!user.archivedAt).map(({passwordHash,...safe})=>({...safe,canApproveRequests:allowed(safe,state,'APPROVE_REQUESTS') && safe.accountStatus!=='SUSPENDED'})):entity==='notifications'?data.filter(n=>roleOf(user)==='ADMIN' || designated(user,n) || actorMatches(user,n.senderId)):data;
    else result[entity]=[];
  }
  result.recordVersions=Object.fromEntries(Object.entries(versions).filter(([entity])=>canRead(user,state,entity)));
  return result;
}

export function authenticateToken(token,verify,state,sessions,revoked) {
  if (!token || revoked(token)) throw new DataError('Sign in to continue.',401,'AUTH_REQUIRED');
  let decoded; try { decoded=verify(token); } catch { throw new DataError('Your session expired. Please sign in again.',401,'AUTH_EXPIRED'); }
  const user=state.users.find(u=>u.id===decoded.userId && u.employeeId===decoded.employeeId);
  const session=sessions.get(decoded.sessionId);
  if (!user || user.identityConflict || user.archivedAt || user.accountStatus==='SUSPENDED' || !session || session.userId!==user.id || !Number.isFinite(Date.parse(session.loginTime)) || !Number.isFinite(Date.parse(session.lastActiveTime)) || Date.now()-Date.parse(session.loginTime)>86400000 || Date.now()-Date.parse(session.lastActiveTime)>28800000) throw new DataError('Your session is no longer active. Please sign in again.',401,'SESSION_INACTIVE');
  return {...user,userId:user.id,sessionId:decoded.sessionId,userRole:roleOf(user)};
}
