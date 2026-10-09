import React, { useState } from 'react';
import { DroneItem, HandoverFormRecord } from '../types/drone';
import { getIssuedHandoverForDrone } from '../utils/handoverUtils';
import { DroneBarcode } from './DroneBarcode';
import { DroneQRCode } from './DroneQRCode';
import { X, Printer, Copy, Check, QrCode, Barcode, Radio, Shield, Download, FileText, ExternalLink } from 'lucide-react';

interface DroneAssetTagModalProps {
  drone: DroneItem | null;
  handoverForms?: HandoverFormRecord[];
  onNavigateToHandover?: (formId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DroneAssetTagModal: React.FC<DroneAssetTagModalProps> = ({
  drone,
  handoverForms = [],
  onNavigateToHandover,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrMode, setQrMode] = useState<'droneSN' | 'remoteSN' | 'fullJSON'>('droneSN');

  if (!isOpen || !drone) return null;

  const issuedHandover = getIssuedHandoverForDrone(drone, handoverForms);

  const handleCopySN = () => {
    navigator.clipboard.writeText(drone.droneSN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getQRValue = () => {
    if (qrMode === 'remoteSN') {
      return drone.remoteSN || 'MISSING_REMOTE_SN';
    }
    if (qrMode === 'fullJSON') {
      return JSON.stringify({
        model: drone.model,
        name: drone.droneName,
        droneSN: drone.droneSN,
        remoteSN: drone.remoteSN,
        dept: drone.department,
        email: drone.email,
        status: drone.status,
      });
    }
    return drone.droneSN;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <QrCode className="w-4 h-4 text-sky-400" />
            <span>Drone Hardware Asset Tag & Codes</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Issued Handover Notice Banner */}
          {issuedHandover && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-200">
                    Currently Issued under Handover Document: <strong className="font-mono text-emerald-300">{issuedHandover.form.srNumber}</strong>
                  </div>
                  <div className="text-[11px] text-emerald-300/80 mt-0.5">
                    Assigned to: {issuedHandover.form.recipientName} ({issuedHandover.form.recipientEmpId}) · Date: {issuedHandover.form.dateIssued}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToHandover?.(issuedHandover.form.id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-200 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700 rounded-md transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
              >
                <span>View Handover Doc</span>
                <ExternalLink className="w-3 h-3 text-emerald-300" />
              </button>
            </div>
          )}

          {/* Physical Asset Tag Preview Card */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-lg relative overflow-hidden print:border-black print:bg-white print:text-black">
            {/* Header banner */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="font-bold tracking-wider text-xs text-slate-200 uppercase font-mono">
                  MOI {drone.department} DRONE ASSET TAG
                </span>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                drone.status === 'ACTIVE'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-amber-950 text-amber-300 border border-amber-800/60'
              }`}>
                {drone.status}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-5 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Model</span>
                <span className="font-semibold text-slate-100 text-sm">{drone.model}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Drone Name</span>
                <span className="font-mono font-bold text-sky-400 text-sm">{drone.droneName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Drone SN</span>
                <span className="font-mono text-slate-200 select-all font-medium text-xs break-all">
                  {drone.droneSN}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Remote Controller SN</span>
                <span className="font-mono text-slate-300 select-all text-xs break-all">
                  {drone.remoteSN || 'None / Missing'}
                </span>
              </div>
            </div>

            {/* Scannable Codes Section */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Barcode side */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-2">
                  <Barcode className="w-3.5 h-3.5 text-sky-400" />
                  <span>Code 128 Barcode (Drone SN)</span>
                </div>
                <DroneBarcode
                  value={drone.droneSN}
                  width={1.4}
                  height={50}
                  fontSize={11}
                  lineColor="#f1f5f9"
                />
              </div>

              {/* QR Code side */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-2">
                  <QrCode className="w-3.5 h-3.5 text-sky-400" />
                  <span>Quick Response (QR) Code</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <DroneQRCode
                    value={getQRValue()}
                    size={110}
                    darkColor={getComputedStyle(document.documentElement).getPropertyValue('--app-accent-400').trim()}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-1.5">
                  Payload: {qrMode === 'droneSN' ? 'Drone SN' : qrMode === 'remoteSN' ? 'Remote SN' : 'Full JSON'}
                </span>
              </div>
            </div>

            {/* Footer with email and ID */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>MOI Custody: {drone.email}</span>
              <span>Dept: {drone.department}</span>
            </div>
          </div>

          {/* QR Code Payload Selector */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2">
            <span className="text-slate-400 font-medium block">
              QR Code Content Mode:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setQrMode('droneSN')}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  qrMode === 'droneSN'
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Drone SN
              </button>
              <button
                type="button"
                onClick={() => setQrMode('remoteSN')}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  qrMode === 'remoteSN'
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Remote SN
              </button>
              <button
                type="button"
                onClick={() => setQrMode('fullJSON')}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  qrMode === 'fullJSON'
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full Asset JSON
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopySN}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Serial Number Copied!' : 'Copy Drone SN'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>Print Asset Label</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

