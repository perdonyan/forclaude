import React, { useState } from 'react';
import { ConfiscatedDroneReport } from '../types/drone';
import {
  Printer,
  Download,
  X,
  Edit3,
  ShieldAlert,
  Image as ImageIcon,
  Maximize2,
  FileText,
  CheckCircle2,
  ChevronRight,
  Maximize,
  Sparkles,
  Paperclip,
} from 'lucide-react';

interface ConfiscatedDroneOfficialSheetProps {
  report: ConfiscatedDroneReport;
  onClose?: () => void;
  onEdit?: (report: ConfiscatedDroneReport) => void;
  isModal?: boolean;
}

export const ConfiscatedDroneOfficialSheet: React.FC<ConfiscatedDroneOfficialSheetProps> = ({
  report,
  onClose,
  onEdit,
  isModal = true,
}) => {
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [imageStretchMode, setImageStretchMode] = useState<'stretch' | 'fit'>(
    report.imageStretchMode || 'stretch'
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${report.srNumber || 'confiscated-drone-report'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const hasCorrespondence = Array.isArray(report.correspondencePhotos) && report.correspondencePhotos.length > 0;
  const totalPages = hasCorrespondence ? 2 : 1;

  const flightRecords = (
    report.flightRecords && report.flightRecords.length > 0
      ? report.flightRecords
      : [
          {
            id: 'cfr-default',
            date: report.date || '13/05/2026',
            location: 'Lusail Marina Promenade',
            coordinates: '25.4215° N, 51.5283° E',
            flightCount: 1,
            flightDuration: '18 mins',
            photos: report.evidencePhotos || [],
          },
        ]
  ).map((rec, idx) => ({
    ...rec,
    photos: Array.isArray(rec.photos) && rec.photos.length > 0
      ? rec.photos
      : idx === 0 && report.evidencePhotos && report.evidencePhotos.length > 0
      ? report.evidencePhotos
      : [],
  }));

  const sheetContent = (
    <div id="printable-confiscated-container" className="w-full space-y-6">
      {/* PAGE 1: CONFISCATED DRONE REPORT */}
      <div
        id="printable-confiscated-sheet"
        className="printable-confiscated-page bg-white text-slate-900 mx-auto font-sans shadow-2xl print:shadow-none border border-slate-300 print:border-none max-w-4xl w-full p-4 sm:p-6"
        style={{ minHeight: '840px' }}
      >
        {/* 1. Official Header Banner (Qatar UAV Team Burgundy #6b1119 / #701a23) */}
        <div className="bg-[#6b1119] text-white py-3.5 px-4 text-center rounded-xs shadow-xs mb-3 border border-[#520b13]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-wide uppercase">
            Confiscated Drone Report (UAV Team)
          </h1>
          <p className="text-[11px] text-rose-200/90 font-mono mt-0.5">
            STATE OF QATAR · MINISTRY OF INTERIOR · UNMANNED AIRCRAFT SYSTEMS COMMAND
          </p>
        </div>

        {/* 2. Top Metadata Row: DATE | LR no: | SR: */}
        <div className="grid grid-cols-3 border-2 border-[#6b1119] text-xs sm:text-sm font-medium mb-4 divide-x-2 divide-[#6b1119] bg-white">
          <div className="grid grid-cols-[80px_1fr] divide-x-2 divide-[#6b1119]">
            <div className="bg-slate-100 font-bold uppercase py-2 px-3 flex items-center justify-center text-slate-900">
              DATE
            </div>
            <div className="py-2 px-3 flex items-center justify-center font-mono font-bold text-slate-800">
              {report.date || '13/05/2026'}
            </div>
          </div>

          <div className="grid grid-cols-[80px_1fr] divide-x-2 divide-[#6b1119]">
            <div className="bg-slate-100 font-bold uppercase py-2 px-3 flex items-center justify-center text-slate-900">
              LR no:
            </div>
            <div className="py-2 px-3 flex items-center justify-center font-mono font-bold text-slate-800">
              {report.lrNumber || '1859'}
            </div>
          </div>

          <div className="grid grid-cols-[80px_1fr] divide-x-2 divide-[#6b1119]">
            <div className="bg-slate-100 font-bold uppercase py-2 px-3 flex items-center justify-center text-slate-900">
              SR:
            </div>
            <div className="py-2 px-3 flex items-center justify-center font-mono font-bold text-slate-900">
              {report.srNumber || 'UAV-CDR-2026-01'}
            </div>
          </div>
        </div>

        {/* 3. Equipment Section: DRONE MODEL | DRONE SN | REMOTE SN */}
        <div className="border-2 border-[#6b1119] mb-4">
          <div className="grid grid-cols-3 bg-[#6b1119] text-white text-xs sm:text-sm font-bold uppercase text-center divide-x-2 divide-white/40">
            <div className="py-2 px-2">DRONE MODEL</div>
            <div className="py-2 px-2">DRONE SN</div>
            <div className="py-2 px-2">REMOTE SN</div>
          </div>
          <div className="grid grid-cols-3 text-xs sm:text-sm font-mono text-center divide-x-2 divide-[#6b1119] bg-white">
            <div className="py-2.5 px-3 flex items-center justify-center font-semibold text-slate-900">
              {report.droneModel || 'Dji mini4'}
            </div>
            <div className="py-2.5 px-3 flex items-center justify-center font-bold tracking-wider text-slate-800">
              {report.droneSN || 'XXXXXXXXXXXXXXX'}
            </div>
            <div className="py-2.5 px-3 flex items-center justify-center font-bold tracking-wider text-slate-800">
              {report.remoteSN || 'XXXXXXXXXXXXXXX'}
            </div>
          </div>
        </div>

        {/* 4. Flight Telemetry & Evidence Box (Matching CDR form.png & multipleentry.png) */}
        {/* If Multiple Entries Mode is enabled, each entry displays its metrics + attached evidence photo box */}
        <div className="space-y-4 mb-4">
          {flightRecords.map((rec, index) => {
            const photos = rec.photos || [];
            return (
              <div key={rec.id || index} className="border-2 border-[#6b1119]">
                {/* Optional Entry label if multiple entries */}
                {report.hasMultipleEntries && flightRecords.length > 1 && (
                  <div className="bg-[#6b1119]/15 border-b border-[#6b1119] px-3 py-1 flex items-center justify-between text-xs font-mono font-bold text-[#6b1119]">
                    <span>FLIGHT ENTRY #{index + 1} OF {flightRecords.length}</span>
                    {photos.length > 0 && (
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#6b1119]">
                        {photos.length} Photo{photos.length > 1 ? 's' : ''} Attached
                      </span>
                    )}
                  </div>
                )}

                {/* Table Header matching multipleentry.png */}
                <div className="grid grid-cols-5 bg-[#6b1119] text-white text-[11px] sm:text-xs font-bold uppercase text-center divide-x-2 divide-white/40">
                  <div className="py-2 px-1">DATE</div>
                  <div className="py-2 px-1">LOCATION</div>
                  <div className="py-2 px-1">COORDINATES</div>
                  <div className="py-2 px-1">FLIGHT COUNT</div>
                  <div className="py-2 px-1">FLIGHT DURATION</div>
                </div>

                {/* Flight Row Values */}
                <div className="grid grid-cols-5 text-xs font-mono text-center divide-x-2 divide-[#6b1119] bg-white">
                  <div className="py-2 px-2 flex items-center justify-center text-slate-800 font-semibold">
                    {rec.date || report.date}
                  </div>
                  <div className="py-2 px-2 flex items-center justify-center text-slate-800 font-sans text-xs">
                    {rec.location || '—'}
                  </div>
                  <div className="py-2 px-2 flex items-center justify-center text-slate-800 text-[11px]">
                    {rec.coordinates || '—'}
                  </div>
                  <div className="py-2 px-2 flex items-center justify-center font-bold text-slate-900">
                    {rec.flightCount || index + 1}
                  </div>
                  <div className="py-2 px-2 flex items-center justify-center text-slate-800 font-semibold">
                    {rec.flightDuration || '—'}
                  </div>
                </div>

                {/* DEDICATED EVIDENCE PHOTO ATTACHED UNDER THIS ENTRY (Matching multipleentry.png) */}
                {/* PHOTO STRETCHED TO CHANGE RATIO AND FILL THE AREA (AS REQUESTED) */}
                <div className="border-t-2 border-[#6b1119] p-3 sm:p-4 flex flex-col justify-between relative bg-white">
                  <div className="text-[11px] font-sans italic text-slate-500 mb-2 flex items-center justify-between">
                    <span>
                      Flight Route Track&System Log Capture Evidence:
                      {report.hasMultipleEntries && (
                        <span className="not-italic text-slate-700 font-mono font-semibold ml-1.5">
                          (Entry #{index + 1})
                        </span>
                      )}
                    </span>
                    {photos.length > 0 && (
                      <span className="font-mono not-italic text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {imageStretchMode === 'stretch' ? 'Stretched to Fill Area' : 'Original Ratio'}
                      </span>
                    )}
                  </div>

                  {photos.length > 0 ? (
                    <div className="w-full space-y-3">
                      {photos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setSelectedPhotoPreview(photo)}
                          className="group relative border-2 border-slate-400 rounded-xs overflow-hidden cursor-pointer hover:border-[#6b1119] transition-all bg-black shadow-md w-full h-[260px] sm:h-[320px] print:h-[240px]"
                        >
                          <img
                            src={photo}
                            alt={`Entry ${index + 1} Evidence ${pIdx + 1}`}
                            className={`w-full h-full ${
                              imageStretchMode === 'stretch'
                                ? 'object-fill'
                                : 'object-contain'
                            }`}
                            style={{
                              objectFit: imageStretchMode === 'stretch' ? 'fill' : 'contain',
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white print:hidden">
                            <Maximize2 className="w-6 h-6 drop-shadow" />
                          </div>
                          <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded print:hidden">
                            Click to Enlarge
                          </div>
                        </div>
                      ))}

                      {rec.notes && (
                        <p className="mt-2 text-xs text-slate-600 font-mono italic">
                          Telemetry Extraction Note: {rec.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded">
                      <p className="text-slate-400 font-sans italic text-sm sm:text-base tracking-wide select-none">
                        Flight Route Track&System Log Capture Evidence:
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 print:hidden font-mono">
                        [Aeroscope RF Telemetry / DJI Fly Flight Route Replay / GPS Trajectory Export]
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. Received & Evaluated Bar: Received & Evaluated By | Capt. Tariq Al-Kuwari | EVAL DATE / TIME | 14/05/2026 | 08:30 AM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border-2 border-[#6b1119] mb-4 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#6b1119]">
          <div className="grid grid-cols-[160px_1fr] divide-x-2 divide-[#6b1119]">
            <div className="bg-[#6b1119] text-white font-bold text-xs sm:text-sm py-2.5 px-3 flex items-center justify-center text-center">
              Received & Evaluated By
            </div>
            <div className="py-2.5 px-3 flex items-center font-bold text-xs sm:text-sm text-slate-900 bg-white">
              {report.receivedBy || 'Capt. Tariq Al-Kuwari'}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] divide-x-2 divide-[#6b1119]">
            <div className="bg-[#6b1119] text-white font-bold text-xs sm:text-sm py-2.5 px-3 flex items-center justify-center text-center">
              EVAL DATE / TIME
            </div>
            <div className="py-2.5 px-3 flex items-center justify-between font-mono font-bold text-xs sm:text-sm text-emerald-800 bg-white border-2 border-emerald-600 sm:border-none">
              <span>{report.evalDateTime || '14/05/2026 | 08:30 AM'}</span>
            </div>
          </div>
        </div>

        {/* 6. Field System Notes Box: FIELD SYSTEM NOTES: | textarea content */}
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] border-2 border-[#6b1119] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#6b1119] min-h-[140px]">
          <div className="bg-slate-100 font-bold text-xs sm:text-sm py-4 px-4 flex items-center justify-center text-center text-slate-900 tracking-wider">
            FIELD SYSTEM NOTES:
          </div>
          <div className="py-3 px-4 font-mono text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-white flex flex-col justify-start">
            {report.fieldSystemNotes || (
              <span className="text-slate-400 italic font-sans">
                No technical or custody notes recorded for this confiscation report.
              </span>
            )}
          </div>
        </div>

        {/* Formal Footer / Authority Seal */}
        <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div>
            <span>MINISTRY OF INTERIOR · STATE OF QATAR · UAV INTERCEPT & LAW ENFORCEMENT SECTION</span>
          </div>
          <div className="flex items-center gap-3">
            <span>CLASSIFICATION: LAW ENFORCEMENT SENSITIVE</span>
            <span className="font-bold text-[#6b1119]">PAGE 1 OF {totalPages}</span>
          </div>
        </div>
      </div>

      {/* PAGE 2: OFFICIAL CORRESPONDENCE / ENDORSEMENT LETTER ATTACHMENT (AS REQUESTED) */}
      {hasCorrespondence && (
        <div
          id="printable-correspondence-sheet"
          className="print-page-break break-before-page printable-confiscated-page bg-white text-slate-900 mx-auto font-sans shadow-2xl print:shadow-none border border-slate-300 print:border-none max-w-4xl w-full p-4 sm:p-6"
          style={{ minHeight: '840px' }}
        >
          {/* Official Page 2 Header Banner */}
          <div className="bg-[#6b1119] text-white py-3.5 px-4 text-center rounded-xs shadow-xs mb-3 border border-[#520b13]">
            <h2 className="text-xl sm:text-2xl font-bold tracking-wide uppercase">
              Official Correspondence / Endorsement Letter
            </h2>
            <p className="text-[11px] text-rose-200/90 font-mono mt-0.5">
              ANNEX A · CUSTODY TRANSFER & PROSECUTION SUBMISSION RECORD
            </p>
          </div>

          {/* Correspondence Meta Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-2 border-[#6b1119] text-xs font-mono mb-4 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#6b1119] bg-white">
            <div className="p-2 sm:p-2.5 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase block font-sans">LETTER REF NO:</span>
              <span className="font-bold text-rose-900">{report.correspondenceLetterRef || `MOI/UAV-CDR/${report.lrNumber}/2026`}</span>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase block font-sans">LETTER DATE:</span>
              <span className="font-bold text-slate-900">{report.correspondenceLetterDate || report.date || '14/05/2026'}</span>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase block font-sans">RELATED CASE:</span>
              <span className="font-bold text-slate-900">LR #{report.lrNumber} / {report.srNumber}</span>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase block font-sans">RECEIVING OFFICER:</span>
              <span className="font-bold text-[#6b1119]">{report.receivedBy || 'Capt. Tariq Al-Kuwari'}</span>
            </div>
          </div>

          {/* Letter Notes or Subject Description */}
          {report.correspondenceNotes && (
            <div className="mb-4 p-3 bg-amber-50/60 border border-amber-300 rounded text-xs font-mono text-amber-950">
              <span className="font-bold font-sans uppercase text-[10px] text-amber-800 block mb-0.5">
                Official Letter Endorsement Notes:
              </span>
              {report.correspondenceNotes}
            </div>
          )}

          {/* High-Resolution Document Display Canvas */}
          <div className="space-y-4 mb-4">
            {report.correspondencePhotos?.map((letterPhoto, lIdx) => (
              <div
                key={lIdx}
                onClick={() => setSelectedPhotoPreview(letterPhoto)}
                className="border-2 border-[#6b1119] rounded-xs overflow-hidden shadow-lg bg-slate-50 cursor-pointer hover:border-rose-700 transition-all relative group"
              >
                <div className="bg-slate-100 border-b border-slate-300 px-3 py-1.5 flex items-center justify-between text-xs text-slate-600 print:hidden">
                  <span className="font-mono font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#6b1119]" />
                    <span>Scanned Correspondence Document #{lIdx + 1}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" />
                    <span>Click to View Full Size</span>
                  </span>
                </div>

                <div className="w-full flex items-center justify-center p-2 sm:p-4 bg-white min-h-[500px]">
                  <img
                    src={letterPhoto}
                    alt={`Correspondence Letter Document ${lIdx + 1}`}
                    className="max-w-full w-auto max-h-[850px] object-contain shadow-sm border border-slate-200"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Page 2 Formal Footer */}
          <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <div>
              <span>MINISTRY OF INTERIOR · STATE OF QATAR · UAV EVIDENCE & LEGAL DISPOSITION SECTION</span>
            </div>
            <div className="flex items-center gap-3">
              <span>ATTACHED ANNEX A</span>
              <span className="font-bold text-[#6b1119]">PAGE 2 OF {totalPages}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!isModal) {
    return sheetContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Action Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#6b1119]/30 border border-[#6b1119] flex items-center justify-center text-rose-300">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
                  CONFISCATED DRONE REPORT · {report.srNumber}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#6b1119]/30 text-rose-300 border border-[#6b1119]">
                  {report.status || 'CONFISCATED'}
                </span>
                {report.hasMultipleEntries && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    MULTIPLE ENTRIES ({flightRecords.length})
                  </span>
                )}
                {hasCorrespondence && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    <span>2 PAGES (LETTER ATTACHED)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Law Report: #{report.lrNumber} · Drone: {report.droneModel} ({report.droneSN})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Image Stretch Toggle */}
            <button
              type="button"
              onClick={() => setImageStretchMode((prev) => (prev === 'stretch' ? 'fit' : 'stretch'))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                imageStretchMode === 'stretch'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle whether uploaded photos stretch to fill the evidence area"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {imageStretchMode === 'stretch' ? 'Area Stretched (Active)' : 'Fit Ratio'}
              </span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(report)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                title="Edit this report"
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Edit Report</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
              title="Export as JSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6b1119] bg-[#6b1119] text-xs font-bold text-white hover:bg-[#851621] transition-colors cursor-pointer shadow-xs"
              title="Print official document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {totalPages > 1 ? `Both Pages (${totalPages})` : 'Form'}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Document Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 flex justify-center">
          {sheetContent}
        </div>
      </div>

      {/* Lightbox Preview for Evidence Image */}
      {selectedPhotoPreview && (
        <div
          onClick={() => setSelectedPhotoPreview(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedPhotoPreview}
              alt="Evidence Full View"
              className="max-w-full max-h-[85vh] rounded-md shadow-2xl object-contain"
            />
            <button
              onClick={() => setSelectedPhotoPreview(null)}
              className="absolute top-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
