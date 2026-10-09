import { resolveUserRole } from '../utils/accountIdentity.mjs';
export type DroneStatus = 'ACTIVE' | 'CRASHED' | 'UNDER REPAIR' | 'MISSING';

export interface DroneItem {
  id: string;
  model: string;
  droneName: string;
  droneSN: string;
  remoteSN: string;
  email: string;
  department: 'SSOC' | 'SSD' | string;
  status: DroneStatus | string;
  notes?: string;
}

export type SidebarTab = 'DASHBOARD' | 'INVENTORY' | 'IN_OUT_FORM' | 'INCIDENT_REPORT' | 'CONFISCATED_DRONE' | 'USERS' | 'NOTIFICATIONS';

export type InventorySubTab = 'analytics' | 'all' | 'issued-equipment' | 'accessories' | 'batteries' | 'streaming-devices' | 'excel-manager' | 'excel';

export interface CheckoutRecord {
  id: string;
  droneId: string;
  droneName: string;
  droneSN: string;
  model: string;
  department: string;
  operatorEmail: string;
  operatorName: string;
  purpose: string;
  checkOutTime: string;
  expectedReturnTime: string;
  checkInTime?: string;
  status: 'CHECKED_OUT' | 'RETURNED' | 'OVERDUE';
  batteryLevelOut: number;
  batteryLevelIn?: number;
  remarks?: string;
}

export type UserClass = 'OFFICER' | 'TECHNICIAN' | string;
export type UserRole = 'ADMIN' | 'OFFICER' | 'USER';

export type PrivilegeKey =
  | 'VIEW_TAB_DASHBOARD'
  | 'VIEW_TAB_INVENTORY'
  | 'VIEW_TAB_IN_OUT_FORM'
  | 'VIEW_TAB_INCIDENT_REPORT'
  | 'VIEW_TAB_CONFISCATED_DRONE'
  | 'VIEW_TAB_USERS'
  | 'VIEW_TAB_NOTIFICATIONS'
  | 'INVENTORY_BATCH_UPLOAD'
  | 'INVENTORY_ADD_DRONE'
  | 'INVENTORY_EDIT_DETAILS'
  | 'INVENTORY_DELETE_DRONE'
  | 'INVENTORY_DELETE_STREAMING_DEVICE'
  | 'INVENTORY_DELETE_ACCESSORY'
  | 'INVENTORY_DELETE_BATTERY'
  | 'IN_OUT_DELETE_RECORD'
  | 'INCIDENT_CREATE_REPORT'
  | 'INCIDENT_DELETE_REPORT'
  | 'CONFISCATED_CREATE_REPORT'
  | 'CONFISCATED_EDIT_REPORT'
  | 'CONFISCATED_DELETE_REPORT'
  | 'NOTIFICATIONS_DISMISS_MESSAGE'
  | 'APPROVE_REQUESTS';

export interface PrivilegeItem {
  id: PrivilegeKey;
  label: string;
  category: 'OPERATIONS_MENU' | 'INVENTORY' | 'IN_OUT_FORM' | 'INCIDENT_REPORT' | 'CONFISCATED_DRONE' | 'NOTIFICATION_FUNCTIONS';
  categoryLabel: string;
  description: string;
}

export const TAB_VIEW_PRIVILEGES: Record<SidebarTab, PrivilegeKey> = {
  DASHBOARD: 'VIEW_TAB_DASHBOARD',
  INVENTORY: 'VIEW_TAB_INVENTORY',
  IN_OUT_FORM: 'VIEW_TAB_IN_OUT_FORM',
  INCIDENT_REPORT: 'VIEW_TAB_INCIDENT_REPORT',
  CONFISCATED_DRONE: 'VIEW_TAB_CONFISCATED_DRONE',
  USERS: 'VIEW_TAB_USERS',
  NOTIFICATIONS: 'VIEW_TAB_NOTIFICATIONS',
};

