import { useState, useEffect } from 'react';
import type { FileMetadata, FileTransferState } from '../types';
import { Download, FileText, CheckCircle2, Loader2, Info, Eye } from 'lucide-react';
import { FilePreviewModal } from './FilePreviewModal';

interface Props {
  roomId: string;
  filesList: FileMetadata[];
  activeTransfers: FileTransferState[];
  onRequestFile: (id: string, action: 'preview' | 'download') => void;
  isPeerConnected: boolean;
}

export function GuestView({ filesList, activeTransfers, onRequestFile, isPeerConnected }: Props) {
  const [previewTransfer, setPreviewTransfer] = useState<FileTransferState | null>(null);
  const [pendingPreviewId, setPendingPreviewId] = useState<string | null>(null);

  const handlePreviewRequest = (fileId: string) => {
    const existing = activeTransfers.find(t => t.id === fileId);
    if (existing && existing.status === 'completed') {
      setPreviewTransfer(existing);
    } else {
      setPendingPreviewId(fileId);
      onRequestFile(fileId, 'preview');
    }
  };

  useEffect(() => {
    if (pendingPreviewId) {
      const transfer = activeTransfers.find(t => t.id === pendingPreviewId);
      if (transfer && transfer.status === 'completed') {
        setPreviewTransfer(transfer);
        setPendingPreviewId(null);
      } else if (transfer && transfer.status === 'failed') {
        setPendingPreviewId(null);
      }
    }
  }, [activeTransfers, pendingPreviewId]);
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (file: FileTransferState) => {
    if (file.blob) {
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white">房主分享的檔案 ({filesList.length})</h3>
            {!isPeerConnected && (
              <span className="text-[10px] bg-amber-950/50 text-amber-400 px-2 py-0.5 rounded-full border border-amber-900/30 flex items-center gap-1">
                <Info className="w-3 h-3" />
                連線建立中
              </span>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-800">
          {filesList.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm italic">房主尚未分享任何檔案</div>
          ) : (
            filesList.map((file) => {
              const transfer = activeTransfers.find(t => t.id === file.id);
              const isTransferring = transfer?.status === 'transferring';
              const isCompleted = transfer?.status === 'completed';

              return (
                <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-950/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setPreviewTransfer(transfer!)}
                          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          預覽
                        </button>
                        <button 
                          onClick={() => handleDownload(transfer!)}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          儲存檔案
                        </button>
                      </div>
                    ) : isTransferring ? (
                      <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="text-xs font-bold text-slate-300">
                          {transfer.action === 'preview' ? '正在預覽 ' : '正在下載 '}
                          {transfer.progress}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handlePreviewRequest(file.id)}
                          disabled={!isPeerConnected}
                          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          預覽
                        </button>
                        <button 
                          onClick={() => onRequestFile(file.id, 'download')}
                          disabled={!isPeerConnected}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
                        >
                          <Download className="w-4 h-4" />
                          下載
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {previewTransfer && (
        <FilePreviewModal
          transfer={previewTransfer}
          onClose={() => setPreviewTransfer(null)}
          onDownload={() => handleDownload(previewTransfer)}
        />
      )}
    </div>
  );
}
