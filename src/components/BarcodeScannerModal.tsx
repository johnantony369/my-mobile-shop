import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  ScanBarcode,
  Zap,
  ZapOff,
  RotateCcw,
  Keyboard,
  AlertCircle,
  Check,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannerReady, setScannerReady] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const readerElementId = useRef(`barcode-reader-${Math.random().toString(36).substring(2, 9)}`).current;

  // Sound feedback on successful scan
  const playScanBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // 1760Hz (A6)
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio context not allowed or unsupported
    }
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(60);
      }
    } catch {
      // Haptics not supported
    }
  }, []);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;

      playScanBeep();
      triggerHaptic();

      // Stop scanner before invoking callback to prevent double fires
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          onScan(decodedText.trim());
        });
      } else {
        onScan(decodedText.trim());
      }
    },
    [onScan, playScanBeep, triggerHaptic]
  );

  // Initialize and start camera scanner
  useEffect(() => {
    if (!isOpen || isManualInput) return;

    hasScannedRef.current = false;
    setCameraError(null);
    setScannerReady(false);

    let isMounted = true;
    let html5Qr: Html5Qrcode | null = null;

    const startScanner = async () => {
      // Short delay to ensure DOM element exists inside portal
      await new Promise((r) => setTimeout(r, 120));
      if (!isMounted) return;

      const element = document.getElementById(readerElementId);
      if (!element) return;

      try {
        html5Qr = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });
        scannerRef.current = html5Qr;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const width = Math.max(220, Math.floor(minEdge * 0.88));
            const height = Math.max(140, Math.floor(minEdge * 0.52));
            return { width, height };
          },
          aspectRatio: 1.0,
        };

        await html5Qr.start(
          { facingMode },
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Frame error - frame did not contain readable code; ignore
          }
        );

        if (isMounted) {
          setScannerReady(true);
          // Check torch capability
          try {
            const track = (html5Qr as unknown as { getRunningTrack?: () => MediaStreamTrack }).getRunningTrack?.();
            const capabilities = track?.getCapabilities?.() as unknown as { torch?: boolean };
            if (capabilities && 'torch' in capabilities) {
              setHasTorch(Boolean(capabilities.torch));
            }
          } catch {
            setHasTorch(false);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn('Camera barcode scanner error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('notallowed')) {
          setCameraError('Camera permission was denied. Please allow camera access in browser settings or enter barcode manually.');
        } else {
          setCameraError('Unable to open camera stream. You can enter the barcode number manually below.');
        }
        setIsManualInput(true);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5Qr) {
        if (html5Qr.isScanning) {
          html5Qr.stop().catch(() => {}).finally(() => {
            try {
              html5Qr?.clear();
            } catch {}
          });
        } else {
          try {
            html5Qr.clear();
          } catch {}
        }
      }
      scannerRef.current = null;
    };
  }, [isOpen, isManualInput, facingMode, readerElementId, handleScanSuccess]);

  // Torch Toggle
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }] as unknown as MediaTrackConstraintSet[],
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Flip Camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    playScanBeep();
    triggerHaptic();
    onScan(clean);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none">
      {/* Top Header Bar */}
      <div className="pt-safe flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 z-20">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ScanBarcode className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-white leading-tight">{title}</h2>
            <span className="text-[11px] text-gray-400">Point at barcode or QR code</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {hasTorch && !isManualInput && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isTorchOn ? 'bg-amber-400 text-black' : 'bg-white/15 text-white active:bg-white/25'
              }`}
              title="Toggle Flashlight"
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {!isManualInput && (
            <button
              type="button"
              onClick={toggleCamera}
              className="w-9 h-9 rounded-full bg-white/15 active:bg-white/25 text-white flex items-center justify-center transition-colors"
              title="Switch Camera"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 active:bg-white/25 text-white flex items-center justify-center transition-colors ml-1"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-black">
        {!isManualInput ? (
          <>
            {/* html5-qrcode reader element */}
            <div id={readerElementId} className="w-full h-full max-w-lg mx-auto flex items-center justify-center" />

            {/* Viewfinder Overlay Frame */}
            {scannerReady && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="relative w-64 sm:w-72 h-44 rounded-2xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-iosBlue rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-iosBlue rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-iosBlue rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-iosBlue rounded-br-lg" />

                  {/* Animated laser red line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse top-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-4 text-xs font-medium text-white/80 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                  Align barcode inside frame
                </p>
              </div>
            )}

            {/* Loading state before stream starts */}
            {!scannerReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-black/90">
                <div className="w-8 h-8 border-2 border-iosBlue border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-300">Starting camera...</p>
              </div>
            )}
          </>
        ) : (
          /* Manual Code Entry Mode */
          <div className="w-full max-w-sm px-6 py-8 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto text-iosBlue">
                <Keyboard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Enter Barcode Manually</h3>
              <p className="text-xs text-gray-400">
                Type the barcode / SKU number printed under the barcode stripes
              </p>
            </div>

            {cameraError && (
              <div className="flex items-start space-x-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-200 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 8901030912345"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-base font-mono text-center text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-iosBlue"
              />

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-1.5 transition-all ${
                  manualCode.trim()
                    ? 'bg-iosBlue text-white active:scale-98'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Submit Code</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Switch Mode / Footer */}
      <div className="px-4 py-3 bg-black/90 border-t border-white/10 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-5 z-20 flex items-center justify-center">
        {!isManualInput ? (
          <button
            type="button"
            onClick={() => setIsManualInput(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white transition-all"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Type Code Manually</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCameraError(null);
              setIsManualInput(false);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white transition-all"
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            <span>Switch to Camera Scan</span>
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};