export const SYSTEM_PRIVILEGES: PrivilegeItem[] = [
  { id: 'APPROVE_REQUESTS', label: 'Approve Requests', category: 'NOTIFICATION_FUNCTIONS', categoryLabel: 'NOTIFICATION FUNCTIONS', description: 'Review assigned requests and authorize changes and handovers' },
  // Operations Menu View Tab Privileges
  {
    id: 'VIEW_TAB_DASHBOARD',
    label: 'View DASHBOARD Tab',
    category: 'OPERATIONS_MENU',
    categoryLabel: 'OPERATIONS MENU',
    description: 'Grant view access to the Fleet Operations Dashboard tab in the operations menu',
  },
  {
    id: 'VIEW_TAB_INVENTORY',
    label: 'View INVENTORY Tab',
    category: 'OPERATIONS_MENU',
    categoryLabel: 'OPERATIONS MENU',
    description: 'Grant view access to the Fleet Asset Inventory tab in the operations menu',
  },
  {
    id: 'VIEW_TAB_IN_OUT_FORM',
    label: 'View IN/OUT FORM Tab',
    category: 'OPERATIONS_MENU',
    categoryLabel: 'OPERATIONS MENU',
    description: 'Grant view access to the UAV Handover Sorties & Custody Form tab in the operations menu',
  },
  {
    id: 'VIEW_TAB_INCIDENT_REPORT',
    label: 'View INCIDENT REPORT Tab',
    category: 'OPERATIONS_MENU',
    categoryLabel: 'OPERATIONS MENU',
    description: 'Grant view access to the Incident & Accident Reports tab in the operations menu',
  },
  {
    id: 'VIEW_TAB_CONFISCATED_DRONE',
    label: 'View CONFISCATED DRONE Tab',
    category: 'OPERATIONS_MENU',
    categoryLabel: 'OPERATIONS MENU',
    description: 'Grant view access to the Confiscated Drone Report (UAV Team) tab in the operations menu',
  },
  {
    id: 'VIEW_TAB_USERS',
    label: 'View USERS Tab',
    category: 'OPERATIONS_MENU',
    categoryLabel: 'OPERATIONS MENU',
    description: 'Grant view access to the Officers Directory & Personnel Management tab in the operations menu',
  },
  {
    id: 'VIEW_TAB_NOTIFICATIONS',
    label: 'View NOTIFICATIONS Tab',
    category: 'OPERATIONS_MENU',
    categoryLabel: 'OPERATIONS MENU',
    description: 'Grant view access to the Notifications, Approvals & Messages tab in the operations menu',
  },
  // Inventory Functional Privileges
  {
    id: 'INVENTORY_BATCH_UPLOAD',
    label: 'Batch Upload',
    category: 'INVENTORY',
    categoryLabel: 'INVENTORY',
    description: 'Bulk upload multiple drones from CSV or Excel file',
  },
  {
    id: 'INVENTORY_ADD_DRONE',
    label: 'Add Drone',
    category: 'INVENTORY',
    categoryLabel: 'INVENTORY',
    description: 'Register a single new drone unit into fleet inventory',
  },
  {
    id: 'INVENTORY_EDIT_DETAILS',
    label: 'Edit details',
    category: 'INVENTORY',
    categoryLabel: 'INVENTORY',
    description: 'Modify drone specifications, callsigns & operational details',
  },
  {
    id: 'INVENTORY_DELETE_DRONE',
    label: 'Delete Drone',
    category: 'INVENTORY',
    categoryLabel: 'INVENTORY',
    description: 'Decommission and remove drone platform from fleet registry',
  },
  {
    id: 'INVENTORY_DELETE_STREAMING_DEVICE',
    label: 'Delete streaming device',
    category: 'INVENTORY',
    categoryLabel: 'INVENTORY',
    description: 'Delete streaming devices from inventory',
  },
  {
    id: 'INVENTORY_DELETE_ACCESSORY',
    label: 'Delete accessory',
    category: 'INVENTORY',
    categoryLabel: 'INVENTORY',
    description: 'Delete accessories from inventory',
  },
  {
    id: 'INVENTORY_DELETE_BATTERY',
    label: 'Delete battery',
    category: 'INVENTORY',
    categoryLabel: 'INVENTORY',
    description: 'Delete batteries from inventory',
  },
  // In/Out Form Functional Privileges
  {
    id: 'IN_OUT_DELETE_RECORD',
    label: 'Delete Record',
    category: 'IN_OUT_FORM',
    categoryLabel: 'IN/OUT FORM',
    description: 'Permanently delete Handover Custody Form documents and records',
  },
  // Incident Report Functional Privileges
  {
    id: 'INCIDENT_CREATE_REPORT',
    label: 'Create Incident Report',
    category: 'INCIDENT_REPORT',
    categoryLabel: 'INCIDENT REPORT',
    description: 'File, attach photos, and submit new accident & incident investigation records',
  },
  {
    id: 'INCIDENT_DELETE_REPORT',
    label: 'Delete Incident Report',
    category: 'INCIDENT_REPORT',
    categoryLabel: 'INCIDENT REPORT',
    description: 'Permanently remove incident and accident report documents',
  },
  // Confiscated Drone Functional Privileges
  {
    id: 'CONFISCATED_CREATE_REPORT',
    label: 'Create Confiscated Drone Report',
    category: 'CONFISCATED_DRONE',
    categoryLabel: 'CONFISCATED DRONE',
    description: 'File new Confiscated Drone Reports with flight route logs & telemetry captures',
  },
  {
    id: 'CONFISCATED_EDIT_REPORT',
    label: 'Edit Confiscated Drone Report',
    category: 'CONFISCATED_DRONE',
    categoryLabel: 'CONFISCATED DRONE',
    description: 'Modify confiscated drone records, sequential flight entries, and evaluation notes',
  },
  {
    id: 'CONFISCATED_DELETE_REPORT',
    label: 'Delete Confiscated Drone Report',
    category: 'CONFISCATED_DRONE',
    categoryLabel: 'CONFISCATED DRONE',
    description: 'Permanently remove confiscated drone case files and reports',
  },
  // Notification Functions Privileges
  {
    id: 'NOTIFICATIONS_DISMISS_MESSAGE',
    label: 'Dismiss message',
    category: 'NOTIFICATION_FUNCTIONS',
    categoryLabel: 'NOTIFICATION FUNCTIONS',
    description: 'Dismiss, clear or remove notifications, messages, and alert records from the queue',
  },
];

