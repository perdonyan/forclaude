import { canApproveRequests } from './types/drone';
import { AssetDeleteConfirmation } from './components/AssetDeleteConfirmation';
import { useState, useEffect, useRef } from 'react';
import {
  DroneItem,
  SidebarTab,
  InventorySubTab,
  CheckoutRecord,
  UserItem,
  UserGroup,
  BatteryItem,
  AccessoryItem,
  StreamingDeviceItem,
  NotificationMessage,
  NotificationStatus,
  InventoryChangeDetails,
  InventoryFieldDiff,
  HandoverFormRecord,
  ActiveSession,
  GroupPrivileges,
  DEFAULT_GROUP_PRIVILEGES,
  canViewTab,
  getUserRole,
  hasPrivilege,
  IncidentReportRecord,
  ConfiscatedDroneReport,
  DroneStatus,
  AuditLogEntry,
} from './types/drone';
import { realtimeSync, ForceSignoutPayload } from './utils/realtimeSync';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { InventoryView } from './components/InventoryView';
import { DashboardView } from './components/DashboardView';
import { InOutFormView } from './components/InOutFormView';
import { IncidentReportView } from './components/IncidentReportView';
import { ConfiscatedDroneView } from './components/ConfiscatedDroneView';
import { UsersView } from './components/UsersView';
import { NotificationsView } from './components/NotificationsView';
import { OfficerApprovalModal } from './components/OfficerApprovalModal';
import { AddDroneModal } from './components/AddDroneModal';
import { DroneAssetTagModal } from './components/DroneAssetTagModal';
import { BatchLabelsModal } from './components/BatchLabelsModal';
import { SignIn } from './components/SignIn';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { IncidentAssetModal, IncidentAssetTarget } from './components/IncidentAssetModal';
import { Check, Lock } from 'lucide-react';

const STORAGE_KEY_DRONES = 'aerotrack_excel_drone_fleet_v2';
const STORAGE_KEY_CHECKOUTS = 'aerotrack_checkouts_v3';
const STORAGE_KEY_OFFICERS = 'aerotrack_officers_sheet_v2';
const STORAGE_KEY_BATTERIES = 'aerotrack_batteries_v1';
const STORAGE_KEY_ACCESSORIES = 'aerotrack_accessories_v1';
const STORAGE_KEY_STREAMING_DEVICES = 'aerotrack_streaming_devices_v1';
const STORAGE_KEY_AUTH_USER = 'aerotrack_auth_user_v2';
const STORAGE_KEY_NOTIFICATIONS = 'aerotrack_notifications_v2';
const STORAGE_KEY_HANDOVER_FORMS = 'aerotrack_handover_forms_v3';
const STORAGE_KEY_INCIDENT_REPORTS = 'aerotrack_incident_reports_v1';
const STORAGE_KEY_CONFISCATED_DRONES = 'aerotrack_confiscated_drones_v1';
const STORAGE_KEY_GROUP_PRIVILEGES = 'aerotrack_group_privileges_v1';

