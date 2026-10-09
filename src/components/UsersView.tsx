import { AppDropdown } from './AppDropdown';
import React, { useState, useEffect } from 'react';
import {
  UserItem,
  DroneItem,
  NotificationMessage,
  UserRole,
  UserGroup,
  getUserRole,
  ActiveSession,
  GroupPrivileges,
  DEFAULT_GROUP_PRIVILEGES,
  SYSTEM_PRIVILEGES,
  AuditLogEntry,
} from '../types/drone';
import { GroupPrivilegesMatrix } from './GroupPrivilegesMatrix';
import { UserAccessPanels } from './UserAccessPanels';
import { realtimeSync } from '../utils/realtimeSync';
import {
  Users,
  Search,
  Plus,
  Shield,
  Phone,
  Trash2,
  Edit3,
  Edit2,
  X,
  CreditCard,
  Download,
  Copy,
  Check,
  Wrench,
  Mail,
  AlertCircle,
  ShieldAlert,
  Send,
  UserCheck,
  ArrowRight,
  LogOut,
  Laptop,
  Key,
  KeyRound,
  Lock,
  Unlock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';

interface UsersViewProps {
  users: UserItem[];
  drones: DroneItem[];
  currentUser?: UserItem | null;
  officers?: UserItem[];
  notifications?: NotificationMessage[];
  onNavigateToNotifications?: () => void;
  onAddUser: (user: UserItem, targetOfficer?: UserItem, remarks?: string, initialPassword?: string) => Promise<any> | void;
  onEditUser: (user: UserItem) => Promise<any> | void;
  onDeleteUser: (id: string) => Promise<any> | void;
  onViewAssetTag: (drone: DroneItem) => void;
  activeSessions?: ActiveSession[];
  onSignOutOtherDevice?: (employeeId: string) => Promise<void>;
  groupPrivileges?: GroupPrivileges;
  onUpdateGroupPrivileges?: (privileges: GroupPrivileges) => void;
  onUpdateUserStatus?: (id: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<void>;
  onAdminResetPassword?: (id: string) => Promise<{ temporaryPassword?: string }>;
  auditLogs?: AuditLogEntry[];
  onRefreshAuditLogs?: () => Promise<void>;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  officers,
  notifications,
  onNavigateToNotifications,
  onAddUser,
  onEditUser,
  onDeleteUser,
  activeSessions = [],
  onSignOutOtherDevice,
  groupPrivileges = DEFAULT_GROUP_PRIVILEGES,
  onUpdateGroupPrivileges,
  onUpdateUserStatus,
  onAdminResetPassword,
  auditLogs = [],
  onRefreshAuditLogs,
}) => {
  const currentUserRole = getUserRole(currentUser);

  const [activeSubTab, setActiveSubTab] = useState<'DIRECTORY' | 'GROUPS' | 'PERMISSIONS'>('DIRECTORY');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Temporary Credentials Display Modal
  const [tempCredsModal, setTempCredsModal] = useState<{
    open: boolean;
    title: string;
    employeeId: string;
    name: string;
    tempPass: string;
  }>({
    open: false,
    title: '',
    employeeId: '',
    name: '',
    tempPass: '',
  });

  // Pending Password Reset Requests (Admin only)
  const [resetRequests, setResetRequests] = useState<
    { id: string; userId?: string; employeeId: string; name?: string; department?: string; requestedAt: string; notes?: string }[]
  >([]);

  const fetchResetRequests = () => {
    if (currentUserRole === 'ADMIN') {
      realtimeSync
        .getPendingPasswordResetRequests()
        .then((reqs) => setResetRequests(reqs || []))
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchResetRequests();
    const interval = setInterval(fetchResetRequests, 12000);
    return () => clearInterval(interval);
  }, [currentUserRole]);

  const [selectedPermissionGroup,setSelectedPermissionGroup] = useState('ADMIN');
  const [userGroups,setUserGroups] = useState<UserGroup[]>([]);
  const [isGroupModalOpen,setIsGroupModalOpen] = useState(false);
  const [groupName,setGroupName] = useState('');
  const [groupError,setGroupError] = useState('');
  const [groupBusy,setGroupBusy] = useState(false);
  const [selectedGroupId,setSelectedGroupId] = useState('');
  useEffect(()=>{
    realtimeSync.getUserGroups().then(setUserGroups).catch(error=>setGroupError(error.message));
    const unsubscribe=realtimeSync.onEntityUpdate((entity,data)=>{if(entity==='userGroups')setUserGroups(data);});
    const unsubscribeState=realtimeSync.onState(state=>{if(state.userGroups)setUserGroups(state.userGroups);});
    return ()=>{unsubscribe();unsubscribeState();};
  },[]);
  const groupLabel = (user:UserItem) => userGroups.find(group=>group.id===user.groupId)?.name || getUserRole(user);
  const handleCreateGroup = async (event:React.FormEvent) => {
    event.preventDefault();setGroupError('');setGroupBusy(true);
    try {
      const data=await realtimeSync.createUserGroup(groupName);
      setUserGroups(data.groups);setIsGroupModalOpen(false);setGroupName('');
      setActiveSubTab('GROUPS');
    } catch(error:any) {setGroupError(error.message);} finally {setGroupBusy(false);}
  };

  // Group Privileges Modal and Inline View State
    
  // Officer Approval Dispatch State for adding new user

  // Full Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<UserItem | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [qatarId, setQatarId] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('USER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [department, setDepartment] = useState<'SSOC' | 'SSD'>('SSOC');
  const [status, setStatus] = useState<'ACTIVE' | 'ON_DUTY' | 'OFF_DUTY'>('ON_DUTY');
  const [initialPassword, setInitialPassword] = useState('');
  const [autoGenPassword, setAutoGenPassword] = useState(true);

  // Dedicated Quick Email Edit Modal State
  const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);
  const [quickEditUser, setQuickEditUser] = useState<UserItem | null>(null);
  const [quickEmailValue, setQuickEmailValue] = useState('');
  const [quickEmailError, setQuickEmailError] = useState<string | null>(null);

  // In-App Confirmation Dialog State (avoid native window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    actionVariant: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    actionLabel: '',
    actionVariant: 'primary',
    onConfirm: () => {},
  });

  const pendingPersonnelNotifs = (notifications || []).filter(
    (n) => n.status === 'PENDING' && n.changeDetails?.itemType === 'USER'
  );

  const filteredUsers = users.filter((u) => {
    if (selectedRole !== 'all') {
      const targetRole = selectedRole.toUpperCase();
      if (selectedRole.startsWith('GROUP:') ? u.groupId !== selectedRole.slice(6) : (u.groupId || getUserRole(u) !== targetRole)) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        u.employeeId.toLowerCase().includes(term) ||
        u.qatarId.toLowerCase().includes(term) ||
        groupLabel(u).toLowerCase().includes(term) ||
        (u.userClass && u.userClass.toLowerCase().includes(term)) ||
        u.name.toLowerCase().includes(term) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        u.mobileNumber.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setUserRole(newRole);
  };

  const handleOpenAdd = () => {
    if (currentUserRole!=='ADMIN') return;
    setEditingOfficer(null);
    setEmployeeId('');
    setQatarId('');
    setUserRole('USER');
    setSelectedGroupId('');
    setName('');
    setEmail('');
    setMobileNumber('+974 ');
    setDepartment('SSOC');
    setStatus('ON_DUTY');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (officer: UserItem) => {
    if (currentUserRole!=='ADMIN') return;
    const role = getUserRole(officer);
    setEditingOfficer(officer);
    setEmployeeId(officer.employeeId);
    setQatarId(officer.qatarId);
    setUserRole(role);
    setSelectedGroupId(officer.groupId || '');
    setName(officer.name);
    setEmail(officer.email || `${role.toLowerCase()}${officer.employeeId}@moi.gov.qa`);
    setMobileNumber(officer.mobileNumber);
    setDepartment(officer.department === 'SSD' ? 'SSD' : 'SSOC');
    setStatus(officer.status);
    setIsModalOpen(true);
  };

  const handleOpenQuickEmailEdit = (user: UserItem) => {
    setQuickEditUser(user);
    setQuickEmailValue(user.email || '');
    setQuickEmailError(null);
    setIsQuickEmailOpen(true);
  };

  const handleSaveQuickEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditUser) return;
    const clean = quickEmailValue.trim();
    if (!clean) {
      setQuickEmailError('Email address cannot be empty.');
      return;
    }
    if (!clean.includes('@') || !clean.includes('.')) {
      setQuickEmailError('Please enter a valid email address (e.g. name@moi.gov.qa).');
      return;
    }

    onEditUser({
      ...quickEditUser,
      email: clean,
    });
    setIsQuickEmailOpen(false);
    setQuickEditUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultName = userRole === 'USER' 
      ? `User (${employeeId.trim()})` 
      : userRole === 'ADMIN'
      ? `Admin (${employeeId.trim()})`
      : `Officer (${employeeId.trim()})`;

    const defaultEmail = `${userRole.toLowerCase()}${employeeId.trim()}@moi.gov.qa`;
    const finalEmail = email.trim() || defaultEmail;

    const payload: UserItem = {
      id: editingOfficer ? editingOfficer.id : `off-${employeeId.trim() || Date.now()}`,
      employeeId: employeeId.trim(),
      qatarId: qatarId.trim(),
      rank: editingOfficer ? editingOfficer.rank : '',
      userRole,
      groupId: selectedGroupId || undefined,
      userClass: userRole === 'USER' ? 'TECHNICIAN' : 'OFFICER',
      name: name.trim() || defaultName,
      email: finalEmail,
      mobileNumber: mobileNumber.trim(),
      department,
      status,
      role: userRole === 'ADMIN' 
        ? 'Drones System Administrator' 
        : userRole === 'USER'
        ? 'Drone Avionics & Logistics Operator'
        : 'Flight Operations Officer',
    };

    if (editingOfficer) {
      onEditUser(payload);
      setIsModalOpen(false);
    } else {
      const customPass = autoGenPassword ? undefined : initialPassword.trim();
      {
        const addResult = onAddUser(payload, undefined, undefined, customPass);
        if (addResult && typeof (addResult as any).then === 'function') {
          (addResult as any).then((res: any) => {
            if (res && res.temporaryPassword) {
              setTempCredsModal({
                open: true,
                title: 'New Personnel Credentials',
                employeeId: payload.employeeId,
                name: payload.name,
                tempPass: res.temporaryPassword,
              });
            }
          }).catch(() => {});
        }
        setIsModalOpen(false);
      }
    }
  };

  const handleToggleStatus = (officer: UserItem) => {
    if (!onUpdateUserStatus) return;
    const nextStatus = officer.accountStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setConfirmDialog({
      open: true,
      title: nextStatus === 'SUSPENDED' ? `Suspend Account: ${officer.name}` : `Reactivate Account: ${officer.name}`,
      description: nextStatus === 'SUSPENDED'
        ? `Are you sure you want to SUSPEND the account of ${officer.name} (${officer.employeeId})? All active sessions for this officer will be terminated immediately and future sign-in blocked.`
        : `Reactivate account for ${officer.name} (${officer.employeeId})? They will be granted access to the local network system again.`,
      actionLabel: nextStatus === 'SUSPENDED' ? 'Suspend Account' : 'Reactivate Account',
      actionVariant: nextStatus === 'SUSPENDED' ? 'danger' : 'primary',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        await onUpdateUserStatus(officer.id, nextStatus);
      },
    });
  };

  const handleTriggerAdminReset = (officer: UserItem) => {
    if (!onAdminResetPassword) return;
    setConfirmDialog({
      open: true,
      title: `Reset Password for ${officer.name}`,
      description: `Generate a new temporary password for ${officer.name} (${officer.employeeId})? Their current password will be invalidated, all active workstation sessions terminated, and they will be forced to create a new password on their next sign-in.`,
      actionLabel: 'Generate Temp Password',
      actionVariant: 'warning',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const res = await onAdminResetPassword(officer.id);
          fetchResetRequests();
          if (res && res.temporaryPassword) {
            setTempCredsModal({
              open: true,
              title: 'Temporary Password Reset',
              employeeId: officer.employeeId,
              name: officer.name,
              tempPass: res.temporaryPassword,
            });
          }
        } catch {}
      },
    });
  };

  const handleDeletePrompt = (officer: UserItem) => {
    if (currentUserRole!=='ADMIN') return;
    setConfirmDialog({
      open: true,
      title: `Delete Personnel: ${officer.name}`,
      description: `Are you sure you want to permanently delete the profile of ${officer.name} (${officer.employeeId}) from the directory? Any active sessions will be terminated immediately.`,
      actionLabel: 'Delete Personnel',
      actionVariant: 'danger',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        onDeleteUser(officer.id);
      },
    });
  };

  const handleExportOfficersCsv = () => {
    const header = 'EMPLOYEE ID,QATAR ID,GROUP,NAME,EMAIL,MOBILE NUMBER,DEPARTMENT,STATUS';
    const rows = filteredUsers.map(
      (u) => `"${u.employeeId}","${u.qatarId}","${groupLabel(u)}","${u.name}","${u.email}","${u.mobileNumber}","${u.department}","${u.status}"`
    );
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `moi_personnel_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Roles badge styling
  const getRoleBadge = (officer: UserItem) => {
    const role = getUserRole(officer);
    if (officer.groupId) return <span className="font-mono font-bold text-slate-300 bg-slate-850 border border-slate-800 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1"><Users className="w-3 h-3"/>{groupLabel(officer)}</span>;
    if (role === 'ADMIN') {
      return (
        <span className="font-mono font-bold text-slate-300 bg-slate-850 border border-slate-800 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 shadow-2xs">
          <ShieldAlert className="w-3 h-3 text-slate-300" />
          <span>ADMIN</span>
        </span>
      );
    }
    if (role === 'OFFICER') {
      return (
        <span className="font-mono font-bold text-slate-300 bg-slate-850 border border-slate-800 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 shadow-2xs">
          <Shield className="w-3 h-3 text-slate-300" />
          <span>OFFICER</span>
        </span>
      );
    }
    return (
      <span className="font-mono font-bold text-slate-300 bg-slate-850 border border-slate-800 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 shadow-2xs">
        <UserCheck className="w-3 h-3 text-slate-300" />
        <span>USER</span>
      </span>
    );
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* Primary Sub-Navigation Tabs */}
      <div role="tablist" aria-label="User management" className="bg-slate-900 border border-slate-800 rounded-lg p-2 grid grid-cols-3 gap-1.5">
        {([
          {id:'DIRECTORY',label:'Users',count:users.length,icon:Users},
          {id:'GROUPS',label:'Groups',count:3+userGroups.length,icon:Users},
          {id:'PERMISSIONS',label:'Permissions',count:SYSTEM_PRIVILEGES.length,icon:KeyRound},
        ] as const).map(tab=><button key={tab.id} type="button" role="tab" aria-selected={activeSubTab===tab.id} onClick={()=>setActiveSubTab(tab.id)} className={`min-w-0 h-8 flex items-center justify-center gap-1.5 px-2 rounded-md border text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 ${activeSubTab===tab.id?'bg-slate-800 text-sky-400 border-slate-700':'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}>
          <tab.icon className="w-3.5 h-3.5 shrink-0"/><span>{tab.label}</span><span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono">{tab.count}</span>
        </button>)}
      </div>
      {activeSubTab==='GROUPS' && <UserAccessPanels groups={userGroups} users={users} privileges={groupPrivileges} isAdmin={currentUserRole==='ADMIN'}
        onAddGroup={()=>{setGroupName('');setGroupError('');setIsGroupModalOpen(true);}}
        onViewMembers={key=>{setSelectedRole(key.startsWith('GROUP:')?key:key.toLowerCase());setActiveSubTab('DIRECTORY');}}
        onConfigurePermissions={key=>{setSelectedPermissionGroup(key);setActiveSubTab('PERMISSIONS');}}/>}
      {activeSubTab==='PERMISSIONS' && <GroupPrivilegesMatrix initialGroup={selectedPermissionGroup} userGroups={userGroups} groupPrivileges={groupPrivileges} onUpdateGroupPrivileges={onUpdateGroupPrivileges || (()=>{})} currentUserRole={currentUserRole}/>}
      
      {activeSubTab === 'DIRECTORY' && (
        <>
          {/* Pending Personnel Approvals Banner */}
      {pendingPersonnelNotifs.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-900/60 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                <span>{pendingPersonnelNotifs.length} Personnel Registration Request(s) Awaiting Officer Approval</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  PENDING SIGN-OFF
                </span>
              </div>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Personnel profiles registered by technicians are awaiting officer review and sign-off before being activated in the directory.
              </p>
            </div>
          </div>
          {onNavigateToNotifications && (
            <button
              onClick={onNavigateToNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <span>Review in Notifications ({pendingPersonnelNotifs.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
            </button>
          )}
        </div>
      )}

      {/* Pending Password Reset Requests Banner (Admin Protocol) */}
      {currentUserRole === 'ADMIN' && resetRequests.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 shadow-lg text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-rose-200">
              <KeyRound className="w-4 h-4 text-rose-400" />
              <span>{resetRequests.length} Password Reset Assistance Request(s) Awaiting Admin Action</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700 font-bold">
              ADMIN RESET REQUIRED
            </span>
          </div>
          <div className="divide-y divide-rose-900/50">
            {resetRequests.map((req) => {
              const targetOfficer = users.find(
                (u) =>
                  u.employeeId.toLowerCase() === req.employeeId.toLowerCase() ||
                  u.id.toLowerCase() === (req.userId || '').toLowerCase()
              );
              return (
                <div key={req.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="text-slate-200 font-semibold text-xs flex items-center gap-2">
                      <span>{req.name || targetOfficer?.name || 'Officer'}</span>
                      <span className="font-mono text-rose-300 bg-rose-900/40 px-1.5 py-0.5 rounded text-[11px] border border-rose-800">
                        Emp ID: {req.employeeId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Dept: {req.department || targetOfficer?.department || 'SSOC'} · Requested: {new Date(req.requestedAt).toLocaleTimeString()}
                      {req.notes && <span className="text-slate-300 italic ml-2">"{req.notes}"</span>}
                    </div>
                  </div>
                  {targetOfficer ? (
                    <button
                      type="button"
                      onClick={() => handleTriggerAdminReset(targetOfficer)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors shadow-sm"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Issue Temporary Password</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-rose-400 italic">Personnel not found in active directory</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 w-full"
      >
        {/* Left: Search (First Option) + Filter by Group Dropdown */}
        <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          {/* Compact Search Input - Left-most */}
          <div className="relative w-full sm:w-52 md:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-100" />
            Group:
          </span>
          <div className="relative shrink-0">
            <AppDropdown
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 cursor-pointer appearance-none shadow-xs font-medium"
            >
              <option value="all">All Groups ({users.length})</option>
              <option value="admin">Administrators ({users.filter((u) => getUserRole(u) === 'ADMIN' && !u.groupId).length})</option>
              <option value="officer">Officers ({users.filter((u) => getUserRole(u) === 'OFFICER' && !u.groupId).length})</option>
              <option value="user">Users ({users.filter((u) => getUserRole(u) === 'USER' && !u.groupId).length})</option>
              {userGroups.map(group=><option key={group.id} value={'GROUP:'+group.id}>{group.name} ({users.filter(user=>user.groupId===group.id).length})</option>)}
            </AppDropdown>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-end xl:self-auto">
          {currentUserRole==='ADMIN' && <button type="button" onClick={handleOpenAdd} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap text-slate-950 bg-sky-400 hover:bg-sky-300"><Plus className="w-3.5 h-3.5"/><span>Add User</span></button>}

          {/* Export Officers */}
          <button
            type="button"
            onClick={handleExportOfficersCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            title="Export Officers CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-100" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Officers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">EMPLOYEE ID</th>
                <th className="py-2.5 px-3">QATAR ID</th>
                <th className="py-2.5 px-3">GROUP</th>
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3 w-40">EMAIL ADDRESS</th>
                <th className="py-2.5 px-3">MOBILE NUMBER</th>
                <th className="py-2.5 px-3">DEPT</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-300">No personnel found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try clearing search or group filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((officer) => (
                  <tr
                    key={officer.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Employee ID */}
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        <span>{officer.employeeId}</span>
                      </div>
                    </td>

                    {/* Qatar ID */}
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{officer.qatarId}</span>
                        <button
                          onClick={() => handleCopy(officer.qatarId, officer.id + '-qid')}
                          className="p-0.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                          title="Copy Qatar ID"
                        >
                          {copiedId === officer.id + '-qid' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Roles */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getRoleBadge(officer)}
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3 font-medium text-slate-100">
                      <div className="max-w-[150px] truncate" title={officer.name}>{officer.name}</div>

                    </td>

                    {/* Email Address with Quick Edit option */}
                    <td className="py-2.5 px-3 font-mono text-xs w-40 max-w-[160px]">
                      <div className="flex items-center gap-1.5 w-[136px] max-w-full min-w-0">
                        <Mail className="w-3.5 h-3.5 text-slate-100/80 shrink-0" />
                        <span className="flex-1 min-w-0 text-slate-200 hover:text-sky-300 transition-colors whitespace-normal break-all" title={officer.email}>
                          {officer.email}
                        </span>
                        <div className="flex items-center gap-0.5 ml-auto shrink-0">
                          <button
                            onClick={() => handleCopy(officer.email, officer.id + '-email')}
                            className="p-0.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Copy email address"
                          >
                            {copiedId === officer.id + '-email' ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          {(currentUserRole==='ADMIN'||currentUser?.id===officer.id)&&<button onClick={()=>handleOpenQuickEmailEdit(officer)} className="p-0.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors cursor-pointer" title="Edit email address"><Edit2 className="w-3 h-3"/></button>}
                        </div>
                      </div>
                    </td>

                    {/* Mobile Number */}
                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{officer.mobileNumber}</span>
                        <button
                          onClick={() => handleCopy(officer.mobileNumber, officer.id + '-phone')}
                          className="p-0.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                          title="Copy Mobile Number"
                        >
                          {copiedId === officer.id + '-phone' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`font-mono font-semibold text-xs ${
                        officer.department === 'SSOC' ? 'text-sky-400' : 'text-indigo-400'
                      }`}>
                        {officer.department}
                      </span>
                    </td>

                    {/* Security & Duty Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                              officer.accountStatus === 'SUSPENDED'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${officer.accountStatus === 'SUSPENDED' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                            <span>{officer.accountStatus || 'ACTIVE'}</span>
                          </span>

                          {officer.mustChangePassword && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                                officer.requiresPasswordSetup
                                  ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-800'
                              }`}
                              title={officer.requiresPasswordSetup ? "Requires initial password setup on first login" : "Forced password update on next login"}
                            >
                              {officer.requiresPasswordSetup ? 'Initial Setup' : 'Temp PW'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>Duty: {officer.status || 'ACTIVE'}</span>
                          {activeSessions.find((s) => s.employeeId === officer.employeeId) && (
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-1 py-0.2 rounded flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                              <span>LAN Active</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {onSignOutOtherDevice && activeSessions.some((s) => s.employeeId === officer.employeeId) && (
                          <button
                            onClick={() => onSignOutOtherDevice(officer.employeeId)}
                            className="p-1 text-amber-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Sign out this user from local network device"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {currentUserRole === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => handleTriggerAdminReset(officer)}
                              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Generate temporary password for this user"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {officer.id !== currentUser?.id && officer.employeeId !== currentUser?.employeeId && (
                              <button
                                onClick={() => handleToggleStatus(officer)}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                   officer.accountStatus === 'SUSPENDED'
                                    ? 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
                                    : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                                }`}
                                title={officer.accountStatus === 'SUSPENDED' ? 'Reactivate account' : 'Suspend account and terminate sessions'}
                              >
                                {officer.accountStatus === 'SUSPENDED' ? (
                                  <Unlock className="w-3.5 h-3.5" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </>
                        )}

                        {currentUserRole==='ADMIN' && <>
                          <button onClick={()=>handleOpenEdit(officer)} className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors cursor-pointer" title="Edit user"><Edit3 className="w-3.5 h-3.5"/></button>
                          <button onClick={()=>handleDeletePrompt(officer)} className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer" title="Delete user"><Trash2 className="w-3.5 h-3.5"/></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="font-mono text-[11px] text-slate-500">
            Schema: EMPLOYEE ID · QATAR ID · GROUP · NAME · EMAIL · MOBILE NUMBER
          </div>
          <div>
            Showing <strong className="font-mono text-slate-200">{filteredUsers.length}</strong> of{' '}
            <strong className="font-mono text-slate-200">{users.length}</strong> verified personnel
          </div>
        </div>
      </div>

      {/* Dedicated Quick Email Edit Modal */}
      {isQuickEmailOpen && quickEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-sm">
                    Edit Email Address
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {quickEditUser.name} · Emp ID: <span className="font-mono text-sky-400">{quickEditUser.employeeId}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickEmailOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEmail} className="space-y-4">
              {quickEmailError && (
                <div className="p-2.5 rounded-md bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{quickEmailError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  CURRENT EMAIL
                </label>
                <div className="w-full bg-slate-950/60 border border-slate-800/60 rounded-md px-3 py-2 text-xs text-slate-400 font-mono select-all">
                  {quickEditUser.email || '(None set)'}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">
                    NEW EMAIL ADDRESS *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = getUserRole(quickEditUser).toLowerCase();
                      setQuickEmailValue(`${prefix}${quickEditUser.employeeId.trim()}@moi.gov.qa`);
                    }}
                    className="text-[10px] text-slate-100 hover:text-sky-300 underline underline-offset-2 cursor-pointer"
                  >
                    Reset to Default (@moi.gov.qa)
                  </button>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="e.g. officer1346@moi.gov.qa"
                    value={quickEmailValue}
                    onChange={(e) => {
                      setQuickEmailValue(e.target.value);
                      if (quickEmailError) setQuickEmailError(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  This email is referenced during sortie check-out/in and custody handovers.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickEmailOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded transition-colors cursor-pointer"
                >
                  Save Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Full User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">
                  {editingOfficer ? 'Edit Personnel Record' : 'Register New Personnel'}
                </h3>

              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Employee ID & Qatar ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    EMPLOYEE ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1346"
                    value={employeeId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setEmployeeId(newId);
                      if (!editingOfficer && (!email || email.includes('@moi.gov.qa'))) {
                        const prefix = userRole.toLowerCase();
                        setEmail(`${prefix}${newId.trim()}@moi.gov.qa`);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    QATAR ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2896340"
                    value={qatarId}
                    onChange={(e) => setQatarId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Group */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  GROUP *
                </label>
                <AppDropdown
                  value={selectedGroupId ? 'GROUP:'+selectedGroupId : userRole}
                  onChange={(e) => {
                    const selected=e.target.value;
                    const group=selected.startsWith('GROUP:')?userGroups.find(group=>group.id===selected.slice(6)):undefined;
                    setSelectedGroupId(group?.id || '');
                    const newRole = group ? group.baseRole : selected as UserRole;
                    handleRoleChange(newRole);
                    if (!editingOfficer && (!email || email.includes('@moi.gov.qa'))) {
                      const prefix = newRole.toLowerCase();
                      setEmail(`${prefix}${employeeId.trim()}@moi.gov.qa`);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-semibold cursor-pointer"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="OFFICER">OFFICER</option>
                  <option value="USER">USER</option>
                  {userGroups.map(group=><option key={group.id} value={'GROUP:'+group.id}>{group.name}</option>)}
                </AppDropdown>
              </div>

              {/* Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  NAME / CALLSIGN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Major (Emp ID: 1346) or Arabic Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Email Address with Custom editing & generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">
                    EMAIL ADDRESS *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = userRole.toLowerCase();
                      setEmail(`${prefix}${employeeId.trim()}@moi.gov.qa`);
                    }}
                    className="text-[10px] text-slate-100 hover:text-sky-300 underline underline-offset-2 cursor-pointer"
                  >
                    Reset default (@moi.gov.qa)
                  </button>
                </div>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. officer1346@moi.gov.qa"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Can be edited to any authorized email address for sortie dispatch & logging.
                </p>
              </div>

              {/* Mobile Number & Duty Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    MOBILE NUMBER *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+974 77777055"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    DUTY STATUS
                  </label>
                  <AppDropdown
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="ON_DUTY">ON DUTY</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="OFF_DUTY">OFF DUTY</option>
                  </AppDropdown>
                </div>
              </div>

              {/* Password Setup Policy for New Personnel */}
              {!editingOfficer && (
                <div className="p-3.5 rounded-lg border bg-slate-950/80 space-y-2.5 border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-100" />
                      <span>INITIAL PASSWORD CONFIGURATION</span>
                    </label>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                      Forced Change on 1st Login
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="passMode"
                        checked={autoGenPassword}
                        onChange={() => setAutoGenPassword(true)}
                        className="accent-sky-500 cursor-pointer"
                      />
                      <span>Auto-generate secure temporary password (Recommended)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="passMode"
                        checked={!autoGenPassword}
                        onChange={() => setAutoGenPassword(false)}
                        className="accent-sky-500 cursor-pointer"
                      />
                      <span>Manually specify initial password</span>
                    </label>

                    {!autoGenPassword && (
                      <div className="pt-1">
                        <input
                          type="text"
                          required={!autoGenPassword}
                          placeholder="Enter temporary password (min 6 chars)"
                          value={initialPassword}
                          onChange={(e) => setInitialPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500">
                    The user will be prompted to set their own permanent password immediately upon signing in.
                  </p>
                </div>
              )}


              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                {editingOfficer && currentUserRole === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      handleTriggerAdminReset(editingOfficer);
                    }}
                    className="mr-auto px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800 rounded transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Issue Temporary Password</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {editingOfficer ? (
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded transition-colors cursor-pointer">Add User</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Credentials Display Modal */}
      {tempCredsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{tempCredsModal.title}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {tempCredsModal.name} ({tempCredsModal.employeeId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTempCredsModal({ open: false, title: '', employeeId: '', name: '', tempPass: '' })}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 space-y-1">
              <span className="font-semibold block text-emerald-300">Temporary Password Generated</span>
              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                Provide these temporary credentials to the officer. The server enforces a mandatory password rotation on their first sign-in.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Employee ID</span>
                <span className="font-mono text-slate-200 font-semibold">{tempCredsModal.employeeId}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-900">
                <span>Temporary Password</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-300 font-bold bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded text-xs select-all">
                    {tempCredsModal.tempPass}
                  </span>
                  <button
                    onClick={() => handleCopy(tempCredsModal.tempPass, 'temp-pass')}
                    className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Copy Password"
                  >
                    {copiedId === 'temp-pass' ? <Check className="w-3.5 h-3.5 text-slate-100" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setTempCredsModal({ open: false, title: '', employeeId: '', name: '', tempPass: '' })}
                className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  confirmDialog.actionVariant === 'danger'
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    : confirmDialog.actionVariant === 'warning'
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-100">{confirmDialog.title}</h3>
              </div>
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.onConfirm()}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  confirmDialog.actionVariant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                    : confirmDialog.actionVariant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
{isGroupModalOpen && currentUserRole === 'ADMIN' && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
        <form onSubmit={handleCreateGroup} role="dialog" aria-modal="true" aria-labelledby="add-group-title" className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between"><h3 id="add-group-title" className="text-sm font-bold text-slate-100">Add Group</h3><button type="button" aria-label="Close Add Group" disabled={groupBusy} onClick={()=>setIsGroupModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button></div>
          <label className="block text-xs text-slate-300">Group Name<input required autoFocus maxLength={50} value={groupName} onChange={event=>setGroupName(event.target.value)} placeholder="e.g. Flight Team" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"/></label>
          <p className="text-xs text-slate-400">New groups cannot approve requests until Approve Requests is enabled in Permissions.</p>
          {groupError&&<p role="alert" className="text-xs text-rose-300">{groupError}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={groupBusy} onClick={()=>setIsGroupModalOpen(false)} className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg">Cancel</button><button disabled={groupBusy||!groupName.trim()} className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg disabled:opacity-50">{groupBusy?'Creating…':'Create Group'}</button></div>
        </form>
      </div>}

      
    </div>
  );
};