export interface UserGroup { id: string; name: string; baseRole: 'OFFICER' | 'USER'; }
export type GroupPrivileges = Record<string, Record<PrivilegeKey, boolean>>;

export const DEFAULT_GROUP_PRIVILEGES: GroupPrivileges = {
  ADMIN: {
    VIEW_TAB_DASHBOARD: true,
    VIEW_TAB_INVENTORY: true,
    VIEW_TAB_IN_OUT_FORM: true,
    VIEW_TAB_INCIDENT_REPORT: true,
    VIEW_TAB_CONFISCATED_DRONE: true,
    VIEW_TAB_USERS: true,
    VIEW_TAB_NOTIFICATIONS: true,
    INVENTORY_BATCH_UPLOAD: true,
    INVENTORY_ADD_DRONE: true,
    INVENTORY_EDIT_DETAILS: true,
    INVENTORY_DELETE_DRONE: true,
    INVENTORY_DELETE_STREAMING_DEVICE: true,
    INVENTORY_DELETE_ACCESSORY: true,
    INVENTORY_DELETE_BATTERY: true,
    IN_OUT_DELETE_RECORD: true,
    INCIDENT_CREATE_REPORT: true,
    INCIDENT_DELETE_REPORT: true,
    CONFISCATED_CREATE_REPORT: true,
    CONFISCATED_EDIT_REPORT: true,
    CONFISCATED_DELETE_REPORT: true,
    NOTIFICATIONS_DISMISS_MESSAGE: true,
    APPROVE_REQUESTS: true,
  },
  OFFICER: {
    VIEW_TAB_DASHBOARD: true,
    VIEW_TAB_INVENTORY: true,
    VIEW_TAB_IN_OUT_FORM: true,
    VIEW_TAB_INCIDENT_REPORT: true,
    VIEW_TAB_CONFISCATED_DRONE: true,
    VIEW_TAB_USERS: true,
    VIEW_TAB_NOTIFICATIONS: true,
    INVENTORY_BATCH_UPLOAD: true,
    INVENTORY_ADD_DRONE: true,
    INVENTORY_EDIT_DETAILS: true,
    INVENTORY_DELETE_DRONE: true,
    INVENTORY_DELETE_STREAMING_DEVICE: true,
    INVENTORY_DELETE_ACCESSORY: true,
    INVENTORY_DELETE_BATTERY: true,
    IN_OUT_DELETE_RECORD: true,
    INCIDENT_CREATE_REPORT: true,
    INCIDENT_DELETE_REPORT: true,
    CONFISCATED_CREATE_REPORT: true,
    CONFISCATED_EDIT_REPORT: true,
    CONFISCATED_DELETE_REPORT: true,
    NOTIFICATIONS_DISMISS_MESSAGE: true,
    APPROVE_REQUESTS: true,
  },
  USER: {
    VIEW_TAB_DASHBOARD: true,
    VIEW_TAB_INVENTORY: true,
    VIEW_TAB_IN_OUT_FORM: true,
    VIEW_TAB_INCIDENT_REPORT: true,
    VIEW_TAB_CONFISCATED_DRONE: true,
    VIEW_TAB_USERS: true,
    VIEW_TAB_NOTIFICATIONS: true,
    INVENTORY_BATCH_UPLOAD: false,
    INVENTORY_ADD_DRONE: false,
    INVENTORY_EDIT_DETAILS: false,
    INVENTORY_DELETE_DRONE: false,
    INVENTORY_DELETE_STREAMING_DEVICE: false,
    INVENTORY_DELETE_ACCESSORY: false,
    INVENTORY_DELETE_BATTERY: false,
    IN_OUT_DELETE_RECORD: false,
    INCIDENT_CREATE_REPORT: true,
    INCIDENT_DELETE_REPORT: false,
    CONFISCATED_CREATE_REPORT: true,
    CONFISCATED_EDIT_REPORT: false,
    CONFISCATED_DELETE_REPORT: false,
    NOTIFICATIONS_DISMISS_MESSAGE: false,
    APPROVE_REQUESTS: false,
  },
};

