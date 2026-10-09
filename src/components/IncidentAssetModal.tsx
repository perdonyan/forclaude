import { AppDropdown } from './AppDropdown';
import React, { useState, useEffect, useRef } from 'react';
import {
  IncidentReportRecord,
  UserItem,
  DroneItem,
  BatteryItem,
  AccessoryItem,
  StreamingDeviceItem,
  IncidentSeverity,
  HandoverFormRecord,
  IncidentPhotoAttachment,
  IncidentPhotoCategory,
} from '../types/drone';
import {
  AlertTriangle,
  FileText,
  Shield,
  Send,
  X,
  UserCheck,
  Radio,
  MapPin,
  Calendar,
  Clock,
  Layers,
  AlertOctagon,
  Sparkles,
  FileSpreadsheet,
  Camera,
  UploadCloud,
  Trash2,
  Eye,
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';

export interface IncidentAssetTarget {
  itemType: 'DRONE' | 'BATTERY' | 'ACCESSORY' | 'STREAMING_DEVICE';
  item: DroneItem | BatteryItem | AccessoryItem | StreamingDeviceItem;
  newStatus: 'CRASHED' | 'MISSING';
  previousStatus: string;
  sourceHandover?: HandoverFormRecord;
  draftReportId?: string;
  draftSrReference?: string;
  draftPhotos?: IncidentPhotoAttachment[];
  queueIndex?: number;
  totalInQueue?: number;
}

const PHOTO_CATEGORIES: IncidentPhotoCategory[] = [
  'Hardware Crash Photo',
  'Drone Battery & Frame Imagery',
  'Detailed Log Sheet Excerpt',
  'Other Supporting Evidence',
];

interface IncidentAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: IncidentAssetTarget | null;
  currentUser: UserItem | null;
  officers: UserItem[];
  existingReportsCount: number;
  onSubmit: (
    incidentReport: IncidentReportRecord,
    targetOfficer: UserItem,
    remarks: string,
    target: IncidentAssetTarget
  ) => void;
}

const LOCATION_PRESETS = [
  'MUAITHER',
  'LUSAIL INTERNATIONAL CIRCUIT',
  'AL KHOR AIRSTRIP / NORTH SECTOR',
  'DOHA CORNICHE VIP CORRIDOR',
  'SEALINE COASTAL PATROL',
  'RAS LAFFAN BUFFER ZONE',
  'AL WAKRAH HARBOR PERIMETER',
  'EDUCATION CITY SECTOR',
];

