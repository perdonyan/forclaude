import { defaultGroupPermissions } from '../utils/accountIdentity.mjs';
import { AppDropdown } from './AppDropdown';
import React, { useState, useEffect } from 'react';
import { GroupSelectorDropdown } from './GroupSelectorDropdown';
import {
  UserRole,
  UserGroup,
  PrivilegeKey,
  GroupPrivileges,
  SYSTEM_PRIVILEGES,
  DEFAULT_GROUP_PRIVILEGES,
} from '../types/drone';
import {
  Shield,
  ShieldAlert,
  UserCheck,
  Check,
  Lock,
  RotateCcw,
  UploadCloud,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Boxes,
  ClipboardList,
  Info,
  Sparkles,
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  AlertTriangle,
  Users,
  Bell,
  BellOff,
  Compass,
  ChevronDown,
  Filter,
  Search,
  X
} from 'lucide-react';

interface GroupPrivilegesMatrixProps {
  initialGroup?: string;
  groupPrivileges?: GroupPrivileges;
  userGroups?: UserGroup[];
  onUpdateGroupPrivileges: (updated: GroupPrivileges) => void;
  currentUserRole?: UserRole;
  isModal?: boolean;
  onCloseModal?: () => void;
}

const BUILTIN_GROUPS: { role: string; label: string; badgeColor: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { role: 'ADMIN', label: 'ADMIN', badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-800', icon: ShieldAlert },
  { role: 'OFFICER', label: 'OFFICER', badgeColor: 'text-sky-400 bg-sky-950/80 border-sky-800', icon: Shield },
  { role: 'USER', label: 'USER', badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800', icon: UserCheck },
];

export const GroupPrivilegesMatrix: React.FC<GroupPrivilegesMatrixProps> = ({
  initialGroup = 'ADMIN',
  groupPrivileges = DEFAULT_GROUP_PRIVILEGES,
  userGroups = [],
  currentUserRole,
  onUpdateGroupPrivileges,
  isModal = false,
  onCloseModal,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  useEffect(()=>setSelectedGroup(initialGroup),[initialGroup]);
  const customGroup = userGroups.find(group=>'GROUP:'+group.id===selectedGroup);
  const selectedGroupInfo = customGroup ? {role:'GROUP:'+customGroup.id,label:customGroup.name,badgeColor:'text-sky-400 bg-sky-950/80 border-sky-800',icon:Shield} : BUILTIN_GROUPS.find(role=>role.role===selectedGroup) || BUILTIN_GROUPS[0];
  const GROUPS = [selectedGroupInfo];
  const isAdmin = currentUserRole === 'ADMIN';
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'OPERATIONS_MENU' | 'INVENTORY' | 'IN_OUT_FORM' | 'INCIDENT_REPORT' | 'CONFISCATED_DRONE' | 'NOTIFICATION_FUNCTIONS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleTogglePrivilege = (group: string, privKey: PrivilegeKey) => {
    if (!isAdmin) return;
    // Safety guard: Admin must always have access to USERS tab so permissions can be configured
    if (group === 'ADMIN' && ['VIEW_TAB_USERS','APPROVE_REQUESTS'].includes(privKey)) {
      showNotification('ADMIN retains access management and request approval.');
      return;
    }

    const isCurrentlyGranted = !!groupPrivileges[group]?.[privKey];
    const updated: GroupPrivileges = {
      ...groupPrivileges,
      [group]: {
        ...groupPrivileges[group],
        [privKey]: !isCurrentlyGranted,
      },
    };
    onUpdateGroupPrivileges(updated);
    showNotification(`${privKey} ${!isCurrentlyGranted ? 'granted to' : 'revoked from'} ${group}`);
  };

  const handleSetAllForGroup = (group: string, enable: boolean) => {
    if (!isAdmin) return;
    const updatedForGroup: Record<PrivilegeKey, boolean> = { ...groupPrivileges[group] };
    SYSTEM_PRIVILEGES.forEach((p) => {
      if (group === 'ADMIN' && ['VIEW_TAB_USERS','APPROVE_REQUESTS'].includes(p.id) && !enable) {
        updatedForGroup[p.id] = true; // Admin retains USERS tab
      } else {
        updatedForGroup[p.id] = enable;
      }
    });
    const updated: GroupPrivileges = {
      ...groupPrivileges,
      [group]: updatedForGroup,
    };
    onUpdateGroupPrivileges(updated);
    showNotification(`${enable ? 'All permissions granted to' : 'All permissions revoked from'} ${group}`);
  };

  const handleResetDefaults = () => {
    if (!isAdmin) return;
    onUpdateGroupPrivileges({...groupPrivileges,[selectedGroupInfo.role]:defaultGroupPermissions(DEFAULT_GROUP_PRIVILEGES,selectedGroupInfo.role)});
    showNotification('Permissions reset to system defaults');
  };

  const getPrivilegeIcon = (privId: PrivilegeKey) => {
    switch (privId) {
      case 'VIEW_TAB_DASHBOARD':
        return <LayoutDashboard className="w-4 h-4 text-sky-400" />;
      case 'VIEW_TAB_INVENTORY':
        return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'VIEW_TAB_IN_OUT_FORM':
        return <ArrowLeftRight className="w-4 h-4 text-emerald-400" />;
      case 'VIEW_TAB_INCIDENT_REPORT':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'VIEW_TAB_USERS':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'VIEW_TAB_NOTIFICATIONS':
        return <Bell className="w-4 h-4 text-rose-400" />;
      case 'INVENTORY_BATCH_UPLOAD':
        return <UploadCloud className="w-4 h-4 text-sky-400" />;
      case 'INVENTORY_ADD_DRONE':
        return <Plus className="w-4 h-4 text-emerald-400" />;
      case 'INVENTORY_EDIT_DETAILS':
        return <Edit3 className="w-4 h-4 text-amber-400" />;
      case 'INVENTORY_DELETE_STREAMING_DEVICE':
      case 'INVENTORY_DELETE_ACCESSORY':
      case 'INVENTORY_DELETE_BATTERY':
      case 'INVENTORY_DELETE_DRONE':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'IN_OUT_DELETE_RECORD':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'INCIDENT_CREATE_REPORT':
        return <Plus className="w-4 h-4 text-amber-400" />;
      case 'INCIDENT_DELETE_REPORT':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'CONFISCATED_CREATE_REPORT':
        return <Plus className="w-4 h-4 text-amber-400" />;
      case 'CONFISCATED_EDIT_REPORT':
        return <Edit3 className="w-4 h-4 text-sky-400" />;
      case 'CONFISCATED_DELETE_REPORT':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'VIEW_TAB_CONFISCATED_DRONE':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case 'NOTIFICATIONS_DISMISS_MESSAGE':
        return <BellOff className="w-4 h-4 text-rose-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const operationsMenuPrivileges = SYSTEM_PRIVILEGES.filter((p) => p.category === 'OPERATIONS_MENU');
  const inventoryPrivileges = SYSTEM_PRIVILEGES.filter((p) => p.category === 'INVENTORY');
  const inOutPrivileges = SYSTEM_PRIVILEGES.filter((p) => p.category === 'IN_OUT_FORM');
  const incidentPrivileges = SYSTEM_PRIVILEGES.filter((p) => p.category === 'INCIDENT_REPORT');
  const confiscatedPrivileges = SYSTEM_PRIVILEGES.filter((p) => p.category === 'CONFISCATED_DRONE');
  const notificationPrivileges = SYSTEM_PRIVILEGES.filter((p) => p.category === 'NOTIFICATION_FUNCTIONS');

  const filterBySearch = (list: typeof SYSTEM_PRIVILEGES) => {
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  };

  const filteredOperationsMenu = filterBySearch(operationsMenuPrivileges);
  const filteredInventory = filterBySearch(inventoryPrivileges);
  const filteredInOut = filterBySearch(inOutPrivileges);
  const filteredIncident = filterBySearch(incidentPrivileges);
  const filteredConfiscated = filterBySearch(confiscatedPrivileges);
  const filteredNotification = filterBySearch(notificationPrivileges);

  const totalMatching =
    (activeCategoryFilter === 'ALL' || activeCategoryFilter === 'OPERATIONS_MENU' ? filteredOperationsMenu.length : 0) +
    (activeCategoryFilter === 'ALL' || activeCategoryFilter === 'INVENTORY' ? filteredInventory.length : 0) +
    (activeCategoryFilter === 'ALL' || activeCategoryFilter === 'IN_OUT_FORM' ? filteredInOut.length : 0) +
    (activeCategoryFilter === 'ALL' || activeCategoryFilter === 'INCIDENT_REPORT' ? filteredIncident.length : 0) +
    (activeCategoryFilter === 'ALL' || activeCategoryFilter === 'CONFISCATED_DRONE' ? filteredConfiscated.length : 0) +
    (activeCategoryFilter === 'ALL' || activeCategoryFilter === 'NOTIFICATION_FUNCTIONS' ? filteredNotification.length : 0);

  const content = (
    <>
      {/* Filter and Control Bar */}
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 w-full"
      >
        {/* Left: Search (First Option) + Category Filter Dropdown */}
        <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          {/* Compact Search Input - First option left-most */}
          <div className="relative w-full sm:w-52 md:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            Category:
          </span>
          <div className="relative shrink-0">
            <AppDropdown
              value={activeCategoryFilter}
              onChange={(e) => setActiveCategoryFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 cursor-pointer appearance-none shadow-xs font-medium"
            >
              <option value="ALL">All Functions ({SYSTEM_PRIVILEGES.length})</option>
              <option value="OPERATIONS_MENU">Operations ({operationsMenuPrivileges.length})</option>
              <option value="INVENTORY">Inventory ({inventoryPrivileges.length})</option>
              <option value="IN_OUT_FORM">In/Out Form ({inOutPrivileges.length})</option>
              <option value="INCIDENT_REPORT">Incidents ({incidentPrivileges.length})</option>
              <option value="CONFISCATED_DRONE">Confiscated Drones ({confiscatedPrivileges.length})</option>
              <option value="NOTIFICATION_FUNCTIONS">Notifications ({notificationPrivileges.length})</option>
            </AppDropdown>
          </div>
        </div>

        {/* Right: Group Status Badges + Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-end xl:self-auto">
          {/* Group Quick Status Counts */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono shrink-0">
            {GROUPS.map((g) => {
              const count = SYSTEM_PRIVILEGES.filter((p) => groupPrivileges[g.role]?.[p.id]).length;
              return (
                <span
                  key={g.role}
                  className={`px-2 py-0.5 rounded border ${g.badgeColor} flex items-center gap-1 font-bold text-[10px]`}
                >
                  <span>{g.label}:</span>
                  <span>{count}/{SYSTEM_PRIVILEGES.length}</span>
                </span>
              );
            })}
          </div>

          
          {/* Reset Defaults button */}
          <button
            type="button"
            disabled={!isAdmin}
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            title="Restore default permission assignments"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider min-w-[190px]">
                Functions & View Permissions
              </th>
              {GROUPS.map((g) => {
                return (
                  <th key={g.role} className="py-2.5 px-3 text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <GroupSelectorDropdown selected={selectedGroupInfo.role} onSelect={setSelectedGroup} options={[
                        ...BUILTIN_GROUPS.map(group=>({key:group.role,label:group.label,icon:group.icon})),
                        ...userGroups.map(group=>({key:'GROUP:'+group.id,label:group.name,icon:Shield}))
                      ]}/>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          type="button"
                          disabled={!isAdmin}
                            onClick={() => handleSetAllForGroup(g.role, true)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                          title={`Grant all permissions to ${g.label}`}
                        >
                          All
                        </button>
                        <span className="text-slate-600 text-[10px]">·</span>
                        <button
                          type="button"
                          disabled={!isAdmin}
                            onClick={() => handleSetAllForGroup(g.role, false)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                          title={`Revoke all permissions from ${g.label}`}
                        >
                          None
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {/* Category: OPERATIONS_MENU (VIEW TABS) */}
            {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'OPERATIONS_MENU') && filteredOperationsMenu.length > 0 && (
              <>
                <tr className="bg-amber-950/30 border-t border-amber-900/40">
                  <td colSpan={GROUPS.length + 1} className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-200 uppercase tracking-wider text-[11px]">
                        OPERATIONS MENU VIEW PERMISSIONS (TABS)
                      </span>
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        (DASHBOARD · INVENTORY · IN/OUT FORM · INCIDENT REPORT · USERS · NOTIFICATIONS)
                      </span>
                    </div>
                  </td>
                </tr>
                {filteredOperationsMenu.map((priv) => (
                  <tr key={priv.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                          {getPrivilegeIcon(priv.id)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{priv.label}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {priv.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {priv.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    {GROUPS.map((g) => {
                      const isGranted = !!groupPrivileges[g.role]?.[priv.id];
                      const isRequiredAdminUsers = g.role === 'ADMIN' && ['VIEW_TAB_USERS','APPROVE_REQUESTS'].includes(priv.id);
                      return (
                        <td key={g.role} className="py-2.5 px-3 text-center align-middle">
                          {isRequiredAdminUsers ? (
                            <span
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 opacity-90 cursor-default"
                              title="ADMIN retains access management and request approval"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                              <span>Required</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!isAdmin}
                            onClick={() => handleTogglePrivilege(g.role, priv.id)}
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                isGranted
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 shadow-xs'
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                              }`}
                              title={`Click to ${isGranted ? 'revoke' : 'grant'} ${priv.label} for ${g.label}`}
                            >
                              {isGranted ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                  <span>Granted</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Restricted</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Category: INVENTORY */}
            {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'INVENTORY') && filteredInventory.length > 0 && (
              <>
                <tr className="bg-sky-950/30 border-t border-sky-900/40">
                  <td colSpan={GROUPS.length + 1} className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-sky-200 uppercase tracking-wider text-[11px]">
                        INVENTORY FUNCTIONS
                      </span>
                      <span className="text-[10px] text-sky-400/80 font-mono">
                        (Batch Upload, Add Drone, Edit details, Delete Drone)
                      </span>
                    </div>
                  </td>
                </tr>
                {filteredInventory.map((priv) => (
                  <tr key={priv.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                          {getPrivilegeIcon(priv.id)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{priv.label}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {priv.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {priv.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    {GROUPS.map((g) => {
                      const isGranted = !!groupPrivileges[g.role]?.[priv.id];
                      return (
                        <td key={g.role} className="py-2.5 px-3 text-center align-middle">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleTogglePrivilege(g.role, priv.id)}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              isGranted
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 shadow-xs'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                            title={`Click to ${isGranted ? 'revoke' : 'grant'} ${priv.label} for ${g.label}`}
                          >
                            {isGranted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>Granted</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                                <span>Restricted</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Category: IN/OUT FORM */}
            {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'IN_OUT_FORM') && filteredInOut.length > 0 && (
              <>
                <tr className="bg-emerald-950/30 border-t border-emerald-900/40">
                  <td colSpan={GROUPS.length + 1} className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-emerald-200 uppercase tracking-wider text-[11px]">
                        IN/OUT FORM FUNCTIONS
                      </span>
                      <span className="text-[10px] text-emerald-400/80 font-mono">
                        (Delete Record)
                      </span>
                    </div>
                  </td>
                </tr>
                {filteredInOut.map((priv) => (
                  <tr key={priv.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                          {getPrivilegeIcon(priv.id)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{priv.label}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {priv.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {priv.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    {GROUPS.map((g) => {
                      const isGranted = !!groupPrivileges[g.role]?.[priv.id];
                      return (
                        <td key={g.role} className="py-2.5 px-3 text-center align-middle">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleTogglePrivilege(g.role, priv.id)}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              isGranted
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 shadow-xs'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                            title={`Click to ${isGranted ? 'revoke' : 'grant'} ${priv.label} for ${g.label}`}
                          >
                            {isGranted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>Granted</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                                <span>Restricted</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Category: INCIDENT_REPORT */}
            {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'INCIDENT_REPORT') && filteredIncident.length > 0 && (
              <>
                <tr className="bg-rose-950/40 border-t border-rose-900/50">
                  <td colSpan={GROUPS.length + 1} className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span className="font-bold text-rose-200 uppercase tracking-wider text-[11px]">
                        INCIDENT REPORT FUNCTIONS
                      </span>
                      <span className="text-[10px] text-rose-400/80 font-mono">
                        (Create Incident Report · Delete Incident Report)
                      </span>
                    </div>
                  </td>
                </tr>
                {filteredIncident.map((priv) => (
                  <tr key={priv.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                          {getPrivilegeIcon(priv.id)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{priv.label}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {priv.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {priv.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    {GROUPS.map((g) => {
                      const isGranted = !!groupPrivileges[g.role]?.[priv.id];
                      return (
                        <td key={g.role} className="py-2.5 px-3 text-center align-middle">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleTogglePrivilege(g.role, priv.id)}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              isGranted
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 shadow-xs'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                            title={`Click to ${isGranted ? 'revoke' : 'grant'} ${priv.label} for ${g.label}`}
                          >
                            {isGranted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>Granted</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                                <span>Restricted</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Category: CONFISCATED_DRONE */}
            {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'CONFISCATED_DRONE') && filteredConfiscated.length > 0 && (
              <>
                <tr className="bg-amber-950/40 border-t border-amber-900/50">
                  <td colSpan={GROUPS.length + 1} className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-200 uppercase tracking-wider text-[11px]">
                        CONFISCATED DRONE FUNCTIONS
                      </span>
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        (Create Confiscated Drone Report · Edit Report · Delete Report)
                      </span>
                    </div>
                  </td>
                </tr>
                {filteredConfiscated.map((priv) => (
                  <tr key={priv.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                          {getPrivilegeIcon(priv.id)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{priv.label}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {priv.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {priv.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    {GROUPS.map((g) => {
                      const isGranted = !!groupPrivileges[g.role]?.[priv.id];
                      return (
                        <td key={g.role} className="py-2.5 px-3 text-center align-middle">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleTogglePrivilege(g.role, priv.id)}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              isGranted
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 shadow-xs'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                            title={`Click to ${isGranted ? 'revoke' : 'grant'} ${priv.label} for ${g.label}`}
                          >
                            {isGranted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>Granted</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                                <span>Restricted</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Category: NOTIFICATION_FUNCTIONS */}
            {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'NOTIFICATION_FUNCTIONS') && filteredNotification.length > 0 && (
              <>
                <tr className="bg-rose-950/30 border-t border-rose-900/40">
                  <td colSpan={GROUPS.length + 1} className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-rose-400" />
                      <span className="font-bold text-rose-200 uppercase tracking-wider text-[11px]">
                        NOTIFICATION FUNCTIONS
                      </span>
                      <span className="text-[10px] text-rose-400/80 font-mono">
                        (Dismiss message)
                      </span>
                    </div>
                  </td>
                </tr>
                {filteredNotification.map((priv) => (
                  <tr key={priv.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                          {getPrivilegeIcon(priv.id)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{priv.label}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {priv.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {priv.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    {GROUPS.map((g) => {
                      const isGranted = !!groupPrivileges[g.role]?.[priv.id];
                      return (
                        <td key={g.role} className="py-2.5 px-3 text-center align-middle">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleTogglePrivilege(g.role, priv.id)}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              isGranted
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 shadow-xs'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                            title={`Click to ${isGranted ? 'revoke' : 'grant'} ${priv.label} for ${g.label}`}
                          >
                            {isGranted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>Granted</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                                <span>Restricted</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Empty search state */}
            {totalMatching === 0 && (
              <tr>
                <td colSpan={GROUPS.length + 1} className="py-8 text-center text-slate-400">
                  <p className="font-medium text-xs">No functions or permissions found</p>
                  <p className="text-[11px] text-slate-500 mt-1">Try adjusting your category filter or search query.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Instant Notification Feedback Banner */}
      {successToast && (
        <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80">Saved immediately</span>
        </div>
      )}


      {/* Info note */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Permissions configured here are strictly enforced in real time across the Operations Menu navigation tabs (<strong className="text-slate-300">DASHBOARD, INVENTORY, IN/OUT FORM, USERS, NOTIFICATIONS</strong>), action toolbars, and handover sheet management registers for active user sessions.
        </p>
      </div>
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-xs animate-in fade-in zoom-in-95 space-y-4">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {content}
    </div>
  );
};