export const hasPrivilege = (
  privileges: GroupPrivileges | undefined,
  user: UserItem | null | undefined,
  privilege: PrivilegeKey
): boolean => {
  if (!user) return false;
  const role = getUserRole(user);
  const groupMap = privileges || DEFAULT_GROUP_PRIVILEGES;
  const key = user.groupId ? 'GROUP:' + user.groupId : role;
  if (user.groupId && !groupMap[key]) return false;
  if (groupMap[key] && groupMap[key][privilege] !== undefined) {
    return !!groupMap[key][privilege];
  }
  return role === 'ADMIN';
};

export const canApproveRequests = (privileges: GroupPrivileges | undefined, user: UserItem | null | undefined): boolean => {
  if (!user || user.archivedAt || user.accountStatus === 'SUSPENDED') return false;
  if (getUserRole(user) === 'ADMIN') return true;
  const key = user.groupId ? 'GROUP:' + user.groupId : getUserRole(user);
  if (privileges?.[key]) return privileges[key].APPROVE_REQUESTS === true;
  return user.canApproveRequests === true;
};

export const canViewTab = (
  privileges: GroupPrivileges | undefined,
  user: UserItem | null | undefined,
  tab: SidebarTab
): boolean => {
  if (!user) return true;
  const role = getUserRole(user);
  // Safety: Admin cannot lock themselves out of USERS tab where privileges are configured
  if (role === 'ADMIN' && tab === 'USERS') return true;
  const privKey = TAB_VIEW_PRIVILEGES[tab];
  if (!privKey) return true;
  return hasPrivilege(privileges, user, privKey);
};

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole?: string;
  action: string;
  targetType: 'USER' | 'ROLE' | 'FLEET' | 'AUTH' | 'SECURITY' | 'SYSTEM';
  targetId?: string;
  details: string;
  ipAddress?: string;
}