export default function App() {
  // Group Permissions (Assignable from USERS tab)
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [groupPrivileges, setGroupPrivileges] = useState<GroupPrivileges>(DEFAULT_GROUP_PRIVILEGES);
  // Authoritative Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Password Change Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isForcedPasswordChange, setIsForcedPasswordChange] = useState(false);

  const handleUpdateGroupPrivileges = async (updated: GroupPrivileges) => {
    try {
      await realtimeSync.updateGroupPrivileges(updated);
      setGroupPrivileges(updated);
      showToast('Group permissions updated and enforced on server.');
    } catch (err: any) {
      console.error('Failed to persist group permissions:', err);
      showToast(err.message || 'Failed to sync group permissions to server.');
    }
  };

  // Current Auth User
  const [assetDeleteRequest,setAssetDeleteRequest] = useState<{kind:'DRONE'|'BATTERY'|'ACCESSORY'|'STREAMER';id:string;label:string}|null>(null);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  // Drones State
  const [drones, setDrones] = useState<DroneItem[]>([]);
  // Batteries State
  const [batteries, setBatteries] = useState<BatteryItem[]>([]);
  // Accessories State
  const [accessories, setAccessories] = useState<AccessoryItem[]>([]);
  // Streaming Devices State
  const [streamingDevices, setStreamingDevices] = useState<StreamingDeviceItem[]>([]);
  // Checkouts State
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  // Handover Forms State
  const [handoverForms, setHandoverForms] = useState<HandoverFormRecord[]>([]);
  // Incident Reports State
  const [incidentReports, setIncidentReports] = useState<IncidentReportRecord[]>([]);
  // Confiscated Drone Reports State
  const [confiscatedDrones, setConfiscatedDrones] = useState<ConfiscatedDroneReport[]>([]);
  // Officers & Personnel State
  const [users, setUsers] = useState<UserItem[]>([]);
  // Notifications & Messages State
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  // Navigation State
  const [activeTab, setActiveTab] = useState<SidebarTab>('INVENTORY');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [targetHandoverId, setTargetHandoverId] = useState<string | null>(null);
  const [handoverReturnTab, setHandoverReturnTab] = useState<SidebarTab | null>(null);

  // Modals State
  const [isAddDroneOpen, setIsAddDroneOpen] = useState(false);
  const [droneToEdit, setDroneToEdit] = useState<DroneItem | null>(null);
  const [selectedDroneForTag, setSelectedDroneForTag] = useState<DroneItem | null>(null);
  const [isBatchLabelsOpen, setIsBatchLabelsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [requestedToast, setRequestedToast] = useState<{message:string;nonce:number} | null>(null);

  // Local Network Real-time Presence & Sync State
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [forceSignoutNotice, setForceSignoutNotice] = useState<ForceSignoutPayload | null>(null);

  // Guard against re-broadcasting remote updates back to server
  const isRemoteSyncRef = useRef<Record<string, boolean>>({});

  const handleSelectTab = (tab: SidebarTab) => {
    if (currentUser && !canViewTab(groupPrivileges, currentUser, tab)) {
      showToast(`View access to ${tab} is restricted for your role (${getUserRole(currentUser)}).`);
      return;
    }
    setHandoverReturnTab(null);
    setActiveTab(tab);
  };

  const [inventoryNavOptions, setInventoryNavOptions] = useState<{
    subTab?: InventorySubTab;
    status?: string;
    department?: 'SSOC' | 'SSD' | 'all';
  } | null>(null);

  const [inOutStatusFilter, setInOutStatusFilter] = useState<{
    filter: 'ALL' | 'ISSUED' | 'RETURNED' | 'PENDING' | 'PENDING_APPROVAL' | 'DRAFT' | 'ARCHIVED';
    key: number;
  } | null>(null);

  const handleNavigateWithFilter = (
    tab: SidebarTab,
    options?: {
      subTab?: InventorySubTab;
      status?: string;
      department?: 'SSOC' | 'SSD' | 'all';
      inOutStatusFilter?: 'ALL' | 'ISSUED' | 'RETURNED' | 'PENDING' | 'PENDING_APPROVAL' | 'DRAFT' | 'ARCHIVED';
    }
  ) => {
    if (options && tab === 'INVENTORY') {
      setInventoryNavOptions(options);
    }
    if (options && tab === 'IN_OUT_FORM' && options.inOutStatusFilter) {
      setInOutStatusFilter({
        filter: options.inOutStatusFilter,
        key: Date.now(),
      });
    }
    handleSelectTab(tab);
  };

  // Auto-redirect if active tab is restricted for user's role
  useEffect(() => {
    if (currentUser && !canViewTab(groupPrivileges, currentUser, activeTab)) {
      const tabOrder: SidebarTab[] = ['DASHBOARD', 'INVENTORY', 'IN_OUT_FORM', 'INCIDENT_REPORT', 'CONFISCATED_DRONE', 'USERS', 'NOTIFICATIONS'];
      const firstAllowed = tabOrder.find((t) => canViewTab(groupPrivileges, currentUser, t));
      if (firstAllowed) {
        setActiveTab(firstAllowed);
      }
    }
  }, [groupPrivileges, currentUser, activeTab]);

  const handleNavigateToHandover = (formIdOrSr: string) => {
    if (currentUser && !canViewTab(groupPrivileges, currentUser, 'IN_OUT_FORM')) {
      handleSelectTab('IN_OUT_FORM');
      return;
    }
    if (formIdOrSr && activeTab !== 'IN_OUT_FORM') {
      setHandoverReturnTab(activeTab);
      setTargetHandoverId(formIdOrSr);
      return;
    }
    handleSelectTab('IN_OUT_FORM');
    setTargetHandoverId(formIdOrSr);
  };

  const handleCloseLinkedHandover = () => {
    setTargetHandoverId(null);
    if (handoverReturnTab) {
      handleSelectTab(handoverReturnTab);
    }
  };

  // Technician Approval Workflow Modal State
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<InventoryChangeDetails | null>(null);

  // Incident Asset Modal State (Asset status changed to CRASHED or MISSING)
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentAssetTarget, setIncidentAssetTarget] = useState<IncidentAssetTarget | null>(null);
  const [incidentAssetQueue, setIncidentAssetQueue] = useState<IncidentAssetTarget[]>([]);

  // Connect to Real-Time Local Network Sync
  useEffect(() => {
    for (const key of [STORAGE_KEY_AUTH_USER, STORAGE_KEY_DRONES, STORAGE_KEY_BATTERIES, STORAGE_KEY_ACCESSORIES, STORAGE_KEY_STREAMING_DEVICES, STORAGE_KEY_CHECKOUTS, STORAGE_KEY_HANDOVER_FORMS, STORAGE_KEY_INCIDENT_REPORTS, STORAGE_KEY_CONFISCATED_DRONES, STORAGE_KEY_OFFICERS, STORAGE_KEY_NOTIFICATIONS, STORAGE_KEY_GROUP_PRIVILEGES]) localStorage.removeItem(key);
    realtimeSync.connect();

    // 1. Full State Sync
    const unsubState = realtimeSync.onState((serverState) => {
      if (serverState.userGroups) setUserGroups(serverState.userGroups);
      if (serverState.authenticatedUser) setCurrentUser(serverState.authenticatedUser);
      if (serverState.drones) {
        isRemoteSyncRef.current.drones = true;
        setDrones(serverState.drones);
      }
      if (serverState.batteries) {
        isRemoteSyncRef.current.batteries = true;
        setBatteries(serverState.batteries);
      }
      if (serverState.accessories) {
        isRemoteSyncRef.current.accessories = true;
        setAccessories(serverState.accessories);
      }
      if (serverState.streamingDevices) {
        isRemoteSyncRef.current.streamingDevices = true;
        setStreamingDevices(serverState.streamingDevices);
      }
      if (serverState.checkouts) {
        isRemoteSyncRef.current.checkouts = true;
        setCheckouts(serverState.checkouts);
      }
      if (serverState.handoverForms) {
        isRemoteSyncRef.current.handoverForms = true;
        setHandoverForms(serverState.handoverForms);
      }
      if (serverState.users) {
        isRemoteSyncRef.current.users = true;
        setUsers(serverState.users);
      }
      if (serverState.notifications) {
        isRemoteSyncRef.current.notifications = true;
        setNotifications(serverState.notifications);
      }
      if (serverState.incidentReports) {
        isRemoteSyncRef.current.incidentReports = true;
        setIncidentReports(serverState.incidentReports);
      }
      if (serverState.confiscatedDrones) {
        isRemoteSyncRef.current.confiscatedDrones = true;
        setConfiscatedDrones(serverState.confiscatedDrones);
      }
      if (serverState.groupPrivileges) {
        setGroupPrivileges(serverState.groupPrivileges);
      }
      if (serverState.auditLogs) {
        setAuditLogs(serverState.auditLogs);
      }
      if (serverState.activeSessions) {
        setActiveSessions(serverState.activeSessions);
      }
    });

    // 2. Entity Delta Updates from other workstations
    const unsubEntity = realtimeSync.onEntityUpdate((entity, data) => {
      isRemoteSyncRef.current[entity] = true;
      if (entity === 'drones') setDrones(data);
      else if (entity === 'batteries') setBatteries(data);
      else if (entity === 'accessories') setAccessories(data);
      else if (entity === 'streamingDevices') setStreamingDevices(data);
      else if (entity === 'checkouts') setCheckouts(data);
      else if (entity === 'handoverForms') setHandoverForms(data);
      else if (entity === 'users') setUsers(data);
      else if (entity === 'notifications') setNotifications(data);
      else if (entity === 'incidentReports') setIncidentReports(data);
      else if (entity === 'confiscatedDrones') setConfiscatedDrones(data);
      else if (entity === 'userGroups') setUserGroups(data);
      else if (entity === 'groupPrivileges') setGroupPrivileges(data);
      else if (entity === 'auditLogs') setAuditLogs(data);
    });

    // 3. Active Sessions on LAN
    const unsubSessions = realtimeSync.onActiveSessions((sessions) => {
      setActiveSessions(sessions);
    });

    // 4. Force Signout when another device logs into this user
    const unsubForceSignout = realtimeSync.onForceSignout((notice) => {
      console.warn('[App] Force signout received:', notice);
      setForceSignoutNotice(notice);
      setCurrentUser(null);
      setDrones([]); setBatteries([]); setAccessories([]); setStreamingDevices([]); setCheckouts([]); setHandoverForms([]); setIncidentReports([]); setConfiscatedDrones([]); setUsers([]); setNotifications([]); setAuditLogs([]); setActiveSessions([]);
      try {
        sessionStorage.removeItem(STORAGE_KEY_AUTH_USER);
      } catch {}
      showToast('⚠️ Signed out: Account logged in from another device.');
    });

    // 5. Connection status
    const unsubStatus = realtimeSync.onStatusChange((status) => {
      setIsConnected(status);
    });

    // Initial fetch fallback
    realtimeSync.fetchFullState().then((state) => {
      if (state) {
        if (state.drones) {
          isRemoteSyncRef.current.drones = true;
          setDrones(state.drones);
        }
        if (state.batteries) {
          isRemoteSyncRef.current.batteries = true;
          setBatteries(state.batteries);
        }
        if (state.accessories) {
          isRemoteSyncRef.current.accessories = true;
          setAccessories(state.accessories);
        }
        if (state.streamingDevices) {
          isRemoteSyncRef.current.streamingDevices = true;
          setStreamingDevices(state.streamingDevices);
        }
        if (state.checkouts) {
          isRemoteSyncRef.current.checkouts = true;
          setCheckouts(state.checkouts);
        }
        if (state.handoverForms) {
          isRemoteSyncRef.current.handoverForms = true;
          setHandoverForms(state.handoverForms);
        }
        if (state.users) {
          isRemoteSyncRef.current.users = true;
          setUsers(state.users);
        }
        if (state.notifications) {
          isRemoteSyncRef.current.notifications = true;
          setNotifications(state.notifications);
        }
        if (state.userGroups) setUserGroups(state.userGroups);
        if (state.groupPrivileges) {
          setGroupPrivileges(state.groupPrivileges);
        }
        if (state.auditLogs) {
          setAuditLogs(state.auditLogs);
        }
        if (state.activeSessions) {
          setActiveSessions(state.activeSessions);
        }
      }
    });

    return () => {
      unsubState();
      unsubEntity();
      unsubSessions();
      unsubForceSignout();
      unsubStatus();
    };
  }, []);

  // Fetch server-authoritative permissions and audit logs on load
  useEffect(() => {
    realtimeSync.getGroupPrivileges().then((privs) => {
      if (privs) setGroupPrivileges(privs);
    });
    if (currentUser && getUserRole(currentUser) === 'ADMIN') {
      realtimeSync.getAuditLogs().then((logs) => {
        if (logs) setAuditLogs(logs);
      }).catch(() => {});
    }
  }, [currentUser]);

  // Prompt password change if mustChangePassword is required
  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setIsForcedPasswordChange(true);
      setIsChangePasswordOpen(true);
    }
  }, [currentUser]);

  // Verify session on mount: require valid JWT session token
  useEffect(() => {
    try {
      const token = sessionStorage.getItem('aerotrack_client_jwt_token_v1');
      if (!token && currentUser) {
        setCurrentUser(null);
        sessionStorage.removeItem(STORAGE_KEY_AUTH_USER);
      }
    } catch {}
  }, []);

  // Global Real-time Synchronization & Local Persistence
  useEffect(() => {
    if (isRemoteSyncRef.current.drones) {
      isRemoteSyncRef.current.drones = false;
      return;
    }
    realtimeSync.mutate('drones', drones);
  }, [drones]);

  useEffect(() => {
    if (isRemoteSyncRef.current.checkouts) {
      isRemoteSyncRef.current.checkouts = false;
      return;
    }
    realtimeSync.mutate('checkouts', checkouts);
  }, [checkouts]);

  useEffect(() => {
    if (isRemoteSyncRef.current.users) {
      isRemoteSyncRef.current.users = false;
      return;
    }
  }, [users]);

  useEffect(() => {
    if (isRemoteSyncRef.current.batteries) {
      isRemoteSyncRef.current.batteries = false;
      return;
    }
    realtimeSync.mutate('batteries', batteries);
  }, [batteries]);

  useEffect(() => {
    if (isRemoteSyncRef.current.accessories) {
      isRemoteSyncRef.current.accessories = false;
      return;
    }
    realtimeSync.mutate('accessories', accessories);
  }, [accessories]);

  useEffect(() => {
    if (isRemoteSyncRef.current.streamingDevices) {
      isRemoteSyncRef.current.streamingDevices = false;
      return;
    }
    realtimeSync.mutate('streamingDevices', streamingDevices);
  }, [streamingDevices]);

  useEffect(() => {
    if (isRemoteSyncRef.current.notifications) {
      isRemoteSyncRef.current.notifications = false;
      return;
    }
    realtimeSync.mutate('notifications', notifications);
  }, [notifications]);

  useEffect(() => {
    if (isRemoteSyncRef.current.handoverForms) {
      isRemoteSyncRef.current.handoverForms = false;
      return;
    }
    realtimeSync.mutate('handoverForms', handoverForms);
  }, [handoverForms]);

  useEffect(() => {
    if (isRemoteSyncRef.current.incidentReports) {
      isRemoteSyncRef.current.incidentReports = false;
      return;
    }
    realtimeSync.mutate('incidentReports' as any, incidentReports);
  }, [incidentReports]);

  useEffect(() => {
    if (isRemoteSyncRef.current.confiscatedDrones) {
      isRemoteSyncRef.current.confiscatedDrones = false;
      return;
    }
    realtimeSync.mutate('confiscatedDrones' as any, confiscatedDrones);
  }, [confiscatedDrones]);

  useEffect(() => {
    const onError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      setToastMessage(message);
      setTimeout(()=>setToastMessage(prev=>prev===message?null:prev),7000);
    };
    window.addEventListener('fleet-save-error',onError);
    return ()=>window.removeEventListener('fleet-save-error',onError);
  }, []);
  // Registered after synchronization effects, so success waits for durable commit.
  useEffect(() => {
    if (!requestedToast) return;
    let cancelled=false;
    realtimeSync.whenSettled().then((saved: boolean)=>{
      if (cancelled || !saved) return;
      setToastMessage(requestedToast.message);
      setTimeout(()=>setToastMessage(prev=>prev===requestedToast.message?null:prev),3500);
    });
    return ()=>{cancelled=true;};
  }, [requestedToast]);

  const handleSaveConfiscatedDrone = (report: ConfiscatedDroneReport) => {
    setConfiscatedDrones((prev) => {
      const idx = prev.findIndex((r) => r.id === report.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = report;
        return copy;
      }
      return [report, ...prev];
    });
    showToast(`Confiscated Drone Report ${report.srNumber} (LR #${report.lrNumber}) saved.`);
  };

  const handleDeleteConfiscatedDrone = (reportId: string) => {
    const target = confiscatedDrones.find((r) => r.id === reportId);
    setConfiscatedDrones((prev) => prev.filter((r) => r.id !== reportId));
    showToast(`Confiscated Drone Report ${target?.srNumber || reportId} deleted.`);
  };

  const handleSaveIncidentReport = (report: IncidentReportRecord, updateDroneStatus?: DroneStatus) => {
    setIncidentReports((prev) => {
      const idx = prev.findIndex((r) => r.id === report.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = report;
        return copy;
      }
      return [report, ...prev];
    });

    if (updateDroneStatus && report.droneName) {
      if (updateDroneStatus === 'CRASHED' || updateDroneStatus === 'MISSING') {
        showToast(`Asset status change to ${updateDroneStatus} requires designated officer approval via Incident Report.`);
      } else {
        setDrones((prevDrones) =>
          prevDrones.map((d) =>
            d.droneName === report.droneName || d.id === report.droneId
              ? { ...d, status: updateDroneStatus }
              : d
          )
        );
      }
    }

    showToast(`Incident Accident Report ${report.srReference} saved successfully.`);
  };

  const handleDeleteIncidentReport = (reportId: string) => {
    const target = incidentReports.find((r) => r.id === reportId);
    setIncidentReports((prev) => prev.filter((r) => r.id !== reportId));
    showToast(`Incident report ${target?.srReference || reportId} deleted.`);
  };

  const handleConfirmIncidentReport = (
    incidentReport: IncidentReportRecord,
    targetOfficer: UserItem,
    remarks: string,
    target: IncidentAssetTarget
  ) => {
    // 1. Add or update incident report in incident reports collection
    setIncidentReports((prev) => {
      const exists = prev.some((r) => r.id === incidentReport.id || r.srReference === incidentReport.srReference);
      if (exists) {
        return prev.map((r) => (r.id === incidentReport.id || r.srReference === incidentReport.srReference ? incidentReport : r));
      }
      return [incidentReport, ...prev];
    });

    // 2. Note: Strictly, Changing status of assets will not take effect without officer approval!
    // Therefore, asset inventory status remains in its previous operational state until the designated officer
    // evaluates and approves the request in the Notifications approval workflow.

    // 3. Dispatch INCIDENT_APPROVAL_REQUEST notification to target officer
    const notifId = `notif-inc-${Date.now()}`;
    const assetName =
      target.itemType === 'DRONE'
        ? (target.item as DroneItem).droneName
        : target.itemType === 'BATTERY'
        ? `Battery ${(target.item as BatteryItem).serialNumber}`
        : target.itemType === 'ACCESSORY'
        ? (target.item as AccessoryItem).name
        : (target.item as StreamingDeviceItem).deviceName;

    const newNotification: NotificationMessage = {
      id: notifId,
      type: 'INCIDENT_APPROVAL_REQUEST',
      title: `Incident Approval: ${incidentReport.srReference} - ${assetName} (${target.newStatus})`,
      message:
        remarks ||
        `Asset "${assetName}" was reported ${target.newStatus}. Official Incident Accident Report ${incidentReport.srReference} has been filed and dispatched for officer evaluation. Changing status of asset will take effect only upon officer approval.`,
      senderId: currentUser?.id || 'operator',
      senderName: currentUser?.rank ? `${currentUser.rank} ${currentUser.name}` : currentUser?.name || 'Field Operator',
      senderClass: currentUser?.userClass || 'TECHNICIAN',
      senderEmail: currentUser?.email || 'command@moi.gov.qa',
      targetOfficerId: targetOfficer.id,
      targetOfficerName: targetOfficer.name,
      targetOfficerEmail: targetOfficer.email,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'PENDING',
      incidentReport,
      changeDetails: {
        itemType: target.itemType,
        action: 'STATUS_CHANGE',
        itemId: target.item.id,
        itemIdentifier: assetName,
        summary: `Asset ${assetName} status changed from ${target.previousStatus} to ${target.newStatus} with Incident Report ${incidentReport.srReference}`,
        diffs: [{ fieldName: 'status', label: 'Operational Status', oldValue: target.previousStatus, newValue: target.newStatus }],
        previousData: target.item,
        proposedData: { ...target.item, status: target.newStatus },
      },
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // Check if there are further incident asset targets in the queue
    if (incidentAssetQueue.length > 0) {
      const nextTarget = incidentAssetQueue[0];
      setIncidentAssetQueue((prev) => prev.slice(1));
      setIncidentAssetTarget({
        ...nextTarget,
        queueIndex: (target.queueIndex || 1) + 1,
        totalInQueue: target.totalInQueue || incidentAssetQueue.length + 1,
      });
      setIsIncidentModalOpen(true);
      showToast(
        `Incident Report ${incidentReport.srReference} submitted to officer. Next: Completing Incident Report for ${
          (nextTarget.item as any).droneName || (nextTarget.item as any).name || (nextTarget.item as any).serialNumber
        }...`
      );
    } else {
      setIsIncidentModalOpen(false);
      setIncidentAssetTarget(null);
      showToast(
        `Incident Report ${incidentReport.srReference} submitted to ${targetOfficer.name}. Asset status change is pending officer approval.`
      );
    }
  };

  const handleOpenDraftIncidentModal = (report: IncidentReportRecord) => {
    const clean = (s?: string) => (s || '').trim().toLowerCase();
    const repName = clean(report.droneName);
    const repSN = clean(report.aircraftSN);

    const matchedDrone = drones.find((d) => {
      const dSN = clean(d.droneSN);
      const rSN = clean(d.remoteSN);
      const dName = clean(d.droneName);
      return (
        (report.droneId && d.id === report.droneId) ||
        (repSN && (repSN === dSN || repSN === rSN)) ||
        (repName && (dName === repName || repName.includes(dSN) || dSN.includes(repName)))
      );
    });

    const matchedBattery = !matchedDrone
      ? batteries.find((b) => (repSN && clean(b.serialNumber) === repSN) || (repName && repName.includes(clean(b.serialNumber))))
      : null;

    const matchedAccessory = !matchedDrone && !matchedBattery
      ? accessories.find((a) => (repSN && clean(a.serialNumber) === repSN) || (repName && clean(a.name) === repName))
      : null;

    const matchedStream = !matchedDrone && !matchedBattery && !matchedAccessory
      ? streamingDevices.find((s) => (repSN && clean(s.serialNumber) === repSN) || (repName && clean(s.deviceName) === repName))
      : null;

    const itemType = matchedDrone ? 'DRONE' : matchedBattery ? 'BATTERY' : matchedAccessory ? 'ACCESSORY' : matchedStream ? 'STREAMING_DEVICE' : 'DRONE';
    const item = matchedDrone || matchedBattery || matchedAccessory || matchedStream || {
      id: report.droneId || `drone-${Date.now()}`,
      model: report.droneName,
      droneName: report.droneName,
      droneSN: report.aircraftSN,
      remoteSN: report.remoteSN,
      email: 'ops@moi.gov.qa',
      department: (report.department as any) || 'SSOC',
      status: 'ACTIVE',
    };

    setIncidentAssetTarget({
      itemType: itemType as any,
      item: item as any,
      newStatus: (report.markDroneStatus as any) || (report.severity === 'CRITICAL' ? 'CRASHED' : 'MISSING'),
      previousStatus: (item as any).status || 'ACTIVE',
      draftReportId: report.id,
      draftSrReference: report.srReference,
      draftPhotos: report.photos || [],
    });
    setIsIncidentModalOpen(true);
  };

  const showToast = (msg: string) => setRequestedToast({message:msg,nonce:Date.now()});

  // Counts
  const activeDronesCount = drones.filter((d) => d.status === 'ACTIVE').length;
  const activeCheckoutsCount = checkouts.filter((c) => c.status === 'CHECKED_OUT').length;
  const pendingApprovalsCount = notifications.filter((n) => n.status === 'PENDING').length;
  const officerUsers = users.filter((u) => canApproveRequests(groupPrivileges,u));

  // Technician Submitting Approval Request
  const handleSubmitTechnicianApproval = (targetOfficer: UserItem, remarks: string) => {
    if (!pendingChange || !currentUser) return;

    const notifId = `notif-req-${Date.now()}`;
    const isUser = pendingChange.itemType === 'USER';
    const newNotification: NotificationMessage = {
      id: notifId,
      type: 'CHANGE_APPROVAL_REQUEST',
      title: `Approval Required: ${pendingChange.summary}`,
      message:
        remarks ||
        `${currentUser.userClass === 'TECHNICIAN' ? 'Technician' : 'Personnel'} ${currentUser.name} requested ${pendingChange.action.toLowerCase()} on ${isUser ? 'personnel directory' : pendingChange.itemType.toLowerCase()} "${pendingChange.itemIdentifier}". Officer sign-off is required before ${isUser ? 'personnel directory is updated' : 'inventory data can be modified'}.`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderClass: currentUser.userClass || 'TECHNICIAN',
      senderEmail: currentUser.email,
      targetOfficerId: targetOfficer.id,
      targetOfficerName: targetOfficer.name,
      targetOfficerEmail: targetOfficer.email,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'PENDING',
      changeDetails: pendingChange,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    setIsApprovalModalOpen(false);
    setPendingChange(null);
    showToast(`Approval request dispatched to ${targetOfficer.name}. Notification queued in Notifications Tab.`);
  };

  // Officer Approving Notification (Only Designated Approving Officer)
  const handleApproveNotification = (notificationId: string) => {
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif) return;
    if (notif.changeDetails?.itemType === 'USER') { showToast('This old personnel request cannot be approved. An administrator must make the change in Users; reject the old request.'); return; }

    // Strict authorization: Only the designated approving officer can approve
    const isDesignated =
      currentUser &&
      (currentUser.id === notif.targetOfficerId ||
       currentUser.employeeId === notif.targetOfficerId ||
       (currentUser.email && notif.targetOfficerEmail && currentUser.email.toLowerCase() === notif.targetOfficerEmail.toLowerCase()) ||
       (notif.targetOfficerName && currentUser.name && notif.targetOfficerName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
       (currentUser.employeeId && notif.targetOfficerName && notif.targetOfficerName.includes(currentUser.employeeId)));

    if (!isDesignated || !canApproveRequests(groupPrivileges,currentUser)) {
      showToast(`Unauthorized: Only designated officer (${notif.targetOfficerName}) can approve this change.`);
      return;
    }

    const reviewerName = currentUser
      ? currentUser.rank
        ? `${currentUser.rank} (${currentUser.employeeId})`
        : currentUser.name
      : 'Flight Operations Officer';

    // Handle Handover Form Approval
    if (notif.type === 'HANDOVER_APPROVAL_REQUEST' || notif.handoverForm) {
      const hof = notif.handoverForm;
      if (hof) {
        setHandoverForms((prev) => {
          const exists = prev.some((f) => f.srNumber === hof.srNumber || f.id === hof.id);
          const updatedRecord: HandoverFormRecord = {
            ...hof,
            status: 'ISSUED',
            issuedAuthorityName: reviewerName,
            dateIssued: new Date().toLocaleDateString(),
          };
          return exists
            ? prev.map((f) => (f.srNumber === hof.srNumber || f.id === hof.id ? updatedRecord : f))
            : [updatedRecord, ...prev];
        });
      }

      const updatedNotifs = notifications.map((n) => {
        if (n.id === notificationId) {
          return {
            ...n,
            status: 'APPROVED' as NotificationStatus,
            reviewedBy: reviewerName,
            reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        return n;
      });

      const confirmNotice: NotificationMessage = {
        id: `notif-appr-hof-${Date.now()}`,
        type: 'HANDOVER_APPROVED' as const,
        title: `Approved & Issued: ${hof?.srNumber || 'Handover Sheet'}`,
        message: `UAV Handover Form ${hof?.srNumber || ''} for recipient ${hof?.recipientName || 'Officer'} has been officially authorized and issued by designated officer ${reviewerName}. Equipment custody is active.`,
        senderId: currentUser?.id || 'officer',
        senderName: reviewerName,
        senderClass: 'OFFICER',
        senderEmail: currentUser?.email || 'command@moi.gov.qa',
        targetOfficerId: notif.senderId,
        targetOfficerName: notif.senderName,
        targetOfficerEmail: notif.senderEmail,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'READ' as const,
        handoverForm: hof ? { ...hof, status: 'ISSUED' as const } : undefined,
      };

      setNotifications([confirmNotice, ...updatedNotifs]);
      showToast(`Approved & Issued Handover Form ${hof?.srNumber || ''}.`);
      return;
    }

    // Handle Incident Report Approval
    if (notif.type === 'INCIDENT_APPROVAL_REQUEST' || notif.incidentReport) {
      const inc = notif.incidentReport;
      if (inc) {
        setIncidentReports((prev) =>
          prev.map((r) =>
            r.id === inc.id || r.srReference === inc.srReference
              ? {
                  ...r,
                  status: 'UNDER_INVESTIGATION',
                  evaluationStatus: `OFFICER APPROVED & EVALUATED (${r.markDroneStatus || 'CRASHED / MISSING'})`,
                  receivedEvaluatedBy: reviewerName,
                  reviewDate: new Date().toLocaleDateString(),
                  evalDateTime: `${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                  updatedAt: new Date().toISOString(),
                }
              : r
          )
        );
      }

      // Officially confirm and apply the approved asset status change to inventory
      if (notif.changeDetails?.proposedData) {
        const { itemType, itemId, proposedData } = notif.changeDetails;
        const newStatus = proposedData.status || notif.incidentReport?.markDroneStatus || 'CRASHED';
        if (itemType === 'DRONE') {
          setDrones((prev) =>
            prev.map((d) => (d.id === itemId || (inc && d.droneName === inc.droneName) ? { ...d, status: newStatus } : d))
          );
        } else if (itemType === 'BATTERY') {
          setBatteries((prev) => prev.map((b) => (b.id === itemId ? { ...b, status: newStatus } : b)));
        } else if (itemType === 'ACCESSORY') {
          setAccessories((prev) => prev.map((a) => (a.id === itemId ? { ...a, status: newStatus } : a)));
        } else if (itemType === 'STREAMING_DEVICE') {
          setStreamingDevices((prev) => prev.map((s) => (s.id === itemId ? { ...s, status: newStatus } : s)));
        }
      }

      const updatedNotifs = notifications.map((n) => {
        if (n.id === notificationId) {
          return {
            ...n,
            status: 'APPROVED' as NotificationStatus,
            reviewedBy: reviewerName,
            reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        return n;
      });

      const confirmNotice: NotificationMessage = {
        id: `notif-appr-inc-${Date.now()}`,
        type: 'INCIDENT_APPROVED' as const,
        title: `Approved: Incident Report ${inc?.srReference || ''}`,
        message: `Incident Report ${inc?.srReference || ''} for asset "${inc?.droneName || 'Asset'}" has been officially authorized, evaluated and signed off by designated officer ${reviewerName}. Flight safety investigation and damage assessment are active.`,
        senderId: currentUser?.id || 'officer',
        senderName: reviewerName,
        senderClass: 'OFFICER',
        senderEmail: currentUser?.email || 'command@moi.gov.qa',
        targetOfficerId: notif.senderId,
        targetOfficerName: notif.senderName,
        targetOfficerEmail: notif.senderEmail,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'READ' as const,
        incidentReport: inc,
      };

      setNotifications([confirmNotice, ...updatedNotifs]);
      showToast(`Approved & evaluated Incident Report ${inc?.srReference || ''}.`);
      return;
    }

    if (!notif.changeDetails) return;
    const { itemType, action, itemId, proposedData } = notif.changeDetails;

    // Apply the change to inventory data
    if (itemType === 'DRONE') {
      if (action === 'CREATE') {
        setDrones((prev) => [proposedData, ...prev]);
      } else if (action === 'UPDATE') {
        setDrones((prev) => prev.map((d) => (d.id === proposedData.id ? proposedData : d)));
      } else if (action === 'DELETE') {
        setDrones((prev) => prev.filter((d) => d.id !== itemId));
      } else if (action === 'STATUS_CHANGE') {
        setDrones((prev) => prev.map((d) => (d.id === itemId ? { ...d, status: proposedData.status } : d)));
      }
    } else if (itemType === 'BATTERY') {
      if (action === 'CREATE') {
        setBatteries((prev) => [proposedData, ...prev]);
      } else if (action === 'UPDATE') {
        setBatteries((prev) => prev.map((b) => (b.id === proposedData.id ? proposedData : b)));
      } else if (action === 'DELETE') {
        setBatteries((prev) => prev.filter((b) => b.id !== itemId));
      }
    } else if (itemType === 'ACCESSORY') {
      if (action === 'CREATE') {
        setAccessories((prev) => [proposedData, ...prev]);
      } else if (action === 'UPDATE') {
        setAccessories((prev) => prev.map((a) => (a.id === proposedData.id ? proposedData : a)));
      } else if (action === 'DELETE') {
        setAccessories((prev) => prev.filter((a) => a.id !== itemId));
      }
    } else if (itemType === 'STREAMING_DEVICE') {
      if (action === 'CREATE') {
        setStreamingDevices((prev) => [proposedData, ...prev]);
      } else if (action === 'UPDATE') {
        setStreamingDevices((prev) => prev.map((s) => (s.id === proposedData.id ? proposedData : s)));
      } else if (action === 'DELETE') {
        setStreamingDevices((prev) => prev.filter((s) => s.id !== itemId));
      }
    } else if (itemType === 'BATCH_DRONES') {
      const droneList: DroneItem[] = Array.isArray(proposedData)
        ? proposedData
        : proposedData?.drones || [];
      const replaceAll = !!proposedData?.replaceAll;

      if (replaceAll) {
        setDrones(droneList);
      } else {
        setDrones((prev) => {
          const existingSNs = new Set(prev.map((d) => d.droneSN.trim().toUpperCase()));
          const uniqueNew = droneList.filter((d) => !existingSNs.has(d.droneSN.trim().toUpperCase()));
          const updatedExisting = prev.map((d) => {
            const match = droneList.find((n) => n.droneSN.trim().toUpperCase() === d.droneSN.trim().toUpperCase());
            return match ? { ...d, ...match, id: d.id } : d;
          });
          return [...uniqueNew, ...updatedExisting];
        });
      }
    }

    // Update notification status to APPROVED
    const updatedNotifs = notifications.map((n) => {
      if (n.id === notificationId) {
        return {
          ...n,
          status: 'APPROVED' as NotificationStatus,
          reviewedBy: reviewerName,
          reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
      }
      return n;
    });

    const isBatchDrones = notif.changeDetails.itemType === 'BATCH_DRONES';
    // Create an approval acknowledgement message
    const confirmNotice: NotificationMessage = {
      id: `notif-appr-${Date.now()}`,
      type: 'CHANGE_APPROVED',
      title: `Approved: ${notif.changeDetails.summary}`,
      message: `The ${isBatchDrones ? 'batch drone upload' : 'inventory change'} request on ${notif.changeDetails.itemType} "${notif.changeDetails.itemIdentifier}" requested by ${notif.senderName} has been officially approved by ${reviewerName}. The inventory records have been updated.`,
      senderId: currentUser?.id || 'officer',
      senderName: reviewerName,
      senderClass: 'OFFICER',
      senderEmail: currentUser?.email || 'command@moi.gov.qa',
      targetOfficerId: notif.senderId,
      targetOfficerName: notif.senderName,
      targetOfficerEmail: notif.senderEmail,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'READ',
    };

    setNotifications([confirmNotice, ...updatedNotifs]);
    showToast(`Approved ${isBatchDrones ? 'batch upload of' : 'change on'} ${notif.changeDetails.itemIdentifier}.`);
  };

  // Officer Rejecting Notification (Only Designated Approving Officer)
  const handleRejectNotification = (notificationId: string, reason?: string) => {
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif) return;

    // Strict authorization: Only the designated approving officer can reject
    const isDesignated =
      currentUser &&
      (currentUser.id === notif.targetOfficerId ||
       currentUser.employeeId === notif.targetOfficerId ||
       (currentUser.email && notif.targetOfficerEmail && currentUser.email.toLowerCase() === notif.targetOfficerEmail.toLowerCase()) ||
       (notif.targetOfficerName && currentUser.name && notif.targetOfficerName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
       (currentUser.employeeId && notif.targetOfficerName && notif.targetOfficerName.includes(currentUser.employeeId)));

    if (!isDesignated || !canApproveRequests(groupPrivileges,currentUser)) {
      showToast(`Unauthorized: Only designated officer (${notif.targetOfficerName}) can reject this change.`);
      return;
    }

    const reviewerName = currentUser
      ? currentUser.rank
        ? `${currentUser.rank} (${currentUser.employeeId})`
        : currentUser.name
      : 'Flight Operations Officer';

    // Handle Handover Form Rejection
    if (notif.type === 'HANDOVER_APPROVAL_REQUEST' || notif.handoverForm) {
      const hof = notif.handoverForm;
      if (hof) {
        setHandoverForms((prev) =>
          prev.map((f) =>
            f.srNumber === hof.srNumber || f.id === hof.id
              ? {
                  ...f,
                  status: 'REJECTED',
                  returnNotes: reason || 'Declined during officer review.',
                }
              : f
          )
        );
      }

      const updatedNotifs = notifications.map((n) => {
        if (n.id === notificationId) {
          return {
            ...n,
            status: 'REJECTED' as NotificationStatus,
            reviewedBy: reviewerName,
            reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            reviewComment: reason || 'Declined during officer review.',
          };
        }
        return n;
      });

      const rejectNotice: NotificationMessage = {
        id: `notif-rej-hof-${Date.now()}`,
        type: 'HANDOVER_REJECTED' as const,
        title: `Declined Handover Sheet: ${hof?.srNumber || 'Handover Sheet'}`,
        message: `Handover Form ${hof?.srNumber || ''} requested by ${notif.senderName} was declined by designated officer ${reviewerName}.${reason ? ` Reason: "${reason}"` : ''}`,
        senderId: currentUser?.id || 'officer',
        senderName: reviewerName,
        senderClass: 'OFFICER',
        senderEmail: currentUser?.email || 'command@moi.gov.qa',
        targetOfficerId: notif.senderId,
        targetOfficerName: notif.senderName,
        targetOfficerEmail: notif.senderEmail,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'READ' as const,
        reviewComment: reason,
        handoverForm: hof ? { ...hof, status: 'REJECTED' as const } : undefined,
      };

      setNotifications([rejectNotice, ...updatedNotifs]);
      showToast(`Handover Form ${hof?.srNumber || ''} was declined.`);
      return;
    }

    // Handle Incident Report Rejection
    if (notif.type === 'INCIDENT_APPROVAL_REQUEST' || notif.incidentReport) {
      const inc = notif.incidentReport;
      if (inc) {
        setIncidentReports((prev) =>
          prev.map((r) =>
            r.id === inc.id || r.srReference === inc.srReference
              ? {
                  ...r,
                  status: 'DRAFT',
                  evaluationStatus: `DECLINED BY OFFICER: ${reason || 'Investigation requested'}`,
                  receivedEvaluatedBy: reviewerName,
                  updatedAt: new Date().toISOString(),
                }
              : r
          )
        );
      }

      // Revert asset status back to previous status if change is declined
      if (notif.changeDetails?.previousData) {
        const { itemType, itemId, previousData } = notif.changeDetails;
        const prevStatus = previousData.status || 'ACTIVE';
        if (itemType === 'DRONE') {
          setDrones((prev) =>
            prev.map((d) => (d.id === itemId || (inc && d.droneName === inc.droneName) ? { ...d, status: prevStatus } : d))
          );
        } else if (itemType === 'BATTERY') {
          setBatteries((prev) => prev.map((b) => (b.id === itemId ? { ...b, status: prevStatus } : b)));
        } else if (itemType === 'ACCESSORY') {
          setAccessories((prev) => prev.map((a) => (a.id === itemId ? { ...a, status: prevStatus } : a)));
        } else if (itemType === 'STREAMING_DEVICE') {
          setStreamingDevices((prev) => prev.map((s) => (s.id === itemId ? { ...s, status: prevStatus } : s)));
        }
      }

      const updatedNotifs = notifications.map((n) => {
        if (n.id === notificationId) {
          return {
            ...n,
            status: 'REJECTED' as NotificationStatus,
            reviewedBy: reviewerName,
            reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            reviewComment: reason || 'Declined during officer review.',
          };
        }
        return n;
      });

      const rejectNotice: NotificationMessage = {
        id: `notif-rej-inc-${Date.now()}`,
        type: 'INCIDENT_REJECTED' as const,
        title: `Declined: Incident Report ${inc?.srReference || ''}`,
        message: `Incident Report ${inc?.srReference || ''} on asset "${inc?.droneName || 'Asset'}" submitted by ${notif.senderName} was declined by designated officer ${reviewerName}.${reason ? ` Reason: "${reason}"` : ''}`,
        senderId: currentUser?.id || 'officer',
        senderName: reviewerName,
        senderClass: 'OFFICER',
        senderEmail: currentUser?.email || 'command@moi.gov.qa',
        targetOfficerId: notif.senderId,
        targetOfficerName: notif.senderName,
        targetOfficerEmail: notif.senderEmail,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'READ' as const,
        reviewComment: reason,
        incidentReport: inc,
      };

      setNotifications([rejectNotice, ...updatedNotifs]);
      showToast(`Incident Report ${inc?.srReference || ''} was declined by officer.`);
      return;
    }

    const reviewerNameOriginal = currentUser
      ? currentUser.rank
        ? `${currentUser.rank} (${currentUser.employeeId})`
        : currentUser.name
      : 'Flight Operations Officer';

    const updatedNotifs = notifications.map((n) => {
      if (n.id === notificationId) {
        return {
          ...n,
          status: 'REJECTED' as NotificationStatus,
          reviewedBy: reviewerName,
          reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          reviewComment: reason || 'Declined during officer review.',
        };
      }
      return n;
    });

    const isUserChange = notif.changeDetails?.itemType === 'USER';
    const rejectNotice: NotificationMessage = {
      id: `notif-rej-${Date.now()}`,
      type: 'CHANGE_REJECTED',
      title: `Rejected: ${notif.changeDetails?.summary || notif.title}`,
      message: `${isUserChange ? 'Personnel registration' : 'Change request'} on ${notif.changeDetails?.itemIdentifier || 'item'} submitted by ${notif.senderName} was declined by ${reviewerName}.${reason ? ` Reason: "${reason}"` : ''}`,
      senderId: currentUser?.id || 'officer',
      senderName: reviewerName,
      senderClass: 'OFFICER',
      senderEmail: currentUser?.email || 'command@moi.gov.qa',
      targetOfficerId: notif.senderId,
      targetOfficerName: notif.senderName,
      targetOfficerEmail: notif.senderEmail,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'READ',
      reviewComment: reason,
    };

    setNotifications([rejectNotice, ...updatedNotifs]);
    showToast(`${isUserChange ? 'Personnel registration' : 'Change request'} was declined by officer.`);
  };

  // Delete/Dismiss Notification Message
  const handleDeleteNotification = (id: string) => {
    if (!hasPrivilege(groupPrivileges, currentUser, 'NOTIFICATIONS_DISMISS_MESSAGE')) {
      showToast('Permission restricted: Your group does not have the "Dismiss message" permission.');
      return;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast('Message removed from notification queue.');
  };

  // Switch Active User (Role testing)
  const handleSwitchUser = (user: UserItem) => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    } catch (err) {
      console.error('Failed to save auth user', err);
    }
    const tabOrder: SidebarTab[] = ['DASHBOARD', 'INVENTORY', 'IN_OUT_FORM', 'USERS', 'NOTIFICATIONS'];
    if (!canViewTab(groupPrivileges, user, activeTab)) {
      const firstAllowed = tabOrder.find((t) => canViewTab(groupPrivileges, user, t));
      if (firstAllowed) {
        setActiveTab(firstAllowed);
      }
    }
    showToast(`Switched active user to ${user.name} (${getUserRole(user)}).`);
  };

  // Drone Handlers
  const handleSaveDrone = (drone: DroneItem, targetOfficer?: UserItem, remarks?: string) => {
    const exists = drones.some((d) => d.id === drone.id);
    if (drones.find(item => item.id === drone.id)?.status === 'CRASHED' && drone.status !== 'CRASHED') {
      showToast('CRASHED is permanent and cannot be changed.'); return;
    }

    // If adding a new drone, require officer approval if technician OR an approving officer is designated
    if (!exists) {
      if (!canApproveRequests(groupPrivileges,currentUser) || targetOfficer) {
        if (targetOfficer) {
          const notifId = `notif-req-${Date.now()}`;
          const newNotification: NotificationMessage = {
            id: notifId,
            type: 'CHANGE_APPROVAL_REQUEST',
            title: `Approval Required: Add Drone ${drone.droneName} (${drone.model})`,
            message:
              remarks ||
              `${currentUser?.userClass === 'TECHNICIAN' ? 'Technician' : 'Personnel'} ${currentUser?.name || 'Operator'} requested officer approval to register new drone ${drone.droneName} (${drone.model} · SN: ${drone.droneSN}) to the ${drone.department} drones inventory. Officer sign-off is required to activate and commit record.`,
            senderId: currentUser?.id || 'user',
            senderName: currentUser?.name || 'Operator',
            senderClass: currentUser?.userClass || 'TECHNICIAN',
            senderEmail: currentUser?.email || 'command@moi.gov.qa',
            targetOfficerId: targetOfficer.id,
            targetOfficerName: targetOfficer.name,
            targetOfficerEmail: targetOfficer.email,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            status: 'PENDING',
            changeDetails: {
              itemType: 'DRONE',
              action: 'CREATE',
              itemId: drone.id,
              itemIdentifier: `${drone.droneName} (${drone.droneSN})`,
              summary: `Add New Drone ${drone.droneName} (${drone.model} · ${drone.droneSN})`,
              previousData: null,
              proposedData: drone,
            },
          };

          setNotifications((prev) => [newNotification, ...prev]);
          showToast(`Approval request to add drone ${drone.droneName} sent to ${targetOfficer.name}.`);
          setDroneToEdit(null);
          setIsAddDroneOpen(false);
          return;
        }

        // Fallback to OfficerApprovalModal if technician without targetOfficer
        setPendingChange({
          itemType: 'DRONE',
          action: 'CREATE',
          itemId: drone.id,
          itemIdentifier: `${drone.droneName} (${drone.droneSN})`,
          summary: `Add New Drone ${drone.droneName} (${drone.model})`,
          previousData: null,
          proposedData: drone,
        });
        setIsApprovalModalOpen(true);
        setDroneToEdit(null);
        setIsAddDroneOpen(false);
        return;
      }
    }

    // Technician interception: requires officer approval for edits
    if (!canApproveRequests(groupPrivileges,currentUser) && exists) {
      const prevDrone = drones.find((d) => d.id === drone.id);
      const diffs: InventoryFieldDiff[] = [];
      if (prevDrone) {
        if (prevDrone.status !== drone.status) diffs.push({ fieldName: 'status', label: 'Operational Status', oldValue: prevDrone.status, newValue: drone.status });
        if (prevDrone.department !== drone.department) diffs.push({ fieldName: 'department', label: 'Department', oldValue: prevDrone.department, newValue: drone.department });
        if (prevDrone.droneName !== drone.droneName) diffs.push({ fieldName: 'droneName', label: 'Drone Callsign', oldValue: prevDrone.droneName, newValue: drone.droneName });
        if (prevDrone.droneSN !== drone.droneSN) diffs.push({ fieldName: 'droneSN', label: 'Drone Serial', oldValue: prevDrone.droneSN, newValue: drone.droneSN });
        if (prevDrone.remoteSN !== drone.remoteSN) diffs.push({ fieldName: 'remoteSN', label: 'Remote Serial', oldValue: prevDrone.remoteSN, newValue: drone.remoteSN });
        if (prevDrone.email !== drone.email) diffs.push({ fieldName: 'email', label: 'Custody Email', oldValue: prevDrone.email, newValue: drone.email });
        if (prevDrone.model !== drone.model) diffs.push({ fieldName: 'model', label: 'Model', oldValue: prevDrone.model, newValue: drone.model });
      }

      setPendingChange({
        itemType: 'DRONE',
        action: 'UPDATE',
        itemId: drone.id,
        itemIdentifier: drone.droneName || drone.model,
        summary: `Update Drone ${drone.droneName} (${drone.model})`,
        diffs: exists ? diffs : undefined,
        previousData: prevDrone,
        proposedData: drone,
      });
      setIsApprovalModalOpen(true);
      setDroneToEdit(null);
      setIsAddDroneOpen(false);
      return;
    }

    if (exists) {
      const prevDrone = drones.find((d) => d.id === drone.id);
      if (prevDrone && (drone.status === 'CRASHED' || drone.status === 'MISSING') && prevDrone.status !== drone.status) {
        setIncidentAssetTarget({
          itemType: 'DRONE',
          item: prevDrone,
          newStatus: drone.status as 'CRASHED' | 'MISSING',
          previousStatus: prevDrone.status,
        });
        setIsIncidentModalOpen(true);
        setDroneToEdit(null);
        setIsAddDroneOpen(false);
        return;
      }
      setDrones((prev) => prev.map((d) => (d.id === drone.id ? drone : d)));
      showToast(`Updated record for ${drone.droneName} (${drone.model}).`);
    } else {
      setDrones((prev) => [drone, ...prev]);
      showToast(`Added ${drone.droneName} (${drone.model}) to ${drone.department} drones.`);
    }
    setDroneToEdit(null);
    setIsAddDroneOpen(false);
  };

  const handleDeleteDrone = (id: string) => {
    const target = drones.find((d) => d.id === id);

    if (!canApproveRequests(groupPrivileges,currentUser)) {
      setPendingChange({
        itemType: 'DRONE',
        action: 'DELETE',
        itemId: id,
        itemIdentifier: target?.droneName || id,
        summary: `Delete Drone ${target?.droneName || id} (${target?.model})`,
        previousData: target,
        proposedData: null,
      });
      setIsApprovalModalOpen(true);
      return;
    }

    setDrones((prev) => prev.filter((d) => d.id !== id));
    showToast(`Removed drone ${target?.droneName || 'unit'} from inventory.`);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    const target = drones.find((d) => d.id === id);
    if (!target) return;
    if (target.status === 'CRASHED') { showToast('CRASHED is permanent and cannot be changed.'); return; }

    // Any asset status changed to crashed or missing creates an incident report document and sends for officer approval
    if (newStatus === 'CRASHED' || newStatus === 'MISSING') {
      setIncidentAssetTarget({
        itemType: 'DRONE',
        item: target,
        newStatus,
        previousStatus: target.status,
      });
      setIsIncidentModalOpen(true);
      return;
    }

    if (!canApproveRequests(groupPrivileges,currentUser)) {
      setPendingChange({
        itemType: 'DRONE',
        action: 'STATUS_CHANGE',
        itemId: id,
        itemIdentifier: target?.droneName || id,
        summary: `Change status of ${target?.droneName} from ${target?.status} to ${newStatus}`,
        diffs: [{ fieldName: 'status', label: 'Operational Status', oldValue: target?.status, newValue: newStatus }],
        previousData: target,
        proposedData: target ? { ...target, status: newStatus } : { id, status: newStatus },
      });
      setIsApprovalModalOpen(true);
      return;
    }

    setDrones((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
    showToast(`Updated ${target?.droneName} status to ${newStatus}.`);
  };

  const handleOpenEdit = (drone: DroneItem) => {
    setDroneToEdit(drone);
    setIsAddDroneOpen(true);
  };

  // In / Out Handlers
  const handleCheckOutDrone = (recordData: Omit<CheckoutRecord, 'id'>) => {
    const newRecord: CheckoutRecord = {
      ...recordData,
      id: `chk-${Date.now()}`,
    };
    setCheckouts((prev) => [newRecord, ...prev]);
    showToast(`Dispatched ${newRecord.droneName} to ${newRecord.operatorName}.`);
  };

  const handleCheckInDrone = (checkoutId: string, batteryIn: number, remarks: string) => {
    const now = new Date();
    const formatTime = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins}`;
    };

    setCheckouts((prev) =>
      prev.map((c) => {
        if (c.id === checkoutId) {
          return {
            ...c,
            status: 'RETURNED',
            checkInTime: formatTime(now),
            batteryLevelIn: batteryIn,
            remarks: remarks || c.remarks,
          };
        }
        return c;
      })
    );
    const target = checkouts.find((c) => c.id === checkoutId);
    showToast(`Checked in ${target?.droneName || 'drone'} back into custody.`);
  };

  // User Handlers
  const handleAddUser = async (user: UserItem, targetOfficer?: UserItem, remarks?: string, initialPassword?: string) => {
    if (getUserRole(currentUser)!=='ADMIN') { showToast('Only an administrator can add users.'); return; }

    try {
      const res = await realtimeSync.createUser({
        employeeId: user.employeeId,
        qatarId: user.qatarId,
        rank: user.rank,
        userClass: user.userClass,
        userRole: user.userRole,
        groupId: user.groupId,
        name: user.name,
        mobileNumber: user.mobileNumber,
        email: user.email,
        department: user.department,
        initialPassword,
      });

      if (res && res.user) {
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === res.user.id || u.employeeId === res.user.employeeId);
          return exists ? prev.map((u) => (u.id === res.user.id ? res.user : u)) : [res.user, ...prev];
        });
      }
      showToast(`Registered new personnel: ${user.name} (${user.department}).`);
      return res;
    } catch (err: any) {
      console.error('Failed to create user on server:', err);
      showToast(err.message || 'Failed to create user on server.');
      throw err;
    }
  };

  const handleEditUser = async (user: UserItem) => {
    if (getUserRole(currentUser)!=='ADMIN' && currentUser?.id!==user.id) { showToast('Only an administrator can edit other users.'); return; }

    try {
      const res = await realtimeSync.updateUser(user.id, {
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        ...(getUserRole(currentUser) === 'ADMIN' ? {
          qatarId: user.qatarId,
          department: user.department,
          rank: user.rank,
          userClass: user.userClass,
          userRole: user.userRole,
          groupId: user.groupId || '',
          status: user.status,
        } : {}),
      });

      if (res && res.user) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? res.user : u)));
      } else {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
      }

      if (currentUser && (currentUser.id === user.id || currentUser.employeeId === user.employeeId)) {
        const updatedSelf = res?.user || user;
        setCurrentUser(updatedSelf);
        try {
          sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(updatedSelf));
        } catch (err) {
          console.error('Failed to sync auth user', err);
        }
      }
      showToast(`Updated record for ${user.name} on server.`);
    } catch (err: any) {
      console.error('Failed to update user on server:', err);
      showToast(err.message || 'Failed to update user.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (getUserRole(currentUser)!=='ADMIN') { showToast('Only an administrator can delete users.'); return; }

    try {
      await realtimeSync.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast(`Removed ${target?.name || 'user'} from directory.`);
    } catch (err: any) {
      console.error('Failed to delete user on server:', err);
      showToast(err.message || 'Failed to delete user.');
    }
  };

  const handleUpdateUserStatus = async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      const res = await realtimeSync.updateUserStatus(id, status);
      if (res && res.user) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, accountStatus: status } : u)));
      }
      showToast(`Account status updated to ${status}.`);
    } catch (err: any) {
      console.error('Failed to update account status:', err);
      showToast(err.message || 'Failed to update account status.');
    }
  };

  const handleAdminResetPassword = async (id: string) => {
    try {
      const res = await realtimeSync.adminResetPassword(id);
      showToast('Temporary credentials generated. Password change required upon login.');
      return res;
    } catch (err: any) {
      console.error('Failed to reset password:', err);
      showToast(err.message || 'Failed to reset password.');
      throw err;
    }
  };

  const handleRefreshAuditLogs = async () => {
    try {
      const logs = await realtimeSync.getAuditLogs();
      setAuditLogs(logs);
      showToast('Security audit trail refreshed.');
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      showToast(err.message || 'Failed to load audit logs.');
    }
  };

  // Battery Handlers
  const handleAddBattery = (battery: BatteryItem) => {
    if (!canApproveRequests(groupPrivileges,currentUser)) {
      setPendingChange({
        itemType: 'BATTERY',
        action: 'CREATE',
        itemId: battery.id,
        itemIdentifier: `${battery.batteryModel} (${battery.serialNumber})`,
        summary: `Register new Battery ${battery.batteryModel} (${battery.serialNumber})`,
        previousData: null,
        proposedData: battery,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setBatteries((prev) => [battery, ...prev]);
    showToast(`Registered battery ${battery.serialNumber} (${battery.batteryModel}).`);
  };

  const handleEditBattery = (battery: BatteryItem) => {
    const prev = batteries.find((b) => b.id === battery.id);
    if (prev?.status === 'CRASHED' && battery.status !== 'CRASHED') { showToast('CRASHED is permanent and cannot be changed.'); return; }
    if ((battery.status === 'CRASHED' || battery.status === 'MISSING') && prev && prev.status !== battery.status) {
      setIncidentAssetTarget({
        itemType: 'BATTERY',
        item: prev,
        newStatus: battery.status as 'CRASHED' | 'MISSING',
        previousStatus: prev.status,
      });
      setIsIncidentModalOpen(true);
      return;
    }

    if (!canApproveRequests(groupPrivileges,currentUser)) {
      const diffs: InventoryFieldDiff[] = [];
      if (prev) {
        if (prev.status !== battery.status) diffs.push({ fieldName: 'status', label: 'Status', oldValue: prev.status, newValue: battery.status });
        if (prev.cycleCount !== battery.cycleCount) diffs.push({ fieldName: 'cycleCount', label: 'Cycle Count', oldValue: prev.cycleCount, newValue: battery.cycleCount });
        if (prev.healthPercent !== battery.healthPercent) diffs.push({ fieldName: 'healthPercent', label: 'Health %', oldValue: `${prev.healthPercent}%`, newValue: `${battery.healthPercent}%` });
        if (prev.location !== battery.location) diffs.push({ fieldName: 'location', label: 'Location', oldValue: prev.location || '-', newValue: battery.location || '-' });
      }
      setPendingChange({
        itemType: 'BATTERY',
        action: 'UPDATE',
        itemId: battery.id,
        itemIdentifier: `${battery.batteryModel} (${battery.serialNumber})`,
        summary: `Update Battery ${battery.serialNumber}`,
        diffs,
        previousData: prev,
        proposedData: battery,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setBatteries((prev) => prev.map((b) => (b.id === battery.id ? battery : b)));
    showToast(`Updated battery ${battery.serialNumber}.`);
  };

  const handleDeleteBattery = (id: string) => {
    if (!hasPrivilege(groupPrivileges,currentUser,'INVENTORY_DELETE_BATTERY')) { showToast('Delete battery permission is required.'); return; }
    const target = batteries.find((b) => b.id === id);
    if (!canApproveRequests(groupPrivileges,currentUser)) {
      setPendingChange({
        itemType: 'BATTERY',
        action: 'DELETE',
        itemId: id,
        itemIdentifier: target?.serialNumber || id,
        summary: `Delete Battery ${target?.serialNumber}`,
        previousData: target,
        proposedData: null,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setBatteries((prev) => prev.filter((b) => b.id !== id));
    showToast(`Removed battery ${target?.serialNumber || 'unit'}.`);
  };

  // Accessory Handlers
  const handleAddAccessory = (acc: AccessoryItem) => {
    if (!canApproveRequests(groupPrivileges,currentUser)) {
      setPendingChange({
        itemType: 'ACCESSORY',
        action: 'CREATE',
        itemId: acc.id,
        itemIdentifier: `${acc.name} (${acc.serialNumber})`,
        summary: `Register new Accessory ${acc.name}`,
        previousData: null,
        proposedData: acc,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setAccessories((prev) => [acc, ...prev]);
    showToast(`Added accessory ${acc.name}.`);
  };

  const handleEditAccessory = (acc: AccessoryItem) => {
    const prev = accessories.find((a) => a.id === acc.id);
    if (prev?.status === 'CRASHED' && acc.status !== 'CRASHED') { showToast('CRASHED is permanent and cannot be changed.'); return; }
    if ((acc.status === 'CRASHED' || acc.status === 'MISSING') && prev && prev.status !== acc.status) {
      setIncidentAssetTarget({
        itemType: 'ACCESSORY',
        item: prev,
        newStatus: acc.status as 'CRASHED' | 'MISSING',
        previousStatus: prev.status,
      });
      setIsIncidentModalOpen(true);
      return;
    }

    if (!canApproveRequests(groupPrivileges,currentUser)) {
      const diffs: InventoryFieldDiff[] = [];
      if (prev) {
        if (prev.status !== acc.status) diffs.push({ fieldName: 'status', label: 'Status', oldValue: prev.status, newValue: acc.status });
        if (prev.condition !== acc.condition) diffs.push({ fieldName: 'condition', label: 'Condition', oldValue: prev.condition, newValue: acc.condition });
        if (prev.compatibleDrone !== acc.compatibleDrone) diffs.push({ fieldName: 'compatibleDrone', label: 'Compatible Drone', oldValue: prev.compatibleDrone, newValue: acc.compatibleDrone });
        if (prev.location !== acc.location) diffs.push({ fieldName: 'location', label: 'Location', oldValue: prev.location || '-', newValue: acc.location || '-' });
      }
      setPendingChange({
        itemType: 'ACCESSORY',
        action: 'UPDATE',
        itemId: acc.id,
        itemIdentifier: `${acc.name} (${acc.serialNumber})`,
        summary: `Update Accessory ${acc.name}`,
        diffs,
        previousData: prev,
        proposedData: acc,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setAccessories((prev) => prev.map((a) => (a.id === acc.id ? acc : a)));
    showToast(`Updated accessory ${acc.name}.`);
  };

  const handleDeleteAccessory = (id: string) => {
    if (!hasPrivilege(groupPrivileges,currentUser,'INVENTORY_DELETE_ACCESSORY')) { showToast('Delete accessory permission is required.'); return; }
    const target = accessories.find((a) => a.id === id);
    if (!canApproveRequests(groupPrivileges,currentUser)) {
      setPendingChange({
        itemType: 'ACCESSORY',
        action: 'DELETE',
        itemId: id,
        itemIdentifier: target?.name || id,
        summary: `Delete Accessory ${target?.name}`,
        previousData: target,
        proposedData: null,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setAccessories((prev) => prev.filter((a) => a.id !== id));
    showToast(`Removed accessory ${target?.name || 'unit'}.`);
  };

  // Streaming Device Handlers
  const handleAddStreamingDevice = (device: StreamingDeviceItem) => {
    if (!canApproveRequests(groupPrivileges,currentUser)) {
      setPendingChange({
        itemType: 'STREAMING_DEVICE',
        action: 'CREATE',
        itemId: device.id,
        itemIdentifier: `${device.deviceName} (${device.serialNumber})`,
        summary: `Register new Streaming Device ${device.deviceName}`,
        previousData: null,
        proposedData: device,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setStreamingDevices((prev) => [device, ...prev]);
    showToast(`Added streaming device ${device.deviceName}.`);
  };

  const handleEditStreamingDevice = (device: StreamingDeviceItem) => {
    const prev = streamingDevices.find((s) => s.id === device.id);
    if (prev?.status === 'CRASHED' && device.status !== 'CRASHED') { showToast('CRASHED is permanent and cannot be changed.'); return; }
    if ((device.status === 'CRASHED' || device.status === 'MISSING') && prev && prev.status !== device.status) {
      setIncidentAssetTarget({
        itemType: 'STREAMING_DEVICE',
        item: prev,
        newStatus: device.status as 'CRASHED' | 'MISSING',
        previousStatus: prev.status,
      });
      setIsIncidentModalOpen(true);
      return;
    }

    if (!canApproveRequests(groupPrivileges,currentUser)) {
      const diffs: InventoryFieldDiff[] = [];
      if (prev) {
        if (prev.status !== device.status) diffs.push({ fieldName: 'status', label: 'Status', oldValue: prev.status, newValue: device.status });
        if (prev.assignedDroneOrUnit !== device.assignedDroneOrUnit) diffs.push({ fieldName: 'assignedDroneOrUnit', label: 'Assigned Drone', oldValue: prev.assignedDroneOrUnit, newValue: device.assignedDroneOrUnit });
        if (prev.streamProtocol !== device.streamProtocol) diffs.push({ fieldName: 'streamProtocol', label: 'Protocol', oldValue: prev.streamProtocol, newValue: device.streamProtocol });
        if (prev.ipAddress !== device.ipAddress) diffs.push({ fieldName: 'ipAddress', label: 'IP Address', oldValue: prev.ipAddress || '-', newValue: device.ipAddress || '-' });
      }
      setPendingChange({
        itemType: 'STREAMING_DEVICE',
        action: 'UPDATE',
        itemId: device.id,
        itemIdentifier: `${device.deviceName} (${device.serialNumber})`,
        summary: `Update Streaming Device ${device.deviceName}`,
        diffs,
        previousData: prev,
        proposedData: device,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setStreamingDevices((prev) => prev.map((s) => (s.id === device.id ? device : s)));
    showToast(`Updated streaming device ${device.deviceName}.`);
  };

  const handleDeleteStreamingDevice = (id: string) => {
    if (!hasPrivilege(groupPrivileges,currentUser,'INVENTORY_DELETE_STREAMING_DEVICE')) { showToast('Delete streaming device permission is required.'); return; }
    const target = streamingDevices.find((s) => s.id === id);
    if (!canApproveRequests(groupPrivileges,currentUser)) {
      setPendingChange({
        itemType: 'STREAMING_DEVICE',
        action: 'DELETE',
        itemId: id,
        itemIdentifier: target?.deviceName || id,
        summary: `Delete Streaming Device ${target?.deviceName}`,
        previousData: target,
        proposedData: null,
      });
      setIsApprovalModalOpen(true);
      return;
    }
    setStreamingDevices((prev) => prev.filter((s) => s.id !== id));
    showToast(`Removed device ${target?.deviceName || 'unit'}.`);
  };

  // CSV and Batch Import Handlers
  const handleExportCsv = () => {
    const header = 'MODEL,NAME,DRONE SERIAL,REMOTE SERIAL,EMAIL,DEPARTMENT,STATUS';
    const rows = drones.map(
      (d) => `${d.model},${d.droneName},${d.droneSN},${d.remoteSN},${d.email},${d.department},${d.status}`
    );
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `moi_drone_fleet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported fleet inventory to CSV.');
  };

  const handleImportDrones = (
    importedDrones: DroneItem[],
    replaceAll: boolean = false,
    targetOfficer?: UserItem,
    remarks?: string
  ) => {
    if (!canApproveRequests(groupPrivileges,currentUser) || targetOfficer) {
      if (targetOfficer) {
        const notifId = `notif-req-batch-${Date.now()}`;
        const newNotification: NotificationMessage = {
          id: notifId,
          type: 'CHANGE_APPROVAL_REQUEST',
          title: `Approval Required: Batch Upload of ${importedDrones.length} Drones`,
          message:
            remarks ||
            `Technician ${currentUser?.name || 'Technician'} requested bulk upload of ${importedDrones.length} drone airframe(s) to fleet inventory. Officer sign-off is required to activate and commit records.`,
          senderId: currentUser?.id || 'tech',
          senderName: currentUser?.name || 'Technician',
          senderClass: currentUser?.userClass || 'TECHNICIAN',
          senderEmail: currentUser?.email || 'tech@moi.gov.qa',
          targetOfficerId: targetOfficer.id,
          targetOfficerName: targetOfficer.name,
          targetOfficerEmail: targetOfficer.email,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'PENDING',
          changeDetails: {
            itemType: 'BATCH_DRONES',
            action: 'CREATE',
            itemId: `batch-${Date.now()}`,
            itemIdentifier: `${importedDrones.length} Airframes (Batch)`,
            summary: `Batch upload of ${importedDrones.length} new drone airframes (${replaceAll ? 'Replace' : 'Append'})`,
            previousData: null,
            proposedData: {
              drones: importedDrones,
              replaceAll,
            },
          },
        };

        setNotifications((prev) => [newNotification, ...prev]);
        showToast(`Batch upload request for ${importedDrones.length} drones sent to ${targetOfficer.name} for officer approval.`);
        return;
      }

      setPendingChange({
        itemType: 'BATCH_DRONES',
        action: 'CREATE',
        itemId: `batch-${Date.now()}`,
        itemIdentifier: `${importedDrones.length} Airframes (Batch)`,
        summary: `Batch upload of ${importedDrones.length} new drone airframes (${replaceAll ? 'Replace' : 'Append'})`,
        previousData: null,
        proposedData: {
          drones: importedDrones,
          replaceAll,
        },
      });
      setIsApprovalModalOpen(true);
      return;
    }

    if (replaceAll) {
      setDrones(importedDrones);
      showToast(`Fleet replaced with ${importedDrones.length} imported drone records.`);
    } else {
      setDrones((prev) => {
        const existingSNs = new Set(prev.map((d) => d.droneSN.trim().toUpperCase()));
        const uniqueNew = importedDrones.filter((d) => !existingSNs.has(d.droneSN.trim().toUpperCase()));
        const updatedExisting = prev.map((d) => {
          const match = importedDrones.find((n) => n.droneSN.trim().toUpperCase() === d.droneSN.trim().toUpperCase());
          return match ? { ...d, ...match, id: d.id } : d;
        });
        return [...uniqueNew, ...updatedExisting];
      });
      showToast(`Successfully batch uploaded ${importedDrones.length} drone airframe(s) into fleet inventory.`);
    }
  };

  const handleResetOriginalData = async () => {
    try { await realtimeSync.resetFleetData(); }
    catch (error: any) { showToast(error.message || 'Factory reset is disabled. Contact the administrator to restore a backup.'); }
  };

  // Handover Form Handlers
  const handleSaveHandoverForm = (record: HandoverFormRecord) => {
    setHandoverForms((prev) => {
      const exists = prev.some((f) => f.id === record.id || f.srNumber === record.srNumber);
      return exists
        ? prev.map((f) => (f.id === record.id || f.srNumber === record.srNumber ? record : f))
        : [record, ...prev];
    });

    // Sync inventory asset statuses when equipment is received
    if (record.status === 'RETURNED' || record.status === 'PENDING') {
      const clean = (s?: string) => (s || '').trim().toLowerCase();
      const crashedOrMissingTargets: IncidentAssetTarget[] = [];

      // Stable IDs selected in the handover form; legacy equipment uses exact serials only.
      const collections = { drones, batteries, accessories, streamingDevices };
      const itemTypes = { drones:'DRONE', batteries:'BATTERY', accessories:'ACCESSORY', streamingDevices:'STREAMING_DEVICE' } as const;
      for (const entry of [...record.equipment,...record.accessories]) {
        if (!entry.returnStatus || entry.returnStatus === 'PENDING') continue;
        let entity = entry.assetEntity;
        let item = entity && entry.assetId ? collections[entity].find(asset=>asset.id===entry.assetId) : undefined;
        if (!item && 'serialNumber' in entry && entry.serialNumber) {
          const serial = clean(entry.serialNumber);
          const matches = Object.entries(collections).flatMap(([key,assets])=>assets.filter((asset:any)=>[asset.droneSN,asset.remoteSN,asset.serialNumber].some(sn=>sn && clean(sn)===serial)).map(asset=>({entity:key as keyof typeof collections,item:asset})));
          if (matches.length===1) { entity=matches[0].entity; item=matches[0].item; }
        }
        if (!entity || !item || item.status === 'CRASHED') continue;
        if (entry.returnStatus==='RETURNED') {
          if (entity==='drones') setDrones(prev=>prev.map(asset=>asset.id===item!.id?{...asset,status:'ACTIVE'}:asset));
          if (entity==='batteries') setBatteries(prev=>prev.map(asset=>asset.id===item!.id?{...asset,status:'READY'}:asset));
          if (entity==='accessories') setAccessories(prev=>prev.map(asset=>asset.id===item!.id?{...asset,status:'AVAILABLE'}:asset));
          if (entity==='streamingDevices') setStreamingDevices(prev=>prev.map(asset=>asset.id===item!.id?{...asset,status:'STANDBY_READY'}:asset));
        } else {
          crashedOrMissingTargets.push({itemType:itemTypes[entity],item,newStatus:entry.returnStatus,previousStatus:item.status,sourceHandover:record} as IncidentAssetTarget);
        }
      }

      if (crashedOrMissingTargets.length > 0) {
        const newDraftReports: IncidentReportRecord[] = [];
        const enrichedTargets: IncidentAssetTarget[] = [];

        crashedOrMissingTargets.forEach((target, idx) => {
          const assetName =
            target.itemType === 'DRONE'
              ? (target.item as DroneItem).droneName
              : target.itemType === 'BATTERY'
              ? `Battery ${(target.item as BatteryItem).serialNumber}`
              : target.itemType === 'ACCESSORY'
              ? (target.item as AccessoryItem).name
              : (target.item as StreamingDeviceItem).deviceName;

          const assetModel =
            target.itemType === 'DRONE'
              ? (target.item as DroneItem).model
              : target.itemType === 'BATTERY'
              ? (target.item as BatteryItem).batteryModel
              : target.itemType === 'ACCESSORY'
              ? (target.item as AccessoryItem).category
              : (target.item as StreamingDeviceItem).deviceType;

          const assetSN =
            target.itemType === 'DRONE'
              ? (target.item as DroneItem).droneSN
              : target.itemType === 'BATTERY'
              ? (target.item as BatteryItem).serialNumber
              : target.itemType === 'ACCESSORY'
              ? (target.item as AccessoryItem).serialNumber
              : (target.item as StreamingDeviceItem).serialNumber;

          const remoteSN =
            target.itemType === 'DRONE'
              ? (target.item as DroneItem).remoteSN || 'N/A'
              : 'N/A';

          const isCrashed = target.newStatus === 'CRASHED';
          const reportIndex = incidentReports.length + idx + 1;
          const draftSr = `UAV-IAR-2026-${String(reportIndex).padStart(2, '0')}`;
          const draftId = `iar-draft-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;

          const notesPart = record.returnNotes?.trim()
            ? ` Technical Inspection Remarks: "${record.returnNotes.trim()}".`
            : '';

          const summary = isCrashed
            ? `[EQUIPMENT RETURN INCIDENT - DRAFT] Asset "${assetName}" (${assetModel} · SN: ${assetSN}) was reported CRASHED during return custody intake of Handover Sheet ${record.srNumber} (Mission Purpose: "${record.purpose}"). Operator in custody: ${record.recipientName}.${notesPart} Structural / hardware impact recorded; asset status change approval strictly requires officer sign-off via this official Incident Report.`
            : `[EQUIPMENT RETURN INCIDENT - DRAFT] Asset "${assetName}" (${assetModel} · SN: ${assetSN}) was reported MISSING during return custody intake of Handover Sheet ${record.srNumber} (Mission Purpose: "${record.purpose}"). Operator in custody: ${record.recipientName}.${notesPart} Asset communication lost / unaccounted for in sector; asset status change approval strictly requires officer sign-off via this official Incident Report.`;

          const reporterRankAndName = currentUser?.rank
            ? `${currentUser.rank} ${currentUser.name}`
            : currentUser?.name || record.receivedOfficerName || 'Duty Technician';

          const draftReport: IncidentReportRecord = {
            id: draftId,
            srReference: draftSr,
            droneId: target.itemType === 'DRONE' ? target.item.id : undefined,
            droneName: assetName,
            aircraftSN: assetSN,
            remoteSN: remoteSN,
            location: 'MUAITHER',
            date: new Date().toLocaleDateString('en-GB'),
            logDate: new Date().toLocaleDateString('en-GB'),
            logTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            detailsSummary: summary,
            photos: [],
            reportedBy: reporterRankAndName,
            reporterId: currentUser?.id,
            department: (target.item as any).department || currentUser?.department || 'SSOC',
            status: 'DRAFT',
            severity: isCrashed ? 'CRITICAL' : 'SEVERE',
            markDroneStatus: target.newStatus,
            createdAt: new Date().toISOString(),
            operatorName: record.recipientName,
            operatorQid: record.recipientQid,
            operatorJobId: record.recipientJobId || record.recipientEmpId,
            operatorPhone: record.recipientPhone,
            reportPreparedBy: reporterRankAndName,
            evaluationStatus: `DRAFT - PENDING OFFICER APPROVAL (${target.newStatus})`,
            fieldSystemNotes: `Draft report automatically generated during equipment return on Handover Sheet ${record.srNumber}. Asset marked ${target.newStatus}. Changing status of assets will not take effect without officer approval.`,
          };

          newDraftReports.push(draftReport);
          enrichedTargets.push({
            ...target,
            draftReportId: draftId,
            draftSrReference: draftSr,
          });
        });

        // 1. Automatically create draft incident report documents directly in the INCIDENT REPORT tab
        setIncidentReports((prev) => [...newDraftReports, ...prev]);

        // 2. Open modal for first asset; queue remainder
        const [first, ...rest] = enrichedTargets;
        setIncidentAssetQueue(rest);
        setIncidentAssetTarget({
          ...first,
          queueIndex: 1,
          totalInQueue: enrichedTargets.length,
        });
        setIsIncidentModalOpen(true);
        showToast(
          `Draft Incident Report ${first.draftSrReference || ''} created directly in INCIDENT REPORT tab for "${
            (first.item as any).droneName || (first.item as any).name || (first.item as any).serialNumber
          }". Please complete and send to officer for approval.`
        );
      }
    }

    showToast(`Handover Form ${record.srNumber} saved (${record.status}).`);
  };

  const handleDeleteHandoverForm = (id: string) => {
    setHandoverForms((prev) => prev.filter((f) => f.id !== id));
    showToast('Handover Form removed.');
  };

  const handleSubmitHandoverApprovalRequest = (
    record: HandoverFormRecord,
    targetOfficer: UserItem,
    remarks: string
  ) => {
    if (!currentUser) return;

    setHandoverForms((prev) => {
      const exists = prev.some((f) => f.id === record.id || f.srNumber === record.srNumber);
      return exists
        ? prev.map((f) => (f.id === record.id || f.srNumber === record.srNumber ? { ...record, status: 'PENDING_APPROVAL' } : f))
        : [{ ...record, status: 'PENDING_APPROVAL' }, ...prev];
    });

    const notifId = `notif-hof-${Date.now()}`;
    const newNotification: NotificationMessage = {
      id: notifId,
      type: 'HANDOVER_APPROVAL_REQUEST' as const,
      title: `Handover Approval: ${record.srNumber} (${record.recipientName})`,
      message:
        remarks ||
        `${currentUser.userClass === 'TECHNICIAN' ? 'Technician' : 'Officer'} ${currentUser.name} requested approval to issue Equipment Handover Form ${record.srNumber} to ${record.recipientName} for "${record.purpose}". Assigned items require officer sign-off to issue custody.`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderClass: currentUser.userClass || 'TECHNICIAN',
      senderEmail: currentUser.email,
      targetOfficerId: targetOfficer.id,
      targetOfficerName: targetOfficer.name,
      targetOfficerEmail: targetOfficer.email,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'PENDING' as const,
      handoverForm: record,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    showToast(`Handover approval request sent to ${targetOfficer.name}. Notification queued in Notifications Tab.`);
  };

  // Auth Handlers with Single-Instance Enforcement & Remote Kick
  const handleSignInSuccess = (user: UserItem) => {
    try {
      setForceSignoutNotice(null);
      setCurrentUser(user);
      try {
        sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
      } catch (err) {
        console.error('Failed to save auth user', err);
      }
      showToast(`Access granted. Welcome, ${user.rank ? user.rank + ' ' : ''}(ID: ${user.employeeId}).`);
    } catch (err) {
      console.error('Sign in error:', err);
      showToast('Network error during sign in.');
    }
  };

  const handleSignOut = async () => {
    try {
      await realtimeSync.logout();
    } catch {}
    setAssetDeleteRequest(null);
    setForceSignoutNotice(null);
    setCurrentUser(null);
    setDrones([]); setBatteries([]); setAccessories([]); setStreamingDevices([]); setCheckouts([]); setHandoverForms([]); setIncidentReports([]); setConfiscatedDrones([]); setUsers([]); setNotifications([]); setAuditLogs([]); setActiveSessions([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY_AUTH_USER);
    } catch (err) {
      console.error('Failed to clear auth user', err);
    }
    showToast('Signed out of DRONES SYSTEM SECTION.');
  };

  const handleSignOutOtherDevice = async (employeeId: string) => {
    try {
      await realtimeSync.kickOtherDevices(employeeId);
      showToast(`Remote session for employee ${employeeId} terminated.`);
    } catch {
      showToast('Failed to disconnect other device.');
    }
  };

  // If not signed in, show the minimal sign in screen
  if (!currentUser) {
    return (
      <div className="relative">
        <SignIn
          users={users}
          onSignInSuccess={handleSignInSuccess}
          activeSessions={activeSessions}
          onSignOutOtherDevice={handleSignOutOtherDevice}
          forceSignoutNotice={forceSignoutNotice}
          onDismissForceSignout={() => setForceSignoutNotice(null)}
          isConnected={isConnected}
        />
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-sky-500 text-slate-950 font-medium text-xs px-4 py-2.5 rounded-lg shadow-xl shadow-sky-500/20 animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased max-w-full overflow-x-hidden">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        totalDrones={drones.length}
        activeDrones={activeDronesCount}
        checkedOutCount={activeCheckoutsCount}
        totalUsers={users.length}
        incidentReportsCount={incidentReports.length}
        confiscatedDronesCount={confiscatedDrones.length}
        pendingApprovalsCount={pendingApprovalsCount}
        totalNotifications={notifications.length}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        isConnected={isConnected}
        activeSessionsCount={activeSessions.length}
        groupPrivileges={groupPrivileges}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden w-full max-w-full [scrollbar-gutter:stable]">
        {/* Top Navbar */}
        <Header
          activeTab={activeTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenAddDrone={() => {
            setDroneToEdit(null);
            setIsAddDroneOpen(true);
          }}
          onOpenBatchLabels={() => setIsBatchLabelsOpen(true)}
          pendingApprovalsCount={pendingApprovalsCount}
          onNavigateTab={handleSelectTab}
          activeSessions={activeSessions}
          isConnected={isConnected}
          currentUser={currentUser}
          userGroups={userGroups}
          onSignOut={handleSignOut}
          onSignOutOtherDevice={handleSignOutOtherDevice}
          groupPrivileges={groupPrivileges}
          onOpenChangePassword={() => {
            setIsForcedPasswordChange(false);
            setIsChangePasswordOpen(true);
          }}
        />

        {/* Tab Viewports */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 min-w-0">
          {currentUser && !canViewTab(groupPrivileges, currentUser, activeTab) ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto my-12 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-100">Operations Tab Restricted</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                View access to the <span className="text-rose-300 font-mono font-bold">{activeTab}</span> tab in the Operations Menu is restricted for group <strong className="text-slate-200">{getUserRole(currentUser)}</strong>.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const tabOrder: SidebarTab[] = ['DASHBOARD', 'INVENTORY', 'IN_OUT_FORM', 'INCIDENT_REPORT', 'USERS', 'NOTIFICATIONS'];
                    const firstAllowed = tabOrder.find((t) => canViewTab(groupPrivileges, currentUser, t));
                    if (firstAllowed) setActiveTab(firstAllowed);
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Return to Accessible Tab
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* DASHBOARD TAB */}
              {activeTab === 'DASHBOARD' && (
                <DashboardView
                  drones={drones}
                  handoverForms={handoverForms}
                  onNavigateToHandover={handleNavigateToHandover}
                  onNavigateTab={handleNavigateWithFilter}
                  onAddDrone={() => {
                    setDroneToEdit(null);
                    setIsAddDroneOpen(true);
                  }}
                  onOpenBatchUpload={() => {
                    handleNavigateWithFilter('INVENTORY', {
                      subTab: 'all',
                    });
                  }}
                />
              )}

              {/* INVENTORY TAB */}
              {(activeTab === 'INVENTORY' || handoverReturnTab === 'INVENTORY') && (
                <div hidden={activeTab !== 'INVENTORY'}>
                <InventoryView
                  drones={drones}
                  batteries={batteries}
                  accessories={accessories}
                  streamingDevices={streamingDevices}
                  handoverForms={handoverForms}
                  currentUser={currentUser}
                  officers={officerUsers}
                  notifications={notifications}
                  initialSubTab={inventoryNavOptions?.subTab}
                  initialDroneStatus={inventoryNavOptions?.status}
                  initialDroneDepartment={inventoryNavOptions?.department}
                  onNavigateToNotifications={() => handleSelectTab('NOTIFICATIONS')}
                  onNavigateToHandover={handleNavigateToHandover}
                  onAddDrone={() => {
                    setDroneToEdit(null);
                    setIsAddDroneOpen(true);
                  }}
                  onEditDrone={handleOpenEdit}
                  onDeleteDrone={id=>{const asset=drones.find(item=>item.id===id);if(asset)setAssetDeleteRequest({kind:'DRONE',id,label:asset.droneName+' ('+asset.droneSN+')'});}}
                  onUpdateStatus={handleUpdateStatus}
                  onExportCsv={handleExportCsv}
                  onViewAssetTag={(drone) => setSelectedDroneForTag(drone)}
                  onOpenBatchLabels={() => setIsBatchLabelsOpen(true)}
                  onImportDrones={handleImportDrones}
                  onResetOriginalData={handleResetOriginalData}
                  onAddBattery={handleAddBattery}
                  onEditBattery={handleEditBattery}
                  onDeleteBattery={id=>{const asset=batteries.find(item=>item.id===id);if(asset)setAssetDeleteRequest({kind:'BATTERY',id,label:'Battery '+asset.serialNumber});}}
                  onAddAccessory={handleAddAccessory}
                  onEditAccessory={handleEditAccessory}
                  onDeleteAccessory={id=>{const asset=accessories.find(item=>item.id===id);if(asset)setAssetDeleteRequest({kind:'ACCESSORY',id,label:asset.name+' ('+asset.serialNumber+')'});}}
                  onAddStreamingDevice={handleAddStreamingDevice}
                  onEditStreamingDevice={handleEditStreamingDevice}
                  onDeleteStreamingDevice={id=>{const asset=streamingDevices.find(item=>item.id===id);if(asset)setAssetDeleteRequest({kind:'STREAMER',id,label:asset.deviceName+' ('+asset.serialNumber+')'});}}
                  groupPrivileges={groupPrivileges}
                />
                </div>
              )}

              {/* IN/OUT FORM TAB */}
              {(activeTab === 'IN_OUT_FORM' || handoverReturnTab !== null) && (
                <InOutFormView
                  drones={drones}
                  users={users}
                  checkouts={checkouts}
                  onCheckOutDrone={handleCheckOutDrone}
                  onCheckInDrone={handleCheckInDrone}
                  onViewAssetTag={(drone) => setSelectedDroneForTag(drone)}
                  batteries={batteries}
                  accessories={accessories}
                  streamingDevices={streamingDevices}
                  handoverForms={handoverForms}
                  onSaveHandoverForm={handleSaveHandoverForm}
                  onDeleteHandoverForm={handleDeleteHandoverForm}
                  currentUser={currentUser}
                  onSubmitHandoverApprovalRequest={handleSubmitHandoverApprovalRequest}
                  targetHandoverId={targetHandoverId}
                  onClearTargetHandoverId={() => setTargetHandoverId(null)}
                  onCloseLinkedHandover={handleCloseLinkedHandover}
                  documentPreviewOnly={handoverReturnTab !== null && activeTab !== 'IN_OUT_FORM'}
                  onOpenFullView={() => handleSelectTab('IN_OUT_FORM')}
                  groupPrivileges={groupPrivileges}
                  initialStatusFilter={inOutStatusFilter?.filter}
                  initialStatusFilterKey={inOutStatusFilter?.key}
                />
              )}

              {/* INCIDENT REPORT TAB */}
              {activeTab === 'INCIDENT_REPORT' && (
                <IncidentReportView
                  incidentReports={incidentReports}
                  drones={drones}
                  currentUser={currentUser}
                  onSaveReport={handleSaveIncidentReport}
                  onDeleteReport={handleDeleteIncidentReport}
                  groupPrivileges={groupPrivileges}
                  onOpenDraftInModal={handleOpenDraftIncidentModal}
                />
              )}

              {/* CONFISCATED DRONE TAB */}
              {activeTab === 'CONFISCATED_DRONE' && (
                <ConfiscatedDroneView
                  confiscatedDrones={confiscatedDrones}
                  currentUser={currentUser}
                  onSaveReport={handleSaveConfiscatedDrone}
                  onDeleteReport={handleDeleteConfiscatedDrone}
                  groupPrivileges={groupPrivileges}
                />
              )}

              {/* USERS TAB */}
              {activeTab === 'USERS' && (
                <UsersView
                  users={users}
                  drones={drones}
                  currentUser={currentUser}
                  officers={officerUsers}
                  notifications={notifications}
                  onNavigateToNotifications={() => handleSelectTab('NOTIFICATIONS')}
                  onAddUser={handleAddUser}
                  onEditUser={handleEditUser}
                  onDeleteUser={handleDeleteUser}
                  onViewAssetTag={(drone) => setSelectedDroneForTag(drone)}
                  activeSessions={activeSessions}
                  onSignOutOtherDevice={handleSignOutOtherDevice}
                  groupPrivileges={groupPrivileges}
                  onUpdateGroupPrivileges={handleUpdateGroupPrivileges}
                  onUpdateUserStatus={handleUpdateUserStatus}
                  onAdminResetPassword={handleAdminResetPassword}
                  auditLogs={auditLogs}
                  onRefreshAuditLogs={handleRefreshAuditLogs}
                />
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === 'NOTIFICATIONS' && (
                <NotificationsView
                  notifications={notifications}
                  currentUser={currentUser}
                  users={users}
                  onApprove={handleApproveNotification}
                  onReject={handleRejectNotification}
                  onDeleteNotification={handleDeleteNotification}
                  groupPrivileges={groupPrivileges}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {assetDeleteRequest && <AssetDeleteConfirmation label={assetDeleteRequest.label} onCancel={()=>setAssetDeleteRequest(null)} onConfirm={()=>{
        const {kind,id}=assetDeleteRequest;
        setAssetDeleteRequest(null);
        if(kind==='DRONE')handleDeleteDrone(id);
        else if(kind==='BATTERY')handleDeleteBattery(id);
        else if(kind==='ACCESSORY')handleDeleteAccessory(id);
        else handleDeleteStreamingDevice(id);
      }}/>}
      
      {/* Officer Approval Request Modal for Technicians */}
      {isApprovalModalOpen && pendingChange && currentUser && (
        <OfficerApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={() => {
            setIsApprovalModalOpen(false);
            setPendingChange(null);
          }}
          changeDetails={pendingChange}
          officers={officerUsers}
          currentUser={currentUser}
          onSubmitApproval={handleSubmitTechnicianApproval}
        />
      )}

      {/* Add / Edit Drone Modal */}
      {isAddDroneOpen && (
        <AddDroneModal groupPrivileges={groupPrivileges}
          isOpen={isAddDroneOpen}
          onClose={() => {
            setIsAddDroneOpen(false);
            setDroneToEdit(null);
          }}
          onSave={handleSaveDrone}
          droneToEdit={droneToEdit}
          currentUser={currentUser}
          officers={officerUsers}
        />
      )}

      {/* Single Drone Barcode & QR Code Asset Tag Modal */}
      {selectedDroneForTag && (
        <DroneAssetTagModal
          drone={selectedDroneForTag}
          handoverForms={handoverForms}
          onNavigateToHandover={handleNavigateToHandover}
          isOpen={!!selectedDroneForTag}
          onClose={() => setSelectedDroneForTag(null)}
        />
      )}

      {/* Batch Drone Asset Label Sheets Modal */}
      {isBatchLabelsOpen && (
        <BatchLabelsModal
          drones={drones}
          isOpen={isBatchLabelsOpen}
          onClose={() => setIsBatchLabelsOpen(false)}
        />
      )}

      {/* Incident Asset Modal (Asset status changed to CRASHED or MISSING) */}
      {isIncidentModalOpen && incidentAssetTarget && (
        <IncidentAssetModal
          isOpen={isIncidentModalOpen}
          onClose={() => {
            const hadDraft = !!incidentAssetTarget.draftReportId || !!incidentAssetTarget.sourceHandover;
            setIsIncidentModalOpen(false);
            setIncidentAssetTarget(null);
            setIncidentAssetQueue([]);
            if (hadDraft) {
              showToast('Draft incident report retained in INCIDENT REPORT tab. Asset status change strictly requires officer approval.');
            }
          }}
          target={incidentAssetTarget}
          currentUser={currentUser}
          officers={officerUsers}
          existingReportsCount={incidentReports.length}
          onSubmit={handleConfirmIncidentReport}
        />
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => {
            if (!isForcedPasswordChange) {
              setIsChangePasswordOpen(false);
            }
          }}
          currentUser={currentUser}
          isForced={isForcedPasswordChange}
          onPasswordChanged={(updatedUser) => {
            setCurrentUser(updatedUser);
            try {
              sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(updatedUser));
            } catch {}
            setIsChangePasswordOpen(false);
            setIsForcedPasswordChange(false);
            showToast('Password updated and secured successfully.');
          }}
        />
      )}
    </div>
  );
}
