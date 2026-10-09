import { AppDropdown } from './AppDropdown';
import React, { useState } from 'react';
import { UserItem, InventoryChangeDetails } from '../types/drone';
import {
  ShieldAlert,
  Send,
  X,
  UserCheck,
  FileText,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

interface OfficerApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  changeDetails: InventoryChangeDetails | null;
  officers: UserItem[];
  currentUser: UserItem;
  onSubmitApproval: (targetOfficer: UserItem, remarks: string) => void;
}

export const OfficerApprovalModal: React.FC<OfficerApprovalModalProps> = ({
  isOpen,
  onClose,
  changeDetails,
  officers,
  currentUser,
  onSubmitApproval,
}) => {
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(() => {
    // Prefer an officer in the same department, or first available
    const sameDept = officers.find((o) => o.department === currentUser?.department);
    return sameDept ? sameDept.id : officers[0]?.id || '';
  });
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const chosenOfficer = officers.find((o) => o.id === selectedOfficerId);
    if (!chosenOfficer) {
      setError('Please select an approving officer.');
      return;
    }
    onSubmitApproval(chosenOfficer, technicianNotes.trim());
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'UPDATE':
      case 'STATUS_CHANGE':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'DELETE':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  if (!isOpen || !changeDetails) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  Officer Approval Required
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  TECHNICIAN PROTOCOL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Modifications to inventory data must be dispatched to an Officer for sign-off.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Change Summary Card */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>PROPOSED INVENTORY CHANGE</span>
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getActionBadgeColor(changeDetails.action)}`}>
              {changeDetails.action}
            </span>
          </div>

          <div className="text-slate-200 font-semibold text-xs flex items-center gap-2">
            <span className="text-sky-400 font-mono">[{changeDetails.itemType}]</span>
            <span>{changeDetails.summary}</span>
          </div>

          {/* USER CREATE Preview Card */}
          {changeDetails.itemType === 'USER' && changeDetails.action === 'CREATE' && changeDetails.proposedData && (
            <div className="mt-2 pt-2 border-t border-slate-900 space-y-1.5 font-mono text-[11px]">
              <div className="text-[10px] text-slate-500 uppercase">
                Proposed Personnel Profile:
              </div>
              <div className="p-2.5 bg-slate-900/90 rounded border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="text-slate-100 font-bold">{changeDetails.proposedData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ID / QID:</span>
                  <span className="text-sky-400">{changeDetails.proposedData.employeeId} · {changeDetails.proposedData.qatarId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rank / Group:</span>
                  <span className="text-amber-400 font-semibold">{changeDetails.proposedData.rank || '—'} ({changeDetails.proposedData.userRole || changeDetails.proposedData.userClass || 'OFFICER'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dept / Mobile:</span>
                  <span className="text-slate-300">{changeDetails.proposedData.department} · {changeDetails.proposedData.mobileNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-300 truncate max-w-[200px]">{changeDetails.proposedData.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* BATCH_DRONES Preview Card */}
          {changeDetails.itemType === 'BATCH_DRONES' && changeDetails.proposedData && (
            <div className="mt-2 pt-2 border-t border-slate-900 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>PROPOSED BATCH AIRFRAMES:</span>
                <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                  {changeDetails.proposedData.drones?.length || 0} Drones ({changeDetails.proposedData.replaceAll ? 'Replace' : 'Append'})
                </span>
              </div>
              <div className="p-2 bg-slate-900/90 rounded border border-slate-800 max-h-36 overflow-y-auto space-y-1">
                {(changeDetails.proposedData.drones || []).slice(0, 8).map((d: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                    <span className="text-slate-200 font-sans font-medium">{d.droneName || d.model}</span>
                    <span className="text-sky-400">{d.droneSN}</span>
                    <span className="text-slate-400">{d.department}</span>
                  </div>
                ))}
                {(changeDetails.proposedData.drones?.length || 0) > 8 && (
                  <div className="text-[10px] text-slate-500 text-center italic pt-1">
                    + {(changeDetails.proposedData.drones?.length || 0) - 8} more airframes in this upload batch
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diffs / Fields if available */}
          {changeDetails.diffs && changeDetails.diffs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-900 space-y-1.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase">
                Field Value Modifications:
              </div>
              {changeDetails.diffs.map((diff, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-800 text-[11px] font-mono"
                >
                  <span className="text-slate-400">{diff.label}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 line-through">
                      {String(diff.oldValue || 'None')}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-emerald-400 font-semibold">
                      {String(diff.newValue || 'None')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form to Select Officer and Send Notification */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Officer */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              SELECT APPROVING OFFICER *
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <AppDropdown
                required
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
              >
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.rank} {officer.name} — Dept: {officer.department} ({officer.email})
                  </option>
                ))}
              </AppDropdown>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              A notification message will be dispatched directly to this officer's queue.
            </p>
          </div>

          {/* Technician Remarks */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              TECHNICIAN JUSTIFICATION / REMARKS (OPTIONAL)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <textarea
                rows={2}
                placeholder="e.g. Diagnostic bench test completed. Gimbal motor replaced and awaiting air flight check."
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Notice info */}
          <div className="p-2.5 rounded bg-sky-950/40 border border-sky-900/60 text-sky-300 text-[11px] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <span>
              Your change will remain in <strong className="text-amber-300">Pending Approval</strong> state in the <strong>Notifications Tab</strong> until reviewed by the selected officer.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors cursor-pointer shadow-md shadow-amber-500/10"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send for Officer Approval</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
