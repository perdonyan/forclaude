import { canApproveRequests, GroupPrivileges } from '../types/drone';
import { AppDropdown } from './AppDropdown';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  HandoverFormRecord,
  HandoverEquipmentItem,
  HandoverAccessoryItem,
  DroneItem,
  UserItem,
  BatteryItem,
  AccessoryItem,
  StreamingDeviceItem,
  CheckoutRecord
} from '../types/drone';
import { SAMPLE_HANDOVER_RECORD } from '../data/initialHandoverData';
import {
  getDroneAvailability,
  getBatteryAvailability,
  getAccessoryAvailability,
  getStreamingDeviceAvailability,
  checkRowEquipmentAvailability,
  EquipmentAvailability
} from '../utils/handoverUtils';
import {
  FileText,
  Printer,
  Sparkles,
  Columns,
  Eye,
  X,
  Calendar,
  Plus,
  UserCheck,
  RotateCcw,
  Check,
  Shield,
  Layers,
  Send,
  Lock,
  AlertTriangle,
  Info,
  Radio,
  Battery,
  Package,
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  Scan,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface HandoverFormCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: HandoverFormRecord) => void;
  initialRecord?: HandoverFormRecord | null;
  drones: DroneItem[];
  users: UserItem[];
  batteries: BatteryItem[];
  accessories: AccessoryItem[];
  streamingDevices?: StreamingDeviceItem[];
  handoverForms?: HandoverFormRecord[];
  checkouts?: CheckoutRecord[];
  currentUser?: UserItem | null;
  groupPrivileges?: GroupPrivileges;
  onSubmitApprovalRequest?: (record: HandoverFormRecord, targetOfficer: UserItem, remarks: string) => void;
  onOpenReceiveModal?: (record: HandoverFormRecord) => void;
}

const PURPOSE_PRESETS = [
  'UAV Team Perimeter Security & Operational Flight Operations',
  'Northern Sector Perimeter Border Reconnaissance & Tactical Aerial Surveillance',
  'Critical Infrastructure Security Inspection & High-Altitude Thermal Scanning',
  'Maritime & Coastal Border Patrol Sortie',
  'VIP Dignitary Motorcade Escort & Aerial Coverage',
  'Emergency Search & Rescue (SAR) Deployment',
  'Night Thermal Perimeter Sweep & Law Enforcement Support',
];

