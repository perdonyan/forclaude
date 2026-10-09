import { AppDropdown } from './AppDropdown';
import React, { useState, useRef, useEffect } from 'react';
import {
  ConfiscatedDroneReport,
  ConfiscatedFlightRecord,
  ConfiscatedDroneStatus,
  UserItem,
} from '../types/drone';
import {
  ShieldAlert,
  X,
  Plus,
  Trash2,
  UploadCloud,
  Camera,
  Scan,
  Calendar,
  Clock,
  Compass,
  FileText,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Info,
  Maximize2,
  CheckCircle2,
  Layers,
  MapPin,
  Image as ImageIcon,
  Paperclip,
  Maximize,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import {
  SAMPLE_CORRESPONDENCE_LETTER_SVG,
  SAMPLE_FLIGHT_LOG_EVIDENCE_SVG,
} from '../data/initialConfiscatedDroneData';

interface ConfiscatedDroneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: ConfiscatedDroneReport) => void;
  editingReport?: ConfiscatedDroneReport | null;
  currentUser?: UserItem | null;
  existingCount?: number;
}

const COMMON_DRONE_MODELS = [
  'Dji mini4',
  'Dji mini 3 Pro',
  'DJI Mavic 3 Pro',
  'DJI Mavic 3 Enterprise',
  'AIR 2S',
  'DJI Air 3',
  'DJI Matrice 30T',
  'DJI Matrice 350 RTK',
  'Autel EVO II Pro',
  'Custom FPV Quad',
];

