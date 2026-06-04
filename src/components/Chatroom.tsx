import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Send, Users, Shield, User, MessageSquare } from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  myId: string;
  lobbyPlayers: { id: string; name: string }[];
  hostId: string;
}

export function Chatroom({ messages, onSendMessage, myId, lobbyPlayers, hostId }: Props) {
  const [inputText, setInputText] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl h-[500px]">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-sm text-white">文字聊天室</h3>
        </div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all uppercase tracking-wider ${
            showMembers 
              ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' 
              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>成員 ({lobbyPlayers.length})</span>
        </button>
      </div>

      {/* Members Dropdown Overlay */}
      {showMembers && (
        <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-3 divide-y divide-slate-900 animate-in slide-in-from-top duration-250 z-10 max-h-[160px] overflow-y-auto">
          {lobbyPlayers.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-1">房內目前沒有其他成員</div>
          ) : (
            lobbyPlayers.map((player) => {
              const isHost = player.id === hostId;
              const isMe = player.id === myId;
              return (
                <div key={player.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {isHost ? (
                      <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-slate-300 font-medium truncate pr-2">
                      {player.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isMe && (
                      <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md font-bold uppercase">
                        我
                      </span>
                    )}
                    {isHost ? (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase">
                        房主
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-bold uppercase">
                        房客
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-900/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic gap-2 py-10">
            <MessageSquare className="w-8 h-8 text-slate-700/60" />
            <span>開始聊天吧！</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === myId;
            const isHost = msg.senderId === hostId;

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Sender Name & Badges */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500 font-bold tracking-wide">
                  <span className="text-slate-400">{msg.senderName}</span>
                  {isMe && (
                    <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1.5 py-0.2 rounded-full font-black uppercase">我</span>
                  )}
                  {isHost ? (
                    <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded-full font-black uppercase">房主</span>
                  ) : (
                    <span className="text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded-full font-black uppercase">房客</span>
                  )}
                </div>

                {/* Bubble */}
                <div 
                  className={`px-3.5 py-2 text-sm shadow-md transition-all ${
                    isMe 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none border border-blue-500/10' 
                      : 'bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none border border-slate-700/30'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed select-text">{msg.text}</p>
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-slate-600 font-semibold mt-1 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950/30 border-t border-slate-800/80 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="輸入訊息..."
          className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500/80 rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-2xl transition-all shadow-md shadow-blue-900/20 flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
