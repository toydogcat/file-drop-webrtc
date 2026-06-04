import { useState, useEffect, useMemo } from 'react';
import { useMQTT } from './hooks/useMQTT';
import { useWebRTC } from './hooks/useWebRTC';
import { RoomJoinCard } from './components/RoomJoinCard';
import { RoomQRCode } from './components/RoomQRCode';
import { HostControls } from './components/HostControls';
import { GuestView } from './components/GuestView';
import { ConnectionStatus } from './components/ConnectionStatus';
import { CameraQRScanner } from './components/CameraQRScanner';
import { Share2, FolderOpen, Globe, Users } from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9);
const generateRoomId = () => Math.random().toString(36).substring(2, 7).toUpperCase();

export default function App() {
  const [role, setRole] = useState<'idle' | 'host' | 'guest'>('idle');
  const [roomId, setRoomId] = useState('');
  const [myName, setMyName] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  const myId = useMemo(() => generateId(), []);
  
  const initialRoomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.toUpperCase() || '';
  }, []);

  const { 
    isConnected: isMQTTConnected, 
    lobbyPlayers, 
    sendSignal, 
    syncLobby, 
    onSignalReceived, 
    onPlayerJoined 
  } = useMQTT(roomId, myId, myName, role);

  const {
    connections,
    activeTransfers,
    filesList,
    setFilesList,
    sharedFilesRef,
    initiateOffer,
    handleSignal,
    broadcastFileList,
    sendDataMessage
  } = useWebRTC(myId, sendSignal);

  const activeConnectionsCount = useMemo(() => {
    return Array.from(connections.values()).filter(state => state === 'connected' || state === 'completed').length;
  }, [connections]);

  // Connect Signaling to WebRTC
  useEffect(() => {
    onSignalReceived.current = ({ from, sdp, ice }) => {
      handleSignal(from, sdp, ice);
    };

    onPlayerJoined.current = (id) => {
      if (role === 'host') {
        initiateOffer(id);
      }
    };
  }, [role, handleSignal, initiateOffer, onSignalReceived, onPlayerJoined]);

  // Host: Keep lobby in sync
  useEffect(() => {
    if (role === 'host' && isMQTTConnected) {
      const players = [{ id: myId, name: myName }, ...lobbyPlayers.filter(p => p.id !== myId)];
      syncLobby(players);
    }
  }, [role, lobbyPlayers, myId, myName, isMQTTConnected, syncLobby]);

  const handleCreateRoom = (name: string) => {
    setMyName(name);
    setRoomId(generateRoomId());
    setRole('host');
  };

  const handleJoinRoom = (id: string, name: string) => {
    setMyName(name);
    setRoomId(id);
    setRole('guest');
  };

  const handleAddFile = (file: File) => {
    const fileId = `file-${generateId()}`;
    sharedFilesRef.current.set(fileId, file);
    const newFile = { id: fileId, name: file.name, size: file.size, mimeType: file.type };
    setFilesList(prev => {
      const next = [...prev, newFile];
      setTimeout(() => broadcastFileList(next), 100);
      return next;
    });
  };

  const handleRemoveFile = (fileId: string) => {
    sharedFilesRef.current.delete(fileId);
    setFilesList(prev => {
      const next = prev.filter(f => f.id !== fileId);
      setTimeout(() => broadcastFileList(next), 100);
      return next;
    });
  };

  const handleRequestFile = (fileId: string, action: 'preview' | 'download') => {
    // In our Star topology, guest always requests from Host
    // We assume the first peer in our connection map that is 'connected' is the host
    // Actually, in MQTT room, we could find the host, but let's simplify: 
    // Host is the one who didn't join but was there.
    // In this simple version, let's just broadcast the request or find the host ID.
    // For now, let's assume the guest knows who the host is (the person they connected to).
    connections.forEach((state, id) => {
      if (state === 'connected' || state === 'completed') {
        sendDataMessage(id, { type: 'REQUEST_FILE', fileId, action });
      }
    });
  };

  // URL Auto-join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('room');
    if (rId && role === 'idle') {
      const savedName = localStorage.getItem('fd_name');
      if (savedName) {
        handleJoinRoom(rId.toUpperCase(), savedName);
      }
    }
  }, [role]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tighter">File Drop</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isMQTTConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {isMQTTConnected ? '信令已就緒' : '連接中...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://github.com/toydogcat/file-drop-webrtc" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
              <Globe className="w-5 h-5" />
            </a>
            {role !== 'idle' && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-slate-300">{activeConnectionsCount} 節點</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {role === 'idle' ? (
          <div className="py-12">
            <RoomJoinCard 
              onCreateRoom={handleCreateRoom} 
              onJoinRoom={handleJoinRoom}
              isConnecting={!isMQTTConnected && roomId !== ''}
              initialRoomId={initialRoomId}
            />
            <div className="mt-8 text-center">
              <button 
                onClick={() => setShowScanner(true)}
                className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-400 transition-colors text-sm font-semibold"
              >
                <FolderOpen className="w-4 h-4" />
                <span>使用 QR Code 掃描加入</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-8">
                <ConnectionStatus 
                  isConnected={isMQTTConnected} 
                  peerCount={activeConnectionsCount} 
                />
                
                {role === 'host' ? (
                  <HostControls 
                    roomId={roomId}
                    filesList={filesList}
                    activeTransfers={activeTransfers}
                    onAddFile={handleAddFile}
                    onRemoveFile={handleRemoveFile}
                    connectionsCount={activeConnectionsCount}
                    getFile={(id) => sharedFilesRef.current.get(id)}
                  />
                ) : (
                  <GuestView 
                    roomId={roomId}
                    filesList={filesList}
                    activeTransfers={activeTransfers}
                    onRequestFile={handleRequestFile}
                    isPeerConnected={activeConnectionsCount > 0}
                  />
                )}
              </div>

              {role === 'host' && (
                <div className="lg:w-80">
                  <div className="sticky top-24">
                    <RoomQRCode roomId={roomId} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer & Vercount */}
      <footer className="border-t border-slate-900 py-10 mt-12 bg-slate-950">
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

      {showScanner && (
        <CameraQRScanner 
          onScan={(id) => {
            handleJoinRoom(id, myName || localStorage.getItem('fd_name') || '訪客');
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
