import { AppDropdown } from './AppDropdown';
import React, { useState } from 'react';
import { StreamingDeviceItem, HandoverFormRecord } from '../types/drone';
import { getIssuedHandoverForStreamingDevice } from '../utils/handoverUtils';
import { 
  Radio, 
  Search, 
  Plus, 
  Download, 
  CheckCircle2, 
  Activity, 
  Wifi, 
  Wrench, 
  Edit3, 
  Trash2, 
  X, 
  Cast, 
  Signal, 
  Tv, 
  Shield, 
  Building2,
  FileText,
  ExternalLink,
  AlertTriangle,
  Scan,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface StreamingDevicesManagerProps {
  streamingDevices: StreamingDeviceItem[];
  handoverForms?: HandoverFormRecord[];
  onNavigateToHandover?: (formId: string) => void;
  onAddDevice: (device: StreamingDeviceItem) => void;
  onEditDevice: (device: StreamingDeviceItem) => void;
  canDelete?: boolean;
  onDeleteDevice: (id: string) => void;
}

export const StreamingDevicesManager: React.FC<StreamingDevicesManagerProps> = ({
  streamingDevices,
  handoverForms = [],
  onNavigateToHandover,
  onAddDevice,
  onEditDevice,
  canDelete = false,
  onDeleteDevice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<'all' | 'SSOC' | 'SSD'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<StreamingDeviceItem | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<StreamingDeviceItem['deviceType']>('CELLULAR_BONDED');
  const [assignedDroneOrUnit, setAssignedDroneOrUnit] = useState('');
  const [streamProtocol, setStreamProtocol] = useState<StreamingDeviceItem['streamProtocol']>('RTMP / RTSP');
  const [department, setDepartment] = useState<'SSOC' | 'SSD'>('SSOC');
  const [status, setStatus] = useState<StreamingDeviceItem['status']>('ONLINE_STREAMING');
  const [ipAddress, setIpAddress] = useState('');
  const [simCardNumber, setSimCardNumber] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const filteredDevices = streamingDevices.filter((d) => {
    if (statusFilter === 'ISSUED_HANDOVER') {
      const isIssued = !!getIssuedHandoverForStreamingDevice(d, handoverForms);
      if (!isIssued) return false;
    } else if (statusFilter !== 'all' && d.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && d.deviceType !== typeFilter) return false;
    if (deptFilter !== 'all' && d.department !== deptFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        d.deviceName.toLowerCase().includes(term) ||
        d.serialNumber.toLowerCase().includes(term) ||
        d.assignedDroneOrUnit.toLowerCase().includes(term) ||
        d.streamProtocol.toLowerCase().includes(term) ||
        (d.ipAddress && d.ipAddress.toLowerCase().includes(term)) ||
        (d.simCardNumber && d.simCardNumber.toLowerCase().includes(term)) ||
        (d.location && d.location.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingDevice(null);
    setDeviceName('');
    setSerialNumber('');
    setDeviceType('4G_5G_DONGLE');
    setAssignedDroneOrUnit('');
    setStreamProtocol('RTMP / RTSP');
    setDepartment('SSOC');
    setStatus('STANDBY_READY');
    setIpAddress('10.140.');
    setSimCardNumber('');
    setLocation('C2 Equipment Bay');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: StreamingDeviceItem) => {
    setEditingDevice(d);
    setDeviceName(d.deviceName);
    setSerialNumber(d.serialNumber);
    setDeviceType(d.deviceType);
    setAssignedDroneOrUnit(d.assignedDroneOrUnit);
    setStreamProtocol(d.streamProtocol);
    setDepartment(d.department === 'SSD' ? 'SSD' : 'SSOC');
    setStatus(d.status);
    setIpAddress(d.ipAddress || '');
    setSimCardNumber(d.simCardNumber || '');
    setLocation(d.location || '');
    setNotes(d.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: StreamingDeviceItem = {
      id: editingDevice ? editingDevice.id : `stream-${Date.now()}`,
      deviceName: deviceName.trim(),
      serialNumber: serialNumber.trim(),
      deviceType,
      assignedDroneOrUnit: assignedDroneOrUnit.trim(),
      streamProtocol,
      department,
      status,
      ipAddress: ipAddress.trim() || undefined,
      simCardNumber: simCardNumber.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingDevice) {
      onEditDevice(payload);
    } else {
      onAddDevice(payload);
    }
    setIsModalOpen(false);
  };

  const handleExportCsv = () => {
    const header = 'DEVICE NAME,SERIAL NUMBER,TYPE,ASSIGNED UNIT,PROTOCOL,DEPARTMENT,STATUS,IP ADDRESS,SIM CARD,LOCATION,NOTES';
    const rows = filteredDevices.map(
      (d) => `"${d.deviceName}","${d.serialNumber}","${d.deviceType}","${d.assignedDroneOrUnit}","${d.streamProtocol}","${d.department}","${d.status}","${d.ipAddress || ''}","${d.simCardNumber || ''}","${d.location || ''}","${d.notes || ''}"`
    );
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `streaming_devices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (devStatus: StreamingDeviceItem['status']) => {
    switch (devStatus) {
      case 'ONLINE_STREAMING':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5 shadow-xs shadow-emerald-950">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>ONLINE STREAM</span>
          </span>
        );
      case 'STANDBY_READY':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-sky-400" />
            <span>STANDBY</span>
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            OFFLINE
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-amber-400" />
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
            {devStatus}
          </span>
        );
    }
  };

  const getTypeLabel = (t: StreamingDeviceItem['deviceType']) => {
    switch (t) {
      case 'CELLULAR_BONDED':
        return '5G/4G Bonded Unit';
      case 'HDMI_SDI_ENCODER':
        return 'Broadcast Encoder';
      case '4G_5G_DONGLE':
        return 'Cellular Drone Dongle';
      case 'WIRELESS_TRANSMITTER':
        return 'Wireless COFDM Link';
      case 'DECODER_RECEIVER':
        return 'IP Decoder';
      default:
        return t;
    }
  };

  const onlineCount = streamingDevices.filter((d) => d.status === 'ONLINE_STREAMING').length;
  const standbyCount = streamingDevices.filter((d) => d.status === 'STANDBY_READY').length;
  const cellularCount = streamingDevices.filter(
    (d) => d.deviceType === 'CELLULAR_BONDED' || d.deviceType === '4G_5G_DONGLE'
  ).length;
  const issuedHandoverCount = streamingDevices.filter((d) => !!getIssuedHandoverForStreamingDevice(d, handoverForms)).length;

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'all' ? 'border-sky-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">TOTAL ENCODERS</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{streamingDevices.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Stream transmitters</div>
        </div>

        <div 
          onClick={() => setStatusFilter('ISSUED_HANDOVER')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'ISSUED_HANDOVER' ? 'border-emerald-500/80 bg-emerald-950/40' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-emerald-400 font-medium flex items-center justify-between">
            <span>ISSUED (HANDOVER)</span>
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{issuedHandoverCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active custody</div>
        </div>

        {/* ACTIVE LIVE FEEDS */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'ONLINE_STREAMING' ? 'all' : 'ONLINE_STREAMING')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'ONLINE_STREAMING' ? 'border-emerald-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view live transmitting streaming devices"
        >
          <div className="text-xs text-emerald-400 font-medium flex items-center justify-between">
            <span>ACTIVE LIVE FEEDS</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{onlineCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Transmitting live video</div>
        </div>

        {/* STANDBY READY */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'STANDBY_READY' ? 'all' : 'STANDBY_READY')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            statusFilter === 'STANDBY_READY' ? 'border-sky-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view standby ready devices"
        >
          <div className="text-xs text-sky-400 font-medium flex items-center justify-between">
            <span>STANDBY READY</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">{standbyCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Pre-configured & synced</div>
        </div>

        {/* CELLULAR 4G/5G */}
        <div 
          onClick={() => setTypeFilter(typeFilter === 'CELLULAR_BONDED' ? 'all' : 'CELLULAR_BONDED')}
          className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
            typeFilter === 'CELLULAR_BONDED' ? 'border-indigo-500/80 bg-slate-800/60' : 'border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view cellular 4G/5G units"
        >
          <div className="text-xs text-indigo-400 font-medium flex items-center justify-between">
            <span>CELLULAR 4G/5G</span>
            <Signal className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{cellularCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bonded & Dongle units</div>
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
                placeholder="Search streaming..."
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <AppDropdown
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Statuses ({streamingDevices.length})</option>
              <option value="ISSUED_HANDOVER">Issued (Handover) ({issuedHandoverCount})</option>
              <option value="ONLINE_STREAMING">Live Streaming</option>
              <option value="STANDBY_READY">Standby Ready</option>
              <option value="OFFLINE">Offline</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="CRASHED">⚠️ Crashed (Damaged)</option>
              <option value="MISSING">❓ Missing (Lost)</option>
            </AppDropdown>

            <AppDropdown
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Device Types</option>
              <option value="CELLULAR_BONDED">Cellular 5G/4G Bonded</option>
              <option value="4G_5G_DONGLE">Cellular Drone Dongle</option>
              <option value="HDMI_SDI_ENCODER">Broadcast SDI/HDMI Encoders</option>
              <option value="WIRELESS_TRANSMITTER">Wireless Transmitters</option>
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
              title="Export streaming devices to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors shrink-0 cursor-pointer shadow-xs w-44 h-9 justify-center shrink-0 whitespace-nowrap"
              title="Add a new streaming device"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>Add Streamer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Streaming Devices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label="Scrollable inventory table">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">DEVICE NAME</th>
                <th className="py-2.5 px-3">SERIAL NUMBER</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3">ASSIGNED PLATFORM</th>
                <th className="py-2.5 px-3">DEPT</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">IP / SIM / DETAILS</th>
                <th className="py-2.5 px-3 text-center w-20">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No streaming devices found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const issuedHandover = handoverForms ? getIssuedHandoverForStreamingDevice(dev, handoverForms) : null;
                  return (
                    <tr 
                      key={dev.id} 
                      className={`hover:bg-slate-800/40 transition-colors group ${
                        issuedHandover ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{dev.deviceName}</span>
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
                        {dev.serialNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px]">
                          {getTypeLabel(dev.deviceType)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-200 whitespace-nowrap">
                        {dev.assignedDroneOrUnit}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-mono font-semibold text-xs ${
                          dev.department === 'SSOC' ? 'text-sky-400' : 'text-indigo-400'
                        }`}>
                          {dev.department}
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
                              value={dev.status}
                                disabled={dev.status === 'CRASHED'}
                                title={dev.status === 'CRASHED' ? 'CRASHED is permanent for all users, including administrators.' : undefined}
                              onChange={(e) => onEditDevice({ ...dev, status: e.target.value as any })}
                              className={`border rounded px-2 py-1 text-xs font-semibold focus:outline-none transition-colors cursor-pointer ${
                                dev.status === 'CRASHED'
                                  ? 'bg-rose-950/90 border-rose-600 text-rose-300 ring-1 ring-rose-500/30'
                                  : dev.status === 'MISSING'
                                  ? 'bg-missing-950/90 border-missing-600 text-missing-300 ring-1 ring-missing-500/30'
                                  : dev.status === 'ONLINE_STREAMING'
                                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                                  : dev.status === 'STANDBY_READY'
                                  ? 'bg-sky-950/80 border-sky-700 text-sky-300'
                                  : dev.status === 'MAINTENANCE'
                                  ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                                  : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-sky-500'
                              }`}
                            >
                              <option value="ONLINE_STREAMING">ONLINE STREAMING</option>
                              <option value="STANDBY_READY">STANDBY READY</option>
                              <option value="OFFLINE">OFFLINE</option>
                              <option value="MAINTENANCE">MAINTENANCE</option>
                              <option value="CRASHED">⚠️ CRASHED (Damaged)</option>
                              <option value="MISSING">❓ MISSING (Lost)</option>
                            </AppDropdown>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                        {dev.ipAddress && (
                          <div className="font-mono text-[11px] text-sky-400">
                            IP: {dev.ipAddress}
                          </div>
                        )}
                        {dev.simCardNumber && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {dev.simCardNumber}
                          </div>
                        )}
                        {dev.location && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {dev.location}
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
                            onClick={() => handleOpenEdit(dev)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                            title="Edit device"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={!canDelete}
                            aria-label="Delete streaming device"
                            onClick={() => { if(canDelete) onDeleteDevice(dev.id); }}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={canDelete ? "Delete streaming device" : "Delete streaming device permission required"}
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

      {/* Add / Edit Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-400" />
                <span>{editingDevice ? 'Edit Streaming Device' : 'Add Streaming Device'}</span>
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
                  Device Model / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LiveU LU300S 5G Field Unit"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
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
                      placeholder="e.g. LU300S-QTR-5501"
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
                    Device Type
                  </label>
                  <AppDropdown
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="CELLULAR_BONDED">Cellular 5G/4G Bonded</option>
                    <option value="4G_5G_DONGLE">Cellular Drone Dongle</option>
                    <option value="HDMI_SDI_ENCODER">Broadcast SDI/HDMI Encoder</option>
                    <option value="WIRELESS_TRANSMITTER">Wireless COFDM Link</option>
                    <option value="DECODER_RECEIVER">IP Decoder</option>
                  </AppDropdown>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Assigned Unit / Aircraft *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M350RTK - 31"
                    value={assignedDroneOrUnit}
                    onChange={(e) => setAssignedDroneOrUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Stream Protocol
                  </label>
                  <AppDropdown
                    value={streamProtocol}
                    onChange={(e) => setStreamProtocol(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  >
                    <option value="RTMP / RTSP">RTMP / RTSP</option>
                    <option value="SRT (Secure Reliable Transport)">SRT</option>
                    <option value="LiveU LRT">LiveU LRT</option>
                    <option value="NDI|HX">NDI|HX</option>
                    <option value="WebRTC">WebRTC</option>
                  </AppDropdown>
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
                    disabled={streamingDevices.find(item => item.id === editingDevice?.id)?.status === 'CRASHED'}
                    title={streamingDevices.find(item => item.id === editingDevice?.id)?.status === 'CRASHED' ? 'CRASHED is permanent for all users, including administrators.' : undefined}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="ONLINE_STREAMING">ONLINE STREAMING</option>
                    <option value="STANDBY_READY">STANDBY READY</option>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="CRASHED">CRASHED (Damaged)</option>
                    <option value="MISSING">MISSING (Lost)</option>
                  </AppDropdown>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Network IP Address
                  </label>
                  <input
                    type="text"
                    placeholder="10.140.x.x"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    SIM Card / Carrier
                  </label>
                  <input
                    type="text"
                    placeholder="Ooredoo 5G / eSIM"
                    value={simCardNumber}
                    onChange={(e) => setSimCardNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Location / Rack Position
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mobile Command Van 1, C2 Rack 4"
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
                  placeholder="Relay configuration, feed destination..."
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
                  {editingDevice ? 'Save Changes' : 'Add Streamer'}
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
        title="Scan Streaming Device Serial Number Barcode"
        subtitle="Point camera at the barcode or QR code on the live-relay unit"
      />
    </div>
  );
};