export const HandoverFormCreator: React.FC<HandoverFormCreatorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  drones,
  users,
  batteries,
  accessories,
  streamingDevices = [],
  handoverForms = [],
  checkouts = [],
  currentUser,
  groupPrivileges,
  onSubmitApprovalRequest,
  onOpenReceiveModal,
}) => {
  const generateSR = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `UAV-${new Date().getFullYear()}-${randomNum}`;
  };

  const getTodayFormatted = () => {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const getTimeFormatted = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isOfficer = canApproveRequests(groupPrivileges,currentUser);
  const officerUsers = users.filter((u) => canApproveRequests(groupPrivileges,u));

  // Check if viewing an officially issued or returned document (must be viewable and printable only)
  const isViewAndPrintOnly = Boolean(
    initialRecord && (initialRecord.status === 'ISSUED' || initialRecord.status === 'RETURNED' || initialRecord.status === 'PENDING')
  );

  // View mode: 'split' or 'sheet' (strictly 'sheet' for issued/returned records)
  const [viewMode, setViewMode] = useState<'split' | 'sheet'>(isViewAndPrintOnly ? 'sheet' : 'split');
  const effectiveViewMode = isViewAndPrintOnly ? 'sheet' : viewMode;

  // Form State
  const [srNumber, setSrNumber] = useState<string>(initialRecord?.srNumber || generateSR());
  const [date, setDate] = useState<string>(initialRecord?.date || getTodayFormatted());
  const [purpose, setPurpose] = useState<string>(
    initialRecord?.purpose || PURPOSE_PRESETS[0]
  );

  // Recipient info
  const [recipientName, setRecipientName] = useState<string>(initialRecord?.recipientName || '');
  const [recipientEmpId, setRecipientEmpId] = useState<string>(initialRecord?.recipientEmpId || '');
  const [recipientQid, setRecipientQid] = useState<string>(initialRecord?.recipientQid || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(initialRecord?.recipientPhone || '+974 ');
  const [recipientJobId, setRecipientJobId] = useState<string>(initialRecord?.recipientJobId || '');

  // Signature
  const [signatureData, setSignatureData] = useState<string>(initialRecord?.recipientSignature || '');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Issuer info - bound strictly to logged-in user (non-editable)
  const loggedInIssuerName = useMemo(() => {
    if (!currentUser) {
      return initialRecord?.issuedAuthorityName || 'Tariq Al-Kuwari';
    }
    return currentUser.name?.trim() || initialRecord?.issuedAuthorityName || 'Tariq Al-Kuwari';
  }, [currentUser, initialRecord]);

  const [issuedAuthorityName, setIssuedAuthorityName] = useState<string>(loggedInIssuerName);

  useEffect(() => {
    setIssuedAuthorityName(loggedInIssuerName);
  }, [loggedInIssuerName]);
  const [dateIssued, setDateIssued] = useState<string>(initialRecord?.dateIssued || getTodayFormatted());
  const [timeIssued, setTimeIssued] = useState<string>(initialRecord?.timeIssued || getTimeFormatted());

  // Equipment table (12 rows)
  const [equipmentRows, setEquipmentRows] = useState<HandoverEquipmentItem[]>(() => {
    if (initialRecord?.equipment && initialRecord.equipment.length > 0) {
      const rows = [...initialRecord.equipment];
      while (rows.length < 12) {
        rows.push({ id: `eq-${rows.length + 1}`, no: rows.length + 1, description: '', serialNumber: '' });
      }
      return rows;
    }
    return Array.from({ length: 12 }, (_, i) => ({
      id: `eq-${i + 1}`,
      no: i + 1,
      description: '',
      serialNumber: '',
    }));
  });

  // Accessories table (8 rows)
  const [accessoryRows, setAccessoryRows] = useState<HandoverAccessoryItem[]>(() => {
    if (initialRecord?.accessories && initialRecord.accessories.length > 0) {
      const rows = [...initialRecord.accessories];
      while (rows.length < 8) {
        rows.push({ id: `acc-${rows.length + 1}`, no: rows.length + 1, description: '', qty: '' });
      }
      return rows;
    }
    return Array.from({ length: 8 }, (_, i) => ({
      id: `acc-${i + 1}`,
      no: i + 1,
      description: '',
      qty: '',
    }));
  });

  // Return inspection info
  const [receivedOfficerName, setReceivedOfficerName] = useState<string>(initialRecord?.receivedOfficerName || '');
  const [dateReceived, setDateReceived] = useState<string>(initialRecord?.dateReceived || '');
  const [timeReceived, setTimeReceived] = useState<string>(initialRecord?.timeReceived || '');
  const [returnNotes, setReturnNotes] = useState<string>(initialRecord?.returnNotes || '');

  // Synchronize component state whenever initialRecord changes
  useEffect(() => {
    if (initialRecord) {
      if (initialRecord.status === 'ISSUED' || initialRecord.status === 'RETURNED' || initialRecord.status === 'PENDING') {
        setViewMode('sheet');
      }
      setSrNumber(initialRecord.srNumber || generateSR());
      setDate(initialRecord.date || getTodayFormatted());
      setPurpose(initialRecord.purpose || PURPOSE_PRESETS[0]);
      setRecipientName(initialRecord.recipientName || '');
      setRecipientEmpId(initialRecord.recipientEmpId || '');
      setRecipientQid(initialRecord.recipientQid || '');
      setRecipientPhone(initialRecord.recipientPhone || '+974 ');
      setRecipientJobId(initialRecord.recipientJobId || '');
      setSignatureData(initialRecord.recipientSignature || '');
      setDateIssued(initialRecord.dateIssued || getTodayFormatted());
      setTimeIssued(initialRecord.timeIssued || getTimeFormatted());
      if (initialRecord.equipment && initialRecord.equipment.length > 0) {
        const rows = [...initialRecord.equipment];
        while (rows.length < 12) {
          rows.push({ id: `eq-${rows.length + 1}`, no: rows.length + 1, description: '', serialNumber: '' });
        }
        setEquipmentRows(rows);
      }
      if (initialRecord.accessories && initialRecord.accessories.length > 0) {
        const rows = [...initialRecord.accessories];
        while (rows.length < 8) {
          rows.push({ id: `acc-${rows.length + 1}`, no: rows.length + 1, description: '', qty: '' });
        }
        setAccessoryRows(rows);
      }
      setReceivedOfficerName(initialRecord.receivedOfficerName || '');
      setDateReceived(initialRecord.dateReceived || '');
      setTimeReceived(initialRecord.timeReceived || '');
      setReturnNotes(initialRecord.returnNotes || '');
    }
  }, [initialRecord]);

  // Stock asset picker state
  const [selectedStockAsset, setSelectedStockAsset] = useState<string>('');
  const [stockFilterMode, setStockFilterMode] = useState<'available' | 'all'>('available');
  const [pickerNotice, setPickerNotice] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'drone' | 'battery' | 'accessory' | 'stream'>('all');
  const [pickerViewMode, setPickerViewMode] = useState<'list' | 'select'>('list');

  // Blocked Issuance Dialog State
  const [blockedIssuanceModal, setBlockedIssuanceModal] = useState<{
    title: string;
    issues: { row: number; type: string; title: string; serial?: string; reason: string; badge?: string }[];
  } | null>(null);

  // Approval Dialog State
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedApprovingOfficerId, setSelectedApprovingOfficerId] = useState<string>(() => {
    return officerUsers[0]?.id || '';
  });
  const [approvalRemarks, setApprovalRemarks] = useState<string>('');

  // Pre-calculate Armory item availability
  const droneAvailabilities = useMemo(() => {
    return drones.map((d) => {
      const avail = getDroneAvailability(d, handoverForms, checkouts, initialRecord?.id);
      const dSN = d.droneSN.trim().toUpperCase();
      const dRemote = (d.remoteSN || '').trim().toUpperCase();
      const dName = d.droneName.trim().toUpperCase();
      const inCurrentForm = equipmentRows.some((r) => {
        const rSN = (r.serialNumber || '').trim().toUpperCase();
        const rDesc = (r.description || '').trim().toUpperCase();
        return (
          (rSN && (rSN === dSN || (dRemote && rSN === dRemote))) ||
          (dSN && rDesc.includes(dSN)) ||
          (dName && (rDesc === dName || rDesc.includes(`(${dName})`) || rDesc.includes(` ${dName} `)))
        );
      });
      return { drone: d, avail, inCurrentForm };
    });
  }, [drones, handoverForms, checkouts, initialRecord, equipmentRows]);

  const batteryAvailabilities = useMemo(() => {
    return batteries.map((b) => {
      const avail = getBatteryAvailability(b, handoverForms, initialRecord?.id);
      const bSN = b.serialNumber.trim().toUpperCase();
      const inCurrentForm =
        accessoryRows.some((r) => {
          const rDesc = (r.description || '').trim().toUpperCase();
          return bSN && rDesc.includes(bSN);
        }) ||
        equipmentRows.some((r) => {
          const rSN = (r.serialNumber || '').trim().toUpperCase();
          const rDesc = (r.description || '').trim().toUpperCase();
          return (rSN && rSN === bSN) || (bSN && rDesc.includes(bSN));
        });
      return { battery: b, avail, inCurrentForm };
    });
  }, [batteries, handoverForms, initialRecord, accessoryRows, equipmentRows]);

  const accessoryAvailabilities = useMemo(() => {
    return accessories.map((a) => {
      const avail = getAccessoryAvailability(a, handoverForms, initialRecord?.id);
      const aSN = (a.serialNumber || '').trim().toUpperCase();
      const aName = a.name.trim().toUpperCase();
      const inCurrentForm =
        accessoryRows.some((r) => {
          const rDesc = (r.description || '').trim().toUpperCase();
          return (aSN && rDesc.includes(aSN)) || (aName && rDesc.includes(aName));
        }) ||
        equipmentRows.some((r) => {
          const rSN = (r.serialNumber || '').trim().toUpperCase();
          const rDesc = (r.description || '').trim().toUpperCase();
          return (aSN && (rSN === aSN || rDesc.includes(aSN))) || (aName && rDesc.includes(aName));
        });
      return { accessory: a, avail, inCurrentForm };
    });
  }, [accessories, handoverForms, initialRecord, accessoryRows, equipmentRows]);

  const streamingAvailabilities = useMemo(() => {
    return streamingDevices.map((s) => {
      const avail = getStreamingDeviceAvailability(s, handoverForms, initialRecord?.id);
      const sSN = (s.serialNumber || '').trim().toUpperCase();
      const sName = s.deviceName.trim().toUpperCase();
      const inCurrentForm =
        equipmentRows.some((r) => {
          const rSN = (r.serialNumber || '').trim().toUpperCase();
          const rDesc = (r.description || '').trim().toUpperCase();
          return (sSN && (rSN === sSN || rDesc.includes(sSN))) || (sName && rDesc.includes(sName));
        }) ||
        accessoryRows.some((r) => {
          const rDesc = (r.description || '').trim().toUpperCase();
          return (sSN && rDesc.includes(sSN)) || (sName && rDesc.includes(sName));
        });
      return { device: s, avail, inCurrentForm };
    });
  }, [streamingDevices, handoverForms, initialRecord, equipmentRows, accessoryRows]);

  const armoryStats = useMemo(() => {
    const availableDrones = droneAvailabilities.filter((d) => d.avail.isAvailable && !d.inCurrentForm).length;
    const unavailableDrones = droneAvailabilities.filter((d) => !d.avail.isAvailable || d.inCurrentForm).length;
    const availableBats = batteryAvailabilities.filter((b) => b.avail.isAvailable && !b.inCurrentForm).length;
    const availableAccs = accessoryAvailabilities.filter((a) => a.avail.isAvailable && !a.inCurrentForm).length;
    const availableStreams = streamingAvailabilities.filter((s) => s.avail.isAvailable && !s.inCurrentForm).length;
    return {
      availableDrones,
      unavailableDrones,
      availableBats,
      availableAccs,
      availableStreams,
      totalAvailable: availableDrones + availableBats + availableAccs + availableStreams,
      totalUnavailable: unavailableDrones + (batteryAvailabilities.length - availableBats) + (accessoryAvailabilities.length - availableAccs) + (streamingAvailabilities.length - availableStreams),
    };
  }, [droneAvailabilities, batteryAvailabilities, accessoryAvailabilities, streamingAvailabilities]);

  // Unified flat asset list for instant search and selection
  const flatArmoryAssets = useMemo(() => {
    const list: {
      id: string;
      valueKey: string;
      type: 'drone' | 'battery' | 'accessory' | 'stream';
      typeLabel: string;
      name: string;
      modelOrCategory: string;
      serialNumber: string;
      avail: EquipmentAvailability;
      inCurrentForm: boolean;
      statusDisplay: string;
      isAvailable: boolean;
    }[] = [];

    // 1. Drones
    droneAvailabilities.forEach(({ drone, avail, inCurrentForm }) => {
      const isAvailable = avail.isAvailable && !inCurrentForm;
      list.push({
        id: `drone-${drone.id}`,
        valueKey: `drone:${drone.id}`,
        type: 'drone',
        typeLabel: 'Drone',
        name: `${drone.model} (${drone.droneName})`,
        modelOrCategory: drone.model,
        serialNumber: drone.droneSN,
        avail,
        inCurrentForm,
        statusDisplay: inCurrentForm
          ? 'ALREADY IN SHEET'
          : avail.isAvailable
          ? 'READY'
          : `${avail.badgeLabel || 'UNAVAILABLE'}: ${avail.reason}`,
        isAvailable,
      });
    });

    // 2. Batteries
    batteryAvailabilities.forEach(({ battery, avail, inCurrentForm }) => {
      const isAvailable = avail.isAvailable && !inCurrentForm;
      list.push({
        id: `bat-${battery.id}`,
        valueKey: `battery:${battery.id}`,
        type: 'battery',
        typeLabel: 'Battery',
        name: `${battery.batteryModel}`,
        modelOrCategory: 'Flight Battery',
        serialNumber: battery.serialNumber,
        avail,
        inCurrentForm,
        statusDisplay: inCurrentForm
          ? 'ALREADY IN SHEET'
          : avail.isAvailable
          ? 'READY'
          : `${avail.badgeLabel || 'UNAVAILABLE'}: ${avail.reason}`,
        isAvailable,
      });
    });

    // 3. Accessories & Payloads
    accessoryAvailabilities.forEach(({ accessory, avail, inCurrentForm }) => {
      const isAvailable = avail.isAvailable && !inCurrentForm;
      list.push({
        id: `acc-${accessory.id}`,
        valueKey: `acc:${accessory.id}`,
        type: 'accessory',
        typeLabel: 'Accessory',
        name: accessory.name,
        modelOrCategory: accessory.category,
        serialNumber: accessory.serialNumber || 'N/A',
        avail,
        inCurrentForm,
        statusDisplay: inCurrentForm
          ? 'ALREADY IN SHEET'
          : avail.isAvailable
          ? 'AVAILABLE'
          : `${avail.badgeLabel || 'UNAVAILABLE'}: ${avail.reason}`,
        isAvailable,
      });
    });

    // 4. Streaming Encoders
    streamingAvailabilities.forEach(({ device, avail, inCurrentForm }) => {
      const isAvailable = avail.isAvailable && !inCurrentForm;
      list.push({
        id: `stream-${device.id}`,
        valueKey: `stream:${device.id}`,
        type: 'stream',
        typeLabel: 'Streaming',
        name: device.deviceName,
        modelOrCategory: device.deviceType,
        serialNumber: device.serialNumber,
        avail,
        inCurrentForm,
        statusDisplay: inCurrentForm
          ? 'ALREADY IN SHEET'
          : avail.isAvailable
          ? 'STANDBY READY'
          : `${avail.badgeLabel || 'UNAVAILABLE'}: ${avail.reason}`,
        isAvailable,
      });
    });

    return list;
  }, [droneAvailabilities, batteryAvailabilities, accessoryAvailabilities, streamingAvailabilities]);

  // Filtered armory assets with search query and category filters
  const filteredArmoryAssets = useMemo(() => {
    let result = flatArmoryAssets;

    if (stockFilterMode === 'available') {
      result = result.filter((a) => a.isAvailable);
    }

    if (selectedCategoryFilter !== 'all') {
      result = result.filter((a) => a.type === selectedCategoryFilter);
    }

    if (assetSearchQuery.trim()) {
      const q = assetSearchQuery.trim().toLowerCase();
      result = result.filter((a) => {
        return (
          a.name.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q) ||
          a.modelOrCategory.toLowerCase().includes(q) ||
          a.typeLabel.toLowerCase().includes(q) ||
          a.statusDisplay.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [flatArmoryAssets, stockFilterMode, selectedCategoryFilter, assetSearchQuery]);

  const categoryCounts = useMemo(() => {
    const base = stockFilterMode === 'available' ? flatArmoryAssets.filter((a) => a.isAvailable) : flatArmoryAssets;
    return {
      all: base.length,
      drone: base.filter((a) => a.type === 'drone').length,
      battery: base.filter((a) => a.type === 'battery').length,
      accessory: base.filter((a) => a.type === 'accessory').length,
      stream: base.filter((a) => a.type === 'stream').length,
    };
  }, [flatArmoryAssets, stockFilterMode]);

  // Setup canvas signature pad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (signatureData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = signatureData;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [signatureData]);

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  // Auto-fill from selected officer
  const handleSelectOfficer = (officerId: string) => {
    const officer = users.find((u) => u.id === officerId);
    if (!officer) return;
    setRecipientName(officer.name);
    setRecipientEmpId(officer.employeeId);
    setRecipientQid(officer.qatarId || '');
    setRecipientPhone(officer.mobileNumber || '+974 ');
    setRecipientJobId(`${officer.employeeId} - ${officer.department}`);

    // Pre-select approving officer
    setSelectedApprovingOfficerId(officer.id);
  };

  // Quick Add from Armory with strict availability enforcement
  const handleAddStockAsset = (assetKeyOverride?: string) => {
    const key = assetKeyOverride || selectedStockAsset;
    if (!key) return;

    if (key.startsWith('drone:')) {
      const droneId = key.replace('drone:', '');
      const entry = droneAvailabilities.find((e) => e.drone.id === droneId);
      if (!entry) return;

      if (!entry.avail.isAvailable) {
        setPickerNotice({
          type: 'error',
          message: `Cannot add ${entry.drone.droneName}: Unit is currently ${entry.avail.badgeLabel || 'UNAVAILABLE'} (${entry.avail.reason}). Only operational, unissued drone assets can be assigned.`
        });
        return;
      }
      if (entry.inCurrentForm) {
        setPickerNotice({
          type: 'warning',
          message: `Drone ${entry.drone.droneName} is already assigned to this handover sheet.`
        });
        return;
      }

      const emptyIdx = equipmentRows.findIndex((r) => !r.description && !r.serialNumber);
      if (emptyIdx !== -1) {
        const updated = [...equipmentRows];
        updated[emptyIdx] = {
          ...updated[emptyIdx],
          assetId: entry.drone.id,
          assetEntity: 'drones',
          description: `${entry.drone.model} (${entry.drone.droneName})`,
          serialNumber: entry.drone.droneSN,
        };
        setEquipmentRows(updated);
        setPickerNotice(null);
      } else {
        setPickerNotice({
          type: 'warning',
          message: 'Equipment table is full (all 12 rows occupied). Please clear a row first.'
        });
      }
    } else if (key.startsWith('battery:')) {
      const batId = key.replace('battery:', '');
      const entry = batteryAvailabilities.find((e) => e.battery.id === batId);
      if (!entry) return;

      if (!entry.avail.isAvailable) {
        setPickerNotice({
          type: 'error',
          message: `Cannot add battery ${entry.battery.serialNumber}: Unit is currently ${entry.avail.badgeLabel || 'UNAVAILABLE'} (${entry.avail.reason}).`
        });
        return;
      }
      if (entry.inCurrentForm) {
        setPickerNotice({
          type: 'warning',
          message: `Battery ${entry.battery.serialNumber} is already assigned to this sheet.`
        });
        return;
      }

      const emptyIdx = accessoryRows.findIndex((r) => !r.description);
      if (emptyIdx !== -1) {
        const updated = [...accessoryRows];
        updated[emptyIdx] = {
          ...updated[emptyIdx],
          assetId: entry.battery.id,
          assetEntity: 'batteries',
          description: `${entry.battery.batteryModel} (${entry.battery.serialNumber})`,
          qty: '2',
        };
        setAccessoryRows(updated);
        setPickerNotice(null);
      } else {
        setPickerNotice({
          type: 'warning',
          message: 'Accessory table is full (all 8 rows occupied). Please clear a row first.'
        });
      }
    } else if (key.startsWith('acc:')) {
      const accId = key.replace('acc:', '');
      const entry = accessoryAvailabilities.find((e) => e.accessory.id === accId);
      if (!entry) return;

      if (!entry.avail.isAvailable) {
        setPickerNotice({
          type: 'error',
          message: `Cannot add accessory ${entry.accessory.name}: Unit is currently ${entry.avail.badgeLabel || 'UNAVAILABLE'} (${entry.avail.reason}).`
        });
        return;
      }
      if (entry.inCurrentForm) {
        setPickerNotice({
          type: 'warning',
          message: `Accessory ${entry.accessory.name} is already assigned to this sheet.`
        });
        return;
      }

      const emptyIdx = accessoryRows.findIndex((r) => !r.description);
      if (emptyIdx !== -1) {
        const updated = [...accessoryRows];
        updated[emptyIdx] = {
          ...updated[emptyIdx],
          assetId: entry.accessory.id,
          assetEntity: 'accessories',
          description: `${entry.accessory.name} (${entry.accessory.category})`,
          qty: '1',
        };
        setAccessoryRows(updated);
        setPickerNotice(null);
      } else {
        setPickerNotice({
          type: 'warning',
          message: 'Accessory table is full (all 8 rows occupied). Please clear a row first.'
        });
      }
    } else if (key.startsWith('stream:')) {
      const streamId = key.replace('stream:', '');
      const entry = streamingAvailabilities.find((e) => e.device.id === streamId);
      if (!entry) return;

      if (!entry.avail.isAvailable) {
        setPickerNotice({
          type: 'error',
          message: `Cannot add streaming device ${entry.device.deviceName}: Unit is currently ${entry.avail.badgeLabel || 'UNAVAILABLE'} (${entry.avail.reason}).`
        });
        return;
      }
      if (entry.inCurrentForm) {
        setPickerNotice({
          type: 'warning',
          message: `Streaming device ${entry.device.deviceName} is already assigned to this sheet.`
        });
        return;
      }

      const emptyEqIdx = equipmentRows.findIndex((r) => !r.description && !r.serialNumber);
      if (emptyEqIdx !== -1) {
        const updated = [...equipmentRows];
        updated[emptyEqIdx] = {
          ...updated[emptyEqIdx],
          assetId: entry.device.id,
          assetEntity: 'streamingDevices',
          description: `${entry.device.deviceName} (${entry.device.deviceType})`,
          serialNumber: entry.device.serialNumber,
        };
        setEquipmentRows(updated);
        setPickerNotice(null);
      } else {
        const emptyAccIdx = accessoryRows.findIndex((r) => !r.description);
        if (emptyAccIdx !== -1) {
          const updated = [...accessoryRows];
          updated[emptyAccIdx] = {
            ...updated[emptyAccIdx],
            assetId: entry.device.id,
            assetEntity: 'streamingDevices',
            description: `${entry.device.deviceName} (SN: ${entry.device.serialNumber})`,
            qty: '1',
          };
          setAccessoryRows(updated);
          setPickerNotice(null);
        } else {
          setPickerNotice({
            type: 'warning',
            message: 'All equipment and accessory rows are full.'
          });
        }
      }
    }

    setSelectedStockAsset('');
  };

  // Inspect all equipment and accessory rows in the form for unavailable assets
  const getUnavailableRowsInForm = () => {
    const issues: {
      row: number;
      type: string;
      title: string;
      serial?: string;
      reason: string;
      badge?: string;
    }[] = [];

    equipmentRows.forEach((r) => {
      if (r.description || r.serialNumber) {
        const check = checkRowEquipmentAvailability(r.description, r.serialNumber, {
          drones,
          batteries,
          accessories,
          streamingDevices,
          handoverForms,
          checkouts,
          excludeFormId: initialRecord?.id,
        });
        if (check && !check.availability.isAvailable) {
          issues.push({
            row: r.no,
            type: 'Equipment',
            title: r.description || check.matchedItemName || `Equipment #${r.no}`,
            serial: r.serialNumber || check.matchedSerial,
            reason: check.availability.reason || 'Asset is not available in armory',
            badge: check.availability.badgeLabel,
          });
        }
      }
    });

    accessoryRows.forEach((r) => {
      if (r.description) {
        const check = checkRowEquipmentAvailability(r.description, '', {
          drones,
          batteries,
          accessories,
          streamingDevices,
          handoverForms,
          checkouts,
          excludeFormId: initialRecord?.id,
        });
        if (check && !check.availability.isAvailable) {
          issues.push({
            row: r.no,
            type: 'Accessory',
            title: r.description,
            reason: check.availability.reason || 'Accessory is not available',
            badge: check.availability.badgeLabel,
          });
        }
      }
    });

    return issues;
  };

  // Load Sample Data (11/24/2025)
  const handleLoadSample = () => {
    setSrNumber(SAMPLE_HANDOVER_RECORD.srNumber);
    setDate(SAMPLE_HANDOVER_RECORD.date);
    setPurpose(SAMPLE_HANDOVER_RECORD.purpose);
    setRecipientName(SAMPLE_HANDOVER_RECORD.recipientName);
    setRecipientEmpId(SAMPLE_HANDOVER_RECORD.recipientEmpId);
    setRecipientQid(SAMPLE_HANDOVER_RECORD.recipientQid);
    setRecipientPhone(SAMPLE_HANDOVER_RECORD.recipientPhone);
    setRecipientJobId(SAMPLE_HANDOVER_RECORD.recipientJobId);
    setSignatureData(SAMPLE_HANDOVER_RECORD.recipientSignature || '');
    setIssuedAuthorityName(currentUser ? loggedInIssuerName : SAMPLE_HANDOVER_RECORD.issuedAuthorityName);
    setDateIssued(SAMPLE_HANDOVER_RECORD.dateIssued);
    setTimeIssued(SAMPLE_HANDOVER_RECORD.timeIssued);
    setEquipmentRows([...SAMPLE_HANDOVER_RECORD.equipment]);
    setAccessoryRows([...SAMPLE_HANDOVER_RECORD.accessories]);
    setReceivedOfficerName(SAMPLE_HANDOVER_RECORD.receivedOfficerName || '');
    setDateReceived(SAMPLE_HANDOVER_RECORD.dateReceived || '');
    setTimeReceived(SAMPLE_HANDOVER_RECORD.timeReceived || '');
    setReturnNotes(SAMPLE_HANDOVER_RECORD.returnNotes || '');
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Build the record object
  const buildCurrentRecord = (status: HandoverFormRecord['status']): HandoverFormRecord => {
    return {
      id: initialRecord?.id || `hof-${Date.now()}`,
      srNumber: srNumber.trim() || generateSR(),
      status,
      date,
      purpose,
      recipientName: recipientName.trim() || 'Officer Recipient',
      recipientEmpId: recipientEmpId.trim() || '1346',
      recipientQid: recipientQid.trim() || '2896340',
      recipientPhone: recipientPhone.trim(),
      recipientJobId: recipientJobId.trim() || 'SSOC',
      recipientSignature: signatureData,
      issuedAuthorityName: loggedInIssuerName,
      dateIssued,
      timeIssued,
      equipment: equipmentRows,
      accessories: accessoryRows,
      receivedOfficerName,
      dateReceived,
      timeReceived,
      returnNotes,
      createdAt: initialRecord?.createdAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
  };

  // Direct Save Form (e.g. Draft or direct issue)
  const handleSaveForm = (status: 'ISSUED' | 'DRAFT') => {
    if (status === 'ISSUED') {
      const issues = getUnavailableRowsInForm();
      if (issues.length > 0) {
        setBlockedIssuanceModal({
          title: 'Cannot Issue: Unavailable Equipment Detected',
          issues,
        });
        return;
      }
    }
    const record = buildCurrentRecord(status);
    onSave(record);
  };

  // Clicked "Approve & Issue Form (UAV Team)"
  const handleInitiateApproveAndIssue = () => {
    const issues = getUnavailableRowsInForm();
    if (issues.length > 0) {
      setBlockedIssuanceModal({
        title: 'Cannot Issue: Unavailable Equipment Detected',
        issues,
      });
      return;
    }
    // Open the officer approval and dispatch modal
    setIsApprovalModalOpen(true);
  };

  // Submit Approval to Selected Officer
  const handleConfirmApprovalDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const targetOfficer = officerUsers.find((u) => u.id === selectedApprovingOfficerId) || officerUsers[0];
    if (!targetOfficer) return;

    const issues = getUnavailableRowsInForm();
    if (issues.length > 0) {
      setBlockedIssuanceModal({
        title: 'Cannot Submit for Approval: Unavailable Equipment Detected',
        issues,
      });
      return;
    }

    const record = buildCurrentRecord('PENDING_APPROVAL');

    if (onSubmitApprovalRequest) {
      onSubmitApprovalRequest(record, targetOfficer, approvalRemarks.trim());
    } else {
      // Fallback
      onSave(record);
    }

    setIsApprovalModalOpen(false);
  };

  // Direct Issue by Officer
  const handleDirectOfficerIssue = () => {
    const issues = getUnavailableRowsInForm();
    if (issues.length > 0) {
      setBlockedIssuanceModal({
        title: 'Cannot Issue: Unavailable Equipment Detected',
        issues,
      });
      return;
    }
    const record = buildCurrentRecord('ISSUED');
    onSave(record);
    setIsApprovalModalOpen(false);
  };

  const assignedEquipmentCount = equipmentRows.filter((e) => e.description || e.serialNumber).length;
  const assignedAccessoryCount = accessoryRows.filter((a) => a.description || a.qty).length;
  const totalAssignedAssets = assignedEquipmentCount + assignedAccessoryCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/90 backdrop-blur-md flex flex-col p-2 sm:p-4">
      <div className="w-full max-w-7xl mx-auto h-full flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl min-h-0">
        {/* Top Header Bar */}
        <div className="bg-slate-900 border-b border-slate-800 rounded-t-xl px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isViewAndPrintOnly
                ? initialRecord?.status === 'ISSUED'
                  ? 'bg-cyan-950/80 border border-cyan-700/80 text-cyan-400'
                  : initialRecord?.status === 'PENDING'
                  ? 'bg-amber-950/80 border border-amber-700/80 text-amber-400'
                  : 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-400'
                : 'bg-rose-950 border border-rose-800 text-rose-400'
            }`}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                  Equipment Handover Form (UAV Team)
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-semibold shrink-0">
                  {srNumber}
                </span>
                {isViewAndPrintOnly && (
                  initialRecord?.status === 'ISSUED' ? (
                    <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>ISSUED (Active Custody)</span>
                    </span>
                  ) : initialRecord?.status === 'PENDING' ? (
                    <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>PENDING (Partial Return)</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>RETURNED & CLEARED</span>
                    </span>
                  )
                )}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                {isViewAndPrintOnly ? (
                  <>
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Official Archived Custody Document — Viewable and Printable Only</span>
                  </>
                ) : (
                  <span>Live data input synced in real-time with the official spreadsheet template</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto shrink-0">
            {isViewAndPrintOnly ? (
              <>
                {/* Process Return / Receive Remaining Button */}
                {onOpenReceiveModal && initialRecord && (initialRecord.status === 'ISSUED' || initialRecord.status === 'PENDING') && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReceiveModal(initialRecord);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-md ${
                      initialRecord.status === 'PENDING'
                        ? 'text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
                        : 'text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                    }`}
                    title={initialRecord.status === 'PENDING' ? 'Receive Remaining Unreturned Equipment' : 'Receive Equipment & Inspect Return'}
                  >
                    {initialRecord.status === 'PENDING' ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Receive Remaining</span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Receive Equipment</span>
                      </>
                    )}
                  </button>
                )}

                {/* Print Button for Viewable & Printable Document */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
                  title="Print Official Document"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                {/* Load Sample Button */}
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/80 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Sample (11/24/2025)</span>
                </button>

                {/* View Toggle */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'split'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Split View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('sheet')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'sheet'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Sheet Only</span>
                  </button>
                </div>

                {/* Print Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Container Area */}
        <div className="flex-1 bg-slate-950 border-x border-slate-800 p-3 sm:p-4 overflow-y-auto min-h-0">
          <div className={`grid gap-5 min-w-0 ${effectiveViewMode === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
            {/* LEFT PANEL: Form Controls (Hidden if effectiveViewMode === 'sheet') */}
            {effectiveViewMode === 'split' && (
            <div className="lg:col-span-5 space-y-4 min-w-0">
              {/* CARD 1: FORM REFERENCE & DATE */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>FORM REFERENCE & DATE</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSrNumber(generateSR())}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                  >
                    New SR
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      DATE (M/D/YYYY)
                    </label>
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      SR NUMBER
                    </label>
                    <input
                      type="text"
                      value={srNumber}
                      onChange={(e) => setSrNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    PURPOSE OF USE (Preset or Type)
                  </label>
                  <AppDropdown
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 mb-2 cursor-pointer"
                  >
                    {PURPOSE_PRESETS.map((p, i) => (
                      <option key={i} value={p}>
                        {p}
                      </option>
                    ))}
                  </AppDropdown>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Custom Purpose text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* CARD 2: QUICK ADD EQUIPMENT FROM ARMORY */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-200 min-w-0">
                    <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">QUICK ADD EQUIPMENT FROM ARMORY</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px] shrink-0">
                    <button
                      type="button"
                      onClick={() => setStockFilterMode('available')}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        stockFilterMode === 'available'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Available Only ({armoryStats.totalAvailable})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilterMode('all')}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        stockFilterMode === 'all'
                          ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Show All ({armoryStats.totalAvailable + armoryStats.totalUnavailable})
                    </button>
                  </div>
                </div>

                {/* Armory Status Pill Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{armoryStats.totalAvailable} Available</span>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{armoryStats.totalUnavailable} Unavailable</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                    <button
                      type="button"
                      onClick={() => setPickerViewMode('list')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        pickerViewMode === 'list' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'hover:text-slate-200'
                      }`}
                    >
                      Search List
                    </button>
                    <span>/</span>
                    <button
                      type="button"
                      onClick={() => setPickerViewMode('select')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        pickerViewMode === 'select' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'hover:text-slate-200'
                      }`}
                    >
                      Dropdown
                    </button>
                  </div>
                </div>

                {/* SEARCH INPUT BAR */}
                <div className="space-y-1.5">
                  <div className="relative min-w-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={assetSearchQuery}
                      onChange={(e) => setAssetSearchQuery(e.target.value)}
                      placeholder="Search armory assets (model, SN, name, category)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-16 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 min-w-0"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {assetSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAssetSearchQuery('')}
                          className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsBarcodeScannerOpen(true)}
                        className="p-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 rounded cursor-pointer transition-colors"
                        title="Scan asset barcode using device camera"
                      >
                        <Scan className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                        selectedCategoryFilter === 'all'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      All ({categoryCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('drone')}
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                        selectedCategoryFilter === 'drone'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      Drones ({categoryCounts.drone})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('battery')}
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                        selectedCategoryFilter === 'battery'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      Batteries ({categoryCounts.battery})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('accessory')}
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                        selectedCategoryFilter === 'accessory'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      Accessories ({categoryCounts.accessory})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('stream')}
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                        selectedCategoryFilter === 'stream'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      Streaming ({categoryCounts.stream})
                    </button>
                  </div>
                </div>

                {/* Inline Notice when user tries to pick unavailable asset */}
                {pickerNotice && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 animate-in fade-in ${
                      pickerNotice.type === 'error'
                        ? 'bg-rose-950/80 border-rose-600/80 text-rose-200'
                        : 'bg-amber-950/80 border-amber-600/80 text-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">{pickerNotice.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerNotice(null)}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* PRIMARY VIEW: BOUNDED SCROLLABLE SEARCH LIST (Height strictly maintained regardless of 146 items) */}
                {pickerViewMode === 'list' ? (
                  <div className="space-y-2">
                    <div className="h-52 max-h-52 overflow-y-auto bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-800/60 p-1 min-w-0">
                      {filteredArmoryAssets.length === 0 ? (
                        <div className="h-full min-h-[180px] flex flex-col items-center justify-center p-4 text-center text-slate-500 text-xs gap-1.5">
                          <Search className="w-4 h-4 text-slate-600" />
                          <span>No assets match "{assetSearchQuery}"</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAssetSearchQuery('');
                              setSelectedCategoryFilter('all');
                            }}
                            className="text-[10px] text-cyan-400 hover:underline cursor-pointer font-medium mt-1"
                          >
                            Reset filters
                          </button>
                        </div>
                      ) : (
                        filteredArmoryAssets.map((asset) => {
                          const isSelected = selectedStockAsset === asset.valueKey;
                          return (
                            <div
                              key={asset.id}
                              onClick={() => {
                                if (asset.isAvailable) {
                                  setSelectedStockAsset(asset.valueKey);
                                  setPickerNotice(null);
                                } else {
                                  setPickerNotice({
                                    type: 'error',
                                    message: `Cannot select ${asset.name}: ${asset.statusDisplay}. Only operational, unissued drone assets can be assigned.`
                                  });
                                }
                              }}
                              className={`flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-md transition-all cursor-pointer min-w-0 ${
                                isSelected
                                  ? 'bg-cyan-950/70 border border-cyan-500/60 text-slate-100 shadow-sm'
                                  : asset.isAvailable
                                  ? 'hover:bg-slate-900/90 text-slate-200'
                                  : 'opacity-55 hover:opacity-75 bg-slate-950/40 text-slate-400'
                              }`}
                            >
                              {/* Left: Icon & Name & SN */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`p-1 rounded shrink-0 ${
                                    asset.type === 'drone'
                                      ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                      : asset.type === 'battery'
                                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                      : asset.type === 'accessory'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  }`}
                                >
                                  {asset.type === 'drone' && <Radio className="w-3 h-3" />}
                                  {asset.type === 'battery' && <Battery className="w-3 h-3" />}
                                  {asset.type === 'accessory' && <Package className="w-3 h-3" />}
                                  {asset.type === 'stream' && <Radio className="w-3 h-3" />}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className={`font-medium truncate ${
                                        isSelected ? 'text-cyan-200 font-semibold' : ''
                                      }`}
                                    >
                                      {asset.name}
                                    </span>
                                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                                      {asset.typeLabel}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono truncate">
                                    SN: {asset.serialNumber}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Availability Badge & Quick Add Action */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {asset.isAvailable ? (
                                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                                    <span>READY</span>
                                  </span>
                                ) : (
                                  <span
                                    className="text-[9px] font-medium text-rose-300 bg-rose-950/70 border border-rose-800/80 px-1.5 py-0.5 rounded max-w-[140px] truncate"
                                    title={asset.statusDisplay}
                                  >
                                    🚫 {asset.statusDisplay}
                                  </span>
                                )}

                                {asset.isAvailable && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStockAsset(asset.valueKey);
                                      handleAddStockAsset(asset.valueKey);
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded cursor-pointer transition-colors shrink-0"
                                    title="Add to sheet immediately"
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Action Bar Below Search List */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="text-[11px] text-slate-400 min-w-0 flex-1 truncate">
                        {selectedStockAsset ? (
                          <span className="text-cyan-300 font-medium truncate">
                            Selected: {flatArmoryAssets.find((a) => a.valueKey === selectedStockAsset)?.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">
                            Showing {filteredArmoryAssets.length} of {stockFilterMode === 'all' ? armoryStats.totalAvailable + armoryStats.totalUnavailable : armoryStats.totalAvailable} assets
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddStockAsset()}
                        disabled={!selectedStockAsset || selectedStockAsset.startsWith('unavail:')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Add Row
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ALTERNATIVE VIEW: NATIVE SELECT DROPDOWN (Filtered by search & strictly width-capped) */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AppDropdown
                        value={selectedStockAsset}
                        onChange={(e) => setSelectedStockAsset(e.target.value)}
                        className="flex-1 min-w-0 w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer truncate"
                      >
                        <option value="">-- Choose Asset from Armory ({filteredArmoryAssets.length} filtered) --</option>
                        {filteredArmoryAssets.map((asset) => (
                          <option
                            key={asset.id}
                            value={asset.isAvailable ? asset.valueKey : `unavail:${asset.valueKey}`}
                            disabled={!asset.isAvailable}
                            className={!asset.isAvailable ? 'text-slate-500' : 'text-slate-100'}
                          >
                            {asset.isAvailable ? '✓' : '🚫'} {asset.name} · SN: {asset.serialNumber} [{asset.statusDisplay}]
                          </option>
                        ))}
                      </AppDropdown>
                      <button
                        type="button"
                        onClick={() => handleAddStockAsset()}
                        disabled={!selectedStockAsset || selectedStockAsset.startsWith('unavail:')}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Add Row
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Showing {filteredArmoryAssets.length} assets matching active search/category filter.
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
                  Only available equipment can be selected. Items issued in active handover sheets, marked under repair, crashed, or missing are blocked from assignment.
                </p>
              </div>

              {/* CARD 3: RECIPIENT OFFICER INFORMATION */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>RECIPIENT OFFICER INFORMATION</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">+ New Officer</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Select from Registered Officers Directory:
                  </label>
                  <AppDropdown
                    onChange={(e) => handleSelectOfficer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="">-- Choose Officer to Auto-Fill --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.rank ? `${u.rank} ` : ''}{u.name} (QID: {u.qatarId})
                      </option>
                    ))}
                  </AppDropdown>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Officer Full Name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      QID / Military ID
                    </label>
                    <input
                      type="text"
                      placeholder="QID number"
                      value={recipientQid}
                      onChange={(e) => setRecipientQid(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+974"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Job ID / Unit
                    </label>
                    <input
                      type="text"
                      placeholder="Badge / Dept"
                      value={recipientJobId}
                      onChange={(e) => setRecipientJobId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* SIGNATURE CANVAS */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                      <span>Draw Signature on Canvas (Synced Live)</span>
                    </label>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="relative border border-slate-700 rounded-lg overflow-hidden bg-white">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={90}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[90px] cursor-crosshair touch-none"
                    />
                    {!signatureData && !isDrawing && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs italic">
                        Sign with mouse or touch
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 4: ISSUED BY: */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-200 border-b border-slate-800 pb-2">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ISSUED BY:</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={loggedInIssuerName}
                    readOnly
                    tabIndex={-1}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-3 py-1.5 text-slate-100 font-semibold focus:outline-none cursor-not-allowed select-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Date Issued
                    </label>
                    <input
                      type="text"
                      value={dateIssued}
                      onChange={(e) => setDateIssued(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Time Issued
                    </label>
                    <input
                      type="text"
                      value={timeIssued}
                      onChange={(e) => setTimeIssued(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT PANEL: Official Spreadsheet Template */}
          <div className={`min-w-0 ${effectiveViewMode === 'split' ? 'lg:col-span-7' : 'max-w-4xl mx-auto w-full'}`}>
            <div className="flex items-center justify-between text-xs mb-2 px-1">
              {isViewAndPrintOnly ? (
                <>
                  <span className="font-mono text-slate-200 flex items-center gap-2 font-semibold">
                    <span className={`w-2 h-2 rounded-full ${
                      initialRecord?.status === 'RETURNED' ? 'bg-emerald-400' :
                      initialRecord?.status === 'PENDING' ? 'bg-amber-400 animate-pulse' :
                      'bg-cyan-400'
                    }`} />
                    <span>
                      OFFICIAL HANDOVER DOCUMENT — {
                        initialRecord?.status === 'RETURNED' ? 'RETURNED & CLEARED' :
                        initialRecord?.status === 'PENDING' ? 'PENDING (PARTIAL RETURN)' :
                        'ACTIVE CUSTODY'
                      }
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Viewable & Printable Only</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-cyan-400 flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    LIVE DATA SPREADSHEET INPUT (Interactive Cells)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    You can type directly into spreadsheet cells
                  </span>
                </>
              )}
            </div>

            {/* SPREADSHEET PAPER DOCUMENT (PRINTABLE) */}
            <div
              id="printable-handover-sheet"
              className="bg-white text-slate-900 border-2 border-slate-800 rounded-md shadow-2xl overflow-hidden text-[11px] font-sans print:border-none print:shadow-none print:m-0"
            >
              {/* Top Deep Red Banner */}
              <div className="bg-sky-700 text-white text-center py-2.5 px-4 font-bold text-sm tracking-wide border-b border-black">
                Equipment Handover Form(UAV Team)
              </div>

              {/* Date & SR Header Bar */}
              <table className="w-full border-collapse border-b border-black">
                <tbody>
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-1.5 border-r border-black w-20 text-center uppercase">
                      DATE
                    </td>
                    <td className="px-3 py-1 border-r border-black font-mono">
                      <input
                        type="text"
                        value={date}
                        readOnly={isViewAndPrintOnly}
                        onChange={(e) => !isViewAndPrintOnly && setDate(e.target.value)}
                        className={`w-full text-center font-mono text-xs ${
                          isViewAndPrintOnly
                            ? 'focus:outline-none cursor-default select-text'
                            : 'focus:outline-none focus:bg-amber-50'
                        }`}
                      />
                    </td>
                    <td className="bg-slate-100 font-bold px-3 py-1.5 border-r border-black w-16 text-center uppercase">
                      SR:
                    </td>
                    <td className="px-3 py-1 font-mono font-bold">
                      <input
                        type="text"
                        value={srNumber}
                        readOnly={isViewAndPrintOnly}
                        onChange={(e) => !isViewAndPrintOnly && setSrNumber(e.target.value)}
                        className={`w-full text-center font-mono text-xs font-bold text-slate-900 ${
                          isViewAndPrintOnly
                            ? 'focus:outline-none cursor-default select-text'
                            : 'focus:outline-none focus:bg-amber-50'
                        }`}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SERIAL EQUIPMENT TABLE (Rows 1 to 12) */}
              <table className="w-full border-collapse border-b border-black">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold text-[10px] uppercase border-b border-black">
                    <th className="py-1 px-2 border-r border-black w-10">No.</th>
                    <th className="py-1 px-3 border-r border-black text-center">
                      EQUIPMENT DESCRIPTION / NAME
                    </th>
                    <th className="py-1 px-3 text-center w-52 sm:w-64">
                      SERIAL NUMBER
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {equipmentRows.map((row, idx) => {
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-0.5 px-2 border-r border-black text-center font-bold text-slate-700 w-10">
                          {row.no}
                        </td>
                        <td className="py-0.5 px-2 border-r border-black">
                          <input
                            type="text"
                            value={row.description}
                            readOnly={isViewAndPrintOnly}
                            placeholder={isViewAndPrintOnly ? '' : `Equipment #${row.no}`}
                            onChange={(e) => {
                              if (isViewAndPrintOnly) return;
                              const updated = [...equipmentRows];
                              updated[idx] = { ...updated[idx], description: e.target.value, assetId: undefined, assetEntity: undefined };
                              setEquipmentRows(updated);
                            }}
                            className={`w-full text-xs text-slate-800 px-1 py-0.5 ${
                              isViewAndPrintOnly
                                ? 'focus:outline-none cursor-default select-text'
                                : 'placeholder-slate-400 focus:outline-none focus:bg-amber-50'
                            }`}
                          />
                        </td>
                        <td className="py-0.5 px-2 font-mono">
                          <div className="flex items-center justify-between gap-1">
                            <input
                              type="text"
                              value={row.serialNumber}
                              readOnly={isViewAndPrintOnly}
                              placeholder={isViewAndPrintOnly ? '' : 'Serial No...'}
                              onChange={(e) => {
                                if (isViewAndPrintOnly) return;
                                const updated = [...equipmentRows];
                                updated[idx] = { ...updated[idx], serialNumber: e.target.value, assetId: undefined, assetEntity: undefined };
                                setEquipmentRows(updated);
                              }}
                              className={`w-full text-xs font-mono text-slate-800 px-1 py-0.5 ${
                                isViewAndPrintOnly
                                  ? 'focus:outline-none cursor-default select-text'
                                  : 'placeholder-slate-400 focus:outline-none focus:bg-amber-50'
                              }`}
                            />
                            {(() => {
                              if (!isViewAndPrintOnly || (!row.description && !row.serialNumber)) return null;
                              if (row.returnStatus === 'CRASHED') {
                                return (
                                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-400 print:border-rose-700 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                    <span>CRASHED</span>
                                  </span>
                                );
                              }
                              if (row.returnStatus === 'MISSING') {
                                return (
                                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-missing-950 text-missing-400 border border-missing-400 print:border-missing-700 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-missing-600" />
                                    <span>MISSING</span>
                                  </span>
                                );
                              }
                              const isReturned = row.returned === true || row.returnStatus === 'RETURNED' || (initialRecord?.status === 'RETURNED' && row.returned !== false);
                              const isPending = row.returnStatus === 'PENDING' || (initialRecord?.status === 'PENDING' && !row.returned);

                              if (isReturned) {
                                return (
                                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-400 print:border-emerald-700 inline-flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                    <span>RETURNED (ACTIVE)</span>
                                  </span>
                                );
                              }
                              if (isPending) {
                                return (
                                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-400 print:border-amber-700 inline-flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-amber-600" />
                                    <span>PENDING</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ACCESSORIES TABLE (Rows 1 to 8) */}
              <table className="w-full border-collapse border-b border-black">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold text-[10px] uppercase border-b border-black">
                    <th className="py-1 px-2 border-r border-black w-10">No.</th>
                    <th className="py-1 px-3 border-r border-black text-center">
                      ACCESSORY / AUXILIARY EQUIPMENT
                    </th>
                    <th className="py-1 px-3 text-center w-28">
                      QTY
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {accessoryRows.map((row, idx) => {
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-0.5 px-2 border-r border-black text-center font-bold text-slate-700 w-10">
                          {row.no}
                        </td>
                        <td className="py-0.5 px-2 border-r border-black">
                          <input
                            type="text"
                            value={row.description}
                            readOnly={isViewAndPrintOnly}
                            placeholder={isViewAndPrintOnly ? '' : `Accessory #${row.no}`}
                            onChange={(e) => {
                              if (isViewAndPrintOnly) return;
                              const updated = [...accessoryRows];
                              updated[idx] = { ...updated[idx], description: e.target.value, assetId: undefined, assetEntity: undefined };
                              setAccessoryRows(updated);
                            }}
                            className={`w-full text-xs text-slate-800 px-1 py-0.5 ${
                              isViewAndPrintOnly
                                ? 'focus:outline-none cursor-default select-text'
                                : 'placeholder-slate-400 focus:outline-none focus:bg-amber-50'
                            }`}
                          />
                        </td>
                        <td className="py-0.5 px-2 text-center font-mono">
                          <div className="flex items-center justify-between gap-1">
                            <input
                              type="text"
                              value={row.qty}
                              readOnly={isViewAndPrintOnly}
                              placeholder={isViewAndPrintOnly ? '' : 'Qty'}
                              onChange={(e) => {
                                if (isViewAndPrintOnly) return;
                                const updated = [...accessoryRows];
                                updated[idx].qty = e.target.value;
                                setAccessoryRows(updated);
                              }}
                              className={`w-full text-center text-xs font-mono text-slate-800 px-1 py-0.5 ${
                                isViewAndPrintOnly
                                  ? 'focus:outline-none cursor-default select-text'
                                  : 'placeholder-slate-400 focus:outline-none focus:bg-amber-50'
                              }`}
                            />
                            {(() => {
                              if (!isViewAndPrintOnly || (!row.description && !row.qty)) return null;
                              if (row.returnStatus === 'CRASHED') {
                                return (
                                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-400 print:border-rose-700 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                    <span>CRASHED</span>
                                  </span>
                                );
                              }
                              if (row.returnStatus === 'MISSING') {
                                return (
                                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-missing-950 text-missing-400 border border-missing-400 print:border-missing-700 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-missing-600" />
                                    <span>MISSING</span>
                                  </span>
                                );
                              }
                              const isReturned = row.returned === true || row.returnStatus === 'RETURNED' || (initialRecord?.status === 'RETURNED' && row.returned !== false);
                              const isPending = row.returnStatus === 'PENDING' || (initialRecord?.status === 'PENDING' && !row.returned);

                              if (isReturned) {
                                return (
                                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-400 print:border-emerald-700 inline-flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                    <span>RETURNED (ACTIVE)</span>
                                  </span>
                                );
                              }
                              if (isPending) {
                                return (
                                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-400 print:border-amber-700 inline-flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-amber-600" />
                                    <span>PENDING</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* PURPOSE OF USE ROW */}
              <table className="w-full border-collapse border-b border-black">
                <tbody>
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-3 border-r border-black w-36 text-center uppercase align-middle text-[10px]">
                      PURPOSE OF USE
                    </td>
                    <td className="px-3 py-2 text-xs font-medium">
                      <textarea
                        rows={2}
                        value={purpose}
                        readOnly={isViewAndPrintOnly}
                        onChange={(e) => !isViewAndPrintOnly && setPurpose(e.target.value)}
                        className={`w-full text-xs text-slate-800 resize-none ${
                          isViewAndPrintOnly
                            ? 'focus:outline-none cursor-default select-text'
                            : 'focus:outline-none focus:bg-amber-50'
                        }`}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SIGNATURES & RECIPIENT MATRIX */}
              <table className="w-full border-collapse border-b border-black text-[11px]">
                <tbody>
                  {/* Name and QID */}
                  <tr className="border-b border-black">
                    <td className="bg-slate-100 font-bold px-3 py-1.5 border-r border-black w-36 text-center">
                      Name
                    </td>
                    <td className="px-3 py-1 border-r border-black">
                      <input
                        type="text"
                        value={recipientName}
                        readOnly={isViewAndPrintOnly}
                        placeholder={isViewAndPrintOnly ? '' : 'Recipient Full Name'}
                        onChange={(e) => !isViewAndPrintOnly && setRecipientName(e.target.value)}
                        className={`w-full font-medium text-xs text-slate-800 ${
                          isViewAndPrintOnly
                            ? 'focus:outline-none cursor-default select-text'
                            : 'focus:outline-none focus:bg-amber-50'
                        }`}
                      />
                    </td>
                    <td className="bg-slate-100 font-bold px-3 py-1.5 border-r border-black w-24 text-center">
                      QID
                    </td>
                    <td className="px-3 py-1 font-mono">
                      <input
                        type="text"
                        value={recipientQid}
                        readOnly={isViewAndPrintOnly}
                        placeholder={isViewAndPrintOnly ? '' : 'Qatar ID / Military'}
                        onChange={(e) => !isViewAndPrintOnly && setRecipientQid(e.target.value)}
                        className={`w-full font-mono text-xs text-slate-800 ${
                          isViewAndPrintOnly
                            ? 'focus:outline-none cursor-default select-text'
                            : 'focus:outline-none focus:bg-amber-50'
                        }`}
                      />
                    </td>
                  </tr>

                  {/* Phone and Job ID */}
                  <tr className="border-b border-black">
                    <td className="bg-slate-100 font-bold px-3 py-1.5 border-r border-black text-center">
                      Phone
                    </td>
                    <td className="px-3 py-1 border-r border-black font-mono">
                      <input
                        type="text"
                        value={recipientPhone}
                        readOnly={isViewAndPrintOnly}
                        placeholder={isViewAndPrintOnly ? '' : '+974'}
                        onChange={(e) => !isViewAndPrintOnly && setRecipientPhone(e.target.value)}
                        className={`w-full font-mono text-xs text-slate-800 ${
                          isViewAndPrintOnly
                            ? 'focus:outline-none cursor-default select-text'
                            : 'focus:outline-none focus:bg-amber-50'
                        }`}
                      />
                    </td>
                    <td className="bg-slate-100 font-bold px-3 py-1.5 border-r border-black text-center">
                      JOB ID
                    </td>
                    <td className="px-3 py-1">
                      <input
                        type="text"
                        value={recipientJobId}
                        readOnly={isViewAndPrintOnly}
                        placeholder={isViewAndPrintOnly ? '' : 'Job ID / Dept'}
                        onChange={(e) => !isViewAndPrintOnly && setRecipientJobId(e.target.value)}
                        className={`w-full text-xs text-slate-800 ${
                          isViewAndPrintOnly
                            ? 'focus:outline-none cursor-default select-text'
                            : 'focus:outline-none focus:bg-amber-50'
                        }`}
                      />
                    </td>
                  </tr>

                  {/* Recipient Signature & Date / Time */}
                  <tr className="border-b border-black">
                    <td className="bg-slate-100 font-bold px-3 py-2 border-r border-black text-center align-middle">
                      Signature
                    </td>
                    <td className="px-3 py-1.5 border-r border-black align-middle">
                      {signatureData ? (
                        <div className="h-10 flex items-center">
                          <img
                            src={signatureData}
                            alt="Recipient Signature"
                            className="max-h-10 object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          {isViewAndPrintOnly ? '[Officer Signature Recorded on File]' : '[Signature Canvas Below]'}
                        </span>
                      )}
                    </td>
                    <td className="p-0 border-r border-black" colSpan={2}>
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="border-b border-black">
                            <td className="bg-slate-100 font-bold px-2 py-1 border-r border-black w-24 text-center">
                              DATE
                            </td>
                            <td className="px-2 py-1 font-mono text-center">
                              {dateIssued}
                            </td>
                          </tr>
                          <tr>
                            <td className="bg-slate-100 font-bold px-2 py-1 border-r border-black w-24 text-center">
                              TIME
                            </td>
                            <td className="px-2 py-1 font-mono text-center">
                              {timeIssued || '09:15'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* Issuer Authority Name and Signature */}
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 border-r border-black text-center text-[10px] leading-tight">
                      Prepared by
                    </td>
                    <td className="px-3 py-1.5 border-r border-black font-semibold text-xs text-slate-800 align-middle">
                      <input
                        type="text"
                        value={initialRecord?.issuedAuthorityName || loggedInIssuerName}
                        readOnly
                        tabIndex={-1}
                        className="w-full font-semibold text-xs text-slate-800 focus:outline-none bg-transparent cursor-default select-text"
                      />
                    </td>
                    <td className="p-0 border-r border-black" colSpan={2}>
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="border-b border-black">
                            <td className="bg-slate-100 font-bold px-2 py-1 border-r border-black w-24 text-center">
                              DATE
                            </td>
                            <td className="px-2 py-1 font-mono text-center">
                              {dateIssued}
                            </td>
                          </tr>
                          <tr>
                            <td className="bg-slate-100 font-bold px-2 py-1 border-r border-black w-24 text-center">
                              TIME
                            </td>
                            <td className="px-2 py-1 font-mono text-center">
                              {timeIssued}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* RETURN INSPECTION DETAILS BANNER (Deep Red) */}
              <div className="bg-sky-700 text-white text-center py-1.5 px-4 font-bold text-xs tracking-wider border-b border-black uppercase flex items-center justify-between">
                <span>RECIEVED INFORMATION DETAILS</span>
                {initialRecord?.status === 'PENDING' && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-normal inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-950" />
                    <span>PARTIAL RETURN (PENDING RESTITUTION)</span>
                  </span>
                )}
                {initialRecord?.status === 'RETURNED' && (
                  <span className="bg-emerald-400 text-slate-950 text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-normal inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                    <span>ALL ASSETS RETURNED</span>
                  </span>
                )}
              </div>

              {/* Return Inspection Table */}
              <table className="w-full border-collapse">
                <tbody>
                  {initialRecord?.status === 'PENDING' && (
                    <tr className="border-b border-black bg-amber-50">
                      <td className="bg-amber-100 font-bold px-3 py-1.5 border-r border-black text-center text-[10px] text-amber-900 leading-tight">
                        STATUS NOTICE
                      </td>
                      <td colSpan={3} className="px-3 py-1.5 text-xs text-amber-950 font-medium">
                        ⚠️ <strong>Partial Return:</strong> Assets check-marked with <span className="text-emerald-700 font-bold">✓ RETURNED</span> are restored to inventory. Unreturned assets remain in <span className="text-amber-800 font-bold">⏳ PENDING</span> status. This custody document remains <strong>PENDING</strong> until all items are received.
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-black">
                    <td className="bg-slate-100 font-bold px-3 py-2 border-r border-black w-36 text-center text-[10px] leading-tight">
                      Received by
                    </td>
                    <td className="px-3 py-1 border-r border-black">
                      <input
                        type="text"
                        value={initialRecord?.receivedOfficerName || (currentUser?.name?.trim() || receivedOfficerName)}
                        readOnly
                        tabIndex={-1}
                        className="w-full text-xs text-slate-800 focus:outline-none bg-transparent cursor-default select-text font-semibold"
                      />
                    </td>
                    <td className="p-0" colSpan={2}>
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="border-b border-black">
                            <td className="bg-slate-100 font-bold px-2 py-1 border-r border-black w-24 text-center">
                              DATE
                            </td>
                            <td className="px-2 py-1 font-mono text-center">
                              <input
                                type="text"
                                value={dateReceived}
                                readOnly={isViewAndPrintOnly}
                                placeholder={isViewAndPrintOnly ? '—' : 'Date returned'}
                                onChange={(e) => !isViewAndPrintOnly && setDateReceived(e.target.value)}
                                className={`w-full text-center text-xs font-mono text-slate-800 ${
                                  isViewAndPrintOnly
                                    ? 'focus:outline-none cursor-default select-text'
                                    : 'placeholder-slate-400 focus:outline-none focus:bg-amber-50'
                                }`}
                              />
                            </td>
                          </tr>
                          <tr>
                            <td className="bg-slate-100 font-bold px-2 py-1 border-r border-black w-24 text-center">
                              TIME
                            </td>
                            <td className="px-2 py-1 font-mono text-center">
                              <input
                                type="text"
                                value={timeReceived}
                                readOnly={isViewAndPrintOnly}
                                placeholder={isViewAndPrintOnly ? '—' : 'Time returned'}
                                onChange={(e) => !isViewAndPrintOnly && setTimeReceived(e.target.value)}
                                className={`w-full text-center text-xs font-mono text-slate-800 ${
                                  isViewAndPrintOnly
                                    ? 'focus:outline-none cursor-default select-text'
                                    : 'placeholder-slate-400 focus:outline-none focus:bg-amber-50'
                                }`}
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* Notes Row */}
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 border-r border-black text-center text-xs">
                      NOTE:
                    </td>
                    <td className="px-3 py-2" colSpan={3}>
                      <input
                        type="text"
                        value={returnNotes}
                        readOnly={isViewAndPrintOnly}
                        placeholder={isViewAndPrintOnly ? '—' : 'Additional operational remarks, technical condition, or clearance notes...'}
                        onChange={(e) => !isViewAndPrintOnly && setReturnNotes(e.target.value)}
                        className={`w-full text-xs text-slate-700 ${
                          isViewAndPrintOnly
                            ? 'focus:outline-none cursor-default select-text'
                            : 'placeholder-slate-400 focus:outline-none focus:bg-amber-50'
                        }`}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      {isViewAndPrintOnly ? (
        <div className="bg-slate-900 border border-slate-800 rounded-b-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              Custody Sheet <strong className="font-mono text-slate-200">{srNumber}</strong> ({
                initialRecord?.status === 'RETURNED' ? 'Returned Restitution' :
                initialRecord?.status === 'PENDING' ? 'Pending Restitution (Partial Return)' :
                'Active Issued Custody'
              }) is an official archived record. Viewable and printable only.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenReceiveModal && initialRecord && (initialRecord.status === 'ISSUED' || initialRecord.status === 'PENDING') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReceiveModal(initialRecord);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md ${
                  initialRecord.status === 'PENDING'
                    ? 'text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
                    : 'text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                }`}
              >
                {initialRecord.status === 'PENDING' ? (
                  <>
                    <Clock className="w-4 h-4 text-slate-950" />
                    <span>Receive Remaining Assets (Pending Restitution)</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4 text-slate-950" />
                    <span>Receive & Inspect Assets</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-b-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Sample (11/24/2025)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveForm('DRAFT')}
              className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleInitiateApproveAndIssue}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-all shadow-md shadow-rose-900/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Approve & Issue Form (UAV Team)</span>
            </button>
          </div>
        </div>
      )}
      </div>

      {/* OFFICER APPROVAL & DISPATCH MODAL */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Officer Approval & Issuance
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Designate an officer to authorize UAV custody sheet <span className="font-mono text-cyan-400">{srNumber}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Handover Summary Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-mono font-bold text-cyan-400">{srNumber}</span>
                <span className="text-slate-400">{date}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Recipient Officer:</span>
                  <span className="font-medium text-slate-200">
                    {recipientName || 'Not specified'}
                  </span>
                  <span className="text-slate-400 block text-[10px]">{recipientJobId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Assigned Drone Units:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {totalAssignedAssets} equipment & accessory items
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Mission Purpose:</span>
                <span className="text-slate-300 text-[11px] line-clamp-2">{purpose}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmApprovalDispatch} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SELECT DESIGNATED APPROVING OFFICER *</span>
                </label>
                <AppDropdown
                  required
                  value={selectedApprovingOfficerId}
                  onChange={(e) => setSelectedApprovingOfficerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                >
                  {officerUsers.map((officer) => (
                    <option key={officer.id} value={officer.id}>
                      {officer.rank ? `${officer.rank} ` : ''}{officer.name} (Emp ID: {officer.employeeId}, {officer.department})
                    </option>
                  ))}
                </AppDropdown>
                <p className="text-[10px] text-slate-500 mt-1">
                  A notification message will be dispatched directly to this officer's Notifications queue.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  OPTIONAL REMARKS / MISSION DISPATCH NOTES
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Flight sortie scheduled for perimeter security. All battery cells verified nominal."
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* If user is an officer, provide direct self-issue option */}
                  {isOfficer && (
                    <button
                      type="button"
                      onClick={handleDirectOfficerIssue}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Issue directly under your officer credentials"
                    >
                      Direct Issue (Officer)
                    </button>
                  )}

                  {/* Dispatch approval notification to selected officer */}
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Approval Notification</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCKED ISSUANCE MODAL: UNAVAILABLE EQUIPMENT DETECTED */}
      {blockedIssuanceModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-rose-500/50 rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {blockedIssuanceModal.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Handover Sheet Reference: <span className="font-mono text-cyan-400 font-bold">{srNumber}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockedIssuanceModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs">
              Handover custody cannot be authorized or submitted because the following equipment is marked as unavailable in the system inventory (already issued, under repair, crashed, or missing).
            </div>

            {/* List of problematic rows */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {blockedIssuanceModal.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-rose-900/40 rounded-lg p-3 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        Row #{issue.row} ({issue.type})
                      </span>
                      <span className="font-semibold text-slate-200 text-xs">
                        {issue.title}
                      </span>
                    </div>
                    {issue.serial && (
                      <div className="font-mono text-[11px] text-slate-400">
                        Serial: {issue.serial}
                      </div>
                    )}
                    <div className="text-rose-400 font-medium text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{issue.reason}</span>
                    </div>
                  </div>
                  {issue.badge && (
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 border border-rose-700 text-rose-300 uppercase">
                      {issue.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Please clear or replace these items in the form before proceeding.
              </span>
              <button
                type="button"
                onClick={() => setBlockedIssuanceModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg transition-colors cursor-pointer"
              >
                Return & Fix Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Armory Barcode Scanner Modal using Device Camera */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={(scanned) => {
          setAssetSearchQuery(scanned);
          setPickerViewMode('list');
        }}
        title="Scan Armory Asset Serial Number Barcode"
        subtitle="Point camera at the barcode or QR code on the drone, battery, or accessory tag"
      />
    </div>
  );
};

