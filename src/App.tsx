import { useState, useMemo, useCallback } from 'react';
import { RoomInstance } from './components/RoomInstance';
import { Share2, Globe, Users, Plus, X, Server, User, CircleDot } from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9);

interface Session {
  id: string;
  initialRoomId?: string;
}

interface SessionState {
  isConnected: boolean;
  peerCount: number;
  role: 'idle' | 'host' | 'guest';
  roomId: string;
}

export default function App() {
  const initialRoomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.toUpperCase() || '';
  }, []);

  const defaultSessionId = useMemo(() => generateId(), []);
  
  const [sessions, setSessions] = useState<Session[]>(() => [
    { id: defaultSessionId, initialRoomId: initialRoomId || undefined }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(defaultSessionId);
  const [sessionStates, setSessionStates] = useState<Record<string, SessionState>>({});

  const handleStateChange = useCallback((sessionId: string, state: SessionState) => {
    setSessionStates(prev => {
      const prevVal = prev[sessionId];
      if (
        prevVal &&
        prevVal.isConnected === state.isConnected &&
        prevVal.peerCount === state.peerCount &&
        prevVal.role === state.role &&
        prevVal.roomId === state.roomId
      ) {
        return prev;
      }
      return {
        ...prev,
        [sessionId]: state
      };
    });
  }, []);

  const handleAddSession = () => {
    const newId = generateId();
    setSessions(prev => [...prev, { id: newId }]);
    setActiveSessionId(newId);
  };

  const handleCloseSession = (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (sessions.length <= 1) {
      // Recreate a single idle session to completely clean up resources
      const newId = generateId();
      setSessions([{ id: newId }]);
      setActiveSessionId(newId);
      setSessionStates(prev => {
        const next = { ...prev };
        delete next[idToClose];
        return next;
      });
      return;
    }

    setSessions(prev => {
      const nextSessions = prev.filter(s => s.id !== idToClose);
      if (activeSessionId === idToClose) {
        const lastSession = nextSessions[nextSessions.length - 1];
        if (lastSession) {
          setActiveSessionId(lastSession.id);
        }
      }
      return nextSessions;
    });

    setSessionStates(prev => {
      const next = { ...prev };
      delete next[idToClose];
      return next;
    });
  };

  const activeSessionState = useMemo<SessionState>(() => {
    return sessionStates[activeSessionId] || {
      isConnected: false,
      peerCount: 0,
      role: 'idle',
      roomId: ''
    };
  }, [sessionStates, activeSessionId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30 flex flex-col">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tighter">File Drop</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeSessionState.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {activeSessionState.isConnected ? '信令已就緒' : '連接中...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://github.com/toydogcat/file-drop-webrtc" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
              <Globe className="w-5 h-5" />
            </a>
            {activeSessionState.role !== 'idle' && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-slate-300">{activeSessionState.peerCount} 節點</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-16 z-30 shrink-0">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between overflow-x-auto gap-4 scrollbar-none">
          <div className="flex items-center gap-1 py-3">
            {sessions.map((session, index) => {
              const state = sessionStates[session.id] || {
                isConnected: false,
                peerCount: 0,
                role: 'idle',
                roomId: ''
              };
              const isActive = session.id === activeSessionId;
              
              let title = `連線 #${index + 1}`;
              let Icon = CircleDot;
              let iconColor = 'text-slate-500';

              if (state.role === 'host') {
                title = `房主: ${state.roomId || '建立中'}`;
                Icon = Server;
                iconColor = 'text-blue-400';
              } else if (state.role === 'guest') {
                title = `訪客: ${state.roomId}`;
                Icon = User;
                iconColor = 'text-emerald-400';
              }

              return (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveSessionId(session.id);
                    }
                  }}
                  className={`group flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 shrink-0 select-none cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 border-blue-500/30 text-white shadow-lg shadow-blue-500/5'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${iconColor} ${state.isConnected && state.role !== 'idle' ? 'animate-pulse' : ''}`} />
                  <span>{title}</span>
                  
                  <button
                    onClick={(e) => handleCloseSession(session.id, e)}
                    className="p-0.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors opacity-60 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="關閉連線"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddSession}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 my-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>開新連線</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full">
        {sessions.map((session) => (
          <div key={session.id} className={session.id === activeSessionId ? 'block' : 'hidden'}>
            <RoomInstance
              id={session.id}
              initialRoomId={session.initialRoomId}
              onStateChange={(state) => handleStateChange(session.id, state)}
            />
          </div>
        ))}
      </main>

      {/* Footer & Vercount */}
      <footer className="border-t border-slate-900 py-10 bg-slate-950 shrink-0">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <span>&copy; 2024 File Drop P2P</span>
                <span className="w-1 h-1 bg-slate-800 rounded-full" />
                <span id="vercount_value_site_pv">--</span> 次造訪
              </div>
              <p className="text-[10px] text-slate-600 font-medium">100% P2P 檔案傳輸，資料不經過任何伺服器保存</p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-2xl">
              <div className="flex -space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center">
                    <Users className="w-3 h-3 text-slate-500" />
                  </div>
                ))}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                已有 <span id="vercount_value_site_uv" className="text-white">--</span> 位使用者體驗
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
