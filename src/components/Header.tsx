import React, { useState, useEffect, useRef } from 'react';
import { SidebarTab, ActiveSession, UserItem, UserGroup, GroupPrivileges, canViewTab, getUserRole } from '../types/drone';
import { Menu, Bell, Wifi, Users, LogOut, Laptop, X, UserCheck, Settings, KeyRound, DatabaseBackup, ShieldAlert } from 'lucide-react';

import { SecurityAuditDialog } from './SecurityAuditDialog';
import { AdminSettings } from './AdminSettings';

interface HeaderProps {
  activeTab: SidebarTab;
  onToggleMobileSidebar: () => void;
  onOpenAddDrone?: () => void;
  onOpenBatchLabels?: () => void;
  pendingApprovalsCount?: number;
  onNavigateTab?: (tab: SidebarTab) => void;
  activeSessions?: ActiveSession[];
  isConnected?: boolean;
  currentUser?: UserItem | null;
  userGroups?: UserGroup[];
  onSignOut?: () => void;
  onSignOutOtherDevice?: (employeeId: string) => Promise<void>;
  groupPrivileges?: GroupPrivileges;
  onOpenChangePassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleMobileSidebar,
  pendingApprovalsCount = 0,
  onNavigateTab,
  activeSessions = [],
  isConnected = true,
  currentUser,
  userGroups = [],
  onSignOut,
  onSignOutOtherDevice,
  groupPrivileges,
  onOpenChangePassword,
}) => {
  const [showAudit,setShowAudit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showSettingsMenu) return;
    const handlePointer = (event: PointerEvent) => {
      if (!settingsMenuRef.current?.contains(event.target as Node)) setShowSettingsMenu(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSettingsMenu(false);
        settingsMenuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showSettingsMenu]);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const isAdmin = !!currentUser && getUserRole(currentUser) === 'ADMIN';
  const groupName = userGroups.find(group => group.id === currentUser?.groupId)?.name || getUserRole(currentUser);
  const canViewNotifications = canViewTab(groupPrivileges, currentUser, 'NOTIFICATIONS');
  const [kickingId, setKickingId] = useState<string | null>(null);

  const handleKick = async (empId: string) => {
    if (!onSignOutOtherDevice) return;
    try {
      setKickingId(empId);
      await onSignOutOtherDevice(empId);
    } finally {
      setKickingId(null);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileSidebar}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg md:hidden transition-colors cursor-pointer"
              title="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Right: LAN Presence + Notifications + User Profile (Upper Right UI) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-Time Local Network Status Button */}
            {isAdmin && (
            <button
              onClick={() => setShowSessionsModal(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/70 hover:bg-slate-800/80 text-xs text-slate-300 hover:border-slate-700 transition-colors cursor-pointer"
              title="View active workstations on Local Network"
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="hidden sm:inline text-slate-300">
                  {isConnected ? 'LAN Synced' : 'Reconnecting...'}
                </span>
                <span className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] font-semibold">
                  {activeSessions.length} Active
                </span>
              </div>
            </button>
            )}

            {/* Quick Notifications Bell */}
            {onNavigateTab && canViewNotifications && (
              <button
                onClick={() => onNavigateTab('NOTIFICATIONS')}
                className={`relative p-2 rounded-lg border transition-colors cursor-pointer flex items-center gap-2 text-xs font-medium ${
                  activeTab === 'NOTIFICATIONS'
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                }`}
                title="View fleet notifications & approvals"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden lg:inline">Notifications</span>
                {pendingApprovalsCount > 0 && (
                  <span className="flex items-center justify-center h-4 px-1.5 text-[10px] font-mono font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>
            )}

            {currentUser && <div ref={settingsMenuRef} className="relative">
              <button onClick={() => setShowSettingsMenu(open => !open)} aria-label="Settings" aria-expanded={showSettingsMenu} aria-controls="settings-dropdown" title="Settings" className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-sky-400 hover:bg-slate-800 cursor-pointer"><Settings className="w-4 h-4" /></button>
              {showSettingsMenu && <div id="settings-dropdown" className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl space-y-1">
                {onOpenChangePassword && <button type="button" onClick={() => { setShowSettingsMenu(false); onOpenChangePassword(); }} className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-sky-400 text-left cursor-pointer"><KeyRound className="w-4 h-4" />Change Password</button>}
                {isAdmin && <button type="button" onClick={() => { setShowSettingsMenu(false); setShowSettings(true); }} className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-sky-400 text-left cursor-pointer"><DatabaseBackup className="w-4 h-4" />Backup &amp; Restore</button>}
                {isAdmin && <button type="button" onClick={()=>{setShowSettingsMenu(false);setShowAudit(true);}} className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-sky-400 text-left cursor-pointer"><ShieldAlert className="w-4 h-4"/>Security Audit Trail</button>}
              </div>}
            </div>}

            {/* User Profile & Sign Out */}
            {currentUser && (
              <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border flex items-center justify-center shrink-0 ${
                      getUserRole(currentUser) === 'ADMIN'
                        ? 'bg-slate-850 text-slate-300 border-slate-800'
                        : getUserRole(currentUser) === 'OFFICER'
                        ? 'bg-slate-850 text-slate-300 border-slate-800'
                        : 'bg-slate-850 text-slate-300 border-slate-800'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0 max-w-28 sm:max-w-56 text-left">
                    <div title={currentUser.name} className="font-semibold text-slate-200 text-xs truncate leading-tight">
                      {currentUser.name}
                    </div>
                    <div title={groupName} className="text-[10px] text-slate-400 font-mono truncate leading-tight mt-0.5">
                      {groupName}
                    </div>
                  </div>
                </div>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors shrink-0 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {currentUser && showSettings && <AdminSettings isAdmin={isAdmin} onClose={() => setShowSettings(false)} />}

      {isAdmin && showAudit && <SecurityAuditDialog onClose={()=>setShowAudit(false)}/>}

      {/* LAN Sessions & Remote Sign-Out Modal */}
      {isAdmin && showSessionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  Active Local Network Workstations
                </h3>
              </div>
              <button
                onClick={() => setShowSessionsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time synchronization is active across all devices on this local network. Only a single active instance is permitted per user.
            </p>

            {/* Sessions List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeSessions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-mono">
                  No other active sessions detected on LAN.
                </div>
              ) : (
                activeSessions.map((s) => {
                  const isCurrent = currentUser?.employeeId === s.employeeId;
                  return (
                    <div
                      key={s.sessionId}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-sky-950/30 border-sky-800/80'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${isCurrent ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200 text-xs">
                                {s.rank ? `${s.rank} ` : ''}{s.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ({s.employeeId})
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {s.deviceInfo || 'Workstation'} • IP: {s.ipAddress}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Logged in: {new Date(s.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        {onSignOutOtherDevice && (
                          <button
                            type="button"
                            disabled={kickingId === s.employeeId}
                            onClick={() => handleKick(s.employeeId)}
                            className="px-2 py-1 bg-slate-800 hover:bg-rose-900/80 hover:text-rose-200 text-slate-300 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            title="Sign out this user session"
                          >
                            <LogOut className="w-3 h-3 text-rose-400" />
                            <span>{kickingId === s.employeeId ? 'Signing out...' : 'Sign Out Device'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Action to kick own other devices if any */}
            {currentUser && onSignOutOtherDevice && (
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">Manage your account:</span>
                <button
                  type="button"
                  onClick={() => handleKick(currentUser.employeeId)}
                  className="px-2.5 py-1 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 rounded cursor-pointer transition-colors"
                >
                  Sign Out Other Devices for {currentUser.employeeId}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

