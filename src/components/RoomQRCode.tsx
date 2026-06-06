import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check } from 'lucide-react';

interface Props {
  roomId: string;
}

export function RoomQRCode({ roomId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 180,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    }
  }, [joinUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text:', err);
        // fallback alert or notice if needed
      });
  };

  return (
    <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="bg-white p-2 rounded-xl">
        <canvas ref={canvasRef} />
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">房間代碼</p>
        <p className="text-3xl font-black text-white tracking-[0.2em] font-mono">{roomId}</p>
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        <span>{copied ? '已複製連結' : '複製邀請連結'}</span>
      </button>
    </div>
  );
}
