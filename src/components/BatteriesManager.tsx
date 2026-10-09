import { AppDropdown } from './AppDropdown';
import React, { useState } from 'react';
import { BatteryItem, HandoverFormRecord } from '../types/drone';
import { getIssuedHandoverForBattery } from '../utils/handoverUtils';
import { 
  Battery, 
  BatteryCharging, 
  Search, 
  Plus, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Clock, 
  Shield, 
  Building2, 
  Edit3, 
  Trash2, 
  X, 
  Cpu,
  FileText,
  ExternalLink,
  Scan,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface BatteriesManagerProps {
  batteries: BatteryItem[];
  handoverForms?: HandoverFormRecord[];
  onNavigateToHandover?: (formId: string) => void;
  onAddBattery: (battery: BatteryItem) => void;
  onEditBattery: (battery: BatteryItem) => void;
  canDelete?: boolean;
  onDeleteBattery: (id: string) => void;
}

export const BatteriesManager: React.FC<BatteriesManagerProps> = ({
  batteries,
  handoverForms = [],
  onNavigateToHandover,
  onAddBattery,
  onEditBattery,
  canDelete = false,
  onDeleteBattery,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<'all' | 'SSOC' | 'SSD'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBattery, setEditingBattery] = useState<BatteryItem | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [batteryModel, setBatteryModel] = useState('TB65 Intelligent Flight Battery');
  const [compatibleDrone, setCompatibleDrone] = useState('M350RTK');
  const [department, setDepartment] = useState<'SSOC' | 'SSD'>('SSOC');
  const [cycleCount, setCycleCount] = useState<number>(10);
  const [healthPercent, setHealthPercent] = useState<number>(98);
  const [status, setStatus] = useState<BatteryItem['status']>('READY');
  const [location, setLocation] = useState('Charging Rack Bay A');
  const [notes, setNotes] = useState('');

  const filteredBatteries = batteries.filter((b) => {
    if (statusFilter === 'ISSUED_HANDOVER') {
      const isIssued = !!getIssuedHandoverForBattery(b, handoverForms);
      if (!isIssued) return false;
    } else if (statusFilter !== 'all' && b.status !== statusFilter) {
      return false;
    }
    if (deptFilter !== 'all' && b.department !== deptFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        b.serialNumber.toLowerCase().includes(term) ||
        b.batteryModel.toLowerCase().includes(term) ||
        b.compatibleDrone.toLowerCase().includes(term) ||
        (b.location && b.location.toLowerCase().includes(term)) ||
        (b.notes && b.notes.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingBattery(null);
    setSerialNumber('');
    setBatteryModel('TB65 Intelligent Flight Battery');
    setCompatibleDrone('M350RTK');
    setDepartment('SSOC');
    setCycleCount(1);
    setHealthPercent(100);
    setStatus('READY');
    setLocation('Charging Station Bay');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: BatteryItem) => {
    setEditingBattery(b);
    setSerialNumber(b.serialNumber);
    setBatteryModel(b.batteryModel);
    setCompatibleDrone(b.compatibleDrone);
    setDepartment(b.department === 'SSD' ? 'SSD' : 'SSOC');
    setCycleCount(b.cycleCount);
    setHealthPercent(b.healthPercent);
    setStatus(b.status);
    setLocation(b.location || '');
    setNotes(b.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: BatteryItem = {
      id: editingBattery ? editingBattery.id : `bat-${Date.now()}`,
      serialNumber: serialNumber.trim(),
      batteryModel: batteryModel.trim(),
      compatibleDrone: compatibleDrone.trim(),
      department,
      cycleCount: Number(cycleCount),
      healthPercent: Number(healthPercent),
      status,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingBattery) {
      onEditBattery(payload);
    } else {
      onAddBattery(payload);
    }
    setIsModalOpen(false);
  };

  const handleExportCsv = () => {
    const header = 'SERIAL NUMBER,BATTERY MODEL,COMPATIBLE DRONE,DEPARTMENT,CYCLE COUNT,HEALTH %,STATUS,LOCATION,NOTES';
    const rows = filteredBatteries.map(
      (b) => `"${b.serialNumber}","${b.batteryModel}","${b.compatibleDrone}","${b.department}",${b.cycleCount},${b.healthPercent}%,"${b.status}","${b.location || ''}","${b.notes || ''}"`
    );
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fleet_batteries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (bStatus: BatteryItem['status']) => {
    switch (bStatus) {
      case 'READY':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>READY</span>
          </span>
        );
      case 'IN_USE':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>IN USE</span>
          </span>
        );
      case 'CHARGING':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
            <BatteryCharging className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>CHARGING</span>
          </span>
        );
      case 'DEPLETED':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span>DEPLETED</span>
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-rose-400" />
            <span>MAINTENANCE</span>
          </span>
        );
      case 'CRASHED':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 flex items-center gap-1 ring-1 ring-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>CRASHED</span>
          </span>
        );
      case 'MISSING':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-missing-950 text-missing-300 border border-missing-600 flex items-center gap-1 ring-1 ring-missing-500/30">
            <AlertTriangle className="w-3 h-3 text-missing-400" />
            <span>MISSING</span>
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {bStatus}
          </span>
        );
    }
  };

  const readyCount = batteries.filter((b) => b.status === 'READY').length;
  const inUseCount = batteries.filter((b) => b.status === 'IN_USE').length;
  const chargingCount = batteries.filter((b) => b.status === 'CHARGING').length;
  const maintCount = batteries.filter((b) => b.status === 'MAINTENANCE').length;
  const issuedHandoverCount = batteries.filter((b) => !!getIssuedHandoverForBattery(b, handoverForms)).length;

  return (
    <div className="space-y-4">
      {/* KPI Tally Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'all' ? 'border-sky-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">TOTAL BATTERIES</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{batteries.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Fleet battery packs</div>
        </div>

        <div 
          onClick={() => setStatusFilter('ISSUED_HANDOVER')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'ISSUED_HANDOVER' ? 'border-emerald-500/80 bg-emerald-950/40' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-emerald-400 font-medium flex items-center justify-between">
            <span>ISSUED (HANDOVER)</span>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{issuedHandoverCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active custody</div>
        </div>

        <div 
          onClick={() => setStatusFilter('READY')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'READY' ? 'border-emerald-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-emerald-400 font-medium flex items-center justify-between">
            <span>READY FOR FLIGHT</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{readyCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Charged & verified</div>
        </div>

        <div 
          onClick={() => setStatusFilter('IN_USE')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'IN_USE' ? 'border-sky-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-sky-400 font-medium flex items-center justify-between">
            <span>IN USE (SORTIE)</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">{inUseCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mounted on aircraft</div>
        </div>

        <div 
          onClick={() => setStatusFilter('CHARGING')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'CHARGING' ? 'border-amber-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-amber-400 font-medium flex items-center justify-between">
            <span>CHARGING</span>
            <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{chargingCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">In dock station</div>
        </div>

        <div 
          onClick={() => setStatusFilter('MAINTENANCE')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'MAINTENANCE' ? 'border-rose-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-rose-400 font-medium flex items-center justify-between">
            <span>MAINTENANCE</span>
            <Wrench className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{maintCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cycle threshold</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-52 md:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search serial, model..."
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <AppDropdown
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Statuses ({batteries.length})</option>
              <option value="ISSUED_HANDOVER">Issued (Handover) ({issuedHandoverCount})</option>
              <option value="READY">Ready</option>
              <option value="IN_USE">In Use</option>
              <option value="CHARGING">Charging</option>
              <option value="DEPLETED">Depleted</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="CRASHED">⚠️ Crashed (Accident)</option>
              <option value="MISSING">❓ Missing (Lost)</option>
            </AppDropdown>

            <AppDropdown
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Departments</option>
              <option value="SSOC">SSOC ({batteries.filter((b) => b.department === 'SSOC').length})</option>
              <option value="SSD">SSD ({batteries.filter((b) => b.department === 'SSD').length})</option>
            </AppDropdown>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors shrink-0 cursor-pointer"
              title="Export batteries to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors shrink-0 cursor-pointer shadow-xs w-44 h-9 justify-center shrink-0 whitespace-nowrap"
              title="Add a new flight battery"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>Add Battery</span>
            </button>
          </div>
        </div>
      </div>

      {/* Batteries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label="Scrollable inventory table">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">SERIAL NUMBER</th>
                <th className="py-2.5 px-3">BATTERY MODEL</th>
                <th className="py-2.5 px-3">DRONE PLATFORM</th>
                <th className="py-2.5 px-3">DEPT</th>
                <th className="py-2.5 px-3">CYCLES</th>
                <th className="py-2.5 px-3">HEALTH %</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-center w-20">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredBatteries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No batteries match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBatteries.map((b) => {
                  const issuedHandover = handoverForms ? getIssuedHandoverForBattery(b, handoverForms) : null;

                  return (
                    <tr 
                      key={b.id} 
                      className={`hover:bg-slate-800/40 transition-colors group ${
                        issuedHandover ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-sky-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{b.serialNumber}</span>
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
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200 whitespace-nowrap">
                        {b.batteryModel}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {b.compatibleDrone}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-mono font-semibold text-xs ${
                          b.department === 'SSOC' ? 'text-sky-400' : 'text-indigo-400'
                        }`}>
                          {b.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {b.cycleCount} cycles
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${
                            b.healthPercent >= 90
                              ? 'text-emerald-400'
                              : b.healthPercent >= 75
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}>
                            {b.healthPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
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
                              value={b.status}
                                disabled={b.status === 'CRASHED'}
                                title={b.status === 'CRASHED' ? 'CRASHED is permanent for all users, including administrators.' : undefined}
                              onChange={(e) => onEditBattery({ ...b, status: e.target.value as any })}
                              className={`border rounded px-2 py-1 text-xs font-semibold focus:outline-none transition-colors cursor-pointer ${
                                b.status === 'CRASHED'
                                  ? 'bg-rose-950/90 border-rose-600 text-rose-300 ring-1 ring-rose-500/30'
                                  : b.status === 'MISSING'
                                  ? 'bg-missing-950/90 border-missing-600 text-missing-300 ring-1 ring-missing-500/30'
                                  : b.status === 'READY'
                                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                                  : b.status === 'IN_USE'
                                  ? 'bg-sky-950/80 border-sky-700 text-sky-300'
                                  : b.status === 'CHARGING'
                                  ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                                  : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-sky-500'
                              }`}
                            >
                              <option value="READY">READY</option>
                              <option value="IN_USE">IN USE</option>
                              <option value="CHARGING">CHARGING</option>
                              <option value="DEPLETED">DEPLETED</option>
                              <option value="MAINTENANCE">MAINTENANCE</option>
                              <option value="CRASHED">⚠️ CRASHED (Accident)</option>
                              <option value="MISSING">❓ MISSING (Lost)</option>
                            </AppDropdown>
                          </div>
                        )}
                      </td>
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
                            onClick={() => handleOpenEdit(b)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                            title="Edit battery"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={!canDelete}
                            aria-label="Delete battery"
                            onClick={() => { if(canDelete) onDeleteBattery(b.id); }}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={canDelete ? "Delete battery" : "Delete battery permission required"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add / Edit Battery Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Battery className="w-4 h-4 text-sky-400" />
                <span>{editingBattery ? 'Edit Flight Battery' : 'Add New Battery'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">
                    Battery Serial Number *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono cursor-pointer"
                    title="Scan barcode with camera"
                  >
                    <Scan className="w-3 h-3" />
                    <span>Scan Barcode</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1581F6GKB2401"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md pl-3 pr-8 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 cursor-pointer"
                    title="Scan barcode with camera"
                  >
                    <Scan className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Battery Model
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TB65, TB60, TB30"
                    value={batteryModel}
                    onChange={(e) => setBatteryModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Compatible Drone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M350RTK, M30"
                    value={compatibleDrone}
                    onChange={(e) => setCompatibleDrone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Department
                  </label>
                  <AppDropdown
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="SSOC">SSOC</option>
                    <option value="SSD">SSD</option>
                  </AppDropdown>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Operational Status
                  </label>
                  <AppDropdown
                    value={status}
                    disabled={batteries.find(item => item.id === editingBattery?.id)?.status === 'CRASHED'}
                    title={batteries.find(item => item.id === editingBattery?.id)?.status === 'CRASHED' ? 'CRASHED is permanent for all users, including administrators.' : undefined}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="READY">READY</option>
                    <option value="IN_USE">IN USE</option>
                    <option value="CHARGING">CHARGING</option>
                    <option value="DEPLETED">DEPLETED</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="CRASHED">CRASHED (Accident Damage)</option>
                    <option value="MISSING">MISSING (Lost in Sector)</option>
                  </AppDropdown>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Cycle Count ({cycleCount})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cycleCount}
                    onChange={(e) => setCycleCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Health Capacity ({healthPercent}%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={healthPercent}
                    onChange={(e) => setHealthPercent(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Storage / Charging Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Charging Rack Bay 1, Case 04"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Audit Notes / Diagnostics
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes on pairing, cell impedance..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded transition-colors"
                >
                  {editingBattery ? 'Save Changes' : 'Add Battery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal using Device Camera */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={(code) => setSerialNumber(code)}
        title="Scan Battery Serial Number Barcode"
        subtitle="Point camera at the barcode or QR code on the battery casing"
      />
    </div>
  );
};

