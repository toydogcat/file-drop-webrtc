import { useRef } from 'react';
import type { FileMetadata, FileTransferState } from '../types';
import { Upload, Trash2, Users, FileText, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  roomId: string;
  filesList: FileMetadata[];
  activeTransfers: FileTransferState[];
  onAddFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
  connectionsCount: number;
}

export function HostControls({ filesList, activeTransfers, onAddFile, onRemoveFile, connectionsCount }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">上傳檔案</h3>
              <p className="text-slate-500 text-xs">選擇要分享給房內成員的檔案</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">{connectionsCount} 位成員已連線</span>
          </div>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group"
        >
          <div className="p-4 bg-slate-950 rounded-full group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-400" />
          </div>
          <p className="text-sm font-medium text-slate-400">點擊或拖放檔案至此</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files?.[0] && onAddFile(e.target.files[0])}
            className="hidden" 
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white">分享列表 ({filesList.length})</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {filesList.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm italic">目前尚未分享任何檔案</div>
          ) : (
            filesList.map((file) => (
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
                  {activeTransfers.find(t => t.id === file.id) && (
                    <div className="flex items-center gap-2">
                      {activeTransfers.find(t => t.id === file.id)?.status === 'transferring' ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="text-xs font-bold text-slate-400">
                        {activeTransfers.find(t => t.id === file.id)?.progress}%
                      </span>
                    </div>
                  )}
                  <button 
                    onClick={() => onRemoveFile(file.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
