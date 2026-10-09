import { AppDropdown } from './AppDropdown';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, FlipHorizontal } from 'lucide-react';
import { IncidentPhotoAttachment, IncidentPhotoCategory } from '../types/drone';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (attachment: IncidentPhotoAttachment) => void;
  defaultCategory?: IncidentPhotoCategory;
  categories?: IncidentPhotoCategory[];
}

const DEFAULT_CATEGORIES: IncidentPhotoCategory[] = [
  'Hardware Crash Photo',
  'Drone Battery & Frame Imagery',
  'Detailed Log Sheet Excerpt',
  'Other Supporting Evidence',
];

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  defaultCategory = 'Hardware Crash Photo',
  categories = DEFAULT_CATEGORIES,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [selectedCategory, setSelectedCategory] = useState<IncidentPhotoCategory>(defaultCategory);
  const [caption, setCaption] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);

  // Stop video stream cleanly
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start video stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      // Check available devices for flip toggle
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        setHasMultipleCameras(false);
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let msg = 'Could not access device camera. Please verify camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera permissions in your browser or use file upload.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. You can upload an image from storage.';
      }
      setCameraError(msg);
    }
  }, [stopStream]);

  // Launch camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCaption('');
      setSelectedCategory(defaultCategory);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedImage(null);
      setCameraError(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen, defaultCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flip camera between front/back
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture snapshot from video to canvas
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, width, height);

    // Add optional timestamp watermark in bottom right
    const timestamp = new Date().toLocaleString('en-GB');
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(width - 240, height - 34, 230, 26);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--app-accent-400').trim();
    ctx.fillText(timestamp, width - 230, height - 16);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopStream();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Confirm photo and send to parent
  const handleConfirmPhoto = () => {
    if (!capturedImage) return;

    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    const attachment: IncidentPhotoAttachment = {
      id: `photo-cam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dataUrl: capturedImage,
      fileName: `camera_evidence_${timestampStr}.jpg`,
      category: selectedCategory,
      caption: caption.trim(),
      uploadedAt: now.toISOString(),
      fileSize: Math.round((capturedImage.length * 3) / 4),
    };

    onCapture(attachment);
    handleClose();
  };

  // Fallback file input change
  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedImage(dataUrl);
        setCameraError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Capture Supporting Evidence Photo
              </h3>
              <p className="text-[11px] text-slate-400">
                Snap live forensic imagery using device camera
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Hidden Canvas & Fallback Camera Input */}
          <canvas ref={canvasRef} className="hidden" />
          <input
            type="file"
            ref={fileFallbackRef}
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFileChange}
            className="hidden"
          />

          {/* Camera Viewfinder or Photo Preview */}
          <div className="relative aspect-4/3 sm:aspect-16/9 bg-black rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
            {cameraError && !capturedImage ? (
              <div className="p-6 text-center max-w-md space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-xs text-rose-200 font-medium leading-relaxed">
                  {cameraError}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileFallbackRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Device Camera / File</span>
                  </button>
                </div>
              </div>
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured forensic evidence"
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Guides */}
                <div className="absolute inset-4 pointer-events-none border border-cyan-500/30 rounded-lg flex items-center justify-center">
                  <div className="w-12 h-12 border-t-2 border-l-2 border-cyan-400 absolute top-0 left-0" />
                  <div className="w-12 h-12 border-t-2 border-r-2 border-cyan-400 absolute top-0 right-0" />
                  <div className="w-12 h-12 border-b-2 border-l-2 border-cyan-400 absolute bottom-0 left-0" />
                  <div className="w-12 h-12 border-b-2 border-r-2 border-cyan-400 absolute bottom-0 right-0" />
                  <div className="text-[10px] font-mono text-cyan-300/80 bg-black/60 px-2.5 py-1 rounded-full border border-cyan-500/40">
                    ALIGN OBJECT IN SIGHT
                  </div>
                </div>

                {/* Switch Camera Overlay Button */}
                {hasMultipleCameras && (
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-cyan-400 hover:bg-slate-900 border border-slate-700 transition-colors shadow-lg cursor-pointer"
                    title="Switch camera (Front / Back)"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Form Options for Captured or Live Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Evidence Category
              </label>
              <AppDropdown
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as IncidentPhotoCategory)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </AppDropdown>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Forensic Note / Caption
              </label>
              <input
                type="text"
                placeholder="e.g. Propeller boom fracture, battery casing deformation..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPhoto}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-md shadow-cyan-500/20 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Attach Photo</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSnapPhoto}
                disabled={!!cameraError}
                className="px-5 py-2 rounded-lg text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-500/20 cursor-pointer inline-flex items-center gap-2"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-slate-950 animate-pulse" />
                <span>Snap Photo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

