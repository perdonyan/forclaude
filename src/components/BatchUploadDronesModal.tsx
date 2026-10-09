import { canApproveRequests, GroupPrivileges } from '../types/drone';
import { AppDropdown } from './AppDropdown';
import React, { useState, useMemo, useRef } from 'react';
import { DroneItem, UserItem } from '../types/drone';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Trash2,
  Layers,
  ShieldAlert,
  Send,
  UserCheck,
  Info,
  Radio,
  FileText
} from 'lucide-react';

interface BatchUploadDronesModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDrones: DroneItem[];
  currentUser?: UserItem | null;
  groupPrivileges?: GroupPrivileges;
  officers?: UserItem[];
  onBatchUpload: (
    drones: DroneItem[],
    replaceAll: boolean,
    targetOfficer?: UserItem,
    remarks?: string
  ) => void;
}

interface ParsedDroneRow {
  id: string;
  model: string;
  droneName: string;
  droneSN: string;
  remoteSN: string;
  email: string;
  department: 'SSOC' | 'SSD';
  status: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicateInBatch: boolean;
  isExistingInFleet: boolean;
}

const SAMPLE_CSV_CONTENT = `Model,Drone Name,Drone SN,Remote SN,Email,Department,Status,Notes
DJI Matrice 350 RTK,M350-Alpha,1581F5FHC247G00D363F,13MBK55R0100NW,ssoc.air01@moi.gov.qa,SSOC,ACTIVE,Sortie Tactical Unit
DJI Mavic 3 Enterprise,M3E-Bravo,1581F4BND226900BKPW6,1581F6GKB2401,ssd.patrol02@moi.gov.qa,SSD,ACTIVE,Perimeter Surveillance
DJI Inspire 3,Inspire3-Command,1ZMBJ9700C000K,1ZNAJ880010091,flight.command@moi.gov.qa,SSOC,ACTIVE,Air Tactical Lead
DJI Matrice 30T,M30T-Thermal,1581F5GHC248G00D112A,13MBK66R0200KL,ssoc.thermal@moi.gov.qa,SSOC,ACTIVE,Night SAR Operations`;