export const IncidentAssetModal: React.FC<IncidentAssetModalProps> = ({
  isOpen,
  onClose,
  target,
  currentUser,
  officers,
  existingReportsCount,
  onSubmit,
}) => {
  if (!isOpen || !target) return null;

  const isCrashed = target.newStatus === 'CRASHED';
  const nextReportNum = existingReportsCount + 1;
  const defaultSr = target.draftSrReference || `UAV-IAR-2026-${String(nextReportNum).padStart(2, '0')}`;

  // Helper to extract asset identifiers
  const getAssetDetails = () => {
    if (target.itemType === 'DRONE') {
      const drone = target.item as DroneItem;
      return {
        name: drone.droneName,
        model: drone.model,
        sn: drone.droneSN,
        remoteSN: drone.remoteSN || 'N/A',
        department: drone.department,
        droneId: drone.id,
      };
    } else if (target.itemType === 'BATTERY') {
      const bat = target.item as BatteryItem;
      return {
        name: `Battery ${bat.serialNumber}`,
        model: bat.batteryModel,
        sn: bat.serialNumber,
        remoteSN: `Assigned: ${bat.compatibleDrone}`,
        department: bat.department,
        droneId: undefined,
      };
    } else if (target.itemType === 'ACCESSORY') {
      const acc = target.item as AccessoryItem;
      return {
        name: acc.name,
        model: acc.category,
        sn: acc.serialNumber,
        remoteSN: `Unit: ${acc.compatibleDrone}`,
        department: acc.department,
        droneId: undefined,
      };
    } else {
      const stream = target.item as StreamingDeviceItem;
      return {
        name: stream.deviceName,
        model: stream.deviceType,
        sn: stream.serialNumber,
        remoteSN: `Assigned: ${stream.assignedDroneOrUnit}`,
        department: stream.department,
        droneId: undefined,
      };
    }
  };

  const asset = getAssetDetails();

  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getCurrentTimeFormatted = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Form states
  const [srReference, setSrReference] = useState(defaultSr);
  const [location, setLocation] = useState('MUAITHER');
  const [date, setDate] = useState(getTodayFormatted());
  const [logTime, setLogTime] = useState(getCurrentTimeFormatted());
  const [severity, setSeverity] = useState<IncidentSeverity>(isCrashed ? 'CRITICAL' : 'SEVERE');
  
  const generateDefaultSummary = () => {
    if (target.sourceHandover) {
      const notesPart = target.sourceHandover.returnNotes?.trim()
        ? ` Technical Inspection Remarks: "${target.sourceHandover.returnNotes.trim()}".`
        : '';
      if (isCrashed) {
        return `[EQUIPMENT RETURN INCIDENT] Asset "${asset.name}" (${asset.model} · SN: ${asset.sn}) was reported CRASHED during return custody intake of Handover Sheet ${target.sourceHandover.srNumber} (Mission Purpose: "${target.sourceHandover.purpose}"). Operator in custody: ${target.sourceHandover.recipientName}.${notesPart} Structural / hardware impact recorded; asset status change approval submitted via this official Incident Report.`;
      }
      return `[EQUIPMENT RETURN INCIDENT] Asset "${asset.name}" (${asset.model} · SN: ${asset.sn}) was reported MISSING during return custody intake of Handover Sheet ${target.sourceHandover.srNumber} (Mission Purpose: "${target.sourceHandover.purpose}"). Operator in custody: ${target.sourceHandover.recipientName}.${notesPart} Asset communication lost / unaccounted for in sector; asset status change approval submitted via this official Incident Report.`;
    }

    if (isCrashed) {
      return `[INVENTORY INCIDENT LOG] Asset "${asset.name}" (${asset.model} · SN: ${asset.sn}) transitioned from ${target.previousStatus} to CRASHED. Structural / hardware impact recorded during operational flight duty. Aircraft flight telemetry halted and damage inspection required. Immediate officer verification and safety investigation protocol mandated.`;
    }
    return `[INVENTORY INCIDENT LOG] Asset "${asset.name}" (${asset.model} · SN: ${asset.sn}) transitioned from ${target.previousStatus} to MISSING. Asset communication lost / unaccounted for in sector. Search and recovery protocol initiated; formal flight safety incident report submitted for command review.`;
  };

  const [detailsSummary, setDetailsSummary] = useState(generateDefaultSummary);
  const [operatorName, setOperatorName] = useState(
    target.sourceHandover?.recipientName || currentUser?.name || 'Duty Flight Operator'
  );
  const [operatorQid, setOperatorQid] = useState(
    target.sourceHandover?.recipientQid || currentUser?.qatarId || '2896348'
  );
  const [operatorJobId, setOperatorJobId] = useState(
    target.sourceHandover?.recipientJobId ||
      target.sourceHandover?.recipientEmpId ||
      (currentUser?.employeeId ? `${currentUser.employeeId} - ${currentUser.department || 'SSOC'}` : '1346 - SSOC')
  );
  const [operatorPhone, setOperatorPhone] = useState(
    target.sourceHandover?.recipientPhone || currentUser?.mobileNumber || '+974 77777000'
  );

  // Approving Officer Selection
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(() => {
    const sameDept = officers.find((o) => o.department === (currentUser?.department || asset.department));
    return sameDept ? sameDept.id : officers[0]?.id || '';
  });

  const [technicianRemarks, setTechnicianRemarks] = useState(
    target.sourceHandover
      ? `Equipment return intake: Asset "${asset.name}" marked ${target.newStatus} on Handover Sheet ${target.sourceHandover.srNumber}. Officer approval and flight safety sign-off requested.`
      : `Official review and evaluation requested for incident report on ${asset.name}. Status updated to ${target.newStatus} in inventory.`
  );

  const [error, setError] = useState<string | null>(null);

  // Supporting Evidence & Photographic Logs state
  const [photos, setPhotos] = useState<IncidentPhotoAttachment[]>(() => target.draftPhotos || []);
  const [activePhotoCategory, setActivePhotoCategory] = useState<IncidentPhotoCategory>('Hardware Crash Photo');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<IncidentPhotoAttachment | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = (attachment: IncidentPhotoAttachment) => {
    setPhotos((prev) => [...prev, attachment]);
  };

  // Sync state if target changes
  useEffect(() => {
    setSrReference(target.draftSrReference || `UAV-IAR-2026-${String(existingReportsCount + 1).padStart(2, '0')}`);
    setSeverity(target.newStatus === 'CRASHED' ? 'CRITICAL' : 'SEVERE');
    setDetailsSummary(generateDefaultSummary());
    setPhotos(target.draftPhotos || []);
    setUploadError(null);
    if (target.sourceHandover?.recipientName) {
      setOperatorName(target.sourceHandover.recipientName);
    }
    if (target.sourceHandover?.recipientQid) {
      setOperatorQid(target.sourceHandover.recipientQid);
    }
    if (target.sourceHandover?.recipientJobId || target.sourceHandover?.recipientEmpId) {
      setOperatorJobId(target.sourceHandover.recipientJobId || target.sourceHandover.recipientEmpId || '');
    }
    if (target.sourceHandover?.recipientPhone) {
      setOperatorPhone(target.sourceHandover.recipientPhone);
    }
    if (target.sourceHandover) {
      setTechnicianRemarks(
        `Equipment return intake: Asset "${asset.name}" marked ${target.newStatus} on Handover Sheet ${target.sourceHandover.srNumber}. Officer approval and flight safety sign-off requested.`
      );
    }
  }, [target]);

  // Robust async photo upload handler (No drag option, handles all image formats reliably)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;
    setUploadError(null);

    const filesArray = Array.from(inputFiles);
    const oversizedFiles: string[] = [];

    const readPromises = filesArray.map((file) => {
      return new Promise<IncidentPhotoAttachment | null>((resolve) => {
        // 15MB size limit check per image
        if (file.size > 15 * 1024 * 1024) {
          oversizedFiles.push(file.name);
          resolve(null);
          return;
        }

        const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);
        if (!isImage) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            resolve({
              id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              dataUrl,
              fileName: file.name,
              category: activePhotoCategory,
              caption: '',
              uploadedAt: new Date().toISOString(),
              fileSize: file.size,
            });
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises)
      .then((results) => {
        const validAttachments = results.filter((p): p is IncidentPhotoAttachment => p !== null);
        if (validAttachments.length > 0) {
          setPhotos((prev) => [...prev, ...validAttachments]);
        }
        if (oversizedFiles.length > 0) {
          setUploadError(`File(s) exceed 15MB limit: ${oversizedFiles.join(', ')}`);
        } else if (validAttachments.length === 0 && filesArray.length > 0) {
          setUploadError('Unable to attach selected file(s). Please choose valid images (PNG, JPG, WebP).');
        }
        // Reset file input value so selecting the same file again works
        if (e.target) {
          e.target.value = '';
        }
      })
      .catch((err) => {
        console.error('Error attaching photo:', err);
        setUploadError('Failed to read image file. Please try again.');
        if (e.target) {
          e.target.value = '';
        }
      });
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, caption } : p)));
  };

  const handleUpdatePhotoCategory = (photoId: string, category: IncidentPhotoCategory) => {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, category } : p)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const chosenOfficer = officers.find((o) => o.id === selectedOfficerId);
    if (!chosenOfficer) {
      setError('Please select an approving officer to receive the incident report.');
      return;
    }

    if (!detailsSummary.trim()) {
      setError('Please provide a brief summary of the incident.');
      return;
    }

    const reporterRankAndName = currentUser?.rank
      ? `${currentUser.rank} ${currentUser.name}`
      : currentUser?.name || 'Field Operator';

    // Construct full official IncidentReportRecord document
    const newReport: IncidentReportRecord = {
      id: target.draftReportId || `iar-${Date.now()}`,
      srReference: srReference.trim() || defaultSr,
      droneId: asset.droneId,
      droneName: asset.name,
      aircraftSN: asset.sn,
      remoteSN: asset.remoteSN,
      location: location.trim() || 'MUAITHER',
      date: date.trim() || getTodayFormatted(),
      logDate: date.trim() || getTodayFormatted(),
      logTime: logTime.trim() || getCurrentTimeFormatted(),
      detailsSummary: detailsSummary.trim(),
      photos: photos,
      reportedBy: reporterRankAndName,
      reporterId: currentUser?.id,
      department: asset.department || currentUser?.department || 'SSOC',
      status: 'SUBMITTED', // Submitted to officer for review
      severity,
      markDroneStatus: target.newStatus,
      createdAt: new Date().toISOString(),
      operatorName: operatorName.trim(),
      operatorQid: operatorQid.trim(),
      operatorJobId: operatorJobId.trim(),
      operatorPhone: operatorPhone.trim(),
      reportPreparedBy: reporterRankAndName,
      evaluationStatus: `PENDING OFFICER SIGN-OFF (${target.newStatus})`,
      fieldSystemNotes: target.sourceHandover
        ? `Initiated during equipment return on Handover Form ${target.sourceHandover.srNumber}. Asset ${target.previousStatus} ➔ ${target.newStatus}. Officer evaluation dispatched to ${chosenOfficer.name}.`
        : `Automatically initiated from Inventory status change: ${target.previousStatus} ➔ ${target.newStatus}. Officer evaluation dispatched to ${chosenOfficer.name}.`,
    };

    onSubmit(newReport, chosenOfficer, technicianRemarks.trim(), target);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header Alert Banner */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isCrashed
              ? 'bg-rose-950/70 border-rose-900/60 text-rose-200'
              : 'bg-missing-950/70 border-missing-900/60 text-missing-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isCrashed
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-missing-500/20 border-missing-500/40 text-missing-400'
              }`}
            >
              {isCrashed ? <AlertOctagon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base sm:text-lg">
                  Incident Report & Officer Approval Required
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    isCrashed
                      ? 'bg-rose-900/80 text-rose-300 border-rose-700'
                      : 'bg-missing-900/80 text-missing-300 border-missing-700'
                  }`}
                >
                  STATUS: {target.newStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Marking an asset as {target.newStatus.toLowerCase()} initiates an official Incident Accident Report document and sends it for officer evaluation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-200">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-lg flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Draft Notification & Policy Banner */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/70 rounded-xl flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-200/90 leading-relaxed">
              <span className="font-semibold text-amber-300">Operational Approval Protocol:</span> A draft incident report document is automatically created and retained directly in the <strong className="text-white">INCIDENT REPORT</strong> tab. If you close this window without finishing, the draft report is safely retained. <span className="underline decoration-amber-400 font-semibold text-amber-100">Strictly, changing status of assets will not take effect without officer approval.</span>
            </div>
          </div>

          {/* Equipment Return Intake Source Banner */}
          {target.sourceHandover && (
            <div className="p-3 bg-sky-950/40 border border-sky-800/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-sky-900/60 border border-sky-700/80 text-sky-300 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100">Equipment Return Intake:</span>
                    <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      {target.sourceHandover.srNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    Mission: <span className="text-slate-300">{target.sourceHandover.purpose}</span> · Operator: <span className="text-slate-200 font-medium">{target.sourceHandover.recipientName}</span>
                  </p>
                </div>
              </div>
              {target.totalInQueue && target.totalInQueue > 1 && (
                <div className="shrink-0 self-end sm:self-auto">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
                    <span>Incident {target.queueIndex || 1} of {target.totalInQueue}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Asset Subject Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
                <Radio className="w-4 h-4 text-sky-400" />
                <span>Affected Asset Details</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {target.itemType}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-500">Transition:</span>
                <span className="text-slate-400 line-through">{target.previousStatus}</span>
                <span className="text-slate-600">➔</span>
                <span
                  className={`font-bold ${
                    isCrashed ? 'text-rose-400' : 'text-missing-400'
                  }`}
                >
                  {target.newStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Callsign / Name</div>
                <div className="font-bold text-sky-400 truncate mt-0.5">{asset.name}</div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Model / Class</div>
                <div className="font-bold text-slate-200 truncate mt-0.5">{asset.model}</div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Serial Number</div>
                <div className="font-bold text-slate-200 truncate mt-0.5">{asset.sn}</div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Department</div>
                <div className="font-bold text-indigo-400 mt-0.5">{asset.department}</div>
              </div>
            </div>
          </div>

          {/* Section 2: Official Incident Document Meta */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Official Document Parameters</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded font-bold">
                DOC REF: {srReference}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Document SR Reference
                </label>
                <input
                  type="text"
                  value={srReference}
                  onChange={(e) => setSrReference(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Incident Severity
                </label>
                <AppDropdown
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Flight Suspension)</option>
                  <option value="SEVERE">SEVERE (High Priority Investigation)</option>
                  <option value="MODERATE">MODERATE (Hardware Inspection)</option>
                  <option value="MINOR">MINOR (Component Check)</option>
                </AppDropdown>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Sector / Incident Location</span>
                </label>
                <input
                  type="text"
                  list="location-presets"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 uppercase focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="e.g. MUAITHER"
                />
                <datalist id="location-presets">
                  {LOCATION_PRESETS.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Date of Incident</span>
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Time of Occurrence</span>
                </label>
                <input
                  type="text"
                  value={logTime}
                  onChange={(e) => setLogTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] text-slate-400 font-medium">
                  Incident Narrative & Damage / Loss Summary
                </label>
                <button
                  type="button"
                  onClick={() => setDetailsSummary(generateDefaultSummary())}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Regenerate Default Summary</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={detailsSummary}
                onChange={(e) => setDetailsSummary(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="Describe flight conditions, altitude, crash impact or loss of telemetry..."
              />
            </div>
          </div>

          {/* Section 3: Supporting Evidence & Photographic Logs */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>3. Supporting Evidence & Photographic Logs ({photos.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Attach Hardware Crash Photos, Drone Battery Imagery, or Ground Control Station Log Excerpts
                </p>
              </div>

              {/* Photo Category Picker for upcoming uploads */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Category for next upload:</span>
                <AppDropdown
                  value={activePhotoCategory}
                  onChange={(e) => setActivePhotoCategory(e.target.value as IncidentPhotoCategory)}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-md px-2.5 py-1 focus:outline-none focus:border-cyan-500"
                >
                  {PHOTO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </AppDropdown>
              </div>
            </div>

            {/* Hidden File Input & Upload Trigger Area (No Drag Option) */}
            <input
              type="file"
              ref={fileInputRef}
              id="incident-asset-photo-input"
              onChange={handleFileUpload}
              multiple
              accept="image/*"
              className="hidden"
            />

            {/* Dual Trigger: Live Device Camera Snapshot & File Attachment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-950/70 text-cyan-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs group"
              >
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <span>Take Photo from Device Camera</span>
                <span className="text-[10px] text-cyan-400/70 font-normal">
                  Live viewfinder snapshot directly attached
                </span>
              </button>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/80 text-slate-300 font-semibold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:scale-110 transition-all">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span>Browse & Attach Photo Files</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Supports PNG, JPG, JPEG, WebP (up to 15MB)
                </span>
              </div>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Attached Photos List with Previews & Captions */}
            {photos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2.5 relative group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <AppDropdown
                        value={photo.category}
                        onChange={(e) => handleUpdatePhotoCategory(photo.id, e.target.value as IncidentPhotoCategory)}
                        className="bg-slate-950 border border-slate-700 text-[10px] font-mono font-bold text-cyan-300 rounded px-2 py-0.5 focus:outline-none"
                      >
                        {PHOTO_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </AppDropdown>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(photo)}
                          className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
                          title="View enlarged photo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 cursor-pointer"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() => setPreviewPhoto(photo)}
                      className="relative aspect-16/9 bg-black rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer group/thumb"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.caption || photo.fileName}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Add caption or forensic observation note..."
                      value={photo.caption || ''}
                      onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Officer Sign-Off & Approval Dispatch */}
          <div className="bg-slate-950/80 border border-amber-900/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>4. Send Incident Report for Officer Sign-Off</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 font-semibold">
                CHAIN OF COMMAND
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Designated Approving Officer</span>
              </label>
              <AppDropdown
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              >
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.rank ? `${officer.rank} ` : ''}
                    {officer.name} (Emp ID: {officer.employeeId} · {officer.department})
                  </option>
                ))}
              </AppDropdown>
              <p className="text-[10px] text-slate-500 mt-1">
                The designated officer will receive an urgent approval request in their Notifications tab with full incident documentation.
              </p>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-medium mb-1">
                Remarks / Instructions for Approving Officer
              </label>
              <textarea
                rows={2}
                value={technicianRemarks}
                onChange={(e) => setTechnicianRemarks(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                placeholder="Add any specific context for the officer (e.g. flight log attached, pilot statement taken)..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {target.draftReportId || target.sourceHandover ? 'Close (Retain Draft in Incident Tab)' : 'Close'}
            </button>

            <button
              type="submit"
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer ${
                isCrashed
                  ? 'bg-rose-600 hover:bg-rose-500 text-slate-950 shadow-rose-900/30'
                  : 'bg-missing-500 hover:bg-missing-400 text-slate-950 shadow-missing-900/30'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Create Incident Report & Send to Officer</span>
            </button>
          </div>
        </form>
      </div>

      {/* Forensic Photo Full-Screen Inspection Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-xs bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {previewPhoto.category}
                </span>
                <span className="text-slate-300 font-mono text-[11px] truncate max-w-xs sm:max-w-md">
                  {previewPhoto.fileName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black overflow-auto max-h-[75vh]">
              <img
                src={previewPhoto.dataUrl}
                alt={previewPhoto.caption || previewPhoto.fileName}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>
            {previewPhoto.caption && (
              <div className="p-3 border-t border-slate-800 text-xs text-slate-300 font-mono bg-slate-950">
                <span className="text-slate-500 mr-1.5">Note:</span>
                {previewPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Device Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        defaultCategory={activePhotoCategory}
        categories={PHOTO_CATEGORIES}
      />
    </div>
  );
};

