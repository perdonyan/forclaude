import React, { useMemo } from 'react';
import { DroneItem, HandoverFormRecord } from '../types/drone';
import { getIssuedHandoverForDrone } from '../utils/handoverUtils';
import {
  Shield,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface FleetAnalyticsProps {
  drones: DroneItem[];
  handoverForms?: HandoverFormRecord[];
  onNavigateToHandover?: (formId: string) => void;
  onSelectFleetFilter?: (filter: { status?: string; department?: string }) => void;
  onAddDrone?: () => void;
  onOpenBatchUpload?: () => void;
}

export const FleetAnalytics: React.FC<FleetAnalyticsProps> = ({ 
  drones, 
  handoverForms = [], 
  onNavigateToHandover,
  onSelectFleetFilter,
  onAddDrone,
  onOpenBatchUpload,
}) => {
  const issuedDrones = useMemo(() => {
    return drones.filter((d) => !!getIssuedHandoverForDrone(d, handoverForms));
  }, [drones, handoverForms]);

  // Department breakdown
  const deptStats = useMemo(() => {
    const ssoc = drones.filter((d) => d.department === 'SSOC');
    const ssd = drones.filter((d) => d.department === 'SSD');

    return {
      ssocTotal: ssoc.length,
      ssocActive: ssoc.filter((d) => d.status === 'ACTIVE').length,
      ssdTotal: ssd.length,
      ssdActive: ssd.filter((d) => d.status === 'ACTIVE').length,
    };
  }, [drones]);

  // Status breakdown
  const statusStats = useMemo(() => {
    const active = drones.filter((d) => d.status === 'ACTIVE').length;
    const crashed = drones.filter((d) => d.status === 'CRASHED').length;
    const repair = drones.filter((d) => d.status === 'UNDER REPAIR').length;
    const missing = drones.filter((d) => d.status === 'MISSING').length;

    const list = [
      { label: 'ACTIVE', statusKey: 'ACTIVE', count: active, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
      { label: 'UNDER REPAIR', statusKey: 'UNDER REPAIR', count: repair, color: 'bg-amber-500', textColor: 'text-amber-400' },
      { label: 'CRASHED', statusKey: 'CRASHED', count: crashed, color: 'bg-rose-500', textColor: 'text-rose-400' },
      { label: 'MISSING', statusKey: 'MISSING', count: missing, color: 'bg-missing-500', textColor: 'text-missing-400' },
    ];

    if (issuedDrones.length > 0) {
      list.unshift({
        label: 'ISSUED (HANDOVER)',
        statusKey: 'ISSUED_HANDOVER',
        count: issuedDrones.length,
        color: 'bg-emerald-500',
        textColor: 'text-emerald-400',
      });
    }

    return list;
  }, [drones, issuedDrones]);

  // Model breakdown
  const modelStats = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {};
    drones.forEach((d) => {
      // Normalize slight typo in model if any (e.g. Matrcie -> Matrice)
      const cleanModel = d.model.replace('Matrcie', 'Matrice');
      if (!counts[cleanModel]) {
        counts[cleanModel] = { total: 0, active: 0 };
      }
      counts[cleanModel].total += 1;
      if (d.status === 'ACTIVE') {
        counts[cleanModel].active += 1;
      }
    });

    return Object.entries(counts)
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [drones]);

  // Remote Controller anomalies
  const rcAnomalies = useMemo(() => {
    return drones.filter((d) => {
      const rc = (d.remoteSN || '').trim().toLowerCase();
      return !rc || rc.includes('missing');
    });
  }, [drones]);

  const activeRate = drones.length > 0
    ? Math.round((drones.filter((d) => d.status === 'ACTIVE').length / drones.length) * 100)
    : 0;

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* Top Level Summary Cards - Only clickable elements with Click to view */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => onSelectFleetFilter?.({ status: 'all', department: 'all' })}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-lg p-4 cursor-pointer transition-all group"
          title="Click to view"
        >
          <div className="text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
            <span>TOTAL DRONES ASSETS</span>
            <span className="text-[10px] text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">Click to view →</span>
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-100">
            {drones.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">From verified Excel inventory</div>
        </div>

        <div 
          onClick={() => onSelectFleetFilter?.({ status: 'ACTIVE', department: 'all' })}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-lg p-4 cursor-pointer transition-all group"
          title="Click to view"
        >
          <div className="text-slate-100 text-xs font-medium mb-1 flex items-center justify-between">
            <span>OPERATIONAL READINESS</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-100">
            {activeRate}%
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span><strong className="font-mono text-slate-200">{drones.filter((d) => d.status === 'ACTIVE').length}</strong> drones active</span>
            <span className="text-[10px] text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">Click to view →</span>
          </div>
        </div>

        <div 
          onClick={() => onSelectFleetFilter?.({ department: 'SSOC' })}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-lg p-4 cursor-pointer transition-all group"
          title="Click to view"
        >
          <div className="text-slate-100 text-xs font-medium mb-1 flex items-center justify-between">
            <span>SSOC DEPARTMENT</span>
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-100">
            {deptStats.ssocTotal}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>{Math.round((deptStats.ssocActive / (deptStats.ssocTotal || 1)) * 100)}% active ({deptStats.ssocActive}/{deptStats.ssocTotal})</span>
            <span className="text-[10px] text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">Click to view →</span>
          </div>
        </div>

        <div 
          onClick={() => onSelectFleetFilter?.({ department: 'SSD' })}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-lg p-4 cursor-pointer transition-all group"
          title="Click to view"
        >
          <div className="text-slate-100 text-xs font-medium mb-1 flex items-center justify-between">
            <span>SSD DEPARTMENT</span>
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-100">
            {deptStats.ssdTotal}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>{Math.round((deptStats.ssdActive / (deptStats.ssdTotal || 1)) * 100)}% active ({deptStats.ssdActive}/{deptStats.ssdTotal})</span>
            <span className="text-[10px] text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">Click to view →</span>
          </div>
        </div>
      </div>

      {/* Status Breakdown & Department Allocation - Non-clickable informative panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Drones Operational Status</span>
            </span>
            <span className="text-xs font-mono text-slate-400">{drones.length} total</span>
          </h3>

          {/* Stacked bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex mb-4 border border-slate-800">
            {statusStats.map((st) => {
              const widthPct = drones.length > 0 ? (st.count / drones.length) * 100 : 0;
              if (widthPct === 0) return null;
              return (
                <div
                  key={st.label}
                  className={`h-full ${st.color} transition-all`}
                  style={{ width: `${widthPct}%` }}
                />
              );
            })}
          </div>

          <div className="space-y-2 text-xs">
            {statusStats.map((st) => {
              const pct = drones.length > 0 ? Math.round((st.count / drones.length) * 100) : 0;
              return (
                <div
                  key={st.label}
                  className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${st.color}`} />
                    <span className="text-slate-300 font-medium">{st.label}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-200 font-semibold">{st.count}</span>
                    <span className={`text-xs ${st.textColor}`}>({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Department Allocations</span>
            </span>
            <span className="text-xs font-mono text-slate-400">SSOC vs SSD</span>
          </h3>

          <div className="space-y-4 text-xs">
            {/* SSOC Card */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  SSOC (Special Security Operations Center)
                </span>
                <span className="font-mono text-slate-200 font-bold">{deptStats.ssocTotal} units</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-2">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${(deptStats.ssocTotal / drones.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Active: <strong className="font-mono text-emerald-400">{deptStats.ssocActive}</strong></span>
                <span>Share: <strong className="font-mono text-slate-300">{Math.round((deptStats.ssocTotal / drones.length) * 100)}%</strong> of total drones</span>
              </div>
            </div>

            {/* SSD Card */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  SSD (Security Systems Department)
                </span>
                <span className="font-mono text-slate-200 font-bold">{deptStats.ssdTotal} units</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-2">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(deptStats.ssdTotal / drones.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Active: <strong className="font-mono text-emerald-400">{deptStats.ssdActive}</strong></span>
                <span>Share: <strong className="font-mono text-slate-300">{Math.round((deptStats.ssdTotal / drones.length) * 100)}%</strong> of total drones</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Distribution & RC Integrity Audit - Non-clickable informative panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Model Breakdown */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Drone Models Inventory
            </h3>
            <span className="text-xs text-slate-400">
              {modelStats.length} distinct models
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {modelStats.map((item) => {
              const maxTotal = modelStats[0]?.total || 1;
              const barWidth = (item.total / maxTotal) * 100;
              return (
                <div 
                  key={item.model} 
                  className="p-2 rounded bg-slate-950/60 border border-slate-800"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-slate-200">{item.model}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-emerald-400">{item.active} active</span>
                      <span className="text-slate-300 font-bold">{item.total} total</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remote Controller Audit */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Remote Controller Audit</span>
            </h3>
            <span className="text-xs font-mono text-orange-400">
              {rcAnomalies.length} attention required
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Drones flagged with missing controller serial numbers or "MISSING RC":
          </p>

          <div className="space-y-2 text-xs max-h-96 overflow-y-auto pr-1">
            {rcAnomalies.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                All drones currently have assigned remote serial numbers.
              </div>
            ) : (
              rcAnomalies.map((unit) => (
                <div
                  key={unit.id}
                  className="p-2.5 rounded bg-slate-950/80 border border-orange-900/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sky-400">{unit.droneName}</span>
                    <span className="font-mono text-slate-300">{unit.model}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] truncate">
                    SN: <span className="font-mono text-slate-300">{unit.droneSN}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-orange-400 font-medium">
                      RC: {unit.remoteSN || 'None provided'}
                    </span>
                    <span className="font-mono text-slate-400">{unit.department}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

