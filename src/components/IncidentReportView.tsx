import { AppDropdown } from './AppDropdown';
import React, { useState, useRef, useMemo } from 'react';
import {
  IncidentReportRecord,
  IncidentPhotoAttachment,
  IncidentPhotoCategory,
  IncidentSeverity,
  IncidentStatus,
  DroneItem,
  UserItem,
  GroupPrivileges,
  hasPrivilege,
  DroneStatus,
} from '../types/drone';
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
  Printer,
  Edit3,
  X,
  AlertTriangle,
  Camera,
  UploadCloud,
  Maximize2,
  Radio,
  ShieldAlert,
  Send,
  Shield,
  Scan,
  AlertCircle,
  ChevronDown,
  Filter
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface IncidentReportViewProps {
  incidentReports: IncidentReportRecord[];
  drones: DroneItem[];
  currentUser?: UserItem | null;
  onSaveReport: (report: IncidentReportRecord, updateDroneStatus?: DroneStatus) => void;
  onDeleteReport: (reportId: string) => void;
  groupPrivileges?: GroupPrivileges;
  onOpenDraftInModal?: (report: IncidentReportRecord) => void;
}

const PHOTO_CATEGORIES: IncidentPhotoCategory[] = [
  'Hardware Crash Photo',
  'Drone Battery & Frame Imagery',
  'Detailed Log Sheet Excerpt',
  'Other Supporting Evidence',
];

