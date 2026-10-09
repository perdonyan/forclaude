import { AppDropdown } from './AppDropdown';
import React, { useState, useMemo } from 'react';
import {
  ConfiscatedDroneReport,
  ConfiscatedDroneStatus,
  UserItem,
  GroupPrivileges,
  hasPrivilege,
} from '../types/drone';
import {
  ShieldAlert,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit3,
  Trash2,
  Printer,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  MapPin,
  Clock,
  Compass,
  ChevronDown,
  X,
  Sparkles,
} from 'lucide-react';
import { ConfiscatedDroneOfficialSheet } from './ConfiscatedDroneOfficialSheet';
import { ConfiscatedDroneFormModal } from './ConfiscatedDroneFormModal';

interface ConfiscatedDroneViewProps {
  confiscatedDrones: ConfiscatedDroneReport[];
  currentUser?: UserItem | null;
  onSaveReport: (report: ConfiscatedDroneReport) => void;
  onDeleteReport: (reportId: string) => void;
  groupPrivileges?: GroupPrivileges;
}

export const ConfiscatedDroneView: React.FC<ConfiscatedDroneViewProps> = ({
  confiscatedDrones,
  currentUser,
  onSaveReport,
  onDeleteReport,
  groupPrivileges,
}) => {
  // Functional privileges
  const canCreate = hasPrivilege(groupPrivileges, currentUser, 'CONFISCATED_CREATE_REPORT');
  const canEdit = hasPrivilege(groupPrivileges, currentUser, 'CONFISCATED_EDIT_REPORT');
  const canDelete = hasPrivilege(groupPrivileges, currentUser, 'CONFISCATED_DELETE_REPORT');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE_CASES' | ConfiscatedDroneStatus>('ALL');
  const [multiEntryFilter, setMultiEntryFilter] = useState<'ALL' | 'MULTI' | 'SINGLE'>('ALL');

  // Modals State
  const [viewingReport, setViewingReport] = useState<ConfiscatedDroneReport | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ConfiscatedDroneReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<ConfiscatedDroneReport | null>(null);

  // Compute statistics
  const totalReportsCount = confiscatedDrones.length;
  const multiEntryCount = confiscatedDrones.filter((r) => r.hasMultipleEntries).length;
  const totalSequentialFlights = confiscatedDrones.reduce(
    (acc, r) => acc + (r.flightRecords?.length || 1),
    0
  );
  const activeCasesCount = confiscatedDrones.filter(
    (r) => r.status === 'CONFISCATED' || r.status === 'ACTIVE' || r.status === 'UNDER_INVESTIGATION'
  ).length;

  // Filtered reports
  const filteredReports = useMemo(() => {
    return confiscatedDrones.filter((report) => {
      if (statusFilter === 'ACTIVE_CASES') {
        if (!['CONFISCATED', 'ACTIVE', 'UNDER_INVESTIGATION'].includes(report.status)) return false;
      } else if (statusFilter !== 'ALL' && report.status !== statusFilter) {
        return false;
      }
      if (multiEntryFilter === 'MULTI' && !report.hasMultipleEntries) return false;
      if (multiEntryFilter === 'SINGLE' && report.hasMultipleEntries) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchSr = report.srNumber?.toLowerCase().includes(q);
        const matchLr = report.lrNumber?.toLowerCase().includes(q);
        const matchModel = report.droneModel?.toLowerCase().includes(q);
        const matchDroneSN = report.droneSN?.toLowerCase().includes(q);
        const matchRemoteSN = report.remoteSN?.toLowerCase().includes(q);
        const matchReceiver = report.receivedBy?.toLowerCase().includes(q);
        const matchNotes = report.fieldSystemNotes?.toLowerCase().includes(q);
        const matchFlight = report.flightRecords?.some(
          (f) =>
            f.location?.toLowerCase().includes(q) ||
            f.coordinates?.toLowerCase().includes(q) ||
            f.notes?.toLowerCase().includes(q)
        );

        return matchSr || matchLr || matchModel || matchDroneSN || matchRemoteSN || matchReceiver || matchNotes || matchFlight;
      }
      return true;
    });
  }, [confiscatedDrones, statusFilter, multiEntryFilter, searchTerm]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'SR Number',
      'LR Number',
      'Date',
      'Drone Model',
      'Drone SN',
      'Remote SN',
      'Multiple Entries',
      'Flight Records Count',
      'Received By',
      'Eval Date Time',
      'Status',
      'Notes',
    ];

    const rows = filteredReports.map((r) => [
      `"${r.srNumber || ''}"`,
      `"${r.lrNumber || ''}"`,
      `"${r.date || ''}"`,
      `"${r.droneModel || ''}"`,
      `"${r.droneSN || ''}"`,
      `"${r.remoteSN || ''}"`,
      r.hasMultipleEntries ? 'YES' : 'NO',
      r.flightRecords?.length || 1,
      `"${r.receivedBy || ''}"`,
      `"${r.evalDateTime || ''}"`,
      `"${r.status || ''}"`,
      `"${(r.fieldSystemNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `confiscated_drones_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* Summary cards match the other Operations Menu pages. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setStatusFilter('ALL');
            setMultiEntryFilter('ALL');
          }}
          className={`text-left bg-slate-900 border rounded-lg p-3.5 sm:p-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            statusFilter === 'ALL' && multiEntryFilter === 'ALL'
              ? 'border-sky-500/80 bg-slate-800/60 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between gap-2">
            <span>TOTAL DOCUMENTS</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {totalReportsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Confiscated drone register</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('ALL');
            setMultiEntryFilter('MULTI');
          }}
          className={`text-left bg-slate-900 border rounded-lg p-3.5 sm:p-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            multiEntryFilter === 'MULTI'
              ? 'border-sky-500/80 bg-sky-950/40 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-sky-400 text-xs font-medium flex items-center justify-between gap-2">
            <span>MULTIPLE FLIGHT REPORTS</span>
            <Layers className="w-3.5 h-3.5 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-sky-300 mt-1">
            {multiEntryCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Records with multiple entries</div>
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between gap-2">
            <span>SEQUENTIAL SORTIES</span>
            <Compass className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {totalSequentialFlights}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Recorded flight entries</div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('ACTIVE_CASES');
            setMultiEntryFilter('ALL');
          }}
          className={`text-left bg-slate-900 border rounded-lg p-3.5 sm:p-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            statusFilter === 'ACTIVE_CASES'
              ? 'border-emerald-500/80 bg-emerald-950/40 shadow-xs'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-emerald-400 text-xs font-medium flex items-center justify-between gap-2">
            <span>ACTIVE IMPOUNDS</span>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-300 mt-1">
            {activeCasesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Confiscated and investigating</div>
        </button>
      </div>

      {/* Compact search, filters, and actions use the shared Operations layout. */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-0 flex-1 flex-wrap">
            <div className="relative w-full sm:w-52 md:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search confiscated drone reports"
                placeholder="Search SR, LR, model, serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline-flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                Status:
              </span>
              <div className="relative flex-1 sm:flex-none">
                <AppDropdown
                  aria-label="Filter reports by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 cursor-pointer appearance-none shadow-xs font-medium"
                >
                  <option value="ALL">All Reports ({totalReportsCount})</option>
                  <option value="ACTIVE_CASES">Active Impounds ({activeCasesCount})</option>
                  <option value="CONFISCATED">Confiscated</option>
                  <option value="ACTIVE">Active Investigation</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="LEGAL_REVIEW">Legal Review</option>
                  <option value="ARCHIVED">Archived</option>
                </AppDropdown>
              </div>
            </div>

            <div className="relative">
              <AppDropdown
                aria-label="Filter reports by entry type"
                value={multiEntryFilter}
                onChange={(e) => setMultiEntryFilter(e.target.value as typeof multiEntryFilter)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 cursor-pointer appearance-none shadow-xs font-medium"
              >
                <option value="ALL">All Entry Types</option>
                <option value="MULTI">Multiple Entries</option>
                <option value="SINGLE">Single Entry</option>
              </AppDropdown>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-end xl:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
            {confiscatedDrones.length > 0 && (
              <button
                type="button"
                onClick={() => setViewingReport(confiscatedDrones[0])}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="View sample official CDR form"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Sample CDR</span>
              </button>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setEditingReport(null);
                  setIsFormModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors shadow-md shadow-sky-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Confiscated Drone Report</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reports Table / Card List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium text-[11px]">
              <tr>
                <th className="py-2.5 px-3">SR Reference & LR No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Drone Model & SN</th>
                <th className="py-2.5 px-3">Sequential Flight Entries</th>
                <th className="py-2.5 px-3">Evaluated By</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const flightCount = report.flightRecords?.length || 1;
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* SR & LR */}
                      <td className="py-2.5 px-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{report.srNumber}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            LR #{report.lrNumber}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {report.date}
                      </td>

                      {/* Drone Equipment */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-100">
                          {report.droneModel}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 tracking-wider">
                          SN: {report.droneSN}
                        </div>
                        {report.remoteSN && report.remoteSN !== 'N/A' && (
                          <div className="text-[10px] font-mono text-slate-500">
                            RC: {report.remoteSN}
                          </div>
                        )}
                      </td>

                      {/* Flight Records */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">
                            {flightCount} Sortie{flightCount !== 1 ? 's' : ''}
                          </span>
                          {report.hasMultipleEntries ? (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                              Multi-Entry
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              Single
                            </span>
                          )}
                        </div>
                        {report.flightRecords?.[0]?.location && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{report.flightRecords[0].location}</span>
                          </div>
                        )}
                      </td>

                      {/* Evaluated By */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-200">
                          {report.receivedBy}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {report.evalDateTime}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            report.status === 'CONFISCATED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : report.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : report.status === 'UNDER_INVESTIGATION'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : report.status === 'LEGAL_REVIEW'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Official Form Sheet View */}
                          <button
                            type="button"
                            onClick={() => setViewingReport(report)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="View official Confiscated Drone Report (CDR form.png)"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                          </button>

                          {/* Print Shortcut */}
                          <button
                            type="button"
                            onClick={() => setViewingReport(report)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Print official form"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          {/* Edit Report */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReport(report);
                                setIsFormModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit report"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                            </button>
                          )}

                          {/* Delete Report */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setReportToDelete(report)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Delete report"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No Confiscated Drone Reports Found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm
                        ? 'Try clearing your search filters or status selection.'
                        : 'Create the first confiscated drone report using the button above.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Sheet Modal (CDR form.png layout) */}
      {viewingReport && (
        <ConfiscatedDroneOfficialSheet
          report={viewingReport}
          onClose={() => setViewingReport(null)}
          onEdit={(r) => {
            setViewingReport(null);
            setEditingReport(r);
            setIsFormModalOpen(true);
          }}
          isModal={true}
        />
      )}

      {/* Create / Edit Form Modal (with Multiple Entries toggle) */}
      {isFormModalOpen && (
        <ConfiscatedDroneFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingReport(null);
          }}
          onSave={(savedReport) => {
            onSaveReport(savedReport);
            setIsFormModalOpen(false);
            setEditingReport(null);
          }}
          editingReport={editingReport}
          currentUser={currentUser}
          existingCount={confiscatedDrones.length}
        />
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm">Delete Confiscated Drone Record?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove Confiscated Drone Report{' '}
              <strong className="text-rose-400 font-mono">{reportToDelete.srNumber}</strong> (LR #{reportToDelete.lrNumber})?
              All associated flight telemetry logs will be deleted.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteReport(reportToDelete.id);
                  setReportToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
