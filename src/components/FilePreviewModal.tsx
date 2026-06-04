import { useEffect, useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import type { FileTransferState } from '../types';

interface Props {
  transfer: FileTransferState;
  onClose: () => void;
  onDownload: () => void;
}

export function FilePreviewModal({ transfer, onClose, onDownload }: Props) {
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState(false);

  const { blob, name, size } = transfer;

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    // Check if it is a text-like file
    const isText = 
      blob.type.startsWith('text/') || 
      blob.type === 'application/json' || 
      blob.type === 'application/javascript' || 
      name.endsWith('.txt') || 
      name.endsWith('.md') || 
      name.endsWith('.json') || 
      name.endsWith('.js') || 
      name.endsWith('.ts') || 
      name.endsWith('.tsx') || 
      name.endsWith('.css') || 
      name.endsWith('.html');

    if (isText) {
      setLoadingText(true);
      blob.text()
        .then((text) => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch(() => {
          setTextContent('無法讀取此檔案的文字內容。');
          setLoadingText(false);
        });
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob, name]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    if (!blob) return null;

    const mime = blob.type.toLowerCase();

    // 1. Image
    if (mime.startsWith('image/')) {
      return (
        <div className="flex justify-center items-center p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
          <img src={objectUrl} alt={name} className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl" />
        </div>
      );
    }

    // 2. Video
    if (mime.startsWith('video/')) {
      return (
        <div className="flex justify-center items-center bg-black rounded-2xl overflow-hidden border border-slate-800">
          <video src={objectUrl} controls className="max-w-full max-h-[60vh]" />
        </div>
      );
    }

    // 3. Audio
    if (mime.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-905 border border-slate-800 rounded-2xl gap-4">
          <div className="p-6 bg-blue-600/10 rounded-full text-blue-400">
            <FileText className="w-12 h-12" />
          </div>
          <audio src={objectUrl} controls className="w-full max-w-md" />
        </div>
      );
    }

    // 4. PDF
    if (mime === 'application/pdf') {
      return (
        <div className="w-full h-[60vh] rounded-2xl overflow-hidden border border-slate-800 bg-white">
          <iframe src={objectUrl} className="w-full h-full border-0" title={name} />
        </div>
      );
    }

    // 5. Text / Code
    const isText = 
      mime.startsWith('text/') || 
      mime === 'application/json' || 
      mime === 'application/javascript' || 
      name.endsWith('.txt') || 
      name.endsWith('.md') || 
      name.endsWith('.json') || 
      name.endsWith('.js') || 
      name.endsWith('.ts') || 
      name.endsWith('.tsx') || 
      name.endsWith('.css') || 
      name.endsWith('.html');

    if (isText) {
      if (loadingText) {
        return (
          <div className="flex items-center justify-center h-48 text-slate-400">
            正在載入檔案內容...
          </div>
        );
      }
      return (
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 overflow-hidden">
          <pre className="w-full max-h-[60vh] overflow-auto text-left text-xs font-mono text-slate-300 whitespace-pre-wrap break-all select-text">
            {textContent}
          </pre>
        </div>
      );
    }

    // 6. Unsupported preview
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 border border-slate-800 rounded-2xl text-center gap-4">
        <div className="p-4 bg-slate-800 text-slate-400 rounded-2xl">
          <FileText className="w-12 h-12" />
        </div>
        <div>
          <h4 className="text-white font-bold text-lg">{name}</h4>
          <p className="text-slate-400 text-sm mt-1">此檔案格式 ({mime || '未知'}) 不支援線上預覽</p>
          <p className="text-slate-500 text-xs mt-0.5">您可以直接下載並使用您裝置上的應用程式開啟</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-slate-800 rounded-xl text-slate-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate pr-4">{name}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{formatSize(size)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800/85 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            關閉
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20"
          >
            <Download className="w-4 h-4" />
            儲存檔案
          </button>
        </div>
      </div>
    </div>
  );
}
