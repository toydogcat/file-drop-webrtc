import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface Props {
  onScan: (roomId: string) => void;
  onClose: () => void;
}

export function CameraQRScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        try {
          const url = new URL(decodedText);
          const room = url.searchParams.get('room');
          if (room) {
            onScan(room);
            scannerRef.current?.clear();
          }
        } catch (e) {
          // If not a URL, try to use the text as room ID if it matches 8 chars
          if (decodedText.length === 8) {
            onScan(decodedText.toUpperCase());
            scannerRef.current?.clear();
          }
        }
      },
      (_error) => {
        // console.warn(error);
      }
    );

    return () => {
      scannerRef.current?.clear();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white">掃描 QR Code</h3>
            <p className="text-slate-400 text-sm mt-1">對準朋友的螢幕進行掃描</p>
          </div>
          <div id="qr-reader" className="overflow-hidden rounded-2xl border border-slate-800 bg-black" />
        </div>
      </div>
    </div>
  );
}
