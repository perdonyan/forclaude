import React, { useState } from 'react';
import { DroneItem, UserItem } from '../types/drone';
import { Download, Upload, Copy, Check, FileSpreadsheet, AlertCircle, RefreshCw, UploadCloud } from 'lucide-react';

interface ExcelManagerProps {
  drones: DroneItem[];
  onImportDrones: (imported: DroneItem[], replaceAll: boolean) => void;
  onResetOriginalData: () => void;
  onOpenBatchUpload?: () => void;
}

export const ExcelManager: React.FC<ExcelManagerProps> = ({
  drones,
  onImportDrones,
  onResetOriginalData,
  onOpenBatchUpload,
}) => {
  // Convert DroneItem array to exact CSV string
  const generateCsv = (items: DroneItem[]) => {
    const header = 'Model,Drone Name,Drone SN,Remote SN,Email,Department,Status';
    const rows = items.map(
      (d) => `${d.model},${d.droneName},${d.droneSN},${d.remoteSN},${d.email},${d.department},${d.status}`
    );
    return [header, ...rows].join('\n');
  };

  const [csvContent, setCsvContent] = useState<string>(() => generateCsv(drones));
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | null }>({
    text: '',
    type: null,
  });

  // Keep synced if drones change externally
  React.useEffect(() => {
    setCsvContent(generateCsv(drones));
  }, [drones]);

  const handleCopy = () => {
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `drone_fleet_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (replaceAll: boolean) => {
    try {
      const lines = csvContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        setStatusMsg({ text: 'No CSV data provided.', type: 'error' });
        return;
      }

      // Check header
      const headerIdx = lines.findIndex(
        (l) => l.toLowerCase().includes('model') && l.toLowerCase().includes('drone name')
      );
      const dataLines = headerIdx !== -1 ? lines.slice(headerIdx + 1) : lines;

      const parsed: DroneItem[] = [];

      dataLines.forEach((line, index) => {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 7) {
          const [model, droneName, droneSN, remoteSN, email, department, status] = parts;
          if (droneName || droneSN) {
            parsed.push({
              id: `imported-${Date.now()}-${index}`,
              model: model || 'UAV',
              droneName: droneName || `D-${index + 1}`,
              droneSN: droneSN || 'UNKNOWN_SN',
              remoteSN: remoteSN || '',
              email: email || '',
              department: (department === 'SSD' ? 'SSD' : 'SSOC') as any,
              status: status || 'ACTIVE',
            });
          }
        }
      });

      if (parsed.length === 0) {
        setStatusMsg({
          text: 'No valid drone rows detected. Ensure columns match: Model,Drone Name,Drone SN,Remote SN,Email,Department,Status',
          type: 'error',
        });
        return;
      }

      onImportDrones(parsed, replaceAll);
      setStatusMsg({
        text: `Successfully loaded ${parsed.length} drone items into the inventory!`,
        type: 'success',
      });
    } catch {
      setStatusMsg({
        text: 'Failed to parse Excel CSV data. Please check delimiter and row format.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>Excel & CSV Data Synchronizer</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Strict schema: <code className="text-sky-300 font-mono">Model,Drone Name,Drone SN,Remote SN,Email,Department,Status</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBatchUpload && (
              <button
                onClick={onOpenBatchUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-950" />
                <span>Open Batch Uploader</span>
              </button>
            )}
            <button
              onClick={onResetOriginalData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Reset to Original 118 Drones</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor & Raw Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Raw Excel Dataset ({drones.length} Records)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Download .CSV</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          rows={14}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 selection:bg-sky-900 selection:text-white"
          placeholder="Model,Drone Name,Drone SN,Remote SN,Email,Department,Status"
        />

        {statusMsg.type && (
          <div
            className={`mt-3 p-3 rounded-md text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-800 text-rose-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            You can edit rows directly above or paste new Excel CSV data.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleImport(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Append Rows</span>
            </button>

            <button
              onClick={() => handleImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-950" />
              <span>Overwrite with Editor Content</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
