import { useState } from 'react';
import { Plus, LogIn } from 'lucide-react';

interface Props {
  onCreateRoom: (name: string, password?: string) => void;
  onJoinRoom: (id: string, name: string, password?: string) => void;
  isConnecting: boolean;
  initialRoomId?: string;
}

export function RoomJoinCard({ onCreateRoom, onJoinRoom, isConnecting, initialRoomId = '' }: Props) {
  const [mode, setMode] = useState<'initial' | 'join'>(initialRoomId ? 'join' : 'initial');
  const [name, setName] = useState(localStorage.getItem('fd_name') || '');
  const [roomId, setRoomId] = useState(initialRoomId);
  const [password, setPassword] = useState('');

  const handleCreate = () => {
    if (!name) return;
    localStorage.setItem('fd_name', name);
    onCreateRoom(name, password);
  };

  const handleJoin = () => {
    if (!name || !roomId) return;
    localStorage.setItem('fd_name', name);
    onJoinRoom(roomId.toUpperCase(), name, password);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">開始傳輸</h2>
          <p className="text-slate-400 mt-2">輸入暱稱並選擇加入或建立房間</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">您的暱稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 小明"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          {mode === 'initial' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">設定房間密碼 (選填)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="留空則不設密碼"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleCreate}
                  disabled={!name || isConnecting}
                  className="flex flex-col items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-6 rounded-2xl transition-all group cursor-pointer"
                >
                  <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm">建立房間</span>
                </button>
                <button
                  onClick={() => setMode('join')}
                  disabled={!name}
                  className="flex flex-col items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white p-6 rounded-2xl transition-all group cursor-pointer"
                >
                  <LogIn className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm">加入房間</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">房間代碼</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="輸入 8 位代碼"
                  maxLength={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">房間密碼 (若有設定)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="留空則無密碼"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMode('initial');
                    setPassword('');
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-all text-sm cursor-pointer"
                >
                  返回
                </button>
                <button
                  onClick={handleJoin}
                  disabled={!roomId || isConnecting}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all text-sm cursor-pointer"
                >
                  確認加入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
