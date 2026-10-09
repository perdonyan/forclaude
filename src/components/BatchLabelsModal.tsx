import React, { useState } from 'react';
import { DroneItem } from '../types/drone';
import { DroneBarcode } from './DroneBarcode';
import { DroneQRCode } from './DroneQRCode';
import { X, Printer, Filter, QrCode, Barcode } from 'lucide-react';

interface BatchLabelsModalProps {
  drones: DroneItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const BatchLabelsModal: React.FC<BatchLabelsModalProps> = ({
  drones,
  isOpen,
  onClose,
}) => {
  const [selectedDept, setSelectedDept] = useState<'all' | 'SSOC' | 'SSD'>('all');
  const [format, setFormat] = useState<'both' | 'barcode' | 'qr'>('both');

  const filteredDrones = drones.filter((d) => {
    if (selectedDept !== 'all' && d.department !== selectedDept) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <QrCode className="w-4 h-4 text-sky-400" />
            <span>Batch Drone Asset Label Sheets ({filteredDrones.length} Units)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Department:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedDept('all')}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedDept === 'all' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
              >
                All ({drones.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDept('SSOC')}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedDept === 'SSOC' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
              >
                SSOC ({drones.filter((d) => d.department === 'SSOC').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDept('SSD')}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedDept === 'SSD' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
              >
                SSD ({drones.filter((d) => d.department === 'SSD').length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setFormat('both')}
                className={`px-2 py-1 rounded ${
                  format === 'both' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
              >
                Barcode + QR
              </button>
              <button
                type="button"
                onClick={() => setFormat('barcode')}
                className={`px-2 py-1 rounded ${
                  format === 'barcode' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
              >
                Barcode Only
              </button>
              <button
                type="button"
                onClick={() => setFormat('qr')}
                className={`px-2 py-1 rounded ${
                  format === 'qr' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
              >
                QR Only
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All Labels</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 print:p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-2">
            {filteredDrones.map((drone) => (
              <div
                key={drone.id}
                className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex flex-col justify-between text-xs break-inside-avoid print:bg-white print:text-black print:border-black"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 print:border-black">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-sky-400 text-sm print:text-black">
                      <span>{drone.droneName}</span>
                      <span className="text-slate-400 font-normal text-xs">({drone.model})</span>
                    </div>
                    <span className="text-[10px] font-mono px-1 rounded bg-slate-900 border border-slate-800 text-slate-300 print:bg-white print:border-black print:text-black">
                      {drone.department}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-300 mb-2 truncate print:text-black">
                    SN: <strong className="select-all">{drone.droneSN}</strong>
                  </div>
                </div>

                {/* Codes */}
                <div className="py-2 flex items-center justify-around gap-2 bg-slate-900/40 rounded border border-slate-800/80 p-2 print:bg-white print:border-black">
                  {(format === 'both' || format === 'barcode') && (
                    <div className="flex flex-col items-center">
                      <DroneBarcode
                        value={drone.droneSN}
                        width={1.1}
                        height={38}
                        fontSize={9}
                        lineColor="#f1f5f9"
                      />
                    </div>
                  )}

                  {(format === 'both' || format === 'qr') && (
                    <div className="flex flex-col items-center">
                      <DroneQRCode
                        value={drone.droneSN}
                        size={format === 'qr' ? 85 : 68}
                        darkColor={getComputedStyle(document.documentElement).getPropertyValue('--app-accent-400').trim()}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono print:text-black print:border-black">
                  <span>RC: {drone.remoteSN ? drone.remoteSN.slice(0, 12) + '...' : 'NONE'}</span>
                  <span>{drone.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