export interface UserItem {
  id: string;
  employeeId: string;
  qatarId: string;
  rank: 'MAJOR' | 'CAPTAIN' | '1st LT' | string;
  userClass?: 'OFFICER' | 'TECHNICIAN' | string;
  userRole?: UserRole;
  groupId?: string;
  name: string;
  mobileNumber: string;
  passwordHash?: string;
  canApproveRequests?: boolean;
  identityConflict?: boolean;
  archivedAt?: string;
  email: string;
  department: 'SSOC' | 'SSD' | string;
  status: 'ACTIVE' | 'ON_DUTY' | 'OFF_DUTY';
  role?: string;
  accountStatus?: 'ACTIVE' | 'SUSPENDED';
  mustChangePassword?: boolean;
  requiresPasswordSetup?: boolean;
  lastPasswordChange?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export const getUserRole = (user?: UserItem | null): UserRole => resolveUserRole(user) as UserRole;

export interface BatteryItem {
  id: string;
  serialNumber: string;
  batteryModel: string;
  compatibleDrone: string;
  department: 'SSOC' | 'SSD' | string;
  cycleCount: number;
  healthPercent: number;
  status: 'READY' | 'IN_USE' | 'CHARGING' | 'DEPLETED' | 'MAINTENANCE' | 'CRASHED' | 'MISSING' | string;
  location?: string;
  notes?: string;
}

export interface AccessoryItem {
  id: string;
  name: string;
  serialNumber: string;
  category: 'PAYLOAD_CAMERA' | 'REMOTE_CONTROLLER' | 'GNSS_RTK' | 'SEARCHLIGHT_SPEAKER' | 'CHARGER_DOCK' | 'SAFETY_PROP' | 'OTHER';
  compatibleDrone: string;
  department: 'SSOC' | 'SSD' | string;
  condition: 'EXCELLENT' | 'GOOD' | 'NEEDS_INSPECTION' | 'DAMAGED';
  status: 'AVAILABLE' | 'DEPLOYED' | 'MAINTENANCE' | 'STORAGE' | 'CRASHED' | 'MISSING' | string;
  location?: string;
  notes?: string;
}

export interface StreamingDeviceItem {
  id: string;
  deviceName: string;
  serialNumber: string;
  deviceType: 'CELLULAR_BONDED' | 'HDMI_SDI_ENCODER' | '4G_5G_DONGLE' | 'WIRELESS_TRANSMITTER' | 'DECODER_RECEIVER';
  assignedDroneOrUnit: string;
  streamProtocol: 'RTMP / RTSP' | 'SRT (Secure Reliable Transport)' | 'LiveU LRT' | 'NDI|HX' | 'WebRTC';
  department: 'SSOC' | 'SSD' | string;
  status: 'ONLINE_STREAMING' | 'STANDBY_READY' | 'OFFLINE' | 'MAINTENANCE' | 'CRASHED' | 'MISSING' | string;
  ipAddress?: string;
  simCardNumber?: string;
  location?: string;
  notes?: string;
}

// Notification & Approval Types
export type NotificationType =
  | 'CHANGE_APPROVAL_REQUEST'
  | 'CHANGE_APPROVED'
  | 'CHANGE_REJECTED'
  | 'HANDOVER_APPROVAL_REQUEST'
  | 'HANDOVER_APPROVED'
  | 'HANDOVER_REJECTED'
  | 'INCIDENT_APPROVAL_REQUEST'
  | 'INCIDENT_APPROVED'
  | 'INCIDENT_REJECTED'
  | 'SYSTEM_MESSAGE';
export type NotificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'READ' | 'UNREAD';
export type InventoryItemType = 'DRONE' | 'BATTERY' | 'ACCESSORY' | 'STREAMING_DEVICE' | 'HANDOVER_FORM' | 'USER' | 'BATCH_DRONES' | 'INCIDENT_REPORT';
export type ChangeActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';

export interface InventoryFieldDiff {
  fieldName: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface InventoryChangeDetails {
  itemType: InventoryItemType;
  action: ChangeActionType;
  itemId: string;
  itemIdentifier: string;
  summary: string;
  diffs?: InventoryFieldDiff[];
  previousData?: any;
  proposedData: any;
}

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  senderId: string;
  senderName: string;
  senderClass: 'TECHNICIAN' | 'OFFICER' | string;
  senderEmail: string;
  targetOfficerId: string;
  targetOfficerName: string;
  targetOfficerEmail: string;
  timestamp: string;
  status: NotificationStatus;
  changeDetails?: InventoryChangeDetails;
  reviewComment?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  handoverForm?: HandoverFormRecord;
  incidentReport?: IncidentReportRecord;
}

// Handover Form Types (UAV Team Equipment Handover Form)
export type HandoverFormStatus = 'ISSUED' | 'RETURNED' | 'PENDING' | 'DRAFT' | 'ARCHIVED' | 'PENDING_APPROVAL' | 'REJECTED';
export type HandoverAssetReturnStatus = 'RETURNED' | 'CRASHED' | 'MISSING' | 'PENDING';

export interface HandoverEquipmentItem {
  assetId?: string;
  assetEntity?: 'drones' | 'batteries' | 'accessories' | 'streamingDevices';
  id: string;
  no: number;
  description: string;
  serialNumber: string;
  returned?: boolean;
  returnStatus?: HandoverAssetReturnStatus;
  returnedAt?: string;
  conditionOnReturn?: string;
}

export interface HandoverAccessoryItem {
  assetId?: string;
  assetEntity?: 'drones' | 'batteries' | 'accessories' | 'streamingDevices';
  id: string;
  no: number;
  description: string;
  qty: string | number;
  returned?: boolean;
  returnStatus?: HandoverAssetReturnStatus;
  returnedAt?: string;
}

export interface HandoverFormRecord {
  id: string;
  srNumber: string;
  status: HandoverFormStatus;
  date: string;
  purpose: string;
  recipientName: string;
  recipientEmpId: string;
  recipientQid: string;
  recipientPhone: string;
  recipientJobId: string;
  recipientSignature?: string;
  issuedAuthorityName: string;
  dateIssued: string;
  timeIssued: string;
  equipment: HandoverEquipmentItem[];
  accessories: HandoverAccessoryItem[];
  receivedOfficerName?: string;
  dateReceived?: string;
  timeReceived?: string;
  returnNotes?: string;
  createdAt?: string;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  employeeId: string;
  name: string;
  rank?: string;
  userClass?: string;
  department?: string;
  ipAddress?: string;
  deviceInfo?: string;
  loginTime: string;
  lastActiveTime: string;
}

export type IncidentPhotoCategory =
  | 'Hardware Crash Photo'
  | 'Drone Battery & Frame Imagery'
  | 'Detailed Log Sheet Excerpt'
  | 'Other Supporting Evidence';

export interface IncidentPhotoAttachment {
  id: string;
  dataUrl: string; // Base64 or URL
  fileName: string;
  category: IncidentPhotoCategory;
  caption?: string;
  uploadedAt: string;
  fileSize?: number;
}

export type IncidentSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type IncidentStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_INVESTIGATION' | 'CLOSED';

export interface IncidentReportRecord {
  id: string;
  srReference: string; // e.g. "UAV-IAR-2026-01"
  droneId?: string;
  droneName: string; // e.g. "M30T-29"
  aircraftSN: string; // e.g. "1581F5BKD23910OFJSNJ"
  remoteSN: string; // e.g. "4LFCL8L006KDPK"
  location: string; // e.g. "MUAITHER"
  date: string; // e.g. "13/05/2026"
  detailsSummary: string; // Accident Details Summary
  photos: IncidentPhotoAttachment[];
  reportedBy: string; // Officer/Technician name & rank
  reporterId?: string;
  department?: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  markDroneStatus?: DroneStatus;
  createdAt: string;
  updatedAt?: string;

