import { Activity, ShieldCheck, Zap, Globe } from 'lucide-react';

interface Props {
  isConnected: boolean;
  peerCount: number;
}

export function ConnectionStatus({ isConnected, peerCount }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
          <Globe className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">信令狀態</p>
          <p className="text-sm font-bold text-white">{isConnected ? '已連線' : '連線中'}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">P2P 節點</p>
          <p className="text-sm font-bold text-white">{peerCount} 個連線</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">傳輸加密</p>
          <p className="text-sm font-bold text-white">DTLS 2.0</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">傳輸協議</p>
          <p className="text-sm font-bold text-white">SCTP</p>
        </div>
      </div>
    </div>
  );
}
