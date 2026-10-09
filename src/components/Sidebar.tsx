import React from 'react';
import { SidebarTab, UserItem, GroupPrivileges, canViewTab } from '../types/drone';
import {
  Plane,
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  AlertTriangle,
  Users,
  Bell,
  X,
  Radio,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  totalDrones: number;
  activeDrones: number;
  checkedOutCount: number;
  totalUsers: number;
  incidentReportsCount?: number;
  confiscatedDronesCount?: number;
  pendingApprovalsCount?: number;
  totalNotifications?: number;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  currentUser?: UserItem | null;
  onSignOut?: () => void;
  isConnected?: boolean;
  activeSessionsCount?: number;
  groupPrivileges?: GroupPrivileges;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  totalDrones,
  activeDrones,
  checkedOutCount,
  totalUsers,
  incidentReportsCount = 0,
  confiscatedDronesCount = 0,
  pendingApprovalsCount = 0,
  totalNotifications = 0,
  isMobileOpen,
  setIsMobileOpen,
  currentUser,
  onSignOut,
  isConnected = true,
  activeSessionsCount = 1,
  groupPrivileges,
}) => {
  const navItems = [
    {
      id: 'DASHBOARD' as SidebarTab,
      label: 'DASHBOARD',
      icon: LayoutDashboard,
      badge: null,
      description: 'Drones command & readiness',
    },
    {
      id: 'INVENTORY' as SidebarTab,
      label: 'INVENTORY',
      icon: Layers,
      badge: `${totalDrones}`,
      description: '118 Excel drone units',
    },
    {
      id: 'USERS' as SidebarTab,
      label: 'USERS',
      icon: Users,
      badge: `${totalUsers}`,
      description: 'Pilots & operators',
    },
    {
      id: 'IN_OUT_FORM' as SidebarTab,
      label: 'IN/OUT FORM',
      icon: ArrowLeftRight,
      badge: checkedOutCount > 0 ? `${checkedOutCount} Active` : '0',
      badgeColor: checkedOutCount > 0 ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400',
      description: 'Sorties & mission dispatch',
    },
    {
      id: 'INCIDENT_REPORT' as SidebarTab,
      label: 'INCIDENT REPORT',
      icon: AlertTriangle,
      badge: incidentReportsCount > 0 ? `${incidentReportsCount}` : '0',
      badgeColor: incidentReportsCount > 0 ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-slate-800 text-slate-400',
      description: 'Accident & damage records',
    },
    {
      id: 'CONFISCATED_DRONE' as SidebarTab,
      label: 'CONFISCATED DRONE',
      icon: ShieldAlert,
      badge: confiscatedDronesCount > 0 ? `${confiscatedDronesCount}` : '0',
      badgeColor: confiscatedDronesCount > 0 ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-slate-800 text-slate-400',
      description: 'UAV Team CDR & flight logs',
    },
    {
      id: 'NOTIFICATIONS' as SidebarTab,
      label: 'NOTIFICATIONS',
      icon: Bell,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Pending` : `${totalNotifications}`,
      badgeColor: pendingApprovalsCount > 0 ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse font-bold' : 'bg-slate-800 text-slate-400',
      description: 'Approval requests & messages',
    },
  ];

  const permittedNavItems = navItems.filter((item) => canViewTab(groupPrivileges, currentUser, item.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Plane className="w-4 h-4 -rotate-45" />
            </div>
            <div>
              <span className="font-bold text-slate-100 tracking-tight text-xs block uppercase">
                DRONES SYSTEM SECTION
              </span>
              <p className="text-[10px] text-sky-400 font-medium tracking-wide leading-none mt-0.5">
                Inventory Management
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-200 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 flex items-center justify-between text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            <span>Operations Menu</span>
          </div>

          {permittedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <div className="text-left">
                    <span className="block tracking-wide">{item.label}</span>
                    <span className="block text-[10px] font-normal text-slate-500 group-hover:text-slate-400">
                      {item.description}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                      item.badgeColor || (isActive ? 'bg-sky-950 text-sky-300 border-sky-800' : 'bg-slate-800 text-slate-400 border-slate-700')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Department Quick-Stats Card */}
          <div className="pt-5 px-1">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono font-medium text-slate-400">
                <span>DRONES DEPARTMENTS</span>
                <Radio className="w-3 h-3 text-slate-300" />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  SSOC Drones
                </span>
                <span className="font-mono font-bold text-slate-300">75</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  SSD Drones
                </span>
                <span className="font-mono font-bold text-slate-300">43</span>
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between text-[11px] text-slate-400">
                <span>Active Status</span>
                <span className="font-mono font-bold text-emerald-400">
                  {Math.round((activeDrones / (totalDrones || 1)) * 100)}% ({activeDrones}/{totalDrones})
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