  // Official UAV Team Incident Accident Report form fields
  latitude?: string; // e.g. "25.25130140833998"
  longitude?: string; // e.g. "51.39657338652925"
  operatorName?: string; // e.g. "محمد على المرى"
  operatorQid?: string; // e.g. "2896348"
  operatorPhone?: string; // e.g. "777770"
  operatorJobId?: string; // e.g. "1346 - SSOC"
  operatorSignature?: string;
  logDate?: string; // e.g. "13/05/2026"
  logTime?: string; // e.g. "23:47"
  reportPreparedBy?: string; // e.g. "Capt. Tariq Al-Kuwari"
  reviewDate?: string; // e.g. "14/05/2026"
  evaluationStatus?: string; // e.g. "HARDWARE DISCONNECTED / LOST"
  receivedEvaluatedBy?: string; // e.g. "Capt. Tariq Al-Kuwari"
  evalDateTime?: string; // e.g. "14/05/2026 | 08:30 AM"
  fieldSystemNotes?: string;
}

export interface ConfiscatedFlightRecord {
  id: string;
  flightIndex?: number;
  date: string; // e.g. "13/05/2026"
  location: string; // e.g. "Lusail Marina"
  coordinates: string; // e.g. "25.4215° N, 51.5283° E"
  flightCount: number | string; // e.g. 1
  flightDuration: string; // e.g. "18 mins"
  photos?: string[]; // Evidence photo(s) attached directly to this specific flight entry
  evidenceNotes?: string;
  notes?: string;
}

export type ConfiscatedDroneStatus = 'ACTIVE' | 'CONFISCATED' | 'UNDER_INVESTIGATION' | 'LEGAL_REVIEW' | 'ARCHIVED';

export interface ConfiscatedDroneReport {
  id: string; // e.g. "cdr-2026-001"
  srNumber: string; // e.g. "UAV-CDR-2026-01"
  lrNumber: string; // e.g. "1859"
  date: string; // e.g. "13/05/2026"
  droneModel: string; // e.g. "Dji mini4"
  droneSN: string; // e.g. "XXXXXXXXXXXXXXX"
  remoteSN: string; // e.g. "XXXXXXXXXXXXXXX"
  hasMultipleEntries: boolean;
  flightRecords: ConfiscatedFlightRecord[];
  evidencePhotos: string[]; // Base64 data URLs or asset URLs
  evidenceNotes?: string;
  // Correspondence letter attachment (prints as additional page in print preview)
  correspondencePhotos?: string[]; // Array of letter image data URLs
  correspondenceLetterRef?: string; // e.g. "MOI/SEC-892/2026"
  correspondenceLetterDate?: string; // e.g. "13/05/2026"
  correspondenceNotes?: string;
  imageStretchMode?: 'stretch' | 'fit'; // Stretch / change ratio to fill area
  receivedBy: string; // e.g. "Capt. Tariq Al-Kuwari"
  evalDateTime: string; // e.g. "14/05/2026 | 08:30 AM"
  fieldSystemNotes: string;
  status: ConfiscatedDroneStatus;
  department?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface FleetServerState {
  authenticatedUser?: UserItem;
  recordVersions?: Record<string, Record<string, number>>;
  drones: DroneItem[];
  batteries: BatteryItem[];
  accessories: AccessoryItem[];
  streamingDevices: StreamingDeviceItem[];
  checkouts: CheckoutRecord[];
  handoverForms: HandoverFormRecord[];
  users: UserItem[];
  notifications: NotificationMessage[];
  activeSessions: ActiveSession[];
  incidentReports?: IncidentReportRecord[];
  confiscatedDrones?: ConfiscatedDroneReport[];
  groupPrivileges?: GroupPrivileges;
  userGroups?: UserGroup[];
  auditLogs?: AuditLogEntry[];
}

