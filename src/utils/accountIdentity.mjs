// userRole is the canonical built-in group. Legacy class and position fields
// are read only for old records without a canonical value; unknowns fail closed.
export function resolveUserRole(user) {
  if (['ADMIN','OFFICER','USER'].includes(user?.userRole)) return user.userRole;
  if (user?.userRole) return 'USER';
  const legacyRole=String(user?.role || '').trim().toUpperCase();
  if (['ADMIN','OFFICER','USER'].includes(legacyRole)) return legacyRole;
  const legacyClass=String(user?.userClass || '').trim().toUpperCase();
  return legacyClass==='OFFICER' ? 'OFFICER' : 'USER';
}

export const classForRole = role => role==='USER' ? 'TECHNICIAN' : 'OFFICER';

export function normalizeLegacyAccount(user,groups=[]) {
  const group=user.groupId ? groups.find(group=>group.id===user.groupId) : undefined;
  if (user.groupId && !group && !user.archivedAt) throw new Error('Account '+user.id+' references a missing group. Repair the verified legacy data before deployment.');
  // Preserve only the known historical administrator titles during migration.
  // Position text never grants authority to an already canonical account.
  const historicalAdmin=!user.userRole && ['DRONE FLEET SYSTEM ADMINISTRATOR','DRONES SYSTEM ADMINISTRATOR'].includes(String(user.role || '').trim().toUpperCase());
  const userRole=group ? group.baseRole : historicalAdmin ? 'ADMIN' : resolveUserRole(user);
  return {...user,userRole,userClass:classForRole(userRole)};
}

export function defaultGroupPermissions(defaults,group) {
  // A custom group's hidden legacy classification must not restore authority.
  return {...defaults[group.startsWith('GROUP:') ? 'USER' : group]};
}
