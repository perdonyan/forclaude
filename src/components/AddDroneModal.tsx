import { canApproveRequests, GroupPrivileges } from '../types/drone';
import { AppDropdown } from './AppDropdown';
import React, { useState, useEffect } from 'react';
import { DroneItem, UserItem } from '../types/drone';
import { X, Plane, ShieldAlert, UserCheck, Send, Scan } from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface AddDroneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (drone: DroneItem, targetOfficer?: UserItem, remarks?: string) => void;
  droneToEdit?: DroneItem | null;
  currentUser?: UserItem | null;
  groupPrivileges?: GroupPrivileges;
  officers?: UserItem[];
}

export const AddDroneModal: React.FC<AddDroneModalProps> = ({
  isOpen,
  onClose,
  onSave,
  droneToEdit,
  currentUser,
  groupPrivileges,
  officers = [],
}) => {
  const isTechnician = !canApproveRequests(groupPrivileges,currentUser);
  const availableOfficers = officers.length > 0 ? officers : [];

  const [model, setModel] = useState('AIR 2S');
  const [droneName, setDroneName] = useState('');
  const [droneSN, setDroneSN] = useState('');
  const [remoteSN, setRemoteSN] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<'SSOC' | 'SSD'>('SSOC');
  const [status, setStatus] = useState<string>('ACTIVE');

  // Officer Approval Protocol State
  const [selectedApprovingOfficerId, setSelectedApprovingOfficerId] = useState<string>(() => {
    const sameDept = availableOfficers.find((o) => o.department === (currentUser?.department || 'SSOC'));
    return sameDept ? sameDept.id : availableOfficers[0]?.id || '';
  });
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [requireOfficerApproval, setRequireOfficerApproval] = useState(true);
  const [scannerTarget, setScannerTarget] = useState<'droneSN' | 'remoteSN' | null>(null);

  useEffect(() => {
    if (droneToEdit) {
      setModel(droneToEdit.model);
      setDroneName(droneToEdit.droneName);
      setDroneSN(droneToEdit.droneSN);
      setRemoteSN(droneToEdit.remoteSN);
      setEmail(droneToEdit.email);
      setDepartment(droneToEdit.department === 'SSD' ? 'SSD' : 'SSOC');
      setStatus(droneToEdit.status);
      setRequireOfficerApproval(false);
    } else {
      setModel('AIR 2S');
      setDroneName('');
      setDroneSN('');
      setRemoteSN('');
      setEmail('drone@moi.gov.qa');
      setDepartment('SSOC');
      setStatus('ACTIVE');
      setRequireOfficerApproval(true);
      setApprovalRemarks('');
      const defaultOfficer = availableOfficers.find((o) => o.department === (currentUser?.department || 'SSOC')) || availableOfficers[0];
      if (defaultOfficer) {
        setSelectedApprovingOfficerId(defaultOfficer.id);
      }
    }
  }, [droneToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: DroneItem = {
      id: droneToEdit ? droneToEdit.id : `drone-${Date.now()}`,
      model: model.trim(),
      droneName: droneName.trim(),
      droneSN: droneSN.trim(),
      remoteSN: remoteSN.trim(),
      email: email.trim(),
      department,
      status,
    };

    if (droneToEdit) {
      onSave(payload);
    } else {
      if (isTechnician || requireOfficerApproval) {
        const targetOfficer = availableOfficers.find((o) => o.id === selectedApprovingOfficerId) || availableOfficers[0];
        onSave(payload, targetOfficer, approvalRemarks.trim());
      } else {
        onSave(payload);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100 font-semibold">
            <Plane className="w-4 h-4 text-sky-400" />
            <span>{droneToEdit ? 'Edit Drone Record' : 'Register New Drone'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form adhering directly to Excel columns */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Department Picker */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Department
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setDepartment('SSOC')}
                className={`py-1.5 rounded-md font-medium text-xs transition-colors ${
                  department === 'SSOC'
                    ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SSOC
              </button>
              <button
                type="button"
                onClick={() => setDepartment('SSD')}
                className={`py-1.5 rounded-md font-medium text-xs transition-colors ${
                  department === 'SSD'
                    ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SSD
              </button>
            </div>
          </div>

          {/* Model & Drone Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Model
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. AIR 2S, M30, M300"
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Drone Name
              </label>
              <input
                type="text"
                required
                value={droneName}
                onChange={(e) => setDroneName(e.target.value)}
                placeholder="e.g. A30, M30- Y"
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Drone SN & Remote SN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-medium">
                  Drone Serial Number (Drone SN) *
                </label>
                <button
                  type="button"
                  onClick={() => setScannerTarget('droneSN')}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono cursor-pointer"
                  title="Scan barcode using camera"
                >
                  <Scan className="w-3 h-3" />
                  <span>Scan Barcode</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={droneSN}
                  onChange={(e) => setDroneSN(e.target.value)}
                  placeholder="e.g. 3YTBJB500301X3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md pl-3 pr-8 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setScannerTarget('droneSN')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 cursor-pointer"
                  title="Scan barcode using camera"
                >
                  <Scan className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-medium">
                  Remote Serial Number (Remote SN)
                </label>
                <button
                  type="button"
                  onClick={() => setScannerTarget('remoteSN')}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono cursor-pointer"
                  title="Scan barcode using camera"
                >
                  <Scan className="w-3 h-3" />
                  <span>Scan Barcode</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={remoteSN}
                  onChange={(e) => setRemoteSN(e.target.value)}
                  placeholder="e.g. 4QQZJBA00301ZF or MISSING RC"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md pl-3 pr-8 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setScannerTarget('remoteSN')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 cursor-pointer"
                  title="Scan barcode using camera"
                >
                  <Scan className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Email & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="droneXX@moi.gov.qa"
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Status
              </label>
              <AppDropdown
                value={status}
                    disabled={droneToEdit?.status === 'CRASHED'}
                    title={droneToEdit?.status === 'CRASHED' ? 'CRASHED is permanent for all users, including administrators.' : undefined}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="UNDER REPAIR">UNDER REPAIR</option>
                <option value="CRASHED">CRASHED</option>
                <option value="MISSING">MISSING</option>
              </AppDropdown>
            </div>
          </div>

          {/* Officer Approval Protocol Section (For Adding New Drone) */}
          {!droneToEdit && (
            <div className="p-3.5 rounded-lg border bg-slate-950/80 space-y-3 border-amber-900/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">
                      Officer Approval Protocol
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isTechnician
                        ? 'Adding new drone airframes requires review and approval by a designated Officer.'
                        : 'Route new drone registration to an approving Officer for official sign-off.'}
                    </p>
                  </div>
                </div>

                {!isTechnician && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 shrink-0">
                    <input
                      type="checkbox"
                      checked={requireOfficerApproval}
                      onChange={(e) => setRequireOfficerApproval(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span className="font-medium text-[11px]">Require Officer Sign-off</span>
                  </label>
                )}
              </div>

              {(isTechnician || requireOfficerApproval) && availableOfficers.length > 0 && (
                <div className="pt-2 border-t border-slate-900 space-y-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                      DESIGNATED APPROVING OFFICER *
                    </label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <AppDropdown
                        required={isTechnician || requireOfficerApproval}
                        value={selectedApprovingOfficerId}
                        onChange={(e) => setSelectedApprovingOfficerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        {availableOfficers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.rank} {off.name} — {off.department} ({off.email})
                          </option>
                        ))}
                      </AppDropdown>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      This officer will receive a notification to verify serial numbers and authorize adding this airframe.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                      REGISTRATION REMARKS / JUSTIFICATION NOTE
                    </label>
                    <textarea
                      rows={2}
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      placeholder="e.g. Sortie drone reinforcement; new airframe allocated to SSOC perimeter operations."
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {droneToEdit ? (
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            ) : isTechnician || requireOfficerApproval ? (
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5 text-slate-950" />
                <span>Submit for Officer Approval</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRequireOfficerApproval(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 rounded transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Request Sign-off</span>
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  Direct Add Drone
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Barcode Scanner Modal using Device Camera */}
      <BarcodeScannerModal
        isOpen={scannerTarget !== null}
        onClose={() => setScannerTarget(null)}
        onScan={(scannedCode) => {
          if (scannerTarget === 'droneSN') {
            setDroneSN(scannedCode);
          } else if (scannerTarget === 'remoteSN') {
            setRemoteSN(scannedCode);
          }
        }}
        title={scannerTarget === 'droneSN' ? 'Scan Drone Serial Number Barcode' : 'Scan Remote Serial Number Barcode'}
        subtitle={`Point camera at the barcode or QR code to autofill ${scannerTarget === 'droneSN' ? 'Drone SN' : 'Remote SN'}`}
      />
    </div>
  );
};
