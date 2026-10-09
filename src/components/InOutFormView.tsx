import { AppDropdown } from './AppDropdown';
import React, { useState, useEffect } from 'react';
import {
  DroneItem,
  UserItem,
  BatteryItem,
  AccessoryItem,
  StreamingDeviceItem,
  HandoverFormRecord,
  HandoverFormStatus,
  HandoverAssetReturnStatus,
  CheckoutRecord,
  GroupPrivileges,
  hasPrivilege
} from '../types/drone';
import { INITIAL_HANDOVER_FORMS } from '../data/initialHandoverData';
import { HandoverFormCreator } from './HandoverFormCreator';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Eye,
  Trash2,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  FileText,
  PackageCheck,
  Undo2,
  X,
  Check,
  RotateCcw,
  Shield,
  Calendar,
  Lock,
  AlertTriangle,
  Radio,
  ChevronDown,
  Filter
} from 'lucide-react';

interface InOutFormViewProps {
  drones: DroneItem[];
  users: UserItem[];
  checkouts?: CheckoutRecord[];
  onCheckOutDrone?: (record: Omit<CheckoutRecord, 'id'>) => void;
  onCheckInDrone?: (checkoutId: string, batteryIn: number, remarks: string) => void;
  onViewAssetTag?: (drone: DroneItem) => void;
  batteries?: BatteryItem[];
  accessories?: AccessoryItem[];
  streamingDevices?: StreamingDeviceItem[];
  handoverForms?: HandoverFormRecord[];
  onSaveHandoverForm?: (record: HandoverFormRecord) => void;
  onDeleteHandoverForm?: (id: string) => void;
  currentUser?: UserItem | null;
  onSubmitHandoverApprovalRequest?: (record: HandoverFormRecord, targetOfficer: UserItem, remarks: string) => void;
  targetHandoverId?: string | null;
  onClearTargetHandoverId?: () => void;
  onCloseLinkedHandover?: () => void;
  documentPreviewOnly?: boolean;
  onOpenFullView?: () => void;
  groupPrivileges?: GroupPrivileges;
  initialStatusFilter?: 'ALL' | 'ISSUED' | 'RETURNED' | 'PENDING' | 'PENDING_APPROVAL' | 'DRAFT' | 'ARCHIVED';
  initialStatusFilterKey?: number;
}

