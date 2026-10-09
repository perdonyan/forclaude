import { AppDropdown } from './AppDropdown';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  DroneItem, 
  InventorySubTab, 
  BatteryItem, 
  AccessoryItem, 
  StreamingDeviceItem,
  HandoverFormRecord,
  UserItem,
  NotificationMessage,
  GroupPrivileges,
  hasPrivilege,
  IncidentReportRecord
} from '../types/drone';
import { DroneFleetTable } from './DroneFleetTable';
import { ExcelManager } from './ExcelManager';
import { BatteriesManager } from './BatteriesManager';
import { AccessoriesManager } from './AccessoriesManager';
import { StreamingDevicesManager } from './StreamingDevicesManager';
import { BatchUploadDronesModal } from './BatchUploadDronesModal';
import { getAllIssuedAssetsSummary, IssuedAssetItem } from '../utils/handoverUtils';
import { 
  Layers, 
  Package, 
  Battery, 
  Radio, 
  FileSpreadsheet, 
  FileText, 
  ExternalLink, 
  Clock, 
  UserCheck, 
  Search,
  Filter,
  CheckCircle2,
  Shield,
  ShieldAlert,
  ArrowRight,
  Lock,
  ChevronDown
} from 'lucide-react';

interface InventoryViewProps {
  drones: DroneItem[];
  batteries: BatteryItem[];
  accessories: AccessoryItem[];
  streamingDevices: StreamingDeviceItem[];
  handoverForms?: HandoverFormRecord[];
  incidentReports?: IncidentReportRecord[];
  currentUser?: UserItem | null;
  officers?: UserItem[];
  notifications?: NotificationMessage[];
  onNavigateToNotifications?: () => void;
  onNavigateToHandover?: (formId: string) => void;
  onNavigateToIncident?: (reportId: string) => void;
  onAddDrone: () => void;
  onEditDrone: (drone: DroneItem) => void;
  onDeleteDrone: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onExportCsv: (filteredData?: DroneItem[]) => void;
  onViewAssetTag: (drone: DroneItem) => void;
  onOpenBatchLabels: () => void;
  onImportDrones: (imported: DroneItem[], replaceAll: boolean, targetOfficer?: UserItem, remarks?: string) => void;
  onResetOriginalData: () => void;
  onAddBattery: (battery: BatteryItem) => void;
  onEditBattery: (battery: BatteryItem) => void;
  onDeleteBattery: (id: string) => void;
  onAddAccessory: (accessory: AccessoryItem) => void;
  onEditAccessory: (accessory: AccessoryItem) => void;
  onDeleteAccessory: (id: string) => void;
  onAddStreamingDevice: (device: StreamingDeviceItem) => void;
  onEditStreamingDevice: (device: StreamingDeviceItem) => void;
  onDeleteStreamingDevice: (id: string) => void;
  groupPrivileges?: GroupPrivileges;
  initialSubTab?: InventorySubTab;
  initialDroneStatus?: string;
  initialDroneDepartment?: 'SSOC' | 'SSD' | 'all';
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  drones,
  batteries,
  accessories,
  streamingDevices,
  handoverForms = [],
  incidentReports = [],
  currentUser,
  officers = [],
  notifications = [],
  onNavigateToNotifications,
  onNavigateToHandover,
  onNavigateToIncident,
  onAddDrone,
  onEditDrone,
  onDeleteDrone,
  onUpdateStatus,
  onExportCsv,
  onViewAssetTag,
  onOpenBatchLabels,
  onImportDrones,
  onResetOriginalData,
  onAddBattery,
  onEditBattery,
  onDeleteBattery,
  onAddAccessory,
  onEditAccessory,
  onDeleteAccessory,
  onAddStreamingDevice,
  onEditStreamingDevice,
  onDeleteStreamingDevice,
  groupPrivileges,
  initialSubTab,
  initialDroneStatus,
  initialDroneDepartment,
}) => {
  const resolveSubTab = (tab?: InventorySubTab): InventorySubTab => {
    if (!tab || tab === 'analytics') return 'all';
    if (tab === 'excel') return 'excel-manager';
    return tab;
  };

  const [subTab, setSubTab] = useState<InventorySubTab>(resolveSubTab(initialSubTab));
  const [activeDroneStatus, setActiveDroneStatus] = useState<string | undefined>(initialDroneStatus);
  const [activeDroneDept, setActiveDroneDept] = useState<'SSOC' | 'SSD' | 'all' | undefined>(initialDroneDepartment);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(resolveSubTab(initialSubTab));
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialDroneStatus !== undefined) {
      setActiveDroneStatus(initialDroneStatus);
    }
  }, [initialDroneStatus]);

  useEffect(() => {
    if (initialDroneDepartment !== undefined) {
      setActiveDroneDept(initialDroneDepartment);
    }
  }, [initialDroneDepartment]);

  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [issuedSearch, setIssuedSearch] = useState('');
  const [issuedTypeFilter, setIssuedTypeFilter] = useState<'ALL' | 'DRONE' | 'BATTERY' | 'ACCESSORY' | 'STREAMING_DEVICE'>('ALL');

  // Functional privileges enforcement for INVENTORY module
  const canBatchUpload = hasPrivilege(groupPrivileges, currentUser, 'INVENTORY_BATCH_UPLOAD');
  const canAddDrone = hasPrivilege(groupPrivileges, currentUser, 'INVENTORY_ADD_DRONE');
  const canEditDetails = hasPrivilege(groupPrivileges, currentUser, 'INVENTORY_EDIT_DETAILS');
  const canDeleteStreamingDevice = hasPrivilege(groupPrivileges,currentUser,'INVENTORY_DELETE_STREAMING_DEVICE');
  const canDeleteAccessory = hasPrivilege(groupPrivileges,currentUser,'INVENTORY_DELETE_ACCESSORY');
  const canDeleteBattery = hasPrivilege(groupPrivileges,currentUser,'INVENTORY_DELETE_BATTERY');
  const canDeleteDrone = hasPrivilege(groupPrivileges, currentUser, 'INVENTORY_DELETE_DRONE');

  // Summary of all equipment currently issued across active handover documents
  const issuedAssets = useMemo(() => {
    return getAllIssuedAssetsSummary(handoverForms, drones, batteries, accessories, streamingDevices);
  }, [handoverForms, drones, batteries, accessories, streamingDevices]);

  const filteredIssuedAssets = useMemo(() => {
    return issuedAssets.filter((asset) => {
      if (issuedTypeFilter !== 'ALL' && asset.type !== issuedTypeFilter) {
        return false;
      }
      if (issuedSearch) {
        const term = issuedSearch.toLowerCase();
        return (
          asset.title.toLowerCase().includes(term) ||
          (asset.serialNumber && asset.serialNumber.toLowerCase().includes(term)) ||
          asset.formSrNumber.toLowerCase().includes(term) ||
          asset.recipientName.toLowerCase().includes(term) ||
          asset.recipientEmpId.toLowerCase().includes(term) ||
          (asset.purpose && asset.purpose.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [issuedAssets, issuedTypeFilter, issuedSearch]);

  const issuedCounts = useMemo(() => {
    return {
      total: issuedAssets.length,
      drones: issuedAssets.filter((a) => a.type === 'DRONE').length,
      batteries: issuedAssets.filter((a) => a.type === 'BATTERY').length,
      accessories: issuedAssets.filter((a) => a.type === 'ACCESSORY' || a.type === 'EQUIPMENT').length,
      streaming: issuedAssets.filter((a) => a.type === 'STREAMING_DEVICE').length,
    };
  }, [issuedAssets]);

  const getAssetTypeBadge = (type: IssuedAssetItem['type']) => {
    switch (type) {
      case 'DRONE':
        return <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 text-slate-300 font-mono text-[10px] font-bold">DRONE</span>;
      case 'BATTERY':
        return <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 text-slate-300 font-mono text-[10px] font-bold">BATTERY</span>;
      case 'STREAMING_DEVICE':
        return <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 text-slate-300 font-mono text-[10px] font-bold">STREAMING</span>;
      case 'ACCESSORY':
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 text-slate-300 font-mono text-[10px] font-bold">ACCESSORY</span>;
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* Sub-navigation bar for the INVENTORY Tab */}
      <div
        style={{ height: '50px', borderRadius: '8px' }}
        className="bg-slate-900 border border-slate-800 rounded-lg h-[50px] p-2 overflow-x-auto"
      >
        <div className="grid grid-cols-6 gap-2 w-full min-w-[840px]">
          {/* 1st Option: All drones */}
          <button
            type="button"
            onClick={() => setSubTab('all')}
            className={`w-full min-w-0 h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 text-center ${
              subTab === 'all'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>All drones</span>
            <span className="font-mono text-[10px] text-slate-400">({drones.length})</span>
          </button>

          {/* 2nd Option: Streaming devices */}
          <button
            type="button"
            onClick={() => setSubTab('streaming-devices')}
            className={`w-full min-w-0 h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 text-center ${
              subTab === 'streaming-devices'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span>Streaming</span>
            <span className="font-mono text-[10px] text-slate-400">({streamingDevices.length})</span>
          </button>

          {/* 3rd Option: Accessories */}
          <button
            type="button"
            onClick={() => setSubTab('accessories')}
            className={`w-full min-w-0 h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 text-center ${
              subTab === 'accessories'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>Accessories</span>
            <span className="font-mono text-[10px] text-slate-400">({accessories.length})</span>
          </button>

          {/* 4th Option: Batteries */}
          <button
            type="button"
            onClick={() => setSubTab('batteries')}
            className={`w-full min-w-0 h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 text-center ${
              subTab === 'batteries'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Battery className="w-3.5 h-3.5 shrink-0" />
            <span>Batteries</span>
            <span className="font-mono text-[10px] text-slate-400">({batteries.length})</span>
          </button>

          {/* 5th Option: Issued Equipment */}
          <button
            type="button"
            onClick={() => setSubTab('issued-equipment')}
            className={`w-full min-w-0 h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 text-center ${
              subTab === 'issued-equipment'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Issued</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-850 text-slate-300 border border-slate-800">
              {issuedAssets.length}
            </span>
          </button>

          {/* 6th Option: Excel/CSV Manager */}
          <button
            type="button"
            onClick={() => setSubTab('excel-manager')}
            className={`w-full min-w-0 h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 text-center ${
              subTab === 'excel-manager'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* 1st View: All Fleet Table */}
      {subTab === 'all' && (
        <DroneFleetTable
          drones={drones}
          departmentFilter={activeDroneDept || "all"}
          initialStatus={activeDroneStatus}
          handoverForms={handoverForms}
          incidentReports={incidentReports}
          onNavigateToHandover={onNavigateToHandover}
          onNavigateToIncident={onNavigateToIncident}
          onAddDrone={canAddDrone ? onAddDrone : undefined}
          onOpenBatchUpload={canBatchUpload ? () => setIsBatchUploadOpen(true) : undefined}
          onEditDrone={canEditDetails ? onEditDrone : undefined}
          onDeleteDrone={canDeleteDrone ? onDeleteDrone : undefined}
          onUpdateStatus={onUpdateStatus}
          onExportCsv={onExportCsv}
          onViewAssetTag={onViewAssetTag}
          onOpenBatchLabels={onOpenBatchLabels}
          currentUser={currentUser}
          canEditDetails={canEditDetails}
          canDeleteDrone={canDeleteDrone}
        />
      )}

      {/* 3rd View: Dedicated Issued Equipment Ledger */}
      {subTab === 'issued-equipment' && (
        <div className="space-y-4">
          {/* Quick KPI stats for issued equipment */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div 
              onClick={() => setIssuedTypeFilter('ALL')}
              className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
                issuedTypeFilter === 'ALL' ? 'border-sky-500/80 bg-sky-950/40' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400 font-medium">TOTAL ISSUED</div>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{issuedCounts.total}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Hardware in custody</div>
            </div>

            <div 
              onClick={() => setIssuedTypeFilter('DRONE')}
              className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
                issuedTypeFilter === 'DRONE' ? 'border-sky-500/80 bg-sky-950/40' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>DRONES</span>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{issuedCounts.drones}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Aircraft in field</div>
            </div>

            <div 
              onClick={() => setIssuedTypeFilter('BATTERY')}
              className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
                issuedTypeFilter === 'BATTERY' ? 'border-sky-500/80 bg-sky-950/40' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>BATTERIES</span>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{issuedCounts.batteries}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Flight battery units</div>
            </div>

            <div 
              onClick={() => setIssuedTypeFilter('ACCESSORY')}
              className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
                issuedTypeFilter === 'ACCESSORY' ? 'border-sky-500/80 bg-sky-950/40' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>ACCESSORIES / SENSORS</span>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{issuedCounts.accessories}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Optics, RTK, remotes</div>
            </div>

            <div 
              onClick={() => setIssuedTypeFilter('STREAMING_DEVICE')}
              className={`bg-slate-900 border rounded-lg p-3.5 cursor-pointer transition-colors ${
                issuedTypeFilter === 'STREAMING_DEVICE' ? 'border-sky-500/80 bg-sky-950/40' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>STREAMING</span>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{issuedCounts.streaming}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Live transmitters</div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search (First Option) & Equipment Type Filter Dropdown Menu */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                <div className="relative w-full sm:w-52 md:w-56 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={issuedSearch}
                    onChange={(e) => setIssuedSearch(e.target.value)}
                    placeholder="Search equipment, serial..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 shrink-0 hidden sm:inline-flex">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    Type:
                  </span>
                  <div className="relative">
                    <AppDropdown
                      value={issuedTypeFilter}
                      onChange={(e) => setIssuedTypeFilter(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-purple-500 cursor-pointer appearance-none shadow-xs font-medium"
                    >
                      <option value="ALL">All Equipment Types</option>
                      <option value="DRONE">Drones ({issuedAssets.filter(a => a.type === 'DRONE').length})</option>
                      <option value="BATTERY">Batteries ({issuedAssets.filter(a => a.type === 'BATTERY').length})</option>
                      <option value="ACCESSORY">Accessories ({issuedAssets.filter(a => a.type === 'ACCESSORY').length})</option>
                      <option value="STREAMING_DEVICE">Streaming Devices ({issuedAssets.filter(a => a.type === 'STREAMING_DEVICE').length})</option>
                    </AppDropdown>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateToHandover?.('')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors cursor-pointer shadow-xs shrink-0"
                  title="Go to Handover Documents"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
                  <span>Go to Handover Documents</span>
                </button>
              </div>
            </div>
          </div>

          {/* Issued Items Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label="Scrollable inventory table">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">EQUIPMENT ITEM</th>
                    <th className="py-2.5 px-3">SERIAL / QTY</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">HANDOVER DOCUMENT</th>
                    <th className="py-2.5 px-3">RECIPIENT OFFICER</th>
                    <th className="py-2.5 px-3">DATE & TIME ISSUED</th>
                    <th className="py-2.5 px-3 text-center w-28">DOC LINK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredIssuedAssets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <p className="text-sm font-medium text-slate-300">No issued equipment found matching filter</p>
                        <p className="text-xs text-slate-500 mt-1">
                          When equipment is assigned and issued on a Handover Document, it immediately reflects here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredIssuedAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                          {asset.title}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                          {asset.serialNumber || (asset.qty ? `Qty: ${asset.qty}` : '—')}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {getAssetTypeBadge(asset.type)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onNavigateToHandover?.(asset.formId)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-700 hover:bg-emerald-900 hover:border-emerald-500 transition-colors cursor-pointer group/btn"
                            title="Click to open this Handover Document"
                          >
                            <FileText className="w-3 h-3 text-emerald-400 group-hover/btn:scale-110 transition-transform" />
                            <span>{asset.formSrNumber}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-400/80" />
                          </button>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-slate-200 font-medium">{asset.recipientName}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ID: {asset.recipientEmpId} {asset.recipientPhone ? `· ${asset.recipientPhone}` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Clock className="w-3 h-3 text-sky-400" />
                            <span>{asset.dateIssued} {asset.timeIssued}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onNavigateToHandover?.(asset.formId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-200 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700 rounded transition-colors cursor-pointer"
                          >
                            <span>Open Doc</span>
                            <ExternalLink className="w-3 h-3 text-emerald-300" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4th View: Accessories */}
      {subTab === 'accessories' && (
        <AccessoriesManager
          canDelete={canDeleteAccessory}
          accessories={accessories}
          handoverForms={handoverForms}
          onNavigateToHandover={onNavigateToHandover}
          onAddAccessory={onAddAccessory}
          onEditAccessory={onEditAccessory}
          onDeleteAccessory={onDeleteAccessory}
        />
      )}

      {/* 5th View: Batteries */}
      {subTab === 'batteries' && (
        <BatteriesManager
          canDelete={canDeleteBattery}
          batteries={batteries}
          handoverForms={handoverForms}
          onNavigateToHandover={onNavigateToHandover}
          onAddBattery={onAddBattery}
          onEditBattery={onEditBattery}
          onDeleteBattery={onDeleteBattery}
        />
      )}

      {/* 6th View: Streaming Devices */}
      {subTab === 'streaming-devices' && (
        <StreamingDevicesManager
          canDelete={canDeleteStreamingDevice}
          streamingDevices={streamingDevices}
          handoverForms={handoverForms}
          onNavigateToHandover={onNavigateToHandover}
          onAddDevice={onAddStreamingDevice}
          onEditDevice={onEditStreamingDevice}
          onDeleteDevice={onDeleteStreamingDevice}
        />
      )}

      {/* 7th View: Excel / CSV Manager */}
      {subTab === 'excel-manager' && (
        <ExcelManager
          drones={drones}
          onImportDrones={onImportDrones}
          onResetOriginalData={onResetOriginalData}
          onOpenBatchUpload={canBatchUpload ? () => setIsBatchUploadOpen(true) : undefined}
        />
      )}

      {/* Batch Upload Drones Modal */}
      {isBatchUploadOpen && (
        <BatchUploadDronesModal groupPrivileges={groupPrivileges}
          isOpen={isBatchUploadOpen}
          onClose={() => setIsBatchUploadOpen(false)}
          existingDrones={drones}
          currentUser={currentUser}
          officers={officers}
          onBatchUpload={onImportDrones}
        />
      )}
    </div>
  );
};

