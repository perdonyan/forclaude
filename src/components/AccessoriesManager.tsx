import { AppDropdown } from './AppDropdown';
import React, { useState } from 'react';
import { AccessoryItem, HandoverFormRecord } from '../types/drone';
import { getIssuedHandoverForAccessory } from '../utils/handoverUtils';
import { 
  Package, 
  Search, 
  Plus, 
  Download, 
  CheckCircle2, 
  Wrench, 
  Radio, 
  Edit3, 
  Trash2, 
  X, 
  Camera, 
  Disc, 
  Sparkles, 
  ShieldCheck, 
  Layers,
  FileText,
  ExternalLink,
  AlertTriangle,
  Scan,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface AccessoriesManagerProps {
  accessories: AccessoryItem[];
  handoverForms?: HandoverFormRecord[];
  onNavigateToHandover?: (formId: string) => void;
  onAddAccessory: (acc: AccessoryItem) => void;
  onEditAccessory: (acc: AccessoryItem) => void;
  canDelete?: boolean;
  onDeleteAccessory: (id: string) => void;
}

export const AccessoriesManager: React.FC<AccessoriesManagerProps> = ({
  accessories,
  handoverForms = [],
  onNavigateToHandover,
  onAddAccessory,
  onEditAccessory,
  canDelete = false,
  onDeleteAccessory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<'all' | 'SSOC' | 'SSD'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<AccessoryItem | null>(null);
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [category, setCategory] = useState<AccessoryItem['category']>('PAYLOAD_CAMERA');
  const [compatibleDrone, setCompatibleDrone] = useState('M300 / M350RTK');
  const [department, setDepartment] = useState<'SSOC' | 'SSD'>('SSOC');
  const [condition, setCondition] = useState<AccessoryItem['condition']>('EXCELLENT');
  const [status, setStatus] = useState<AccessoryItem['status']>('AVAILABLE');
  const [location, setLocation] = useState('Payload Locker 1');
  const [notes, setNotes] = useState('');

  const filteredAccessories = accessories.filter((a) => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (statusFilter === 'ISSUED_HANDOVER') {
      const isIssued = !!getIssuedHandoverForAccessory(a, handoverForms);
      if (!isIssued) return false;
    } else if (statusFilter !== 'all' && a.status !== statusFilter) {
      return false;
    }
    if (deptFilter !== 'all' && a.department !== deptFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        a.name.toLowerCase().includes(term) ||
        a.serialNumber.toLowerCase().includes(term) ||
        a.compatibleDrone.toLowerCase().includes(term) ||
        (a.location && a.location.toLowerCase().includes(term)) ||
        (a.notes && a.notes.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const issuedHandoverCount = accessories.filter((a) => !!getIssuedHandoverForAccessory(a, handoverForms)).length;

  const handleOpenAdd = () => {
    setEditingAccessory(null);
    setName('');
    setSerialNumber('');
    setCategory('PAYLOAD_CAMERA');
    setCompatibleDrone('M300 / M350RTK');
    setDepartment('SSOC');
    setCondition('EXCELLENT');
    setStatus('AVAILABLE');
    setLocation('Payload Locker');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: AccessoryItem) => {
    setEditingAccessory(acc);
    setName(acc.name);
    setSerialNumber(acc.serialNumber);
    setCategory(acc.category);
    setCompatibleDrone(acc.compatibleDrone);
    setDepartment(acc.department === 'SSD' ? 'SSD' : 'SSOC');
    setCondition(acc.condition);
    setStatus(acc.status);
    setLocation(acc.location || '');
    setNotes(acc.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AccessoryItem = {
      id: editingAccessory ? editingAccessory.id : `acc-${Date.now()}`,
      name: name.trim(),
      serialNumber: serialNumber.trim(),
      category,
      compatibleDrone: compatibleDrone.trim(),
      department,
      condition,
      status,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingAccessory) {
      onEditAccessory(payload);
    } else {
      onAddAccessory(payload);
    }
    setIsModalOpen(false);
  };

  const handleExportCsv = () => {
    const header = 'ACCESSORY NAME,SERIAL NUMBER,CATEGORY,COMPATIBLE DRONE,DEPARTMENT,CONDITION,STATUS,LOCATION,NOTES';
    const rows = filteredAccessories.map(
      (a) => `"${a.name}","${a.serialNumber}","${a.category}","${a.compatibleDrone}","${a.department}","${a.condition}","${a.status}","${a.location || ''}","${a.notes || ''}"`
    );
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fleet_accessories_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryLabel = (cat: AccessoryItem['category']) => {
    switch (cat) {
      case 'PAYLOAD_CAMERA':
        return 'Camera & Sensor';
      case 'REMOTE_CONTROLLER':
        return 'Remote Controller';
      case 'GNSS_RTK':
        return 'RTK Base Station';
      case 'SEARCHLIGHT_SPEAKER':
        return 'Searchlight & Speaker';
      case 'CHARGER_DOCK':
        return 'Charging Station';
      case 'SAFETY_PROP':
        return 'Propeller & Safety';
      default:
        return 'Tactical Gear';
    }
  };

  const getStatusBadge = (aStatus: AccessoryItem['status']) => {
    switch (aStatus) {
      case 'AVAILABLE':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>AVAILABLE</span>
          </span>
        );
      case 'DEPLOYED':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>DEPLOYED</span>
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-amber-400" />
            <span>SERVICE</span>
          </span>
        );
      case 'STORAGE':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            STORAGE
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
            {aStatus}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'all' ? 'border-sky-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">TOTAL HARDWARE</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{accessories.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tracked units</div>
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
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {issuedHandoverCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active custody</div>
        </div>
        {/* AVAILABLE */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? 'all' : 'AVAILABLE')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'AVAILABLE' ? 'border-emerald-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view available accessories"
        >
          <div className="text-xs text-emerald-400 font-medium flex items-center justify-between">
            <span>AVAILABLE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {accessories.filter((a) => a.status === 'AVAILABLE').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ready for deployment</div>
        </div>

        {/* DEPLOYED */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'DEPLOYED' ? 'all' : 'DEPLOYED')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'DEPLOYED' ? 'border-sky-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view deployed accessories"
        >
          <div className="text-xs text-sky-400 font-medium flex items-center justify-between">
            <span>DEPLOYED</span>
            <Radio className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
            {accessories.filter((a) => a.status === 'DEPLOYED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">In active mission</div>
        </div>

        {/* SENSORS & OPTICS */}
        <div 
          onClick={() => setCategoryFilter(categoryFilter === 'PAYLOAD_CAMERA' ? 'all' : 'PAYLOAD_CAMERA')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            categoryFilter === 'PAYLOAD_CAMERA' ? 'border-indigo-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view cameras and sensors"
        >
          <div className="text-xs text-indigo-400 font-medium flex items-center justify-between">
            <span>SENSORS & OPTICS</span>
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {accessories.filter((a) => a.category === 'PAYLOAD_CAMERA').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">H20T, H20N, Thermal</div>
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
                placeholder="Search accessories..."
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <AppDropdown
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Categories ({accessories.length})</option>
              <option value="PAYLOAD_CAMERA">Cameras & Sensors</option>
              <option value="REMOTE_CONTROLLER">Remote Controllers</option>
              <option value="GNSS_RTK">RTK Base Stations</option>
              <option value="SEARCHLIGHT_SPEAKER">Searchlights & Megaphones</option>
              <option value="CHARGER_DOCK">Charging Stations</option>
              <option value="SAFETY_PROP">Propellers & Safety</option>
            </AppDropdown>

            <AppDropdown
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="DEPLOYED">Deployed</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="STORAGE">Storage</option>
              <option value="CRASHED">⚠️ Crashed (Accident)</option>
              <option value="MISSING">❓ Missing (Lost)</option>
            </AppDropdown>

            <AppDropdown
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Departments</option>
              <option value="SSOC">SSOC</option>
              <option value="SSD">SSD</option>
            </AppDropdown>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors shrink-0 cursor-pointer"
              title="Export accessories to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors shrink-0 cursor-pointer shadow-xs w-44 h-9 justify-center shrink-0 whitespace-nowrap"
              title="Add a new accessory item"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>Add Accessory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Accessories Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label="Scrollable inventory table">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">ITEM NAME</th>
                <th className="py-2.5 px-3">SERIAL NUMBER</th>
                <th className="py-2.5 px-3">CATEGORY</th>
                <th className="py-2.5 px-3">COMPATIBILITY</th>
                <th className="py-2.5 px-3">DEPT</th>
                <th className="py-2.5 px-3">CONDITION</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-center w-20">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAccessories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No accessories found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredAccessories.map((acc) => {
                  const issuedHandover = handoverForms ? getIssuedHandoverForAccessory(acc, handoverForms) : null;
                  return (
                    <tr 
                      key={acc.id} 
                      className={`hover:bg-slate-800/40 transition-colors group ${
                        issuedHandover ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{acc.name}</span>
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
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {acc.serialNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px]">
                          {getCategoryLabel(acc.category)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {acc.compatibleDrone}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-mono font-semibold text-xs ${
                          acc.department === 'SSOC' ? 'text-sky-400' : 'text-indigo-400'
                        }`}>
                          {acc.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        <span className={`${
                          acc.condition === 'EXCELLENT' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {acc.condition}
                        </span>
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
                              value={acc.status}
                                disabled={acc.status === 'CRASHED'}
                                title={acc.status === 'CRASHED' ? 'CRASHED is permanent for all users, including administrators.' : undefined}
                              onChange={(e) => onEditAccessory({ ...acc, status: e.target.value as any })}
                              className={`border rounded px-2 py-1 text-xs font-semibold focus:outline-none transition-colors cursor-pointer ${
                                acc.status === 'CRASHED'
                                  ? 'bg-rose-950/90 border-rose-600 text-rose-300 ring-1 ring-rose-500/30'
                                  : acc.status === 'MISSING'
                                  ? 'bg-missing-950/90 border-missing-600 text-missing-300 ring-1 ring-missing-500/30'
                                  : acc.status === 'AVAILABLE'
                                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                                  : acc.status === 'DEPLOYED'
                                  ? 'bg-sky-950/80 border-sky-700 text-sky-300'
                                  : acc.status === 'MAINTENANCE'
                                  ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                                  : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-sky-500'
                              }`}
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="DEPLOYED">DEPLOYED</option>
                              <option value="MAINTENANCE">MAINTENANCE</option>
                              <option value="STORAGE">STORAGE</option>
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
                            onClick={() => handleOpenEdit(acc)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                            title="Edit accessory"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={!canDelete}
                            aria-label="Delete accessory"
                            onClick={() => { if(canDelete) onDeleteAccessory(acc.id); }}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={canDelete ? "Delete accessory" : "Delete accessory permission required"}
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

      {/* Add / Edit Accessory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-400" />
                <span>{editingAccessory ? 'Edit Tactical Accessory' : 'Register New Accessory'}</span>
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
                <label className="block text-slate-300 font-medium mb-1">
                  Accessory Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zenmuse H20T Thermal Camera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-medium">
                      Serial Number *
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
                      placeholder="e.g. 1ZNAJ880010091"
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

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Category
                  </label>
                  <AppDropdown
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="PAYLOAD_CAMERA">Camera & Sensor</option>
                    <option value="REMOTE_CONTROLLER">Remote Controller</option>
                    <option value="GNSS_RTK">RTK Base Station</option>
                    <option value="SEARCHLIGHT_SPEAKER">Searchlight / Speaker</option>
                    <option value="CHARGER_DOCK">Charging Station</option>
                    <option value="SAFETY_PROP">Propeller / Safety</option>
                    <option value="OTHER">Other Tactical Gear</option>
                  </AppDropdown>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Compatible Drone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M300 / M350RTK"
                    value={compatibleDrone}
                    onChange={(e) => setCompatibleDrone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Hardware Condition
                  </label>
                  <AppDropdown
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="NEEDS_INSPECTION">NEEDS INSPECTION</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </AppDropdown>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Status
                  </label>
                  <AppDropdown
                    value={status}
                    disabled={accessories.find(item => item.id === editingAccessory?.id)?.status === 'CRASHED'}
                    title={accessories.find(item => item.id === editingAccessory?.id)?.status === 'CRASHED' ? 'CRASHED is permanent for all users, including administrators.' : undefined}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="DEPLOYED">DEPLOYED</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="STORAGE">STORAGE</option>
                    <option value="CRASHED">CRASHED (Accident Damaged)</option>
                    <option value="MISSING">MISSING (Lost)</option>
                  </AppDropdown>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Storage / Unit Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Payload Locker 1, Case A"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Sensor calibration, firmware version, lens cleanliness..."
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
                  {editingAccessory ? 'Save Changes' : 'Register Accessory'}
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
        title="Scan Accessory Serial Number Barcode"
        subtitle="Point camera at the barcode or QR code on the accessory tag"
      />
    </div>
  );
};

