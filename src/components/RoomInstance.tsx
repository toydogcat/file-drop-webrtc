import { useState, useEffect, useMemo } from 'react';
import { useMQTT } from '../hooks/useMQTT';
import { useWebRTC } from '../hooks/useWebRTC';
import { RoomJoinCard } from './RoomJoinCard';
import { RoomQRCode } from './RoomQRCode';
import { HostControls } from './HostControls';
import { GuestView } from './GuestView';
import { ConnectionStatus } from './ConnectionStatus';
import { CameraQRScanner } from './CameraQRScanner';
import { Chatroom } from './Chatroom';
import type { ChatMessage } from '../types';
import { FolderOpen } from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9);
const generateRoomId = () => Math.random().toString(36).substring(2, 7).toUpperCase();

interface SessionState {
  isConnected: boolean;
  peerCount: number;
  role: 'idle' | 'host' | 'guest';
  roomId: string;
}

interface Props {
  id: string;
  initialRoomId?: string;
  onStateChange: (state: SessionState) => void;
}

export function RoomInstance({ id: _id, initialRoomId = '', onStateChange }: Props) {
  const [role, setRole] = useState<'idle' | 'host' | 'guest'>('idle');
  const [roomId, setRoomId] = useState('');
  const [myName, setMyName] = useState(() => localStorage.getItem('fd_name') || '');
  const [showScanner, setShowScanner] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const myId = useMemo(() => generateId(), []);

  const { 
    isConnected: isMQTTConnected, 
    lobbyPlayers, 
    setLobbyPlayers,
    sendSignal, 
    syncLobby, 
    onSignalReceived, 
    onPlayerJoined 
  } = useMQTT(roomId, myId, myName, role);

  const handleChatMessage = (fromId: string, msg: ChatMessage) => {
    setChatMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });

    // Host relays the message to all other guests
    if (role === 'host') {
      connections.forEach((state, id) => {
        if (id !== fromId && (state === 'connected' || state === 'completed')) {
          sendDataMessage(id, { type: 'CHAT_MESSAGE', message: msg });
        }
      });
    }
  };

  const handlePeerDisconnected = (id: string) => {
    if (role === 'host') {
      setLobbyPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

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
  } = useWebRTC(myId, sendSignal, handleChatMessage, handlePeerDisconnected, chatMessages);

  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `chat-${generateId()}`,
      senderId: myId,
      senderName: myName || '訪客',
      text,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, newMsg]);

    // Send chat message to all connected peers
    connections.forEach((state, id) => {
      if (state === 'connected' || state === 'completed') {
        sendDataMessage(id, { type: 'CHAT_MESSAGE', message: newMsg });
      }
    });
  };

  const activeConnectionsCount = useMemo(() => {
    return Array.from(connections.values()).filter(state => state === 'connected' || state === 'completed').length;
  }, [connections]);

  // Connect Signaling to WebRTC
  useEffect(() => {
    onSignalReceived.current = ({ from, sdp, ice }) => {
      handleSignal(from, sdp, ice);
    };

    onPlayerJoined.current = (id, name) => {
      if (role === 'host') {
        setLobbyPlayers(prev => {
          if (prev.some(p => p.id === id)) return prev;
          return [...prev, { id, name }];
        });
        initiateOffer(id);
      }
    };
  }, [role, handleSignal, initiateOffer, onSignalReceived, onPlayerJoined, setLobbyPlayers]);

  // Host: Keep lobby in sync
  useEffect(() => {
    if (role === 'host' && isMQTTConnected) {
      const players = [{ id: myId, name: myName }, ...lobbyPlayers.filter(p => p.id !== myId)];
      syncLobby(players);
    }
  }, [role, lobbyPlayers, myId, myName, isMQTTConnected, syncLobby]);

  // Report state to parent App component
  useEffect(() => {
    onStateChange({
      isConnected: isMQTTConnected,
      peerCount: activeConnectionsCount,
      role,
      roomId
    });
  }, [isMQTTConnected, activeConnectionsCount, role, roomId, onStateChange]);

  const handleCreateRoom = (name: string) => {
    setMyName(name);
    localStorage.setItem('fd_name', name);
    setRoomId(generateRoomId());
    setRole('host');
  };

  const handleJoinRoom = (id: string, name: string) => {
    setMyName(name);
    localStorage.setItem('fd_name', name);
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
    connections.forEach((state, id) => {
      if (state === 'connected' || state === 'completed') {
        sendDataMessage(id, { type: 'REQUEST_FILE', fileId, action });
      }
    });
  };

  // URL Auto-join
  useEffect(() => {
    if (initialRoomId && role === 'idle') {
      const savedName = localStorage.getItem('fd_name');
      if (savedName) {
        handleJoinRoom(initialRoomId.toUpperCase(), savedName);
      }
    }
  }, [initialRoomId, role]);

  return (
    <div className="animate-in fade-in duration-500">
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
        <div className="space-y-8">
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

            <div className="lg:w-80 space-y-6">
              {role === 'host' && (
                <RoomQRCode roomId={roomId} />
              )}
              <Chatroom
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                myId={myId}
                lobbyPlayers={lobbyPlayers}
                hostId={role === 'host' ? myId : (lobbyPlayers[0]?.id || '')}
              />
            </div>
          </div>
        </div>
      )}

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