export const BatchUploadDronesModal: React.FC<BatchUploadDronesModalProps> = ({
  isOpen,
  onClose,
  existingDrones,
  currentUser,
  groupPrivileges,
  officers = [],
  onBatchUpload,
}) => {
  const isTechnician = !canApproveRequests(groupPrivileges,currentUser);
  const availableOfficers = officers.length > 0
    ? officers
    : [];

  const [activeInputTab, setActiveInputTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Settings
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [defaultDept, setDefaultDept] = useState<'SSOC' | 'SSD'>('SSOC');
  const [defaultStatus, setDefaultStatus] = useState<string>('ACTIVE');
  const [filterValidOnly, setFilterValidOnly] = useState<'ALL' | 'VALID' | 'ISSUES'>('ALL');

  // Officer Approval Dispatch State
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(() => {
    const sameDept = availableOfficers.find((o) => o.department === (currentUser?.department || 'SSOC'));
    return sameDept ? sameDept.id : availableOfficers[0]?.id || '';
  });
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [requireOfficerApproval, setRequireOfficerApproval] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV/TSV Parser function supporting quoted cells and both commas and tabs
  const parseDelimitedText = (text: string): ParsedDroneRow[] => {
    if (!text || !text.trim()) return [];

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    // Detect delimiter: tab or comma
    const firstLine = lines[0];
    const isTabDelimited = firstLine.includes('\t');
    const delimiter = isTabDelimited ? '\t' : ',';

    // Helper to parse line with optional quotes
    const parseLine = (line: string): string[] => {
      if (isTabDelimited) {
        return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      }
      // Regex for CSV with quotes
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    // Check if first line is a header
    const lowerFirst = firstLine.toLowerCase();
    const hasHeader =
      lowerFirst.includes('model') ||
      lowerFirst.includes('drone') ||
      lowerFirst.includes('sn') ||
      lowerFirst.includes('serial');

    // Header index mapping
    let colMap: Record<string, number> = {
      model: 0,
      droneName: 1,
      droneSN: 2,
      remoteSN: 3,
      email: 4,
      department: 5,
      status: 6,
      notes: 7,
    };

    let dataLines = lines;

    if (hasHeader) {
      const headerCols = parseLine(firstLine).map((c) => c.toLowerCase());
      colMap = {};
      headerCols.forEach((col, idx) => {
        if (col.includes('model')) colMap.model = idx;
        else if (col.includes('name') || col.includes('callsign')) colMap.droneName = idx;
        else if (col.includes('drone sn') || col.includes('drone_sn') || col.includes('body sn') || (col.includes('serial') && !col.includes('remote') && !col.includes('rc'))) colMap.droneSN = idx;
        else if (col.includes('remote') || col.includes('rc')) colMap.remoteSN = idx;
        else if (col.includes('email') || col.includes('mail')) colMap.email = idx;
        else if (col.includes('dept') || col.includes('department')) colMap.department = idx;
        else if (col.includes('status')) colMap.status = idx;
        else if (col.includes('note') || col.includes('remark')) colMap.notes = idx;
      });

      // Fallback defaults if specific columns weren't identified
      if (colMap.model === undefined) colMap.model = 0;
      if (colMap.droneName === undefined) colMap.droneName = 1;
      if (colMap.droneSN === undefined) colMap.droneSN = 2;
      if (colMap.remoteSN === undefined) colMap.remoteSN = 3;
      if (colMap.email === undefined) colMap.email = 4;
      if (colMap.department === undefined) colMap.department = 5;
      if (colMap.status === undefined) colMap.status = 6;

      dataLines = lines.slice(1);
    }

    const existingSNSet = new Set(
      existingDrones.map((d) => (d.droneSN || '').trim().toUpperCase()).filter((s) => s.length > 0)
    );

    const seenBatchSNs = new Set<string>();
    const rows: ParsedDroneRow[] = [];

    dataLines.forEach((line, idx) => {
      const cols = parseLine(line);
      if (cols.length === 0 || cols.every((c) => c === '')) return;

      const rawModel = (cols[colMap.model ?? 0] || '').trim();
      const rawName = (cols[colMap.droneName ?? 1] || '').trim();
      const rawSN = (cols[colMap.droneSN ?? 2] || '').trim();
      const rawRC = (cols[colMap.remoteSN ?? 3] || '').trim();
      const rawEmail = (cols[colMap.email ?? 4] || '').trim();
      const rawDept = (cols[colMap.department ?? 5] || '').trim().toUpperCase();
      const rawStatus = (cols[colMap.status ?? 6] || '').trim().toUpperCase();
      const rawNotes = (cols[colMap.notes ?? 7] || '').trim();

      const finalDept: 'SSOC' | 'SSD' =
        rawDept === 'SSD' ? 'SSD' : rawDept === 'SSOC' ? 'SSOC' : defaultDept;

      const finalStatus = rawStatus || defaultStatus;

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!rawModel && !rawName && !rawSN) {
        errors.push('Row is empty or missing essential fields');
      }
      if (!rawModel) {
        warnings.push('Model not specified, defaulting to UAV');
      }
      if (!rawSN) {
        errors.push('Missing Drone Serial Number');
      }

      // Check duplicates
      const snUpper = rawSN.toUpperCase();
      let isDuplicateInBatch = false;
      let isExistingInFleet = false;

      if (snUpper && snUpper !== 'UNKNOWN_SN' && snUpper !== 'TBD') {
        if (seenBatchSNs.has(snUpper)) {
          isDuplicateInBatch = true;
          warnings.push('Duplicate Serial Number in this batch file');
        } else {
          seenBatchSNs.add(snUpper);
        }

        if (existingSNSet.has(snUpper)) {
          isExistingInFleet = true;
          warnings.push('Serial Number already exists in active fleet inventory');
        }
      }

      const isValid = errors.length === 0;

      rows.push({
        id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        model: rawModel || 'UAV Airframe',
        droneName: rawName || (rawSN ? `Drone ${rawSN.slice(-4)}` : `Drone-${idx + 1}`),
        droneSN: rawSN || 'UNKNOWN_SN',
        remoteSN: rawRC,
        email: rawEmail || `${finalDept.toLowerCase()}.fleet@moi.gov.qa`,
        department: finalDept,
        status: finalStatus,
        notes: rawNotes,
        isValid,
        errors,
        warnings,
        isDuplicateInBatch,
        isExistingInFleet,
      });
    });

    return rows;
  };

  const parsedRows = useMemo(() => {
    return parseDelimitedText(rawContent);
  }, [rawContent, existingDrones, defaultDept, defaultStatus]);

  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);
  const warningRows = useMemo(
    () => parsedRows.filter((r) => r.isValid && (r.warnings.length > 0 || r.isDuplicateInBatch || r.isExistingInFleet)),
    [parsedRows]
  );

  const displayedRows = useMemo(() => {
    if (filterValidOnly === 'VALID') return validRows;
    if (filterValidOnly === 'ISSUES') return parsedRows.filter((r) => !r.isValid || r.warnings.length > 0);
    return parsedRows;
  }, [parsedRows, validRows, filterValidOnly]);

  const handleFileChange = (file: File) => {
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setRawContent(text);
        setPastedText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `moi_drone_fleet_upload_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_CSV_CONTENT);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleLoadSample = () => {
    setRawContent(SAMPLE_CSV_CONTENT);
    setPastedText(SAMPLE_CSV_CONTENT);
    setUploadedFileName('sample_moi_drones_batch.csv');
  };

  const handleClear = () => {
    setRawContent('');
    setPastedText('');
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveRow = (rowId: string) => {
    const updated = parsedRows.filter((r) => r.id !== rowId);
    // Regenerate CSV from updated rows
    const header = 'Model,Drone Name,Drone SN,Remote SN,Email,Department,Status,Notes';
    const lines = updated.map(
      (r) => `${r.model},${r.droneName},${r.droneSN},${r.remoteSN},${r.email},${r.department},${r.status},${r.notes || ''}`
    );
    const newContent = [header, ...lines].join('\n');
    setRawContent(newContent);
    setPastedText(newContent);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validRows.length === 0) return;

    const itemsToUpload: DroneItem[] = validRows.map((r) => ({
      id: r.id,
      model: r.model,
      droneName: r.droneName,
      droneSN: r.droneSN,
      remoteSN: r.remoteSN,
      email: r.email,
      department: r.department,
      status: r.status,
      notes: r.notes,
    }));

    const replaceAll = importMode === 'replace';

    if (isTechnician || requireOfficerApproval) {
      const chosenOfficer = availableOfficers.find((o) => o.id === selectedOfficerId) || availableOfficers[0];
      onBatchUpload(itemsToUpload, replaceAll, chosenOfficer, approvalRemarks.trim());
    } else {
      onBatchUpload(itemsToUpload, replaceAll);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-xs my-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  Batch Upload New Drones
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-semibold">
                  BULK FLEET IMPORT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>OFFICER APPROVAL PROTOCOL</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bulk register multiple UAV airframes into SSOC and SSD fleet inventory via CSV or Excel sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium text-xs">Templates & Presets:</span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-sky-300 bg-sky-950/70 hover:bg-sky-900 border border-sky-800 rounded transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 text-sky-400" />
                <span>Download CSV Template</span>
              </button>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors cursor-pointer"
              >
                {copiedTemplate ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedTemplate ? 'Copied Template!' : 'Copy Sample Data'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 rounded transition-colors cursor-pointer"
              >
                Load Sample Dataset (4 Airframes)
              </button>
              {rawContent && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800 rounded transition-colors cursor-pointer"
                >
                  Clear Data
                </button>
              )}
            </div>
          </div>

          {/* Mode Switch Tabs (File Upload vs Direct Paste) */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveInputTab('file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                activeInputTab === 'file'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload CSV / Spreadsheet File</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInputTab('paste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                activeInputTab === 'paste'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Paste Excel / CSV Text</span>
            </button>
          </div>

          {/* Tab 1: File Drop Zone */}
          {activeInputTab === 'file' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-sky-400 bg-sky-950/30 scale-[0.99]'
                  : uploadedFileName
                  ? 'border-emerald-600 bg-emerald-950/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .tsv, .txt, .xlsx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className={`p-3 rounded-full ${uploadedFileName ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-sky-400'}`}>
                  {uploadedFileName ? <CheckCircle2 className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                </div>
                {uploadedFileName ? (
                  <div>
                    <span className="font-semibold text-slate-100 text-xs">
                      {uploadedFileName}
                    </span>
                    <span className="block text-[11px] text-emerald-400 font-mono mt-0.5">
                      {validRows.length} valid drone airframes parsed • Click to select different file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-medium text-slate-200 text-xs block">
                      Drag & Drop CSV / Spreadsheet file here, or <span className="text-sky-400 underline underline-offset-2">Browse Files</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Supports comma or tab delimited export files (.csv, .txt, .tsv)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Paste Box */}
          {activeInputTab === 'paste' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Paste comma-separated (CSV) or tab-separated (from Excel / Sheets) data:</span>
                <span className="font-mono text-slate-500">Columns: Model, Name, SN, Remote SN, Email, Dept, Status</span>
              </div>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  setRawContent(e.target.value);
                }}
                placeholder="Paste rows here, e.g.:&#10;DJI Matrice 350 RTK,M350-Alpha,1581F5FHC247G00D363F,13MBK55R0100NW,ops@moi.gov.qa,SSOC,ACTIVE"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Default Import Fallback Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1 text-[11px]">
                IMPORT DESTINATION MODE
              </label>
              <AppDropdown
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
              >
                <option value="append">Append (Add as New Fleet Records)</option>
                <option value="replace">Replace Entire Fleet Inventory</option>
              </AppDropdown>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1 text-[11px]">
                DEFAULT DEPARTMENT (IF BLANK)
              </label>
              <AppDropdown
                value={defaultDept}
                onChange={(e) => setDefaultDept(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
              >
                <option value="SSOC">SSOC (Special Security Operations)</option>
                <option value="SSD">SSD (Security Systems Dept)</option>
              </AppDropdown>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1 text-[11px]">
                DEFAULT OPERATIONAL STATUS
              </label>
              <AppDropdown
                value={defaultStatus}
                onChange={(e) => setDefaultStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="UNDER REPAIR">UNDER REPAIR</option>
                <option value="CRASHED">CRASHED</option>
                <option value="MISSING">MISSING</option>
              </AppDropdown>
            </div>
          </div>

          {/* Validation & Preview Summary Bar */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>Parsed Batch Preview:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[11px] font-bold">
                      {validRows.length} Valid
                    </span>
                    {warningRows.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[11px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>{warningRows.length} Warnings</span>
                      </span>
                    )}
                    {invalidRows.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono text-[11px] font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>{invalidRows.length} Invalid</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500">Filter View:</span>
                  <button
                    type="button"
                    onClick={() => setFilterValidOnly('ALL')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      filterValidOnly === 'ALL'
                        ? 'bg-slate-800 text-slate-100 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterValidOnly('VALID')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      filterValidOnly === 'VALID'
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Valid Only ({validRows.length})
                  </button>
                  {warningRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterValidOnly('ISSUES')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        filterValidOnly === 'ISSUES'
                          ? 'bg-slate-800 text-amber-400 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Warnings ({warningRows.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 font-mono sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-medium">#</th>
                      <th className="py-2 px-3 font-medium">MODEL</th>
                      <th className="py-2 px-3 font-medium">CALLSIGN / NAME</th>
                      <th className="py-2 px-3 font-medium">DRONE SERIAL (SN)</th>
                      <th className="py-2 px-3 font-medium">REMOTE SN</th>
                      <th className="py-2 px-3 font-medium">DEPT</th>
                      <th className="py-2 px-3 font-medium">STATUS</th>
                      <th className="py-2 px-3 font-medium">VALIDATION</th>
                      <th className="py-2 px-2 text-center font-medium">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {displayedRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          !row.isValid
                            ? 'bg-rose-950/20'
                            : row.isExistingInFleet
                            ? 'bg-amber-950/15'
                            : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-200 font-semibold">
                          {row.model}
                        </td>
                        <td className="py-2 px-3 text-sky-300 font-medium">
                          {row.droneName}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{row.droneSN}</span>
                            {row.isExistingInFleet && (
                              <span
                                title="Serial number already exists in active drones inventory"
                                className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold"
                              >
                                DRONES MATCH
                              </span>
                            )}
                            {row.isDuplicateInBatch && (
                              <span
                                title="Duplicate serial number within this upload file"
                                className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold"
                              >
                                DUP IN BATCH
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {row.remoteSN || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            row.department === 'SSOC'
                              ? 'bg-sky-950 text-sky-400 border border-sky-800'
                              : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                          }`}>
                            {row.department}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-emerald-400 font-semibold text-[10px]">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            row.warnings.length > 0 ? (
                              <span className="text-amber-400 flex items-center gap-1 text-[10px]">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>{row.warnings[0]}</span>
                              </span>
                            ) : (
                              <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>Ready</span>
                              </span>
                            )
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 text-[10px]">
                              <XCircle className="w-3 h-3 shrink-0" />
                              <span>{row.errors[0]}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Remove row from batch"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Officer Approval Protocol Section */}
          {validRows.length > 0 && (
            <div className="p-3.5 rounded-lg border bg-slate-950/80 space-y-3 border-amber-900/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">
                      Officer Authorization Protocol
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isTechnician
                        ? 'Technician bulk imports require formal review and authorization by an Officer before inventory is updated.'
                        : 'Designate a reviewing Officer for official command sign-off or co-authorization.'}
                    </p>
                  </div>
                </div>

                {!isTechnician && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 shrink-0">
                    <input
                      type="checkbox"
                      checked={requireOfficerApproval}
                      onChange={(e) => setRequireOfficerApproval(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span className="font-medium text-[11px]">Request Officer Sign-off</span>
                  </label>
                )}
              </div>

              {(isTechnician || requireOfficerApproval) && availableOfficers.length > 0 && (
                <div className="pt-2 border-t border-slate-900 space-y-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                      DESIGNATED APPROVING OFFICER *
                    </label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <AppDropdown
                        required={isTechnician || requireOfficerApproval}
                        value={selectedOfficerId}
                        onChange={(e) => setSelectedOfficerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        {availableOfficers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.rank} {off.name} — {off.department} ({off.email})
                          </option>
                        ))}
                      </AppDropdown>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                      BATCH UPLOAD REMARKS / OPERATIONAL JUSTIFICATION
                    </label>
                    <textarea
                      rows={2}
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      placeholder="e.g. Batch procurement shipment; new airframes dispatched to SSOC aerial sortie unit."
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="text-slate-400 text-xs">
            {validRows.length > 0 ? (
              <span>
                Ready to import <strong className="text-slate-100 font-bold">{validRows.length}</strong> drone airframe(s)
                {importMode === 'replace' && <span className="text-rose-400 font-bold ml-1">(REPLACING CURRENT DRONES)</span>}
              </span>
            ) : (
              <span>Upload or paste drone data to generate preview</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {isTechnician || requireOfficerApproval ? (
              <button
                type="button"
                disabled={validRows.length === 0}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5 text-slate-950" />
                <span>Submit Batch for Officer Approval ({validRows.length})</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={validRows.length === 0}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors cursor-pointer shadow-md shadow-sky-500/20"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-950" />
                <span>Import {validRows.length} Drones</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
