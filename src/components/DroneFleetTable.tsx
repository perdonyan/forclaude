import { AppDropdown } from './AppDropdown';
import React, { useState, useMemo } from 'react';
import { DroneItem, HandoverFormRecord, IncidentReportRecord } from '../types/drone';
import { DroneBarcode } from './DroneBarcode';
import { DroneQRCode } from './DroneQRCode';
import { getIssuedHandoverForDrone } from '../utils/handoverUtils';
import { 
  Search, 
  Download, 
  Trash2, 
  Edit3, 
  Radio, 
  Filter, 
  CheckCircle2, 
  Wrench, 
  HelpCircle, 
  XCircle,
  Plus,
  QrCode,
  Barcode,
  Printer,
  FileText,
  ExternalLink,
  UploadCloud,
  Lock,
  AlertOctagon,
  ChevronDown
} from 'lucide-react';

interface DroneFleetTableProps {
  drones: DroneItem[];
  departmentFilter?: 'SSOC' | 'SSD' | 'all';
  initialStatus?: string;
  handoverForms?: HandoverFormRecord[];
  incidentReports?: IncidentReportRecord[];
  onNavigateToHandover?: (formId: string) => void;
  onNavigateToIncident?: (reportId: string) => void;
  onAddDrone?: () => void;
  onOpenBatchUpload?: () => void;
  onEditDrone?: (drone: DroneItem) => void;
  onDeleteDrone?: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onExportCsv: (filteredData?: DroneItem[]) => void;
  onViewAssetTag: (drone: DroneItem) => void;
  onOpenBatchLabels: () => void;
  canEditDetails?: boolean;
  canDeleteDrone?: boolean;
  currentUser?: any;
}

