import { AppDropdown } from './AppDropdown';
import React, { useState } from 'react';
import { AuditLogEntry } from '../types/drone';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  X
} from 'lucide-react';

interface AuditTrailViewProps {
  auditLogs: AuditLogEntry[];
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  auditLogs,
  onRefresh,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'AUTH' | 'USER' | 'ROLE' | 'SECURITY' | 'SYSTEM'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesCategory = categoryFilter === 'ALL' || log.targetType === categoryFilter;
    if (!matchesCategory) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      log.actorName?.toLowerCase().includes(q) ||
      log.actorId?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q) ||
      log.ipAddress?.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Actor ID', 'Actor Name', 'Role', 'Action', 'Category', 'Details', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.actorId || ''}"`,
      `"${l.actorName || ''}"`,
      `"${l.actorRole || ''}"`,
      `"${l.action}"`,
      `"${l.targetType}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aerotrack_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('CREATED') || action.includes('ACTIVATED')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          {action}
        </span>
      );
    }
    if (action.includes('LOCKED') || action.includes('SUSPENDED') || action.includes('BLOCKED')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
          <XCircle className="w-3 h-3 text-rose-400" />
          {action}
        </span>
      );
    }
    if (action.includes('RESET') || action.includes('FAILED')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter and Control Bar */}
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 w-full"
      >
        {/* Left: Search (First Option) + Category Filter Dropdown */}
        <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          <div className="relative w-full sm:w-52 md:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
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

          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            Category:
          </span>
          <div className="relative shrink-0">
            <AppDropdown
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 cursor-pointer appearance-none shadow-xs font-medium"
            >
              <option value="ALL">All Event Domains ({auditLogs.length})</option>
              <option value="AUTH">Authentication (AUTH)</option>
              <option value="USER">User Operations (USER)</option>
              <option value="ROLE">Role & Permissions (ROLE)</option>
              <option value="SECURITY">Security Protocol (SECURITY)</option>
              <option value="SYSTEM">System Events (SYSTEM)</option>
            </AppDropdown>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-end xl:self-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs shrink-0 whitespace-nowrap"
              title="Refresh audit logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs shrink-0 whitespace-nowrap"
            title="Download audit records as CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Timestamp</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Actor</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Action</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Domain</th>
                <th className="py-2.5 px-3">Event Details</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Network IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>
                          {new Date(log.timestamp).toLocaleString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{log.actorName || 'System'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.actorRole ? `${log.actorRole} · ` : ''}ID: {log.actorId || 'N/A'}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Target Type */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                        {log.targetType}
                      </span>
                    </td>

                    {/* Event Details */}
                    <td className="py-2.5 px-3 text-slate-300 leading-relaxed max-w-md">
                      {log.details}
                    </td>

                    {/* IP */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