export const ConfiscatedDroneFormModal: React.FC<ConfiscatedDroneFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingReport,
  currentUser,
  existingCount = 0,
}) => {
  // Format current date e.g. "13/05/2026"
  const getCurrentFormattedDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format current eval date/time e.g. "14/05/2026 | 08:30 AM"
  const getCurrentFormattedDateTime = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} | ${strHours}:${minutes} ${ampm}`;
  };

  // Default next report sequence e.g. "UAV-CDR-2026-01"
  const defaultNextSr = `UAV-CDR-2026-${String(existingCount + 1).padStart(2, '0')}`;

  // Form State
  const [date, setDate] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [srNumber, setSrNumber] = useState('');
  const [droneModel, setDroneModel] = useState('');
  const [droneSN, setDroneSN] = useState('');
  const [remoteSN, setRemoteSN] = useState('');

  // Multiple Entries toggle & flight records (with per-entry photo attachment)
  const [hasMultipleEntries, setHasMultipleEntries] = useState(false);
  const [autoAttachToAllEntries, setAutoAttachToAllEntries] = useState(true);
  const [flightRecords, setFlightRecords] = useState<ConfiscatedFlightRecord[]>([]);

  // Correspondence Letter (attached as additional page in print preview)
  const [correspondencePhotos, setCorrespondencePhotos] = useState<string[]>([]);
  const [correspondenceLetterRef, setCorrespondenceLetterRef] = useState('');
  const [correspondenceLetterDate, setCorrespondenceLetterDate] = useState('');
  const [correspondenceNotes, setCorrespondenceNotes] = useState('');
  const correspondenceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Target entry tracking for photo uploads
  const [targetEntryIdForPhoto, setTargetEntryIdForPhoto] = useState<string | null>(null);

  // Evaluation & Custody
  const [receivedBy, setReceivedBy] = useState('');
  const [evalDateTime, setEvalDateTime] = useState('');
  const [status, setStatus] = useState<ConfiscatedDroneStatus>('CONFISCATED');
  const [fieldSystemNotes, setFieldSystemNotes] = useState('');

  // Modals & Camera Mode
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanTargetField, setScanTargetField] = useState<'droneSN' | 'remoteSN'>('droneSN');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'flightEvidence' | 'correspondence'>('flightEvidence');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize form when opened or editing
  useEffect(() => {
    if (editingReport) {
      setDate(editingReport.date || getCurrentFormattedDate());
      setLrNumber(editingReport.lrNumber || '');
      setSrNumber(editingReport.srNumber || defaultNextSr);
      setDroneModel(editingReport.droneModel || '');
      setDroneSN(editingReport.droneSN || '');
      setRemoteSN(editingReport.remoteSN || '');
      setHasMultipleEntries(!!editingReport.hasMultipleEntries);

      // Correspondence fields
      setCorrespondencePhotos(editingReport.correspondencePhotos || []);
      setCorrespondenceLetterRef(editingReport.correspondenceLetterRef || '');
      setCorrespondenceLetterDate(editingReport.correspondenceLetterDate || editingReport.date || getCurrentFormattedDate());
      setCorrespondenceNotes(editingReport.correspondenceNotes || '');

      // Map flight records and ensure each record has its own photos array
      const mappedRecords: ConfiscatedFlightRecord[] = (
        editingReport.flightRecords && editingReport.flightRecords.length > 0
          ? editingReport.flightRecords
          : [
              {
                id: `cfr-${Date.now()}-1`,
                flightIndex: 1,
                date: editingReport.date || getCurrentFormattedDate(),
                location: 'Lusail Marina Promenade',
                coordinates: '25.4215° N, 51.5283° E',
                flightCount: 1,
                flightDuration: '18 mins',
                photos: editingReport.evidencePhotos || [],
              },
            ]
      ).map((rec, idx) => ({
        ...rec,
        photos: Array.isArray(rec.photos)
          ? rec.photos
          : idx === 0 && editingReport.evidencePhotos?.length
          ? editingReport.evidencePhotos
          : [],
      }));

      setFlightRecords(mappedRecords);
      setReceivedBy(editingReport.receivedBy || currentUser?.name || 'Capt. Tariq Al-Kuwari');
      setEvalDateTime(editingReport.evalDateTime || getCurrentFormattedDateTime());
      setStatus(editingReport.status || 'CONFISCATED');
      setFieldSystemNotes(editingReport.fieldSystemNotes || '');
    } else {
      // New report initialized
      const todayDate = getCurrentFormattedDate();
      const generatedLr = String(Math.floor(1800 + Math.random() * 200));
      setDate(todayDate);
      setLrNumber(generatedLr);
      setSrNumber(defaultNextSr);
      setDroneModel('Dji mini4');
      setDroneSN('');
      setRemoteSN('');
      setHasMultipleEntries(false);
      setAutoAttachToAllEntries(true);
      setCorrespondencePhotos([]);
      setCorrespondenceLetterRef(`MOI/UAV-CDR/${generatedLr}/2026`);
      setCorrespondenceLetterDate(todayDate);
      setCorrespondenceNotes(
        'Formal custody transfer & prosecution impound endorsement pursuant to Decree Law No. 15 of 2002.'
      );
      setFlightRecords([
        {
          id: `cfr-${Date.now()}-1`,
          flightIndex: 1,
          date: todayDate,
          location: 'Lusail Marina Promenade',
          coordinates: '25.4215° N, 51.5283° E',
          flightCount: 1,
          flightDuration: '18 mins',
          photos: [],
          notes: 'Flight Route Track&System Log Capture Evidence',
        },
      ]);
      setReceivedBy(currentUser?.name || 'Capt. Tariq Al-Kuwari');
      setEvalDateTime(getCurrentFormattedDateTime());
      setStatus('CONFISCATED');
      setFieldSystemNotes(
        'Non-permitted civilian flight intercepted in restricted zone. Telemetry extracted from internal NAND flash storage via DJI Assistant forensic bridge. SD card preserved in evidence custody.'
      );
    }
  }, [editingReport, isOpen]);

  // Handle Multiple Entries Toggle switch
  const handleToggleMultipleEntries = () => {
    const nextVal = !hasMultipleEntries;
    setHasMultipleEntries(nextVal);
    if (nextVal) {
      // Find existing photos from entry 1 to attach to every entry added if enabled
      const primaryPhotos = flightRecords[0]?.photos || [];
      if (flightRecords.length <= 1) {
        setFlightRecords((prev) => [
          ...prev,
          {
            id: `cfr-${Date.now()}-2`,
            flightIndex: 2,
            date: date || getCurrentFormattedDate(),
            location: 'Al Maha Island Restricted Perimeter',
            coordinates: '25.4310° N, 51.5412° E',
            flightCount: 2,
            flightDuration: '24 mins',
            photos: autoAttachToAllEntries && primaryPhotos.length > 0 ? [...primaryPhotos] : [],
            notes: 'Second sequential flight track extracted from log',
          },
        ]);
      } else if (autoAttachToAllEntries && primaryPhotos.length > 0) {
        // Ensure every existing entry has the uploaded photo attached
        setFlightRecords((prev) =>
          prev.map((rec) =>
            !rec.photos || rec.photos.length === 0
              ? { ...rec, photos: [...primaryPhotos] }
              : rec
          )
        );
      }
    }
  };

  // Add a new flight entry row with its own dedicated evidence photo attachment area
  // USER REQUIREMENT: if Multiple Entries Mode is enabled, the photo uploaded is attached in every entry added!
  const handleAddFlightRecord = () => {
    const nextIdx = flightRecords.length + 1;
    // Find uploaded photos from any existing record to attach to the new entry
    const existingUploadedPhotos =
      flightRecords.find((r) => Array.isArray(r.photos) && r.photos.length > 0)?.photos || [];

    const photosToAttach =
      hasMultipleEntries && autoAttachToAllEntries && existingUploadedPhotos.length > 0
        ? [...existingUploadedPhotos]
        : [];

    setFlightRecords((prev) => [
      ...prev,
      {
        id: `cfr-${Date.now()}-${nextIdx}`,
        flightIndex: nextIdx,
        date: date || getCurrentFormattedDate(),
        location: '',
        coordinates: '',
        flightCount: nextIdx,
        flightDuration: '15 mins',
        photos: photosToAttach, // Automatically attached in every entry added!
      },
    ]);
  };

  // Update a flight entry field
  const handleUpdateFlightRecord = (id: string, field: keyof ConfiscatedFlightRecord, value: any) => {
    setFlightRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, [field]: value } : rec))
    );
  };

  // Delete a flight entry row
  const handleDeleteFlightRecord = (id: string) => {
    if (flightRecords.length <= 1) return;
    setFlightRecords((prev) => prev.filter((rec) => rec.id !== id));
  };

  // Trigger file upload for a specific entry
  const handleTriggerUploadForEntry = (entryId: string) => {
    setTargetEntryIdForPhoto(entryId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Trigger camera capture for a specific entry
  const handleTriggerCameraForEntry = (entryId: string) => {
    setTargetEntryIdForPhoto(entryId);
    setIsCameraOpen(true);
  };

  // File Upload handler for flight evidence
  // USER REQUIREMENT: if Multiple Entries Mode is enabled, the photo uploaded is attached in every entry add!
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const targetId = targetEntryIdForPhoto || flightRecords[0]?.id;
    if (!targetId && flightRecords.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const dataUrl = reader.result;
          setFlightRecords((prev) =>
            prev.map((rec) =>
              // If Multiple Entries is enabled AND autoAttachToAllEntries is true, attach to ALL entries!
              (hasMultipleEntries && autoAttachToAllEntries) || rec.id === targetId
                ? { ...rec, photos: [...(rec.photos || []), dataUrl] }
                : rec
            )
          );
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Sync a specific photo or all photos across all flight entries
  const handleSyncPhotoToAllEntries = (photosToSync: string[]) => {
    if (photosToSync.length === 0) return;
    setFlightRecords((prev) =>
      prev.map((rec) => ({
        ...rec,
        photos: [...photosToSync],
      }))
    );
  };

  // Load sample flight log telemetry evidence SVG
  const handleLoadSampleTelemetryEvidence = (entryId?: string) => {
    const targetId = entryId || targetEntryIdForPhoto || flightRecords[0]?.id;
    setFlightRecords((prev) =>
      prev.map((rec) =>
        (hasMultipleEntries && autoAttachToAllEntries) || rec.id === targetId
          ? { ...rec, photos: [SAMPLE_FLIGHT_LOG_EVIDENCE_SVG] }
          : rec
      )
    );
  };

  // Remove photo from a specific entry
  const handleRemovePhotoFromEntry = (entryId: string, photoIdx: number) => {
    setFlightRecords((prev) =>
      prev.map((rec) =>
        rec.id === entryId
          ? { ...rec, photos: (rec.photos || []).filter((_, i) => i !== photoIdx) }
          : rec
      )
    );
  };

  // Handle Drag & Drop on a specific entry's evidence box
  const handleDropOnEntry = (e: React.DragEvent, entryId: string) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const dataUrl = reader.result;
          setFlightRecords((prev) =>
            prev.map((rec) =>
              (hasMultipleEntries && autoAttachToAllEntries) || rec.id === entryId
                ? { ...rec, photos: [...(rec.photos || []), dataUrl] }
                : rec
            )
          );
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Paste image from clipboard to active or focused entry
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const targetId = targetEntryIdForPhoto || flightRecords[0]?.id;
    if (!targetId && flightRecords.length === 0) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              const dataUrl = reader.result;
              setFlightRecords((prev) =>
                prev.map((rec) =>
                  (hasMultipleEntries && autoAttachToAllEntries) || rec.id === targetId
                    ? { ...rec, photos: [...(rec.photos || []), dataUrl] }
                    : rec
                )
              );
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Correspondence letter file handlers
  const handleCorrespondenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const dataUrl = reader.result;
          setCorrespondencePhotos((prev) => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleDropCorrespondence = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const dataUrl = reader.result;
          setCorrespondencePhotos((prev) => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveCorrespondencePhoto = (idx: number) => {
    setCorrespondencePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLoadSampleCorrespondence = () => {
    setCorrespondencePhotos((prev) => [...prev, SAMPLE_CORRESPONDENCE_LETTER_SVG]);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!droneModel.trim()) {
      alert('Please specify the Drone Model.');
      return;
    }
    if (!droneSN.trim()) {
      alert('Please enter or scan the Drone Serial Number (SN).');
      return;
    }

    const cleanedFlightRecords = (flightRecords.length > 0 ? flightRecords : [
      {
        id: `cfr-${Date.now()}-1`,
        flightIndex: 1,
        date: date || getCurrentFormattedDate(),
        location: 'Lusail Marina Promenade',
        coordinates: '25.4215° N, 51.5283° E',
        flightCount: 1,
        flightDuration: '18 mins',
        photos: [],
      },
    ]).map((rec, i) => ({
      ...rec,
      flightIndex: i + 1,
      flightCount: rec.flightCount || i + 1,
      date: rec.date || date || getCurrentFormattedDate(),
      photos: rec.photos || [],
    }));

    // Aggregate all entry photos for top-level backward compatibility
    const allEvidencePhotos = cleanedFlightRecords.flatMap((r) => r.photos || []);

    const newReport: ConfiscatedDroneReport = {
      id: editingReport?.id || `cdr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      srNumber: srNumber.trim() || defaultNextSr,
      lrNumber: lrNumber.trim() || '1859',
      date: date.trim() || getCurrentFormattedDate(),
      droneModel: droneModel.trim(),
      droneSN: droneSN.trim(),
      remoteSN: remoteSN.trim() || 'N/A',
      hasMultipleEntries,
      flightRecords: cleanedFlightRecords,
      evidencePhotos: allEvidencePhotos,
      evidenceNotes: editingReport?.evidenceNotes || '',
      correspondencePhotos,
      correspondenceLetterRef: correspondenceLetterRef.trim() || `MOI/UAV-CDR/${lrNumber || '1859'}/2026`,
      correspondenceLetterDate: correspondenceLetterDate.trim() || date || getCurrentFormattedDate(),
      correspondenceNotes: correspondenceNotes.trim(),
      imageStretchMode: 'stretch',
      receivedBy: receivedBy.trim() || currentUser?.name || 'Capt. Tariq Al-Kuwari',
      evalDateTime: evalDateTime.trim() || getCurrentFormattedDateTime(),
      fieldSystemNotes: fieldSystemNotes.trim(),
      status,
      department: 'UAV Team / SSOC',
      createdAt: editingReport?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: editingReport?.createdBy || currentUser?.name || 'Operator',
    };

    onSave(newReport);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onPaste={handlePaste}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      {/* Hidden file input for uploading images to targeted entry */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Hidden file input for uploading correspondence letters */}
      <input
        type="file"
        ref={correspondenceFileInputRef}
        onChange={handleCorrespondenceFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#6b1119] border border-rose-800 flex items-center justify-center text-white shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <span>{editingReport ? 'Edit Confiscated Drone Report' : 'New Confiscated Drone Form'}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#6b1119]/40 text-rose-300 border border-[#6b1119]">
                  UAV Team CDR
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official Law Enforcement & Forensics Evaluation Sheet (State of Qatar)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Official Banner Preview */}
          <div className="bg-[#6b1119] text-white py-3 px-4 text-center rounded-lg shadow-sm border border-[#520b13]">
            <h3 className="text-base sm:text-lg font-bold tracking-wide uppercase">
              Confiscated Drone Report (UAV Team)
            </h3>
            <p className="text-[11px] text-rose-200/80 font-mono mt-0.5">
              STATE OF QATAR · MINISTRY OF INTERIOR · UNMANNED AIRCRAFT SYSTEMS COMMAND
            </p>
          </div>

          {/* Section 1: DATE | LR no: | SR: */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                DATE
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="13/05/2026"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setDate(getCurrentFormattedDate())}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-sky-400 cursor-pointer font-mono"
                  title="Set today"
                >
                  Today
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                LR no: (Law Report No.)
              </label>
              <input
                type="text"
                required
                placeholder="1859"
                value={lrNumber}
                onChange={(e) => setLrNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                SR: (System Report Ref)
              </label>
              <input
                type="text"
                required
                placeholder="UAV-CDR-2026-01"
                value={srNumber}
                onChange={(e) => setSrNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono font-bold text-rose-300 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Section 2: DRONE MODEL | DRONE SN | REMOTE SN */}
          <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#6b1119]" />
                Confiscated Equipment Details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                  DRONE MODEL
                </label>
                <input
                  type="text"
                  required
                  list="drone-models-list"
                  placeholder="Dji mini4"
                  value={droneModel}
                  onChange={(e) => setDroneModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-rose-500"
                />
                <datalist id="drone-models-list">
                  {COMMON_DRONE_MODELS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                    DRONE SN
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setScanTargetField('droneSN');
                      setIsScannerOpen(true);
                    }}
                    className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-mono cursor-pointer"
                  >
                    <Scan className="w-3 h-3" />
                    <span>Scan</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="XXXXXXXXXXXXXXX"
                  value={droneSN}
                  onChange={(e) => setDroneSN(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono tracking-wider text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                    REMOTE SN
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setScanTargetField('remoteSN');
                      setIsScannerOpen(true);
                    }}
                    className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-mono cursor-pointer"
                  >
                    <Scan className="w-3 h-3" />
                    <span>Scan</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="XXXXXXXXXXXXXXX"
                  value={remoteSN}
                  onChange={(e) => setRemoteSN(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono tracking-wider text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: FLIGHT ENTRIES & MULTIPLE ENTRIES WITH PER-ENTRY PHOTO ATTACHMENT */}
          <div className="bg-slate-950/80 p-4 rounded-lg border-2 border-slate-800 space-y-4">
            {/* Control Bar: Title & "Multiple Entries Toggle" */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Flight Records & Telemetry Logs
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {flightRecords.length} Sortie{flightRecords.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {hasMultipleEntries
                    ? 'Multiple Entries Mode enabled: each sequential entry contains its own flight metrics and attached route evidence photo.'
                    : 'Single entry mode: log flight metrics and attach route track evidence below.'}
                </p>
              </div>

              {/* USER'S REQUESTED "MULTIPLE ENTRIES" TOGGLE TOOL */}
              <div className="flex flex-wrap items-center gap-2.5 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 self-start sm:self-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Multiple Entries:
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleMultipleEntries}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      hasMultipleEntries
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                    title="Toggle Multiple Entries to log multiple sequential flight records with attached evidence"
                  >
                    {hasMultipleEntries ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-amber-400" />
                        <span>Multiple Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        <span>Single Entry</span>
                      </>
                    )}
                  </button>
                </div>

                {hasMultipleEntries && (
                  <label className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAttachToAllEntries}
                      onChange={(e) => setAutoAttachToAllEntries(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>Attach photo in every entry added</span>
                  </label>
                )}
              </div>
            </div>

            {/* Quick Bulk Photo Tools when Multiple Entries is active */}
            {hasMultipleEntries && (
              <div className="bg-slate-900/90 border border-amber-500/30 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-200/90 font-mono text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Sequential Mode: Uploading evidence attaches to all entries ({flightRecords.length} total).
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetEntryIdForPhoto(flightRecords[0]?.id || null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#6b1119] hover:bg-[#851621] text-white text-[11px] font-semibold cursor-pointer shadow-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload for All Entries</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleTelemetryEvidence()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold cursor-pointer border border-slate-700"
                    title="Load realistic sample Aeroscope/DJI flight log trajectory"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Use Sample Evidence Map</span>
                  </button>
                </div>
              </div>
            )}

            {/* EACH FLIGHT ENTRY CONTAINS ITS OWN ROW AND DEDICATED EVIDENCE PHOTO ATTACHMENT */}
            <div className="space-y-5">
              {flightRecords.map((rec, index) => {
                const photos = rec.photos || [];
                return (
                  <div
                    key={rec.id}
                    className="border-2 border-[#6b1119] rounded-lg overflow-hidden bg-slate-900 shadow-md transition-all"
                  >
                    {/* Entry Header if Multiple Entries Mode is enabled */}
                    {hasMultipleEntries && (
                      <div className="bg-[#6b1119]/30 border-b border-[#6b1119] px-3.5 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#6b1119] text-white flex items-center justify-center text-[10px] font-mono font-bold">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold font-mono text-slate-100 uppercase tracking-wide">
                            Sequential Flight Entry #{index + 1}
                          </span>
                          {photos.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {photos.length} Photo{photos.length > 1 ? 's' : ''} Attached
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {photos.length > 0 && flightRecords.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleSyncPhotoToAllEntries(photos)}
                              className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 cursor-pointer font-mono"
                              title="Copy this entry's photo to all other entries"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Sync to All Entries</span>
                            </button>
                          )}
                          {flightRecords.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFlightRecord(rec.id)}
                              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete this flight entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Entry</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Table Header matching multipleentry.png */}
                    <div className="grid grid-cols-5 bg-[#6b1119] text-white text-[10px] sm:text-[11px] font-bold uppercase text-center divide-x-2 divide-white/40">
                      <div className="py-2 px-1">DATE</div>
                      <div className="py-2 px-1">LOCATION</div>
                      <div className="py-2 px-1">COORDINATES</div>
                      <div className="py-2 px-1">FLIGHT COUNT</div>
                      <div className="py-2 px-1">FLIGHT DURATION</div>
                    </div>

                    {/* Input Row matching multipleentry.png */}
                    <div className="grid grid-cols-5 text-xs font-mono divide-x-2 divide-[#6b1119] bg-white text-slate-900">
                      {/* DATE */}
                      <div className="p-1.5 flex items-center">
                        <input
                          type="text"
                          placeholder="13/05/2026"
                          value={rec.date}
                          onChange={(e) => handleUpdateFlightRecord(rec.id, 'date', e.target.value)}
                          className="w-full bg-slate-100 border border-slate-300 rounded px-1.5 py-1.5 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#6b1119]"
                        />
                      </div>

                      {/* LOCATION */}
                      <div className="p-1.5 flex items-center">
                        <input
                          type="text"
                          placeholder="Lusail Marina Promenade"
                          value={rec.location}
                          onChange={(e) => handleUpdateFlightRecord(rec.id, 'location', e.target.value)}
                          className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs font-sans text-slate-900 focus:outline-none focus:border-[#6b1119]"
                        />
                      </div>

                      {/* COORDINATES */}
                      <div className="p-1.5 flex items-center">
                        <input
                          type="text"
                          placeholder="25.4215° N, 51.5283° E"
                          value={rec.coordinates}
                          onChange={(e) => handleUpdateFlightRecord(rec.id, 'coordinates', e.target.value)}
                          className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#6b1119]"
                        />
                      </div>

                      {/* FLIGHT COUNT */}
                      <div className="p-1.5 flex items-center">
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={rec.flightCount}
                          onChange={(e) => handleUpdateFlightRecord(rec.id, 'flightCount', e.target.value)}
                          className="w-full bg-slate-100 border border-slate-300 rounded px-1.5 py-1.5 text-center font-bold text-xs text-slate-900 focus:outline-none focus:border-[#6b1119]"
                        />
                      </div>

                      {/* FLIGHT DURATION */}
                      <div className="p-1.5 flex items-center">
                        <input
                          type="text"
                          placeholder="18 mins"
                          value={rec.flightDuration}
                          onChange={(e) => handleUpdateFlightRecord(rec.id, 'flightDuration', e.target.value)}
                          className="w-full bg-slate-100 border border-slate-300 rounded px-1.5 py-1.5 text-center text-xs text-slate-900 focus:outline-none focus:border-[#6b1119]"
                        />
                      </div>
                    </div>

                    {/* DEDICATED EVIDENCE PHOTO UPLOAD ATTACHED DIRECTLY UNDER THIS SPECIFIC ENTRY (Matching multipleentry.png) */}
                    {/* PHOTO STRETCHED TO CHANGE RATIO AND FILL THE AREA (AS REQUESTED) */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnEntry(e, rec.id)}
                      className="border-t-2 border-[#6b1119] bg-white p-3.5 flex flex-col justify-between"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-sans italic text-slate-500 font-medium">
                          Flight Route Track&System Log Capture Evidence:
                          {hasMultipleEntries && (
                            <span className="not-italic text-slate-700 font-mono font-semibold ml-1.5">
                              (Entry #{index + 1})
                            </span>
                          )}
                        </span>

                        {/* Action buttons for this entry */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTriggerUploadForEntry(rec.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#6b1119] hover:bg-[#851621] text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Upload Photo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCameraMode('flightEvidence');
                              handleTriggerCameraForEntry(rec.id);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Camera</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadSampleTelemetryEvidence(rec.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer border border-slate-300"
                            title="Load sample flight telemetry evidence"
                          >
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Sample</span>
                          </button>
                        </div>
                      </div>

                      {/* Display Photos Stretched to fill rectangular evidence area (Ratio adjusted as requested) */}
                      {photos.length > 0 ? (
                        <div className="w-full space-y-3 my-1">
                          {photos.map((photo, pIdx) => (
                            <div
                              key={pIdx}
                              className="relative group rounded-xs border-2 border-slate-400 overflow-hidden bg-black shadow-md w-full h-[240px] sm:h-[300px]"
                            >
                              <img
                                src={photo}
                                alt={`Entry ${index + 1} Evidence ${pIdx + 1}`}
                                className="w-full h-full object-fill"
                                style={{ objectFit: 'fill' }}
                              />
                              <div className="absolute top-2 left-2 bg-slate-900/85 text-rose-300 text-[10px] font-mono px-2 py-0.5 rounded border border-rose-900/60 flex items-center gap-1.5 shadow-sm">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>Stretched to fill area (Ratio adjusted)</span>
                              </div>

                              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhoto(photo)}
                                  className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                                  title="Enlarge Full View"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                  <span>Enlarge</span>
                                </button>
                                {hasMultipleEntries && flightRecords.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleSyncPhotoToAllEntries([photo])}
                                    className="p-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                                    title="Attach this photo to all sequential entries"
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span>Sync to All Entries</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhotoFromEntry(rec.id, pIdx)}
                                  className="p-1.5 rounded-lg bg-rose-900 text-rose-100 hover:bg-rose-800 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                                  title="Remove this photo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          onClick={() => handleTriggerUploadForEntry(rec.id)}
                          className="border-2 border-dashed border-slate-300 hover:border-[#6b1119] rounded p-6 text-center cursor-pointer transition-colors my-auto bg-slate-50/50"
                        >
                          <p className="text-slate-500 font-sans italic text-xs select-none font-medium">
                            Flight Route Track&System Log Capture Evidence:
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 font-sans">
                            Click to upload, drop image here, or press Ctrl+V to attach evidence screenshot to Entry #{index + 1}
                          </p>
                          <p className="text-[10px] text-rose-800/80 mt-1 font-mono">
                            Uploaded photo will stretch and adjust ratio to fill the entire rectangular evidence area.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Multiple Entries Tools & Add Row Button */}
            {hasMultipleEntries && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddFlightRecord}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#6b1119] hover:bg-[#851621] text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Add Sequential Flight Entry (With Photo Attachment)</span>
                </button>

                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                  <span>Total Sequential Entries: <strong className="text-amber-300">{flightRecords.length}</strong></span>
                  {autoAttachToAllEntries && (
                    <span className="text-emerald-400 text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      Auto-Attach to All Entries Active
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Received & Evaluated By | EVAL DATE / TIME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                Received & Evaluated By
              </label>
              <input
                type="text"
                required
                placeholder="Capt. Tariq Al-Kuwari"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  EVAL DATE / TIME
                </label>
                <button
                  type="button"
                  onClick={() => setEvalDateTime(getCurrentFormattedDateTime())}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 cursor-pointer font-mono"
                >
                  Set Now
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="14/05/2026 | 08:30 AM"
                value={evalDateTime}
                onChange={(e) => setEvalDateTime(e.target.value)}
                className="w-full bg-slate-900 border border-emerald-500/50 rounded-md px-3 py-2 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Section 5: CORRESPONDENCE LETTER / ENDORSEMENT ATTACHMENT (PRINTS AS ADDITIONAL PAGE IN PRINT PREVIEW) */}
          <div className="bg-slate-950/80 p-4 rounded-lg border-2 border-[#6b1119] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#6b1119] text-white flex items-center justify-center">
                  <Paperclip className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Official Correspondence Letter / Endorsement Attachment
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                      Prints as Page 2
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Attach official Ministry of Interior letter, CID impound document, or prosecution notice. Appended as an additional formal page in print preview.
                  </p>
                </div>
              </div>

              {/* Action buttons for Correspondence letter */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => correspondenceFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6b1119] hover:bg-[#851621] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Letter</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraMode('correspondence');
                    setIsCameraOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Capture Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleCorrespondence}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium transition-colors cursor-pointer border border-slate-700"
                  title="Load official Qatar MOI sample correspondence letter"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Use MOI Sample</span>
                </button>
              </div>
            </div>

            {/* Correspondence Letter Reference Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Correspondence Ref No:
                </label>
                <input
                  type="text"
                  placeholder="MOI/UAV-CDR/1859/2026"
                  value={correspondenceLetterRef}
                  onChange={(e) => setCorrespondenceLetterRef(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Letter Date:
                </label>
                <input
                  type="text"
                  placeholder="14/05/2026"
                  value={correspondenceLetterDate}
                  onChange={(e) => setCorrespondenceLetterDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                Endorsement & Custody Notes (Optional):
              </label>
              <input
                type="text"
                placeholder="Impound notice & custody transfer from Capital Patrol to UAV Forensics Lab..."
                value={correspondenceNotes}
                onChange={(e) => setCorrespondenceNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-sans text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Attached Correspondence Photo Display or Drag-Drop Area */}
            {correspondencePhotos.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Attached Correspondence Documents ({correspondencePhotos.length}):</span>
                  <span className="text-emerald-400 text-[11px]">Will print as Page 2</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {correspondencePhotos.map((photo, pIdx) => (
                    <div
                      key={pIdx}
                      className="border-2 border-[#6b1119] rounded-lg overflow-hidden bg-slate-900 relative group shadow-md"
                    >
                      <div className="bg-slate-950 px-3 py-1.5 flex items-center justify-between border-b border-slate-800 text-[11px] font-mono">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-rose-400" />
                          <span>Correspondence Page #{pIdx + 1}</span>
                        </span>
                        <span className="text-[10px] text-rose-300 bg-[#6b1119]/40 px-2 py-0.5 rounded border border-[#6b1119]">
                          Page 2 Document
                        </span>
                      </div>

                      <div className="h-56 bg-white flex items-center justify-center p-2 overflow-hidden">
                        <img
                          src={photo}
                          alt={`Correspondence Letter Document ${pIdx + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(photo)}
                          className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        >
                          <Maximize2 className="w-4 h-4" />
                          <span>Enlarge</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCorrespondencePhoto(pIdx)}
                          className="p-1.5 rounded-lg bg-rose-900 text-rose-100 hover:bg-rose-800 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropCorrespondence}
                onClick={() => correspondenceFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-[#6b1119] rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-950/50"
              >
                <Paperclip className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
                <p className="text-slate-300 text-xs font-semibold">
                  Click to upload correspondence letter, or drag & drop document here
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Supports JPG, PNG, WebP, or SVG scans. Added as Page 2 in print preview.
                </p>
              </div>
            )}
          </div>

          {/* Section 5: FIELD SYSTEM NOTES & Forensics */}
          <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                FIELD SYSTEM NOTES:
              </label>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <span>Status:</span>
                <AppDropdown
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-rose-300 font-bold focus:outline-none"
                >
                  <option value="CONFISCATED">CONFISCATED</option>
                  <option value="ACTIVE">ACTIVE INVESTIGATION</option>
                  <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                  <option value="LEGAL_REVIEW">LEGAL REVIEW</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </AppDropdown>
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="Enter technical extraction findings, SD card forensics, Law No. 1859 custody disposition..."
              value={fieldSystemNotes}
              onChange={(e) => setFieldSystemNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#6b1119] hover:bg-[#851621] text-xs font-bold text-white shadow-lg transition-colors cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingReport ? 'Save Changes' : 'Create Confiscated Drone Report'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Scanner Sub-Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={(scanned) => {
            if (scanTargetField === 'droneSN') setDroneSN(scanned);
            else setRemoteSN(scanned);
            setIsScannerOpen(false);
          }}
          title={scanTargetField === 'droneSN' ? 'Scan Drone Aircraft SN' : 'Scan Remote Controller SN'}
        />
      )}

      {/* Camera Capture Sub-Modal */}
      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(att) => {
            if (att.dataUrl) {
              if (cameraMode === 'correspondence') {
                setCorrespondencePhotos((prev) => [...prev, att.dataUrl]);
              } else {
                const targetId = targetEntryIdForPhoto || flightRecords[0]?.id;
                setFlightRecords((prev) =>
                  prev.map((rec) =>
                    (hasMultipleEntries && autoAttachToAllEntries) || rec.id === targetId
                      ? { ...rec, photos: [...(rec.photos || []), att.dataUrl] }
                      : rec
                  )
                );
              }
            }
            setIsCameraOpen(false);
          }}
          defaultCategory={cameraMode === 'correspondence' ? 'Detailed Log Sheet Excerpt' : 'Other Supporting Evidence'}
        />
      )}

      {/* Lightbox Preview */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewPhoto} alt="Evidence" className="max-w-full max-h-[85vh] rounded object-contain" />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-2 right-2 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