export const DroneFleetTable: React.FC<DroneFleetTableProps> = ({
  drones,
  departmentFilter = 'all',
  initialStatus,
  handoverForms = [],
  incidentReports = [],
  onNavigateToHandover,
  onNavigateToIncident,
  onAddDrone,
  onOpenBatchUpload,
  onEditDrone,
  onDeleteDrone,
  onUpdateStatus,
  onExportCsv,
  onViewAssetTag,
  onOpenBatchLabels,
  canEditDetails,
  canDeleteDrone,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<'all' | 'SSOC' | 'SSD'>(departmentFilter);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus || 'all');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [showInlineCodes, setShowInlineCodes] = useState(false);

  // Sync if prop changes
  React.useEffect(() => {
    setSelectedDept(departmentFilter);
  }, [departmentFilter]);

  React.useEffect(() => {
    if (initialStatus !== undefined) {
      if (initialStatus === 'NO_RC' || initialStatus === 'RC_AUDIT') {
        setSelectedStatus('all');
      } else {
        setSelectedStatus(initialStatus);
      }
    }
  }, [initialStatus]);

  // Unique models list
  const uniqueModels = useMemo(() => {
    const set = new Set<string>();
    drones.forEach((d) => set.add(d.model));
    return Array.from(set).sort();
  }, [drones]);

  // Filtered drones
  const filteredDrones = useMemo(() => {
    return drones.filter((d) => {
      // Dept filter
      if (selectedDept !== 'all' && d.department !== selectedDept) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'ISSUED_HANDOVER') {
        const isIssued = !!getIssuedHandoverForDrone(d, handoverForms);
        if (!isIssued) return false;
      } else if (selectedStatus !== 'all' && d.status !== selectedStatus) {
        return false;
      }

      // Model filter
      if (selectedModel !== 'all' && d.model !== selectedModel) {
        return false;
      }

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          d.model.toLowerCase().includes(term) ||
          d.droneName.toLowerCase().includes(term) ||
          d.droneSN.toLowerCase().includes(term) ||
          d.remoteSN.toLowerCase().includes(term) ||
          d.email.toLowerCase().includes(term) ||
          d.department.toLowerCase().includes(term) ||
          d.status.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [drones, selectedDept, selectedStatus, selectedModel, searchTerm]);

  // Status Counts
  const counts = useMemo(() => {
    const subset = selectedDept === 'all' ? drones : drones.filter((d) => d.department === selectedDept);
    return {
      total: subset.length,
      active: subset.filter((d) => d.status === 'ACTIVE').length,
      crashed: subset.filter((d) => d.status === 'CRASHED').length,
      repair: subset.filter((d) => d.status === 'UNDER REPAIR').length,
      missing: subset.filter((d) => d.status === 'MISSING').length,
      issuedHandover: subset.filter((d) => !!getIssuedHandoverForDrone(d, handoverForms)).length,
    };
  }, [drones, selectedDept, handoverForms]);

  // Filtered Assets Status Breakdown for Active Filters Bar
  const filteredStatusCounts = useMemo(() => {
    const map: Record<string, number> = {
      ACTIVE: 0,
      'UNDER REPAIR': 0,
      CRASHED: 0,
      MISSING: 0,
    };
    let issuedCount = 0;
    filteredDrones.forEach((d) => {
      if (getIssuedHandoverForDrone(d, handoverForms)) {
        issuedCount++;
      }
      if (map[d.status] !== undefined) {
        map[d.status]++;
      } else {
        map[d.status] = (map[d.status] || 0) + 1;
      }
    });

    const otherStatuses = Object.entries(map).filter(
      ([key]) => !['ACTIVE', 'UNDER REPAIR', 'CRASHED', 'MISSING'].includes(key)
    );

    return {
      total: filteredDrones.length,
      active: map['ACTIVE'] || 0,
      repair: map['UNDER REPAIR'] || 0,
      crashed: map['CRASHED'] || 0,
      missing: map['MISSING'] || 0,
      issued: issuedCount,
      otherStatuses,
    };
  }, [filteredDrones, handoverForms]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>ACTIVE</span>
          </span>
        );
      case 'CRASHED':
        return (
          <span className="flex items-center gap-1.5 font-medium text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>CRASHED</span>
          </span>
        );
      case 'UNDER REPAIR':
        return (
          <span className="flex items-center gap-1.5 font-medium text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>UNDER REPAIR</span>
          </span>
        );
      case 'MISSING':
        return (
          <span className="flex items-center gap-1.5 font-medium text-missing-400">
            <span className="w-1.5 h-1.5 rounded-full bg-missing-400" />
            <span>MISSING</span>
          </span>
        );
      case 'NO RC':
        return (
          <span className="flex items-center gap-1.5 font-medium text-orange-400">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>NO RC</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Tally Cards - Uniform Slate Styling */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          onClick={() => setSelectedStatus('all')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            selectedStatus === 'all' ? 'border-sky-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-slate-400 text-xs font-medium">TOTAL DRONES</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {counts.total}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {selectedDept === 'all' ? 'All Departments' : selectedDept}
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatus('ISSUED_HANDOVER')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            selectedStatus === 'ISSUED_HANDOVER' ? 'border-emerald-500/80 bg-emerald-950/40' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-emerald-400 text-xs font-medium flex items-center justify-between">
            <span>ISSUED (HANDOVER)</span>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {counts.issuedHandover}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active custody</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('ACTIVE')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            selectedStatus === 'ACTIVE' ? 'border-emerald-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-emerald-400 text-xs font-medium flex items-center justify-between">
            <span>ACTIVE</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {counts.active}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {counts.total > 0 ? Math.round((counts.active / counts.total) * 100) : 0}% operational
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatus('UNDER REPAIR')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            selectedStatus === 'UNDER REPAIR' ? 'border-amber-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-amber-400 text-xs font-medium flex items-center justify-between">
            <span>UNDER REPAIR</span>
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1">
            {counts.repair}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">In maintenance</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('CRASHED')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            selectedStatus === 'CRASHED' ? 'border-rose-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-rose-400 text-xs font-medium flex items-center justify-between">
            <span>CRASHED</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-400 mt-1">
            {counts.crashed}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Airframe loss</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('MISSING')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            selectedStatus === 'MISSING' ? 'border-missing-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-missing-400 text-xs font-medium flex items-center justify-between">
            <span>MISSING</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-missing-400 mt-1">
            {counts.missing}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Unrecovered</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div
        style={{ height: '65.0694px', borderRadius: '8px' }}
        className="bg-slate-900 border border-slate-800 rounded-lg px-3 flex items-center justify-between gap-2 overflow-x-auto"
      >
        {/* Left: Search, Filters & View Toggles */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-36 sm:w-44 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fleet..."
              className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Department Filter Dropdown */}
          <div className="relative shrink-0">
            <AppDropdown
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value as 'all' | 'SSOC' | 'SSD')}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-md pl-2.5 pr-6 py-1.5 focus:outline-none focus:border-sky-500 appearance-none cursor-pointer font-medium"
            >
              <option value="all">All Depts ({drones.length})</option>
              <option value="SSOC">SSOC ({drones.filter((d) => d.department === 'SSOC').length})</option>
              <option value="SSD">SSD ({drones.filter((d) => d.department === 'SSD').length})</option>
            </AppDropdown>
          </div>

          {/* Model Filter Dropdown */}
          <div className="relative shrink-0">
            <AppDropdown
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-md pl-2.5 pr-6 py-1.5 focus:outline-none focus:border-sky-500 max-w-[130px] appearance-none cursor-pointer font-medium"
            >
              <option value="all">All Models</option>
              {uniqueModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </AppDropdown>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative shrink-0">
            <AppDropdown
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-md pl-2.5 pr-6 py-1.5 focus:outline-none focus:border-sky-500 appearance-none cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="UNDER REPAIR">UNDER REPAIR</option>
              <option value="CRASHED">CRASHED</option>
              <option value="MISSING">MISSING</option>
            </AppDropdown>
          </div>

          {/* Toggle Inline Codes */}
          <button
            onClick={() => setShowInlineCodes(!showInlineCodes)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showInlineCodes
                ? 'bg-sky-950/80 text-sky-400 border-sky-800'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
            }`}
            title="Toggle inline barcode and QR code previews in table rows"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-400" />
            <span>{showInlineCodes ? 'Hide Codes' : 'Show Codes'}</span>
          </button>

          {/* Batch Print Labels */}
          <button
            onClick={onOpenBatchLabels}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Print barcode and QR asset label sheets for drones"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Batch Labels</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={() => onExportCsv(filteredDrones)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>
        </div>

        {/* Right: Action Group (Batch Upload and Add Drone) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Batch Upload Drones */}
          {onOpenBatchUpload && (
            <button
              onClick={onOpenBatchUpload}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-sky-300 bg-sky-950/80 hover:bg-sky-900 border border-sky-800 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              title="Batch upload multiple new drones from CSV or Excel file"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Batch Upload</span>
            </button>
          )}

          {/* Add Drone (Single Upload) */}
          {onAddDrone ? (
            <button
              onClick={onAddDrone}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-xs w-44 h-9 justify-center shrink-0 whitespace-nowrap"
              title="Add a single new drone record to drones inventory"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>Add Drone (Single)</span>
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-900 border border-slate-800 rounded-md transition-colors whitespace-nowrap cursor-not-allowed opacity-60 w-44 h-9 justify-center shrink-0 whitespace-nowrap"
              title="Add Drone requires group permission (INVENTORY: Add Drone)"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Drone (Single)</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Indicators with Filtered Quantity Breakdown */}
      {(selectedStatus !== 'all' || selectedModel !== 'all' || searchTerm.trim() !== '' || selectedDept !== 'all') && (
        <div
          style={{ height: '50px', borderRadius: '8px' }}
          className="bg-slate-900 border border-slate-800 rounded-lg h-[50px] px-3 flex items-center justify-between text-xs text-slate-400 gap-3 overflow-x-auto shadow-xs"
        >
          <div className="flex items-center gap-2.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-medium text-slate-300 shrink-0">Active filters:</span>
            {selectedDept !== 'all' && (
              <span className="font-mono text-sky-300 bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded text-[11px] shrink-0">
                Dept: <span className="font-bold">{selectedDept}</span>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="font-mono text-sky-300 bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded text-[11px] shrink-0">
                Status: <span className="font-bold">{selectedStatus}</span>
              </span>
            )}
            {selectedModel !== 'all' && (
              <span className="font-mono text-sky-300 bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded text-[11px] shrink-0">
                Model: <span className="font-bold">{selectedModel}</span>
              </span>
            )}
            {searchTerm.trim() !== '' && (
              <span className="font-mono text-slate-200 bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded text-[11px] shrink-0">
                "{searchTerm}"
              </span>
            )}

            {/* Separator */}
            <span className="text-slate-700 shrink-0 font-light">|</span>

            {/* Quantity of Selected Filter - Separated per Status */}
            <div className="flex items-center gap-2 shrink-0 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-xs">
              <span className="text-slate-400 font-medium">Quantity:</span>
              <span className="font-mono font-bold text-sky-300 bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 rounded text-[11px]">
                {filteredStatusCounts.total}
              </span>
              <span className="text-slate-700">•</span>
              
              <div className="flex items-center gap-2 font-medium">
                <span className="flex items-center gap-1 text-emerald-400" title="Active operational drones">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Active:</span>
                  <span className="font-mono font-bold text-emerald-300">{filteredStatusCounts.active}</span>
                </span>

                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1 text-amber-400" title="Drones under repair or maintenance">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Under Repair:</span>
                  <span className="font-mono font-bold text-amber-300">{filteredStatusCounts.repair}</span>
                </span>

                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1 text-rose-400" title="Crashed drones">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>Crashed:</span>
                  <span className="font-mono font-bold text-rose-300">{filteredStatusCounts.crashed}</span>
                </span>

                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1 text-purple-400" title="Missing or lost drones">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Missing:</span>
                  <span className="font-mono font-bold text-purple-300">{filteredStatusCounts.missing}</span>
                </span>

                {filteredStatusCounts.issued > 0 && (
                  <>
                    <span className="text-slate-700">•</span>
                    <span className="flex items-center gap-1 text-purple-300" title="Drones currently issued out via handover sheet">
                      <FileText className="w-3 h-3 text-purple-400" />
                      <span>Issued:</span>
                      <span className="font-mono font-bold text-purple-200">{filteredStatusCounts.issued}</span>
                    </span>
                  </>
                )}

                {filteredStatusCounts.otherStatuses.map(([st, count]) => (
                  <React.Fragment key={st}>
                    <span className="text-slate-700">•</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>{st}:</span>
                      <span className="font-mono font-bold text-slate-200">{count}</span>
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedStatus('all');
              setSelectedModel('all');
              setSearchTerm('');
              setSelectedDept('all');
            }}
            className="text-slate-400 hover:text-slate-200 underline text-xs cursor-pointer shrink-0 ml-2"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Main Table: Exact Excel Schema */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Drone Name</th>
                <th className="py-2.5 px-3">Drone SN</th>
                <th className="py-2.5 px-3">Remote SN</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDrones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-300">No matching drones found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try clearing filters or search term to see the 118 drone inventory.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDrones.map((drone) => {
                  const isMissingRc = !drone.remoteSN || drone.remoteSN.toLowerCase().includes('missing');
                  const issuedHandover = handoverForms ? getIssuedHandoverForDrone(drone, handoverForms) : null;
                  const linkedIncident = incidentReports.find(
                    (r) => r.droneId === drone.id || r.droneName === drone.droneName || r.aircraftSN === drone.droneSN
                  );

                  return (
                    <tr
                      key={drone.id}
                      className={`hover:bg-slate-800/40 transition-colors group ${
                        issuedHandover ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* Model */}
                      <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Radio className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>{drone.model}</span>
                        </div>
                      </td>

                      {/* Drone Name */}
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{drone.droneName}</span>
                        </div>
                        {issuedHandover && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => onNavigateToHandover?.(issuedHandover.form.id)}
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-sans font-medium underline underline-offset-2 cursor-pointer"
                              title="View Handover Document"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              <span>Doc: {issuedHandover.form.srNumber}</span>
                            </button>
                          </div>
                        )}
                        {linkedIncident && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => onNavigateToIncident?.(linkedIncident.id || linkedIncident.srReference)}
                              className="inline-flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-sans font-medium underline underline-offset-2 cursor-pointer"
                              title={`View Incident Report: ${linkedIncident.srReference}`}
                            >
                              <AlertOctagon className="w-2.5 h-2.5 text-rose-400" />
                              <span>Report: {linkedIncident.srReference}</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Drone SN with Barcode & QR Code trigger */}
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200 font-medium">{drone.droneSN}</span>
                            <button
                              type="button"
                              onClick={() => onViewAssetTag(drone)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium text-sky-400 bg-sky-950/70 border border-sky-800/60 hover:bg-sky-900/80 transition-colors"
                              title="View full scannable barcode and QR code asset tag"
                            >
                              <QrCode className="w-2.5 h-2.5" />
                              <span>Tag</span>
                            </button>
                          </div>

                          {/* Inline preview when toggled */}
                          {showInlineCodes && (
                            <div className="flex items-center gap-3 pt-1 border-t border-slate-800/60">
                              <div className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                                <DroneBarcode
                                  value={drone.droneSN}
                                  width={0.9}
                                  height={24}
                                  fontSize={8}
                                  displayValue={false}
                                  lineColor="#f1f5f9"
                                />
                              </div>
                              <div className="bg-slate-950 p-0.5 rounded border border-slate-800">
                                <DroneQRCode
                                  value={drone.droneSN}
                                  size={32}
                                  darkColor={getComputedStyle(document.documentElement).getPropertyValue('--app-accent-400').trim()}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Remote SN */}
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                        {drone.remoteSN ? (
                          <span className={isMissingRc ? 'text-orange-400 font-semibold' : 'text-slate-300'}>
                            {drone.remoteSN}
                          </span>
                        ) : (
                          <span className="text-orange-400 italic">No Remote SN</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        <span className="max-w-[180px] truncate block" title={drone.email}>
                          {drone.email}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-mono font-semibold text-xs ${
                          drone.department === 'SSOC' ? 'text-sky-400' : 'text-indigo-400'
                        }`}>
                          {drone.department}
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          {issuedHandover ? (
                            <div className="flex flex-col gap-1 items-start">
                              <button
                                type="button"
                                onClick={() => onNavigateToHandover?.(issuedHandover.form.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 hover:bg-emerald-900/90 hover:border-emerald-500 transition-colors cursor-pointer shadow-sm group/btn"
                                title={`Issued via Handover Sheet ${issuedHandover.form.srNumber} to ${issuedHandover.form.recipientName}. Click to open document.`}
                              >
                                <FileText className="w-3 h-3 text-emerald-400 group-hover/btn:scale-110 transition-transform" />
                                <span>ISSUED · {issuedHandover.form.srNumber}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-emerald-400/80" />
                              </button>
                              <span className="text-[10px] text-slate-400 font-sans">
                                To: <strong className="text-slate-300 font-medium">{issuedHandover.form.recipientName}</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AppDropdown
                                value={drone.status}
                                disabled={drone.status === 'CRASHED'}
                                title={drone.status === 'CRASHED' ? 'CRASHED is permanent for all users, including administrators.' : undefined}
                                onChange={(e) => onUpdateStatus(drone.id, e.target.value)}
                                className={`border rounded px-2 py-1 text-xs font-semibold focus:outline-none transition-colors cursor-pointer ${
                                  drone.status === 'CRASHED'
                                    ? 'bg-rose-950/90 border-rose-600 text-rose-300 ring-1 ring-rose-500/30'
                                    : drone.status === 'MISSING'
                                    ? 'bg-missing-950/90 border-missing-600 text-missing-300 ring-1 ring-missing-500/30'
                                    : drone.status === 'ACTIVE'
                                    ? 'bg-emerald-950/90 border-emerald-700 text-emerald-300 focus:border-emerald-500'
                                    : drone.status === 'UNDER REPAIR'
                                    ? 'bg-amber-950/90 border-amber-700 text-amber-300 focus:border-amber-500'
                                    : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-sky-500'
                                }`}
                              >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="UNDER REPAIR">UNDER REPAIR</option>
                                <option value="CRASHED">⚠️ CRASHED (Accident)</option>
                                <option value="MISSING">❓ MISSING (Lost)</option>
                              </AppDropdown>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          {issuedHandover && (
                            <button
                              type="button"
                              onClick={() => onNavigateToHandover?.(issuedHandover.form.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded transition-colors cursor-pointer"
                              title={`Open Handover Document ${issuedHandover.form.srNumber}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onViewAssetTag(drone)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                            title="View Barcode & QR Code Tag"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          {onEditDrone ? (
                            <button
                              onClick={() => onEditDrone(drone)}
                              className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Edit details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1 text-slate-600 rounded cursor-not-allowed opacity-30"
                              title="Edit details requires group permission (INVENTORY: Edit details)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteDrone ? (
                            <button
                              onClick={() => onDeleteDrone(drone.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Delete drone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1 text-slate-600 rounded cursor-not-allowed opacity-30"
                              title="Delete Drone requires group permission (INVENTORY: Delete Drone)"
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

        {/* Table Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">Columns:</span>
            <span>Model · Drone Name · Drone SN · Remote SN · Email · Department · Status</span>
          </div>
          <div>
            Showing <strong className="font-mono text-slate-200">{filteredDrones.length}</strong> of{' '}
            <strong className="font-mono text-slate-200">{drones.length}</strong> total drones
          </div>
        </div>
      </div>
    </div>
  );
};