export const IncidentReportView: React.FC<IncidentReportViewProps> = ({
  incidentReports,
  drones,
  currentUser,
  onSaveReport,
  onDeleteReport,
  groupPrivileges,
  onOpenDraftInModal,
}) => {
  // Functional privilege enforcement
  const canCreate = hasPrivilege(groupPrivileges, currentUser, 'INCIDENT_CREATE_REPORT');
  const canDelete = hasPrivilege(groupPrivileges, currentUser, 'INCIDENT_DELETE_REPORT');

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'UNDER_INVESTIGATION' | 'CLOSED' | 'CRITICAL' | 'SUBMITTED'>('ALL');

  // Modal States
  const [recordToView, setRecordToView] = useState<IncidentReportRecord | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<IncidentReportRecord | null>(null);
  const [formToDelete, setFormToDelete] = useState<IncidentReportRecord | null>(null);

  // Lightbox Preview State
  const [previewPhoto, setPreviewPhoto] = useState<IncidentPhotoAttachment | null>(null);

  // Stats calculation
  const totalReportsCount = incidentReports.length;
  const draftCount = incidentReports.filter((r) => r.status === 'DRAFT').length;
  const underInvestigationCount = incidentReports.filter((r) => r.status === 'UNDER_INVESTIGATION').length;
  const closedCount = incidentReports.filter((r) => r.status === 'CLOSED').length;
  const criticalCount = incidentReports.filter((r) => r.severity === 'CRITICAL' || r.severity === 'SEVERE').length;

  // Filtered reports
  const filteredReports = useMemo(() => {
    return incidentReports.filter((report) => {
      if (statusFilter === 'DRAFT' && report.status !== 'DRAFT') return false;
      if (statusFilter === 'UNDER_INVESTIGATION' && report.status !== 'UNDER_INVESTIGATION') return false;
      if (statusFilter === 'CLOSED' && report.status !== 'CLOSED') return false;
      if (statusFilter === 'SUBMITTED' && report.status !== 'SUBMITTED') return false;
      if (statusFilter === 'CRITICAL' && report.severity !== 'CRITICAL' && report.severity !== 'SEVERE') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchSr = report.srReference?.toLowerCase().includes(term);
        const matchDrone = report.droneName?.toLowerCase().includes(term);
        const matchAircraftSN = report.aircraftSN?.toLowerCase().includes(term);
        const matchRemoteSN = report.remoteSN?.toLowerCase().includes(term);
        const matchLocation = report.location?.toLowerCase().includes(term);
        const matchOperator = report.operatorName?.toLowerCase().includes(term);
        const matchQid = report.operatorQid?.toLowerCase().includes(term);
        const matchReporter = report.reportedBy?.toLowerCase().includes(term);
        const matchDetails = report.detailsSummary?.toLowerCase().includes(term);
        const matchNotes = report.fieldSystemNotes?.toLowerCase().includes(term);

        return (
          matchSr ||
          matchDrone ||
          matchAircraftSN ||
          matchRemoteSN ||
          matchLocation ||
          matchOperator ||
          matchQid ||
          matchReporter ||
          matchDetails ||
          matchNotes
        );
      }

      return true;
    });
  }, [incidentReports, statusFilter, searchTerm]);

  // Handle open editor
  const handleOpenCreate = () => {
    const nextNumber = incidentReports.length + 1;
    const autoSr = `UAV-IAR-2026-${String(nextNumber).padStart(2, '0')}`;
    const newReport: IncidentReportRecord = {
      id: `iar-${Date.now()}`,
      srReference: autoSr,
      droneName: 'M30T-29',
      aircraftSN: '1581F5BKD23910OFJSNJ',
      remoteSN: '4LFCL8L006KDPK',
      location: 'MUAITHER',
      date: '13/05/2026',
      department: currentUser?.department || 'SSOC',
      severity: 'CRITICAL',
      status: 'UNDER_INVESTIGATION',
      reportedBy: 'Capt. Tariq Al-Kuwari',
      reporterId: currentUser?.id,
      detailsSummary:
        'During the execution of an operational mission flight, the aircraft encountered severe, localized GNSS and GPS telemetry signal instabilities. Due to this external environmental degradation, critical RF link connectivity between the airframe and the remote controller was lost. Consequently, the drone became completely uncontrollable, failed to trigger safe-return failsafes, and disconnected fully from the ground control station terminal before impacting terrain.',
      latitude: '25.25130140833998',
      longitude: '51.39657338652925',
      operatorName: 'محمد على المرى',
      operatorQid: '2896348',
      operatorPhone: '777770',
      operatorJobId: '1346 - SSOC',
      operatorSignature: '✍ محمد على المرى',
      logDate: '13/05/2026',
      logTime: '23:47',
      reportPreparedBy: 'Capt. Tariq Al-Kuwari',
      reviewDate: '14/05/2026',
      evaluationStatus: 'HARDWARE DISCONNECTED / LOST',
      receivedEvaluatedBy: 'Capt. Tariq Al-Kuwari',
      evalDateTime: '14/05/2026 | 08:30 AM',
      fieldSystemNotes:
        'Northern sector reconnaissance mission compromised due to terminal link degradation. Airframe impact area mapped via last available GPS positioning vectors. Emergency recovery protocols initiated. Flight logs downloaded up to telemetry loss frame; hardware structural review pending physical wreckage extraction.',
      photos: [],
      createdAt: new Date().toISOString(),
    };
    setEditingReport(newReport);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (report: IncidentReportRecord) => {
    setEditingReport({ ...report, photos: [...(report.photos || [])] });
    setIsEditorOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const header =
      'SR Reference,Status,Severity,Drone Name,Aircraft SN,Remote SN,Location,Date,Log Time,Operator Name,QID,Contact Phone,Job ID,Report Prepared By,Review Date,Evaluation Status,Latitude,Longitude,Incident Assessment Summary,Field System Notes';
    const rows = filteredReports.map((r) => {
      return `"${r.srReference}","${r.status}","${r.severity}","${r.droneName}","${r.aircraftSN}","${r.remoteSN}","${r.location}","${r.date}","${r.logTime || ''}","${r.operatorName || ''}","${r.operatorQid || ''}","${r.operatorPhone || ''}","${r.operatorJobId || ''}","${r.reportPreparedBy || r.reportedBy}","${r.reviewDate || ''}","${r.evaluationStatus || ''}","${r.latitude || ''}","${r.longitude || ''}","${(r.detailsSummary || '').replace(/"/g, '""')}","${(r.fieldSystemNotes || '').replace(/"/g, '""')}"`;
    });
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `uav_incident_reports_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'UNDER_INVESTIGATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-500 text-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>UNDER INVESTIGATION</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/70 border border-emerald-500 text-emerald-400">
            CLOSED
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/70 border border-cyan-500 text-cyan-400">
            SUBMITTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/60 border border-amber-600/80 text-amber-300">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>DRAFT (Pending Officer Sign-Off)</span>
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
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* 1. KPI Stats Cards - Uniform 16px Spacing Grid (Matching IN/OUT FORM visual) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* TOTAL REPORTS */}
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
            {totalReportsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Incident register records</div>
        </div>

        {/* UNDER INVESTIGATION */}
        <div
          onClick={() => setStatusFilter('UNDER_INVESTIGATION')}
          className={`bg-slate-900 border rounded-lg p-3.5 sm:p-4 cursor-pointer transition-colors ${
            statusFilter === 'UNDER_INVESTIGATION'
              ? 'border-amber-500/80 bg-amber-950/40 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-amber-400 text-xs font-medium flex items-center justify-between">
            <span>UNDER INVESTIGATION</span>
            <Radio className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-amber-300 mt-1">
            {underInvestigationCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active forensic inquiries</div>
        </div>

        {/* CLOSED */}
        <div
          onClick={() => setStatusFilter('CLOSED')}
          className={`bg-slate-900 border rounded-lg p-3.5 sm:p-4 cursor-pointer transition-colors ${
            statusFilter === 'CLOSED'
              ? 'border-emerald-500/80 bg-emerald-950/40 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-emerald-400 text-xs font-medium flex items-center justify-between">
            <span>CLOSED</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-300 mt-1">
            {closedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Inquiries concluded</div>
        </div>

        {/* CRITICAL / SEVERE */}
        <div
          onClick={() => setStatusFilter('CRITICAL')}
          className={`bg-slate-900 border rounded-lg p-3.5 sm:p-4 cursor-pointer transition-colors ${
            statusFilter === 'CRITICAL'
              ? 'border-rose-500/80 bg-rose-950/40 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-rose-400 text-xs font-medium flex items-center justify-between">
            <span>CRITICAL SEVERITY</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-rose-300 mt-1">
            {criticalCount}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1">Airframe lost / structural</div>
        </div>
      </div>

      {/* 2. Search, Filter Pill Strip & Action Bar (Matching IN/OUT FORM visual) */}
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
                placeholder="Search IR, pilot, drone..."
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
                  <option value="ALL">All Reports ({totalReportsCount})</option>
                  <option value="DRAFT">Drafts ({draftCount})</option>
                  <option value="UNDER_INVESTIGATION">Investigating ({underInvestigationCount})</option>
                  <option value="CLOSED">Closed ({closedCount})</option>
                  <option value="CRITICAL">Critical Severity ({criticalCount})</option>
                </AppDropdown>
              </div>
            </div>
          </div>

          {/* Action Buttons: Export Excel & New UAV Incident Report */}
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

            {/* New UAV Incident Report Button */}
            {canCreate && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>New UAV Incident Report</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. UAV Incident Reports Register Table (Identical to IN/OUT FORM register visual) */}
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
                <th className="py-2.5 px-3">Operator / Officer</th>
                <th className="py-2.5 px-3">Drone & Incident Summary</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Evidentiary Logs</th>
                <th className="py-2.5 px-3 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-300">No incident reports found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click "+ New UAV Incident Report" to log a flight accident or investigation record.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((item) => {
                  const photosCount = item.photos?.length || 3;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* SR Reference */}
                      <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setRecordToView(item)}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-mono font-bold text-left"
                          title="View & Print Official Incident Report"
                        >
                          {item.srReference}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Operator / Officer */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-100 text-xs">
                          {item.operatorName || item.reportedBy || 'Duty Officer'}
                        </div>
                        {item.operatorJobId && (
                          <div className="text-[11px] font-mono text-slate-400">
                            {item.operatorJobId}
                          </div>
                        )}
                        {item.operatorQid && (
                          <div className="text-[10px] font-mono text-slate-500">
                            QID: {item.operatorQid}
                          </div>
                        )}
                      </td>

                      {/* Drone & Incident Summary */}
                      <td className="py-2.5 px-3 max-w-sm">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-sky-400 font-mono text-xs">{item.droneName}</span>
                          <span className="text-slate-600">•</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] uppercase font-semibold">
                            {item.location || 'MUAITHER'}
                          </span>
                        </div>
                        <p className="truncate text-slate-300 text-[11px]" title={item.detailsSummary}>
                          {item.detailsSummary}
                        </p>
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-300">
                        <div>{item.date}</div>
                        {item.logTime && (
                          <div className="text-[11px] text-slate-500">{item.logTime}</div>
                        )}
                      </td>

                      {/* Evidentiary Logs */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 font-mono text-xs font-semibold cursor-help"
                          title="Photographic & telemetry evidentiary records attached"
                        >
                          <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{photosCount} units</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View & Print Button */}
                          <button
                            type="button"
                            onClick={() => setRecordToView(item)}
                            className="p-1.5 text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-colors cursor-pointer"
                            title="View / Print Official Sheet"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Send Draft to Officer for Approval */}
                          {item.status === 'DRAFT' && onOpenDraftInModal && (
                            <button
                              type="button"
                              onClick={() => onOpenDraftInModal(item)}
                              className="p-1.5 text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/70 rounded-lg transition-colors cursor-pointer"
                              title="Send Draft Incident Report to Officer for Approval"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors cursor-pointer"
                            title="Edit Incident Report"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setFormToDelete(item)}
                              className="p-1.5 text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* 4. MODAL: OFFICIAL INCIDENT ACCIDENT REPORT DOCUMENT VIEWER & PRINT */}
      {recordToView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-auto">
            {/* Modal Header & Document Action Bar */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Incident Accident Report</span>
                    <span className="font-mono text-cyan-400">({recordToView.srReference})</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Official UAV Team Flight Safety & Damage Assessment Document
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(recordToView);
                    setRecordToView(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  title="Print Official Document"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-950" />
                  <span>Print Official Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecordToView(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Sheet (Exact Reconstructed Replica from image.png) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
              <div
                id="printable-incident-sheet"
                className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-2xl border border-slate-300 font-sans max-w-4xl mx-auto"
              >
                {/* 1. Header Banner */}
                <div className="bg-sky-700 text-white font-bold py-2.5 px-4 text-center tracking-normal text-base sm:text-lg border border-sky-700">
                  Incident Accident Report (UAV Team)
                </div>

                {/* 2. Header Metadata Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-400 border-t-0 text-xs sm:text-sm">
                    <tbody>
                      <tr className="divide-x divide-neutral-400">
                        <td className="w-[12%] font-bold text-center py-1.5 px-2 bg-white text-black">DATE</td>
                        <td className="w-[18%] text-center py-1.5 px-2 text-black">{recordToView.date || '13/05/2026'}</td>
                        <td className="w-[14%] font-bold text-center py-1.5 px-2 bg-white text-black">LOCATION</td>
                        <td className="w-[18%] text-center py-1.5 px-2 uppercase text-black">{recordToView.location || 'MUAITHER'}</td>
                        <td className="w-[10%] font-bold text-center py-1.5 px-2 bg-white text-black">SR:</td>
                        <td className="w-[28%] text-center py-1.5 px-2 font-mono font-medium text-black">
                          {recordToView.srReference || 'UAV-IAR-2026-01'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. Drone & Equipment Identification Table */}
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-400 text-xs sm:text-sm text-center">
                    <thead>
                      <tr className="bg-sky-700 text-white font-bold divide-x divide-white">
                        <th className="w-1/3 py-1.5 px-3 uppercase tracking-wider font-bold">DRONE NAME</th>
                        <th className="w-1/3 py-1.5 px-3 uppercase tracking-wider font-bold">AIRCRAFT SN</th>
                        <th className="w-1/3 py-1.5 px-3 uppercase tracking-wider font-bold">REMOTE SN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="divide-x divide-neutral-400 border-t border-neutral-400 bg-white">
                        <td className="py-2 px-3 font-semibold text-slate-900">{recordToView.droneName || 'M30T-29'}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900 tracking-tight">
                          {recordToView.aircraftSN || '1581F5BKD23910OFJSNJ'}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900 tracking-tight">
                          {recordToView.remoteSN || '4LFCL8L006KDPK'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Spacer tick */}
                <div className="text-xs text-neutral-800 px-0.5 font-mono my-1 leading-none">|</div>

                {/* 4. Two-Column Box: Accident Details Summary & Supporting Evidence Logs */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-400 text-xs sm:text-sm mb-5">
                    <thead>
                      <tr className="bg-[#f0f0f0] divide-x divide-neutral-400 border-b border-neutral-400">
                        <th className="w-[52%] py-2 px-3 text-center font-bold text-slate-900 uppercase tracking-wide">
                          ACCIDENT DETAILS SUMMARY
                        </th>
                        <th className="w-[48%] py-2 px-3 text-center font-bold text-slate-900 uppercase tracking-wide">
                          SUPPORTING EVIDENCE LOGS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="divide-x divide-neutral-400 align-top bg-white">
                        {/* Left Column: Summary & Coordinates */}
                        <td className="p-3.5 sm:p-4 text-slate-900 leading-relaxed">
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] mb-1.5">
                            Incident Assessment Summary:
                          </div>
                          <p className="text-xs sm:text-[13px] leading-relaxed text-justify mb-4 text-slate-800 whitespace-pre-line font-normal">
                            {recordToView.detailsSummary}
                          </p>
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] mb-1">
                            Last Recorded Coordinates Before Link Loss:
                          </div>
                          <ul className="text-xs sm:text-[13px] space-y-0.5 font-sans text-slate-800">
                            <li>
                              • Latitude: <strong>{recordToView.latitude || '25.25130140833998'}</strong>
                            </li>
                            <li>
                              • Longitude: <strong>{recordToView.longitude || '51.39657338652925'}</strong>
                            </li>
                          </ul>
                        </td>

                        {/* Right Column: Evidence Placeholders & Photos */}
                        <td className="p-3.5 sm:p-4 text-slate-900">
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] mb-3 text-center sm:text-left">
                            Photographic & Telemetry Imagery Logs
                          </div>

                          <div className="space-y-4 my-2 text-center">
                            <div className="py-4 px-3 border border-neutral-200 rounded bg-neutral-50/50 text-[11px] sm:text-xs italic text-neutral-500 font-serif">
                              [ Hardware Airframe Crash Photo Placeholder ]
                            </div>
                            <div className="py-4 px-3 border border-neutral-200 rounded bg-neutral-50/50 text-[11px] sm:text-xs italic text-neutral-500 font-serif">
                              [ Drone Physical Battery & Degradation Imagery Placeholder ]
                            </div>
                            <div className="py-4 px-3 border border-neutral-200 rounded bg-neutral-50/50 text-[11px] sm:text-xs italic text-neutral-500 font-serif">
                              [ Detailed Ground Control Station Log Excerpt Placeholder ]
                            </div>
                          </div>

                          {/* Attached forensic images if present */}
                          {recordToView.photos && recordToView.photos.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-neutral-200">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                                  Forensic Assets Attached ({recordToView.photos.length})
                                </span>
                                <span className="text-[9px] text-neutral-400 print:hidden">(Click to zoom)</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {recordToView.photos.map((photo) => (
                                  <div
                                    key={photo.id}
                                    onClick={() => setPreviewPhoto(photo)}
                                    className="border border-neutral-300 rounded p-1 bg-white cursor-pointer hover:border-sky-700 transition-colors"
                                    title={photo.caption || photo.category}
                                  >
                                    <div className="aspect-4/3 bg-slate-950 rounded overflow-hidden flex items-center justify-center">
                                      <img src={photo.dataUrl} alt={photo.fileName} className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-[8px] text-neutral-600 truncate mt-0.5 text-center font-medium">
                                      {photo.category}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. Personnel, Sign-off & Investigation Table (5 rows, 4 columns) */}
                <div className="overflow-x-auto mb-5">
                  <table className="w-full border-collapse border border-neutral-400 text-xs sm:text-sm">
                    <tbody>
                      <tr className="divide-x divide-neutral-400 border-b border-neutral-400">
                        <td className="w-[22%] py-1.5 px-3 font-bold text-slate-900 bg-white">Operator Name</td>
                        <td className="w-[33%] py-1.5 px-3 text-slate-900 font-medium">
                          {recordToView.operatorName || 'محمد على المرى'}
                        </td>
                        <td className="w-[18%] py-1.5 px-3 font-bold text-slate-900 bg-white">QID</td>
                        <td className="w-[27%] py-1.5 px-3 font-mono text-slate-900 font-medium">
                          {recordToView.operatorQid || '2896348'}
                        </td>
                      </tr>
                      <tr className="divide-x divide-neutral-400 border-b border-neutral-400">
                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-white">Contact Phone</td>
                        <td className="py-1.5 px-3 font-mono text-slate-900 font-medium">
                          {recordToView.operatorPhone || '777770'}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-white">JOB ID</td>
                        <td className="py-1.5 px-3 font-medium text-slate-900">
                          {recordToView.operatorJobId || '1346 - SSOC'}
                        </td>
                      </tr>
                      <tr className="divide-x divide-neutral-400 border-b border-neutral-400">
                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-white">Operator Signature</td>
                        <td className="py-1.5 px-3 font-medium text-slate-800">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span>✍</span>
                            <span className="font-mono text-neutral-400">________________________</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-white">LOG DATE</td>
                        <td className="py-1.5 px-3 font-medium text-slate-900">
                          {recordToView.logDate || recordToView.date || '13/05/2026'}
                        </td>
                      </tr>
                      <tr className="divide-x divide-neutral-400 border-b border-neutral-400">
                        <td className="py-1.5 px-3 bg-white"></td>
                        <td className="py-1.5 px-3"></td>
                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-white">LOG TIME</td>
                        <td className="py-1.5 px-3 font-mono text-slate-900 font-medium">{recordToView.logTime || '23:47'}</td>
                      </tr>
                      <tr className="divide-x divide-neutral-400">
                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-white">Report Prepared By</td>
                        <td className="py-1.5 px-3 text-slate-900 font-medium">
                          {recordToView.reportPreparedBy || recordToView.reportedBy || 'Capt. Tariq Al-Kuwari'}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-slate-900 bg-white">REVIEW DATE</td>
                        <td className="py-1.5 px-3 font-medium text-slate-900">{recordToView.reviewDate || '14/05/2026'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 6. Crash Overview and Initial Evaluation Status Table */}
                <div className="overflow-x-auto mb-5">
                  <table className="w-full border-collapse border border-neutral-400 text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-neutral-400">
                        <th colSpan={2} className="w-[65%] bg-sky-700 text-white font-bold py-1.5 px-3 text-left uppercase tracking-wide">
                          CRASH OVERVIEW AND INITIAL EVALUATION STATUS
                        </th>
                        <th
                          colSpan={2}
                          className="w-[35%] bg-sky-100 text-sky-700 font-bold py-1.5 px-3 text-center uppercase tracking-wide border-l border-neutral-400"
                        >
                          ✓ {recordToView.evaluationStatus || 'HARDWARE DISCONNECTED / LOST'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="divide-x divide-neutral-400">
                        <td className="w-[22%] py-1.5 px-3 font-bold text-slate-900 bg-white">
                          Received & Evaluated By
                        </td>
                        <td className="w-[33%] py-1.5 px-3 text-slate-900 font-medium">
                          {recordToView.receivedEvaluatedBy ||
                            recordToView.reportPreparedBy ||
                            recordToView.reportedBy ||
                            'Capt. Tariq Al-Kuwari'}
                        </td>
                        <td className="w-[18%] py-1.5 px-3 font-bold text-slate-900 bg-white">
                          EVAL DATE / TIME
                        </td>
                        <td className="w-[27%] py-1.5 px-3 text-slate-900 font-medium">
                          {recordToView.evalDateTime || '14/05/2026 | 08:30 AM'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 7. Field System Notes Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-400 text-xs sm:text-sm">
                    <tbody>
                      <tr className="divide-x divide-neutral-400 align-top">
                        <td className="w-[22%] py-2.5 px-3 font-bold text-slate-900 uppercase tracking-wide bg-neutral-50/40">
                          FIELD SYSTEM NOTES:
                        </td>
                        <td className="w-[78%] py-2.5 px-3 text-slate-800 leading-relaxed text-justify">
                          {recordToView.fieldSystemNotes ||
                            'Northern sector reconnaissance mission compromised due to terminal link degradation. Airframe impact area mapped via last available GPS positioning vectors. Emergency recovery protocols initiated. Flight logs downloaded up to telemetry loss frame; hardware structural review pending physical wreckage extraction.'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: DELETE CONFIRMATION DIALOG */}
      {formToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Delete Incident Report</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{formToDelete.srReference}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this Incident Accident Report for drone{' '}
              <strong className="text-white">{formToDelete.droneName}</strong>? This action will permanently remove
              the flight investigation archive from the register.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteReport(formToDelete.id);
                  if (recordToView?.id === formToDelete.id) {
                    setRecordToView(null);
                  }
                  setFormToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-slate-950 rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: INCIDENT REPORT EDITOR MODAL */}
      {isEditorOpen && editingReport && (
        <IncidentReportEditorModal
          isOpen={isEditorOpen}
          report={editingReport}
          drones={drones}
          currentUser={currentUser}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingReport(null);
          }}
          onSave={(savedReport, updateDroneStatus) => {
            onSaveReport(savedReport, updateDroneStatus);
            setIsEditorOpen(false);
            setEditingReport(null);
            // If viewing this document, update viewer too
            if (recordToView?.id === savedReport.id) {
              setRecordToView(savedReport);
            }
          }}
        />
      )}

      {/* 7. LIGHTBOX MODAL: FULL RESOLUTION PHOTO VIEWER */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
          >
            {/* Lightbox Header */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <span className="text-xs font-bold text-rose-400 font-mono uppercase">
                  {previewPhoto.category}
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {previewPhoto.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Preview */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
              <img
                src={previewPhoto.dataUrl}
                alt={previewPhoto.caption || previewPhoto.fileName}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Lightbox Footer & Caption */}
            {previewPhoto.caption && (
              <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-200">
                <span className="font-semibold text-slate-400">Description: </span>
                <span>{previewPhoto.caption}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// INCIDENT REPORT EDITOR MODAL COMPONENT (WITH PHOTO ATTACHMENT FUNCTION)
// =========================================================================

interface IncidentReportEditorModalProps {
  isOpen: boolean;
  report: IncidentReportRecord;
  drones: DroneItem[];
  currentUser?: UserItem | null;
  onClose: () => void;
  onSave: (report: IncidentReportRecord, updateDroneStatus?: DroneStatus) => void;
}

const IncidentReportEditorModal: React.FC<IncidentReportEditorModalProps> = ({
  isOpen,
  report,
  drones,
  currentUser,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<IncidentReportRecord>({
    ...report,
    photos: [...(report.photos || [])],
  });

  // Photo Attachment & Camera Capture
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoCategory, setActivePhotoCategory] = useState<IncidentPhotoCategory>('Hardware Crash Photo');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Barcode Scanner via Device Camera for Aircraft and Remote Serial Numbers
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeTarget, setBarcodeTarget] = useState<'aircraftSN' | 'remoteSN'>('aircraftSN');

  const handleBarcodeScanned = (scannedSerial: string) => {
    if (barcodeTarget === 'aircraftSN') {
      setFormData((prev) => ({ ...prev, aircraftSN: scannedSerial }));
    } else {
      setFormData((prev) => ({ ...prev, remoteSN: scannedSerial }));
    }
  };

  const handleCameraCapture = (attachment: IncidentPhotoAttachment) => {
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, attachment],
    }));
  };

  // Quick select drone from fleet
  const handleSelectDrone = (droneName: string) => {
    const found = drones.find((d) => d.droneName === droneName);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        droneId: found.id,
        droneName: found.droneName,
        aircraftSN: found.droneSN,
        remoteSN: found.remoteSN,
        department: found.department,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        droneName,
      }));
    }
  };

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    setUploadError(null);
    const filesArray = Array.from(inputFiles);
    const oversizedFiles: string[] = [];

    const readPromises = filesArray.map((file) => {
      return new Promise<IncidentPhotoAttachment | null>((resolve) => {
        // 15MB limit check per image
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
              id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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
          setFormData((prev) => ({
            ...prev,
            photos: [...prev.photos, ...validAttachments],
          }));
        }
        if (oversizedFiles.length > 0) {
          setUploadError(`File(s) exceed 15MB size limit: ${oversizedFiles.join(', ')}`);
        } else if (validAttachments.length === 0 && filesArray.length > 0) {
          setUploadError('Unable to attach selected file(s). Please choose valid image files.');
        }
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
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== photoId),
    }));
  };

  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === photoId ? { ...p, caption } : p)),
    }));
  };

  const handleUpdatePhotoCategory = (photoId: string, category: IncidentPhotoCategory) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === photoId ? { ...p, category } : p)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.droneName.trim()) {
      setFormError('Please specify or select a Drone Name.');
      return;
    }
    if (!formData.srReference.trim()) {
      setFormError('Please enter an SR Reference number.');
      return;
    }
    onSave({ ...formData, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <AlertTriangle className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {formData.id.startsWith('iar-') ? 'Incident Accident Report Entry' : 'Edit Incident Report'}
              </h2>
              <p className="text-xs text-slate-400">
                Operations Menu • Flight Safety & Damage Assessment Document
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {/* Section 1: Aircraft & Incident Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>1. Aircraft & Incident Identification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Drone Quick Select */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Drone
                </label>
                <AppDropdown
                  value={formData.droneName}
                  onChange={(e) => handleSelectDrone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                >
                  <option value="">-- Choose drone or enter custom --</option>
                  {drones.map((d) => (
                    <option key={d.id} value={d.droneName}>
                      {d.droneName} ({d.model} - {d.status})
                    </option>
                  ))}
                </AppDropdown>
              </div>

              {/* Drone Name Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  DRONE NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M30T-29"
                  value={formData.droneName}
                  onChange={(e) => setFormData({ ...formData, droneName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              {/* SR Reference */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  SR Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UAV-IAR-2026-01"
                  value={formData.srReference}
                  onChange={(e) => setFormData({ ...formData, srReference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-cyan-300 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Aircraft Serial Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    AIRCRAFT SN
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeTarget('aircraftSN');
                      setIsBarcodeScannerOpen(true);
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer"
                    title="Scan barcode using camera"
                  >
                    <Scan className="w-3 h-3" />
                    <span>Scan Barcode</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 1581F5BKD23910OFJSNJ"
                    value={formData.aircraftSN}
                    onChange={(e) => setFormData({ ...formData, aircraftSN: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeTarget('aircraftSN');
                      setIsBarcodeScannerOpen(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 cursor-pointer"
                    title="Scan barcode using camera"
                  >
                    <Scan className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Remote Serial Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    REMOTE SN
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeTarget('remoteSN');
                      setIsBarcodeScannerOpen(true);
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer"
                    title="Scan barcode using camera"
                  >
                    <Scan className="w-3 h-3" />
                    <span>Scan Barcode</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 4LFCL8L006KDPK"
                    value={formData.remoteSN}
                    onChange={(e) => setFormData({ ...formData, remoteSN: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeTarget('remoteSN');
                      setIsBarcodeScannerOpen(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 cursor-pointer"
                    title="Scan barcode using camera"
                  >
                    <Scan className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  LOCATION (Sector/Area) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MUAITHER"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold uppercase text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  DATE (e.g. 13/05/2026) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Incident Severity
                </label>
                <AppDropdown
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                >
                  <option value="CRITICAL">CRITICAL (Total Loss / Heavy Crash)</option>
                  <option value="SEVERE">SEVERE (Boom/Motor Structural Damage)</option>
                  <option value="MODERATE">MODERATE (Propeller/Sensor Clip)</option>
                  <option value="MINOR">MINOR (Scuff/Hard Landing)</option>
                </AppDropdown>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Investigation Status
                </label>
                <AppDropdown
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                >
                  <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="DRAFT">DRAFT</option>
                </AppDropdown>
              </div>

              {/* Reported By */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Investigating Officer
                </label>
                <input
                  type="text"
                  value={formData.reportedBy}
                  onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Accident Details Summary & Coordinates */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400">
              2. Accident Assessment Narrative & Coordinates
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Incident Assessment Summary *
              </label>
              <textarea
                required
                rows={4}
                placeholder="During the execution of an operational mission flight, the aircraft encountered severe, localized GNSS and GPS telemetry signal instabilities..."
                value={formData.detailsSummary}
                onChange={(e) => setFormData({ ...formData, detailsSummary: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500 leading-relaxed font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Last Recorded Latitude
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25.25130140833998"
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Last Recorded Longitude
                </label>
                <input
                  type="text"
                  placeholder="e.g. 51.39657338652925"
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Personnel, Log Dates & Evaluation Sign-Off */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400">
              3. Personnel, Log Dates & Evaluation Sign-Off
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operator Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. محمد على المرى"
                  value={formData.operatorName || ''}
                  onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operator QID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2896348"
                  value={formData.operatorQid || ''}
                  onChange={(e) => setFormData({ ...formData, operatorQid: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 777770"
                  value={formData.operatorPhone || ''}
                  onChange={(e) => setFormData({ ...formData, operatorPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  JOB ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1346 - SSOC"
                  value={formData.operatorJobId || ''}
                  onChange={(e) => setFormData({ ...formData, operatorJobId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  LOG DATE
                </label>
                <input
                  type="text"
                  placeholder="e.g. 13/05/2026"
                  value={formData.logDate || ''}
                  onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  LOG TIME
                </label>
                <input
                  type="text"
                  placeholder="e.g. 23:47"
                  value={formData.logTime || ''}
                  onChange={(e) => setFormData({ ...formData, logTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Report Prepared By
                </label>
                <input
                  type="text"
                  placeholder="e.g. Capt. Tariq Al-Kuwari"
                  value={formData.reportPreparedBy || ''}
                  onChange={(e) => setFormData({ ...formData, reportPreparedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  REVIEW DATE
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14/05/2026"
                  value={formData.reviewDate || ''}
                  onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Crash Status Badge
                </label>
                <input
                  type="text"
                  placeholder="e.g. HARDWARE DISCONNECTED / LOST"
                  value={formData.evaluationStatus || 'HARDWARE DISCONNECTED / LOST'}
                  onChange={(e) => setFormData({ ...formData, evaluationStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-teal-400 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Received & Evaluated By
                </label>
                <input
                  type="text"
                  placeholder="e.g. Capt. Tariq Al-Kuwari"
                  value={formData.receivedEvaluatedBy || ''}
                  onChange={(e) => setFormData({ ...formData, receivedEvaluatedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  EVAL DATE / TIME
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14/05/2026 | 08:30 AM"
                  value={formData.evalDateTime || ''}
                  onChange={(e) => setFormData({ ...formData, evalDateTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                FIELD SYSTEM NOTES
              </label>
              <textarea
                rows={3}
                placeholder="Northern sector reconnaissance mission compromised due to terminal link degradation..."
                value={formData.fieldSystemNotes || ''}
                onChange={(e) => setFormData({ ...formData, fieldSystemNotes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 leading-relaxed focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 4: Supporting Documents & Photographic Evidence */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>4. Supporting Evidence & Photographic Logs ({formData.photos.length})</span>
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
                  onChange={(e) => setActivePhotoCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-md px-2.5 py-1"
                >
                  {PHOTO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </AppDropdown>
              </div>
            </div>

            {/* Hidden File Input & Upload Trigger Area */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*"
              className="hidden"
            />

            {/* Dual Trigger: Live Camera Snapshot & File Attachment */}
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
              <p className="text-xs text-rose-400 font-semibold">{uploadError}</p>
            )}

            {/* Attached Photos List with Previews */}
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <AppDropdown
                        value={photo.category}
                        onChange={(e) => handleUpdatePhotoCategory(photo.id, e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-cyan-300 rounded px-2 py-0.5"
                      >
                        {PHOTO_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </AppDropdown>

                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative aspect-16/9 bg-black rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                      <img
                        src={photo.dataUrl}
                        alt={photo.caption || photo.fileName}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Add caption or forensic observation note..."
                      value={photo.caption || ''}
                      onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Official Flight Safety & Chain of Command Protocol */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11.5px] text-slate-300">
                <strong className="text-amber-300 font-semibold">Flight Safety Protocol:</strong> Drone inventory status changes strictly require designated officer evaluation and approval. Status cannot be modified directly without sign-off.
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 font-semibold shrink-0 self-start sm:self-auto">
              OFFICER APPROVAL MANDATED
            </span>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold cursor-pointer shadow-md shadow-cyan-500/20"
            >
              Save Incident Accident Report
            </button>
          </div>
        </form>
      </div>

      {/* Live Device Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        defaultCategory={activePhotoCategory}
        categories={PHOTO_CATEGORIES}
      />

      {/* Live Device Camera Barcode Scanner Modal for Aircraft / Remote SN */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={barcodeTarget === 'aircraftSN' ? 'Scan Aircraft Serial Number Barcode' : 'Scan Remote Serial Number Barcode'}
        subtitle={`Point device camera at the 1D/2D barcode or QR code to autofill ${barcodeTarget === 'aircraftSN' ? 'Aircraft SN' : 'Remote SN'}`}
      />
    </div>
  );
};