export const InOutFormView: React.FC<InOutFormViewProps> = ({
  drones,
  users,
  checkouts = [],
  batteries = [],
  accessories = [],
  streamingDevices = [],
  handoverForms: externalForms,
  onSaveHandoverForm,
  onDeleteHandoverForm,
  currentUser,
  onSubmitHandoverApprovalRequest,
  targetHandoverId,
  onClearTargetHandoverId,
  onCloseLinkedHandover,
  documentPreviewOnly = false,
  onOpenFullView,
  groupPrivileges,
  initialStatusFilter,
  initialStatusFilterKey,
}) => {
  // Functional permission enforcement for IN/OUT FORM
  const canDeleteRecord = hasPrivilege(groupPrivileges, currentUser, 'IN_OUT_DELETE_RECORD');
  const [formToDelete, setFormToDelete] = useState<HandoverFormRecord | null>(null);

  // Local state for Handover Forms with localStorage persistence fallback
  const [internalForms, setInternalForms] = useState<HandoverFormRecord[]>(() => {
    try {
      const saved = localStorage.getItem('aerotrack_handover_forms_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_HANDOVER_FORMS;
  });

  const forms = externalForms || internalForms;

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ISSUED' | 'RETURNED' | 'PENDING' | 'PENDING_APPROVAL' | 'DRAFT' | 'ARCHIVED'>(
    initialStatusFilter || 'ALL'
  );

  // Sync statusFilter whenever initialStatusFilter or key is provided
  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
      setIsCreatorOpen(false);
      setRecordToView(null);
      setSearchTerm('');
    }
  }, [initialStatusFilter, initialStatusFilterKey]);

  // Creator Modal State
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [recordToView, setRecordToView] = useState<HandoverFormRecord | null>(null);
  const [isLinkedHandoverOpen, setIsLinkedHandoverOpen] = useState(false);

  // Receive / Return Equipment Modal State
  const [returningRecord, setReturningRecord] = useState<HandoverFormRecord | null>(null);
  const [receivedByOfficer, setReceivedByOfficer] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [returnInspectionNotes, setReturnInspectionNotes] = useState('');
  const [assetReturnStatuses, setAssetReturnStatuses] = useState<Record<string, HandoverAssetReturnStatus>>({});

  // Handle external deep-link navigation to a specific handover document
  useEffect(() => {
    if (targetHandoverId) {
      const match = forms.find(
        (f) => f.id === targetHandoverId || f.srNumber.toLowerCase() === targetHandoverId.toLowerCase()
      );
      if (match) {
        setRecordToView(match);
        setIsLinkedHandoverOpen(true);
        setIsCreatorOpen(true);
        setSearchTerm(match.srNumber);
      }
      onClearTargetHandoverId?.();
    }
  }, [targetHandoverId, forms, onClearTargetHandoverId]);

  const getTodayFormatted = () => {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const getTimeFormatted = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const saveForm = (record: HandoverFormRecord) => {
    if (onSaveHandoverForm) {
      onSaveHandoverForm(record);
    }
    setInternalForms((prev) => {
      const exists = prev.some((f) => f.id === record.id || f.srNumber === record.srNumber);
      const updated = exists
        ? prev.map((f) => (f.id === record.id || f.srNumber === record.srNumber ? record : f))
        : [record, ...prev];
      try {
        localStorage.setItem('aerotrack_handover_forms_v3', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save handover forms:', err);
      }
      return updated;
    });
    setIsCreatorOpen(false);
    setIsLinkedHandoverOpen(false);
    setRecordToView(null);
    if (isLinkedHandoverOpen) {
      onCloseLinkedHandover?.();
    }
  };

  const deleteForm = (id: string) => {
    if (onDeleteHandoverForm) {
      onDeleteHandoverForm(id);
    }
    setInternalForms((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      try {
        localStorage.setItem('aerotrack_handover_forms_v3', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save handover forms:', err);
      }
      return updated;
    });
  };

  const handleApprovalSubmit = (record: HandoverFormRecord, targetOfficer: UserItem, remarks: string) => {
    if (onSubmitHandoverApprovalRequest) {
      onSubmitHandoverApprovalRequest(record, targetOfficer, remarks);
    } else {
      saveForm(record);
    }
    setIsCreatorOpen(false);
    setIsLinkedHandoverOpen(false);
    setRecordToView(null);
    if (isLinkedHandoverOpen) {
      onCloseLinkedHandover?.();
    }
  };

  // Open Receive / Return modal
  const handleOpenReceiveModal = (record: HandoverFormRecord) => {
    setReturningRecord(record);
    const loggedInName = currentUser?.name?.trim() || record.receivedOfficerName || 'Tariq Al-Kuwari';
    setReceivedByOfficer(loggedInName);
    setReturnDate(record.dateReceived || getTodayFormatted());
    setReturnTime(record.timeReceived || getTimeFormatted());
    setReturnInspectionNotes(
      record.returnNotes ||
        'Returned in nominal operational condition; motor bearings & thermal sensors inspected. Batteries placed on cooling dock.'
    );

    // Initialize asset status dropdown values (default: RETURNED=active)
    const initialMap: Record<string, HandoverAssetReturnStatus> = {};
    const validEquipment = (record.equipment || []).filter((e) => e.description || e.serialNumber);
    const validAccessories = (record.accessories || []).filter((a) => a.description || a.qty);

    validEquipment.forEach((e) => {
      const key = `eq-${e.id || e.no}`;
      if (e.returnStatus === 'CRASHED' || e.returnStatus === 'MISSING' || e.returnStatus === 'RETURNED' || e.returnStatus === 'PENDING') {
        initialMap[key] = e.returnStatus;
      } else if (record.status === 'PENDING' && e.returned === false) {
        initialMap[key] = 'PENDING';
      } else {
        initialMap[key] = 'RETURNED';
      }
    });

    validAccessories.forEach((a) => {
      const key = `acc-${a.id || a.no}`;
      if (a.returnStatus === 'CRASHED' || a.returnStatus === 'MISSING' || a.returnStatus === 'RETURNED' || a.returnStatus === 'PENDING') {
        initialMap[key] = a.returnStatus;
      } else if (record.status === 'PENDING' && a.returned === false) {
        initialMap[key] = 'PENDING';
      } else {
        initialMap[key] = 'RETURNED';
      }
    });

    setAssetReturnStatuses(initialMap);
  };

  const handleStatusChange = (key: string, status: HandoverAssetReturnStatus) => {
    setAssetReturnStatuses((prev) => ({
      ...prev,
      [key]: status,
    }));
  };

  const handleSetAllStatus = (status: HandoverAssetReturnStatus) => {
    if (!returningRecord) return;
    const newMap: Record<string, HandoverAssetReturnStatus> = {};
    (returningRecord.equipment || [])
      .filter((e) => e.description || e.serialNumber)
      .forEach((e) => {
        newMap[`eq-${e.id || e.no}`] = status;
      });
    (returningRecord.accessories || [])
      .filter((a) => a.description || a.qty)
      .forEach((a) => {
        newMap[`acc-${a.id || a.no}`] = status;
      });
    setAssetReturnStatuses(newMap);
  };

  // Submit Receive / Return
  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningRecord) return;

    const loggedInName = currentUser?.name?.trim() || receivedByOfficer.trim() || 'Officer on Return Inspection';
    const stampDate = returnDate.trim() || getTodayFormatted();
    const stampTime = returnTime.trim() || getTimeFormatted();

    const updatedEquipment = (returningRecord.equipment || []).map((eq) => {
      const isValid = eq.description || eq.serialNumber;
      if (!isValid) return eq;
      const key = `eq-${eq.id || eq.no}`;
      const status = assetReturnStatuses[key] || 'RETURNED';
      const isReturned = status !== 'PENDING';
      return {
        ...eq,
        returned: isReturned,
        returnStatus: status,
        returnedAt: isReturned ? (eq.returnedAt || `${stampDate} ${stampTime}`) : undefined,
        conditionOnReturn:
          status === 'CRASHED'
            ? 'Crashed on mission'
            : status === 'MISSING'
            ? 'Reported missing in field'
            : eq.conditionOnReturn || 'Returned Active / Nominal condition',
      };
    });

    const updatedAccessories = (returningRecord.accessories || []).map((acc) => {
      const isValid = acc.description || acc.qty;
      if (!isValid) return acc;
      const key = `acc-${acc.id || acc.no}`;
      const status = assetReturnStatuses[key] || 'RETURNED';
      const isReturned = status !== 'PENDING';
      return {
        ...acc,
        returned: isReturned,
        returnStatus: status,
        returnedAt: isReturned ? (acc.returnedAt || `${stampDate} ${stampTime}`) : undefined,
      };
    });

    const validEq = updatedEquipment.filter((e) => e.description || e.serialNumber);
    const validAcc = updatedAccessories.filter((a) => a.description || a.qty);
    const totalCount = validEq.length + validAcc.length;
    const pendingItemsCount =
      validEq.filter((e) => e.returnStatus === 'PENDING').length +
      validAcc.filter((a) => a.returnStatus === 'PENDING').length;
    const allAccountedFor = totalCount > 0 && pendingItemsCount === 0;

    // If all assets are accounted for (returned active, crashed, or missing) -> status is RETURNED
    // If ANY asset is still PENDING -> document status is PENDING
    const newDocStatus: HandoverFormStatus = allAccountedFor ? 'RETURNED' : 'PENDING';

    const updatedRecord: HandoverFormRecord = {
      ...returningRecord,
      status: newDocStatus,
      receivedOfficerName: loggedInName,
      dateReceived: stampDate,
      timeReceived: stampTime,
      returnNotes: returnInspectionNotes.trim(),
      equipment: updatedEquipment,
      accessories: updatedAccessories,
    };

    saveForm(updatedRecord);
    setReturningRecord(null);
  };

  // Re-open as ISSUED if needed
  const handleReopenAsIssued = () => {
    if (!returningRecord) return;
    const resetEquipment = (returningRecord.equipment || []).map((e) => ({
      ...e,
      returned: false,
      returnStatus: undefined,
      returnedAt: undefined,
    }));
    const resetAccessories = (returningRecord.accessories || []).map((a) => ({
      ...a,
      returned: false,
      returnStatus: undefined,
      returnedAt: undefined,
    }));

    const updatedRecord: HandoverFormRecord = {
      ...returningRecord,
      status: 'ISSUED',
      receivedOfficerName: '',
      dateReceived: '',
      timeReceived: '',
      equipment: resetEquipment,
      accessories: resetAccessories,
    };
    saveForm(updatedRecord);
    setReturningRecord(null);
  };

  // Filtered Handover Forms
  const pendingFormsCount = forms.filter((f) => f.status === 'PENDING_APPROVAL').length;
  const pendingReturnFormsCount = forms.filter((f) => f.status === 'PENDING').length;
  const issuedFormsCount = forms.filter((f) => f.status === 'ISSUED').length;
  const returnedFormsCount = forms.filter((f) => f.status === 'RETURNED').length;

  const filteredForms = forms.filter((item) => {
    if (statusFilter === 'PENDING') {
      if (item.status !== 'PENDING' && item.status !== 'PENDING_APPROVAL') return false;
    } else if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;

      const matchSr = item.srNumber?.toLowerCase().includes(term);
      const matchRecipient = item.recipientName?.toLowerCase().includes(term);
      const matchEmp = item.recipientEmpId?.toLowerCase().includes(term);
      const matchQid = item.recipientQid?.toLowerCase().includes(term);
      const matchPurpose = item.purpose?.toLowerCase().includes(term);
      const matchIssuedBy = item.issuedAuthorityName?.toLowerCase().includes(term);
      const matchReceivedBy = item.receivedOfficerName?.toLowerCase().includes(term);

      // Search matching assigned equipment names and serial numbers
      const matchEquipment = (item.equipment || []).some(
        (eq) =>
          eq.description?.toLowerCase().includes(term) ||
          eq.serialNumber?.toLowerCase().includes(term)
      );

      // Search matching assigned accessory names
      const matchAccessories = (item.accessories || []).some(
        (acc) => acc.description?.toLowerCase().includes(term)
      );

      return (
        matchSr ||
        matchRecipient ||
        matchEmp ||
        matchQid ||
        matchPurpose ||
        matchIssuedBy ||
        matchReceivedBy ||
        matchEquipment ||
        matchAccessories
      );
    }
    return true;
  });

  // Calculate assigned asset count for a record
  const getAssetCount = (record: HandoverFormRecord) => {
    const eqCount = (record.equipment || []).filter((e) => e.description || e.serialNumber).length;
    const accCount = (record.accessories || []).filter((a) => a.description || a.qty).length;
    return eqCount + accCount || 8;
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const header = 'SR Reference,Status,Recipient Name,Employee ID,QID,Phone,Job ID,Mission Purpose,Date,Assigned Assets,Issued By,Received By,Return Notes';
    const rows = filteredForms.map((f) => {
      const assets = getAssetCount(f);
      return `"${f.srNumber}","${f.status}","${f.recipientName}","${f.recipientEmpId || ''}","${f.recipientQid || ''}","${f.recipientPhone || ''}","${f.recipientJobId || ''}","${f.purpose.replace(/"/g, '""')}","${f.date}","${assets} units","${f.issuedAuthorityName}","${f.receivedOfficerName || ''}","${(f.returnNotes || '').replace(/"/g, '""')}"`;
    });
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `uav_handover_forms_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: HandoverFormStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-500 text-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>PENDING</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-500 text-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>PENDING APPROVAL</span>
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/70 border border-emerald-500 text-emerald-400">
            RETURNED
          </span>
        );
      case 'ISSUED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/70 border border-emerald-500 text-emerald-400">
            ISSUED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 border border-slate-600 text-slate-300">
            DRAFT
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-400">
            ARCHIVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/80 border border-rose-500 text-rose-300">
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className={documentPreviewOnly ? 'w-full min-w-0 max-w-full' : 'w-full min-w-0 max-w-full space-y-4'}>
      <div hidden={documentPreviewOnly} className="w-full min-w-0 max-w-full space-y-4">
      {/* KPI Stats Cards - Uniform 16px Spacing Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* TOTAL DOCUMENTS */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`bg-slate-900 border rounded-lg p-3.5 sm:p-4 cursor-pointer transition-colors ${
            statusFilter === 'ALL'
              ? 'border-cyan-500/80 bg-slate-800/60 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>TOTAL DOCUMENTS</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {forms.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Handover register records</div>
        </div>

        {/* ISSUED */}
        <div 
          onClick={() => setStatusFilter('ISSUED')}
          className={`bg-slate-900 border rounded-lg p-3.5 sm:p-4 cursor-pointer transition-colors ${
            statusFilter === 'ISSUED'
              ? 'border-emerald-500/80 bg-emerald-950/40 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-emerald-400 text-xs font-medium flex items-center justify-between">
            <span>ISSUED</span>
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-300 mt-1">
            {issuedFormsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active field custody</div>
        </div>

        {/* RETURNED */}
        <div 
          onClick={() => setStatusFilter('RETURNED')}
          className={`bg-slate-900 border rounded-lg p-3.5 sm:p-4 cursor-pointer transition-colors ${
            statusFilter === 'RETURNED'
              ? 'border-emerald-500/80 bg-emerald-950/40 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-emerald-400 text-xs font-medium flex items-center justify-between">
            <span>RETURNED</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-300 mt-1">
            {returnedFormsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Restitution completed</div>
        </div>

        {/* PENDING */}
        <div 
          onClick={() => {
            if (pendingReturnFormsCount > 0) {
              setStatusFilter('PENDING');
            } else if (pendingFormsCount > 0) {
              setStatusFilter('PENDING_APPROVAL');
            } else {
              setStatusFilter('PENDING');
            }
          }}
          className={`bg-slate-900 border rounded-lg p-3.5 sm:p-4 cursor-pointer transition-colors ${
            statusFilter === 'PENDING' || statusFilter === 'PENDING_APPROVAL'
              ? 'border-amber-500/80 bg-amber-950/40 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-amber-400 text-xs font-medium flex items-center justify-between">
            <span>PENDING</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-amber-300 mt-1">
            {pendingFormsCount + pendingReturnFormsCount}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">
            {pendingReturnFormsCount > 0 && pendingFormsCount > 0
              ? `${pendingFormsCount} approval · ${pendingReturnFormsCount} return`
              : pendingReturnFormsCount > 0
              ? `${pendingReturnFormsCount} awaiting restitution`
              : pendingFormsCount > 0
              ? `${pendingFormsCount} awaiting sign-off`
              : 'No pending requests'}
          </div>
        </div>
      </div>

      {/* Search, Filter Pill Strip & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Box - Compact */}
            <div className="relative w-full sm:w-52 md:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SR, recipient..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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

            {/* Status Filter Dropdown Menu */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 shrink-0 hidden sm:inline-flex">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                Status:
              </span>
              <div className="relative">
                <AppDropdown
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none shadow-xs font-medium"
                >
                  <option value="ALL">All Sheets ({forms.length})</option>
                  <option value="ISSUED">Issued Sheets ({issuedFormsCount})</option>
                  <option value="RETURNED">Returned Sheets ({returnedFormsCount})</option>
                  <option value="PENDING">Pending Action ({pendingFormsCount + pendingReturnFormsCount})</option>
                </AppDropdown>
              </div>
            </div>
          </div>

          {/* Action Buttons: Export Excel & New UAV Handover Form */}
          <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Excel</span>
            </button>

            {/* New UAV Handover Form Button */}
            <button
              type="button"
              onClick={() => {
                setRecordToView(null);
                setIsCreatorOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>New UAV Handover Form</span>
            </button>
          </div>
        </div>
      </div>

      {/* UAV Handover Forms Register Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span>SR Reference</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Recipient Officer</th>
                <th className="py-2.5 px-3">Mission Purpose</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Assigned Assets</th>
                <th className="py-2.5 px-3 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredForms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-300">No handover records found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click "+ New UAV Handover Form" to generate an official equipment custody sheet.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredForms.map((item) => {
                  const assetsCount = getAssetCount(item);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* SR Reference */}
                      <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setRecordToView(item);
                            setIsCreatorOpen(true);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-mono font-bold text-left"
                          title="View & Print Document"
                        >
                          {item.srNumber}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Recipient Officer */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-100 text-xs">
                          {item.recipientName}
                        </div>
                        {item.recipientEmpId && (
                          <div className="text-[11px] font-mono text-slate-400">
                            {item.recipientEmpId}
                          </div>
                        )}
                        {item.recipientQid && (
                          <div className="text-[10px] font-mono text-slate-500">
                            QID: {item.recipientQid}
                          </div>
                        )}
                      </td>

                      {/* Mission Purpose */}
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-300">
                        {item.purpose}
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-300">
                        {item.date}
                      </td>

                      {/* Assigned Assets */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {(() => {
                          const assetNames = [
                            ...(item.equipment || []).filter((e) => e.description).map((e) => e.description),
                            ...(item.accessories || []).filter((a) => a.description).map((a) => a.description),
                          ];
                          const term = searchTerm.toLowerCase().trim();
                          const matchedAsset = term
                            ? assetNames.find((name) => name.toLowerCase().includes(term))
                            : null;

                          const validEq = (item.equipment || []).filter((e) => e.description || e.serialNumber);
                          const validAcc = (item.accessories || []).filter((a) => a.description || a.qty);
                          const totalAssigned = validEq.length + validAcc.length;
                          const returnedCount = item.status === 'RETURNED'
                            ? totalAssigned
                            : validEq.filter((e) => e.returned).length + validAcc.filter((a) => a.returned).length;
                          const pendingCount = totalAssigned - returnedCount;

                          return (
                            <div>
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 font-mono text-xs font-semibold cursor-help"
                                title={assetNames.length > 0 ? `Assigned Assets:\n• ${assetNames.join('\n• ')}` : `${assetsCount} units assigned`}
                              >
                                <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span>{assetsCount} units</span>
                              </span>
                              {item.status === 'PENDING' && (
                                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-bold">
                                    {returnedCount} Ret
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-bold animate-pulse">
                                    {pendingCount} Pending
                                  </span>
                                </div>
                              )}
                              {matchedAsset && (
                                <div
                                  className="text-[10px] text-cyan-300 font-medium mt-1 truncate max-w-[180px]"
                                  title={`Matched assigned asset: ${matchedAsset}`}
                                >
                                  <span className="text-cyan-500 font-semibold mr-1">Match:</span>
                                  {matchedAsset}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Handover Form Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setRecordToView(item);
                              setIsCreatorOpen(true);
                            }}
                            className="p-1.5 text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-colors cursor-pointer"
                            title="View / Print Handover Form"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* ACTION: Receive / Return Equipment for ISSUED sheets */}
                          {item.status === 'ISSUED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReceiveModal(item)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 rounded-lg transition-colors cursor-pointer shadow-sm shadow-emerald-900/30"
                              title="Receive & Inspect Equipment (Mark as RETURNED)"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Receive</span>
                            </button>
                          )}

                          {/* ACTION: Receive Remaining Equipment for PENDING sheets */}
                          {item.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReceiveModal(item)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-300 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/80 rounded-lg transition-colors cursor-pointer shadow-sm shadow-amber-900/30 animate-pulse"
                              title="Receive Remaining Equipment (Pending Restitution)"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Receive Remaining</span>
                            </button>
                          )}

                          {/* ACTION: View / Edit Restitution Inspection for RETURNED sheets */}
                          {item.status === 'RETURNED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReceiveModal(item)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="View Restitution Inspection Details"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px] text-slate-400">Returned</span>
                            </button>
                          )}

                          {item.status === 'PENDING_APPROVAL' && (
                            <span
                              className="text-[10px] font-mono text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-900/50"
                              title="Awaiting Officer Sign-Off in Notifications tab"
                            >
                              Pending
                            </span>
                          )}

                          {canDeleteRecord ? (
                            <button
                              type="button"
                              onClick={() => setFormToDelete(item)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer opacity-60 group-hover:opacity-100"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 text-slate-700 rounded-lg opacity-30 cursor-not-allowed"
                              title="Delete Record requires group permission (IN/OUT FORM: Delete Record)"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      {/* Equipment Handover Form Live Creator Modal */}
      {isCreatorOpen && (
        <HandoverFormCreator groupPrivileges={groupPrivileges}
          isOpen={isCreatorOpen}
          onClose={() => {
            setIsCreatorOpen(false);
            setRecordToView(null);
            if (isLinkedHandoverOpen) {
              setIsLinkedHandoverOpen(false);
              onCloseLinkedHandover?.();
            }
          }}
          onSave={saveForm}
          initialRecord={recordToView}
          drones={drones}
          users={users}
          batteries={batteries}
          accessories={accessories}
          streamingDevices={streamingDevices}
          handoverForms={forms}
          checkouts={checkouts}
          currentUser={currentUser}
          onSubmitApprovalRequest={handleApprovalSubmit}
          onOpenReceiveModal={(record) => {
            setIsCreatorOpen(false);
            setIsLinkedHandoverOpen(false);
            setRecordToView(null);
            onOpenFullView?.();
            handleOpenReceiveModal(record);
          }}
        />
      )}

      {/* RECEIVE / RETURN EQUIPMENT MODAL */}
      {returningRecord && (() => {
        const validEquipment = (returningRecord.equipment || []).filter((e) => e.description || e.serialNumber);
        const validAccessories = (returningRecord.accessories || []).filter((a) => a.description || a.qty);
        const totalAssetsCount = validEquipment.length + validAccessories.length;

        const returnedCount =
          validEquipment.filter((e) => (assetReturnStatuses[`eq-${e.id || e.no}`] || 'RETURNED') === 'RETURNED').length +
          validAccessories.filter((a) => (assetReturnStatuses[`acc-${a.id || a.no}`] || 'RETURNED') === 'RETURNED').length;

        const crashedCount =
          validEquipment.filter((e) => assetReturnStatuses[`eq-${e.id || e.no}`] === 'CRASHED').length +
          validAccessories.filter((a) => assetReturnStatuses[`acc-${a.id || a.no}`] === 'CRASHED').length;

        const missingCount =
          validEquipment.filter((e) => assetReturnStatuses[`eq-${e.id || e.no}`] === 'MISSING').length +
          validAccessories.filter((a) => assetReturnStatuses[`acc-${a.id || a.no}`] === 'MISSING').length;

        const pendingCount =
          validEquipment.filter((e) => assetReturnStatuses[`eq-${e.id || e.no}`] === 'PENDING').length +
          validAccessories.filter((a) => assetReturnStatuses[`acc-${a.id || a.no}`] === 'PENDING').length;

        const allAccountedFor = totalAssetsCount > 0 && pendingCount === 0;

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                    allAccountedFor
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {allAccountedFor ? <PackageCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">
                      {allAccountedFor ? 'Receive Equipment & Asset Intake' : 'Partial Equipment Return (Pending Assets)'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Handover Sheet Reference: <span className="font-mono font-bold text-cyan-400">{returningRecord.srNumber}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReturningRecord(null)}
                  className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Handover Custody Summary */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Recipient Officer:</span>
                    <span className="font-semibold text-slate-200">
                      {returningRecord.recipientName}
                    </span>
                    <span className="text-slate-400 block text-[10px]">
                      {returningRecord.recipientJobId} · QID: {returningRecord.recipientQid}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Issued Custody:</span>
                    <span className="text-slate-200 font-mono">
                      {returningRecord.dateIssued || returningRecord.date} at {returningRecord.timeIssued || '09:00'}
                    </span>
                    <span className="text-slate-400 block text-[10px]">
                      By: {returningRecord.issuedAuthorityName}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2">
                  <span className="text-slate-500 block text-[10px]">Mission Purpose:</span>
                  <span className="text-slate-300 text-[11px]">{returningRecord.purpose}</span>
                </div>

                {/* Asset Status Intake (Dropdown menu for each asset: returned=active, crashed, missing) */}
                <div className="border-t border-slate-800/80 pt-2.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-bold">
                        Asset Intake Status:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {returnedCount} Active
                        </span>
                        {crashedCount > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                            {crashedCount} Crashed
                          </span>
                        )}
                        {missingCount > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                            {missingCount} Missing
                          </span>
                        )}
                        {pendingCount > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {pendingCount} Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Batch Action Controls */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleSetAllStatus('RETURNED')}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 cursor-pointer"
                        title="Set all assets to Returned (Active)"
                      >
                        Set All: Returned (Active)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAllStatus('PENDING')}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
                        title="Set all assets to Pending"
                      >
                        Set All: Pending
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Status Outcome Banner */}
                  <div
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                      allAccountedFor
                        ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-800/70 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {allAccountedFor ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-[11px]">
                          {allAccountedFor
                            ? (crashedCount > 0 || missingCount > 0)
                              ? `All Assets Accounted For (${crashedCount > 0 ? `${crashedCount} Crashed` : ''}${crashedCount > 0 && missingCount > 0 ? ', ' : ''}${missingCount > 0 ? `${missingCount} Missing` : ''})`
                              : 'All Assets Accounted & Returned Active'
                            : `${pendingCount} Asset(s) Not Returned (Pending Restitution)`}
                        </span>
                        <span className="block text-[10px] opacity-80 mt-0.5">
                          {allAccountedFor
                            ? (crashedCount > 0 || missingCount > 0)
                              ? 'Custody intake recorded. Crashed/Missing assets automatically create a draft Incident Report document in the INCIDENT REPORT tab. Asset status change strictly requires officer approval.'
                              : 'All equipment verified active. Document status will be set to RETURNED.'
                            : 'Assets with Pending status remain checked out. Handover document will remain PENDING.'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                        allAccountedFor
                          ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
                          : 'bg-amber-900/60 text-amber-300 border-amber-700'
                      }`}
                    >
                      Doc Status: {allAccountedFor ? 'RETURNED' : 'PENDING'}
                    </span>
                  </div>

                  {/* Equipment items with dropdown menu */}
                  {validEquipment.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Airframes & Serialized Equipment:
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {validEquipment.map((eq) => {
                          const key = `eq-${eq.id || eq.no}`;
                          const currentStatus = assetReturnStatuses[key] || 'RETURNED';
                          return (
                            <div
                              key={key}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                currentStatus === 'RETURNED'
                                  ? 'bg-emerald-950/20 border-emerald-800/60'
                                  : currentStatus === 'CRASHED'
                                  ? 'bg-rose-950/30 border-rose-800/80'
                                  : currentStatus === 'MISSING'
                                  ? 'bg-missing-950/30 border-missing-800/80'
                                  : 'bg-slate-900/90 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="font-mono text-[10px] text-slate-500 w-5 shrink-0">#{eq.no}</span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-200 truncate">{eq.description}</span>
                                    {eq.serialNumber && (
                                      <span className="font-mono text-[10px] text-cyan-400 shrink-0 font-bold">
                                        {eq.serialNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 ml-3 flex items-center gap-2">
                                <AppDropdown
                                  value={currentStatus}
                                  onChange={(e) => handleStatusChange(key, e.target.value as HandoverAssetReturnStatus)}
                                  className={`text-xs font-mono font-bold px-2 py-1 rounded-md border focus:outline-none cursor-pointer ${
                                    currentStatus === 'RETURNED'
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700 focus:ring-1 focus:ring-emerald-500'
                                      : currentStatus === 'CRASHED'
                                      ? 'bg-rose-950 text-rose-300 border-rose-700 focus:ring-1 focus:ring-rose-500'
                                      : currentStatus === 'MISSING'
                                      ? 'bg-missing-950 text-missing-300 border-missing-700 focus:ring-1 focus:ring-missing-500'
                                      : 'bg-amber-950 text-amber-300 border-amber-700 focus:ring-1 focus:ring-amber-500'
                                  }`}
                                >
                                  <option value="RETURNED" className="bg-slate-900 text-emerald-400">
                                    Returned (Active)
                                  </option>
                                  <option value="CRASHED" className="bg-slate-900 text-rose-400">
                                    Crashed
                                  </option>
                                  <option value="MISSING" className="bg-slate-900 text-missing-400">
                                    Missing
                                  </option>
                                  <option value="PENDING" className="bg-slate-900 text-amber-400">
                                    Pending (Not Returned)
                                  </option>
                                </AppDropdown>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Accessories items with dropdown menu */}
                  {validAccessories.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Batteries & Accessories:
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {validAccessories.map((acc) => {
                          const key = `acc-${acc.id || acc.no}`;
                          const currentStatus = assetReturnStatuses[key] || 'RETURNED';
                          return (
                            <div
                              key={key}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                currentStatus === 'RETURNED'
                                  ? 'bg-emerald-950/20 border-emerald-800/60'
                                  : currentStatus === 'CRASHED'
                                  ? 'bg-rose-950/30 border-rose-800/80'
                                  : currentStatus === 'MISSING'
                                  ? 'bg-missing-950/30 border-missing-800/80'
                                  : 'bg-slate-900/90 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="font-mono text-[10px] text-slate-500 w-5 shrink-0">#{acc.no}</span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-200 truncate">{acc.description}</span>
                                    {acc.qty && (
                                      <span className="font-mono text-[10px] text-amber-400 shrink-0 font-bold">
                                        Qty: {acc.qty}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 ml-3 flex items-center gap-2">
                                <AppDropdown
                                  value={currentStatus}
                                  onChange={(e) => handleStatusChange(key, e.target.value as HandoverAssetReturnStatus)}
                                  className={`text-xs font-mono font-bold px-2 py-1 rounded-md border focus:outline-none cursor-pointer ${
                                    currentStatus === 'RETURNED'
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700 focus:ring-1 focus:ring-emerald-500'
                                      : currentStatus === 'CRASHED'
                                      ? 'bg-rose-950 text-rose-300 border-rose-700 focus:ring-1 focus:ring-rose-500'
                                      : currentStatus === 'MISSING'
                                      ? 'bg-missing-950 text-missing-300 border-missing-700 focus:ring-1 focus:ring-missing-500'
                                      : 'bg-amber-950 text-amber-300 border-amber-700 focus:ring-1 focus:ring-amber-500'
                                  }`}
                                >
                                  <option value="RETURNED" className="bg-slate-900 text-emerald-400">
                                    Returned (Active)
                                  </option>
                                  <option value="CRASHED" className="bg-slate-900 text-rose-400">
                                    Crashed
                                  </option>
                                  <option value="MISSING" className="bg-slate-900 text-missing-400">
                                    Missing
                                  </option>
                                  <option value="PENDING" className="bg-slate-900 text-amber-400">
                                    Pending (Not Returned)
                                  </option>
                                </AppDropdown>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Return Inspection Form */}
              <form onSubmit={handleConfirmReturn} className="space-y-3.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    RECEIVED BY (OFFICER ON RETURN INSPECTION)
                  </label>
                  <input
                    type="text"
                    value={currentUser?.name?.trim() || receivedByOfficer || 'Officer on Return Inspection'}
                    readOnly
                    tabIndex={-1}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none cursor-not-allowed select-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      DATE RETURNED (M/D/YYYY) *
                    </label>
                    <input
                      type="text"
                      required
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      TIME RETURNED (HH:MM) *
                    </label>
                    <input
                      type="text"
                      required
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-medium text-[11px]">
                      TECHNICAL INSPECTION & CLEARANCE NOTES
                    </label>
                    <span className="text-[10px] text-slate-500">Quick presets:</span>
                  </div>

                  {/* Quick note buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReturnInspectionNotes(
                          'Returned in pristine operational condition; motor bearings & thermal sensors nominal, battery voltages balanced.'
                        )
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 cursor-pointer"
                    >
                      Nominal / Pristine
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReturnInspectionNotes(
                          'Equipment intact; rotor blades cleaned of dust, optical lens wiped. Storage prep completed.'
                        )
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-sky-950/40 text-sky-300 border border-sky-800/60 hover:bg-sky-900/60 cursor-pointer"
                    >
                      Cleaned
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReturnInspectionNotes(
                          'Flight packs depleted; batteries placed on multi-bank cooling charger. Firmware verified.'
                        )
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60 cursor-pointer"
                    >
                      Recharging
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    required
                    value={returnInspectionNotes}
                    onChange={(e) => setReturnInspectionNotes(e.target.value)}
                    placeholder="Additional operational remarks, technical condition, or clearance notes..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => setReturningRecord(null)}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Close
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {returningRecord.status === 'RETURNED' && (
                        <button
                          type="button"
                          onClick={handleReopenAsIssued}
                          className="px-3 py-2 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/70 border border-amber-800/80 rounded-lg transition-colors cursor-pointer"
                          title="Re-open sheet as active issued custody"
                        >
                          Re-open as ISSUED
                        </button>
                      )}

                      {returningRecord.status === 'RETURNED' ? (
                        <button
                          type="submit"
                          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Update Return Details</span>
                        </button>
                      ) : allAccountedFor ? (
                        crashedCount > 0 || missingCount > 0 ? (
                          <button
                            type="submit"
                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg transition-colors shadow-md shadow-rose-500/20 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Mark RETURNED & File Incident Report ({crashedCount + missingCount} Crashed/Missing)</span>
                          </button>
                        ) : (
                          <button
                            type="submit"
                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Mark Document as RETURNED (All Accounted)</span>
                          </button>
                        )
                      ) : (
                        crashedCount > 0 || missingCount > 0 ? (
                          <button
                            type="submit"
                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg transition-colors shadow-md shadow-rose-500/20 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Save Partial Return & File Incident Report ({crashedCount + missingCount} Crashed/Missing)</span>
                          </button>
                        ) : (
                          <button
                            type="submit"
                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Save Partial Return ({totalAssetsCount - pendingCount}/{totalAssetsCount} Accounted — Doc Remains PENDING)</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {!allAccountedFor && returningRecord.status !== 'RETURNED' && (
                    <div className="text-[11px] text-amber-300/90 font-mono text-right flex items-center justify-end gap-1.5">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        {pendingCount} pending asset(s) will remain checked out in field custody, and the handover document will remain PENDING.
                      </span>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* CONFIRM DELETE HANDOVER RECORD MODAL */}
      {formToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Delete Handover Record</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Are you sure you want to permanently delete this custody document?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">Reference:</span>
                <span className="font-mono font-bold text-sky-400">{formToDelete.srNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">Recipient:</span>
                <span className="font-medium text-slate-200">{formToDelete.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">Date Issued:</span>
                <span className="font-mono text-slate-300">{formToDelete.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">Status:</span>
                <span className="font-mono font-semibold text-amber-300">{formToDelete.status}</span>
              </div>
            </div>

            <p className="text-[11px] text-rose-400/90 leading-relaxed">
              This action cannot be undone. The custody sheet and associated audit logs will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFormToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteForm(formToDelete.id);
                  setFormToDelete(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

