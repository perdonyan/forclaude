import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Scan, X, Camera, RefreshCw, Upload, Check, AlertCircle, Sparkles } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedSerial: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Asset Serial Number',
  subtitle = 'Point camera at the 1D Barcode (Code 128 / 39) or 2D QR Code on the asset tag',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = useRef(`barcode-reader-${Math.random().toString(36).substring(2, 9)}`);

  // Audio beep feedback using Web Audio API (zero external assets needed)
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    } catch {}
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn('Error stopping barcode scanner:', err);
      }
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async () => {
    setErrorMsg(null);
    setScannedResult(null);

    // Stop previous instance if any
    await stopScanner();

    // Give DOM a tick to guarantee container is rendered
    setTimeout(async () => {
      const element = document.getElementById(containerId.current);
      if (!element) return;

      try {
        const html5QrCode = new Html5Qrcode(containerId.current, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });

        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            const cleanCode = decodedText.trim();
            if (cleanCode) {
              playBeep();
              setScannedResult(cleanCode);
              stopScanner();
              // Small delay for visual feedback then trigger callback
              setTimeout(() => {
                onScan(cleanCode);
                onClose();
              }, 450);
            }
          },
          () => {
            // Frame parse failure - standard while scanning
          }
        );

        setIsScanning(true);
      } catch (err: any) {
        console.warn('Failed to start barcode camera:', err);
        let msg = 'Camera access failed. Please ensure camera permissions are granted.';
        if (err.name === 'NotAllowedError') {
          msg = 'Camera permission denied. Please enable camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          msg = 'No camera found on this device. You can scan from an image or type the serial number.';
        }
        setErrorMsg(msg);
        setIsScanning(false);
      }
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setScannedResult(null);
      setErrorMsg(null);
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // File barcode scan fallback
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId.current);
      }
      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        playBeep();
        const clean = decodedText.trim();
        setScannedResult(clean);
        setTimeout(() => {
          onScan(clean);
          onClose();
        }, 400);
      }
    } catch {
      setErrorMsg('No valid barcode or QR code detected in the selected image. Please try another image.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleScanFile}
            className="hidden"
          />

          <div className="relative aspect-4/3 bg-black rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
            {/* Scanned Success Confirmation */}
            {scannedResult ? (
              <div className="p-6 text-center space-y-3 z-20">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block font-semibold">
                    Barcode Detected
                  </span>
                  <span className="text-base font-mono font-bold text-slate-100 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 mt-1 inline-block">
                    {scannedResult}
                  </span>
                </div>
              </div>
            ) : errorMsg ? (
              <div className="p-6 text-center max-w-sm space-y-3 z-20">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-xs text-rose-200 font-medium leading-relaxed">
                  {errorMsg}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={startScanner}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Html5Qrcode Reader Mount Point */}
            <div
              id={containerId.current}
              className={`w-full h-full ${scannedResult || errorMsg ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            />

            {/* Animated Laser Reticle Overlay */}
            {isScanning && !scannedResult && !errorMsg && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-40 border-2 border-sky-400/80 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)] flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-l-2 border-sky-400 -mt-2 -ml-2" />
                    <span className="w-4 h-4 border-t-2 border-r-2 border-sky-400 -mt-2 -mr-2" />
                  </div>

                  {/* Red/Cyan scanning laser line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_var(--app-accent-400)] animate-pulse" />

                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-l-2 border-sky-400 -mb-2 -ml-2" />
                    <span className="w-4 h-4 border-b-2 border-r-2 border-sky-400 -mb-2 -mr-2" />
                  </div>

                  <div className="absolute -bottom-7 left-0 right-0 text-center">
                    <span className="text-[10px] font-mono text-cyan-300 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      SCANNING BARCODE...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Manual Input */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Can't scan with camera?</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Upload barcode image</span>
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Or type/paste serial number manually..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>Supports 1D Code-128, Code-39, QR & 2D tags</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

