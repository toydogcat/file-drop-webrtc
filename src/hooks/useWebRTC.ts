import { useState, useRef, useCallback } from 'react';
import type { FileMetadata, FileTransferState, DataChannelMessage } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const CHUNK_SIZE = 16384; // 16KB

export function useWebRTC(_myId: string, sendSignal: (to: string, data: any) => void) {
  const [connections, setConnections] = useState<Map<string, RTCIceConnectionState>>(new Map());
  const [activeTransfers, setActiveTransfers] = useState<FileTransferState[]>([]);
  const [filesList, setFilesList] = useState<FileMetadata[]>([]);
  
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const sharedFilesRef = useRef<Map<string, File>>(new Map());
  const incomingChunksRef = useRef<Map<string, {
    chunks: ArrayBuffer[];
    totalChunks: number;
    name: string;
    mimeType: string;
    size: number;
  }>>(new Map());

  const updateConnectionState = (id: string, state: RTCIceConnectionState) => {
    setConnections(prev => {
      const next = new Map(prev);
      next.set(id, state);
      return next;
    });
  };

  const cleanupConnection = useCallback((id: string) => {
    const pc = pcsRef.current.get(id);
    if (pc) {
      pc.close();
      pcsRef.current.delete(id);
    }
    const channel = channelsRef.current.get(id);
    if (channel) {
      channel.close();
      channelsRef.current.delete(id);
    }
    updateConnectionState(id, 'closed');
  }, []);

  const setupPC = useCallback((id: string) => {
    if (pcsRef.current.has(id)) cleanupConnection(id);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcsRef.current.set(id, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(id, { ice: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      updateConnectionState(id, pc.iceConnectionState);
      if (['disconnected', 'closed', 'failed'].includes(pc.iceConnectionState)) {
        cleanupConnection(id);
      }
    };

    return pc;
  }, [cleanupConnection, sendSignal]);

  const sendDataMessage = useCallback((toId: string, msg: DataChannelMessage) => {
    const channel = channelsRef.current.get(toId);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(msg));
    }
  }, []);

  const broadcastFileList = useCallback((files: FileMetadata[]) => {
    channelsRef.current.forEach((_, id) => {
      sendDataMessage(id, { type: 'FILE_LIST', files });
    });
  }, [sendDataMessage]);

  const startFileTransmission = async (toId: string, fileId: string, file: File, action: 'preview' | 'download') => {
    const channel = channelsRef.current.get(toId);
    if (!channel || channel.readyState !== 'open') return;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    setActiveTransfers(prev => [
      ...prev.filter(t => t.id !== fileId),
      {
        id: fileId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'transferring',
        direction: 'outgoing',
        totalChunks,
        action,
      }
    ]);

    sendDataMessage(toId, {
      type: 'FILE_START',
      fileId,
      totalChunks,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size
    });

    try {
      for (let i = 0; i < totalChunks; i++) {
        while (channel.bufferedAmount > 65535) {
          await new Promise(r => setTimeout(r, 35));
        }
        if (channel.readyState !== 'open') throw new Error('Channel closed');

        const slice = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const buffer = await slice.arrayBuffer();
        
        // Base64 encoding for JSON transport (same as reference)
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

        sendDataMessage(toId, {
          type: 'FILE_CHUNK',
          fileId,
          chunkIndex: i,
          data: base64
        });

        if (i % 10 === 0 || i === totalChunks - 1) {
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          setActiveTransfers(prev => prev.map(t => 
            t.id === fileId ? { ...t, progress, status: progress === 100 ? 'completed' : 'transferring' } : t
          ));
        }
      }
      sendDataMessage(toId, { type: 'FILE_END', fileId });
    } catch (err: any) {
      console.error('Transmission failed:', err);
      setActiveTransfers(prev => prev.map(t => t.id === fileId ? { ...t, status: 'failed', error: err.message } : t));
    }
  };

  const handleDataMessage = useCallback((fromId: string, data: string) => {
    const msg = JSON.parse(data) as DataChannelMessage;
    switch (msg.type) {
      case 'FILE_LIST':
        setFilesList(msg.files);
        break;
      case 'REQUEST_FILE':
        const file = sharedFilesRef.current.get(msg.fileId);
        if (file) startFileTransmission(fromId, msg.fileId, file, msg.action);
        break;
      case 'FILE_START':
        incomingChunksRef.current.set(msg.fileId, {
          chunks: [],
          totalChunks: msg.totalChunks,
          name: msg.name,
          mimeType: msg.mimeType,
          size: msg.size
        });
        setActiveTransfers(prev => [
          ...prev.filter(t => t.id !== msg.fileId),
          {
            id: msg.fileId,
            name: msg.name,
            size: msg.size,
            progress: 0,
            status: 'transferring',
            direction: 'incoming',
            totalChunks: msg.totalChunks
          }
        ]);
        break;
      case 'FILE_CHUNK':
        const acc = incomingChunksRef.current.get(msg.fileId);
        if (acc) {
          const binary = atob(msg.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          acc.chunks[msg.chunkIndex] = bytes.buffer;
          
          const received = acc.chunks.filter(Boolean).length;
          if (msg.chunkIndex % 10 === 0 || received === acc.totalChunks) {
            const progress = Math.round((received / acc.totalChunks) * 100);
            setActiveTransfers(prev => prev.map(t => t.id === msg.fileId ? { ...t, progress } : t));
          }
        }
        break;
      case 'FILE_END':
        const finalAcc = incomingChunksRef.current.get(msg.fileId);
        if (finalAcc) {
          const blob = new Blob(finalAcc.chunks, { type: finalAcc.mimeType });
          setActiveTransfers(prev => prev.map(t => t.id === msg.fileId ? { ...t, status: 'completed', progress: 100, blob } : t));
        }
        break;
      case 'TRANSFER_CANCEL':
        setActiveTransfers(prev => prev.map(t => t.id === msg.fileId ? { ...t, status: 'failed', error: msg.reason } : t));
        break;
    }
  }, []);

  const setupChannel = useCallback((id: string, channel: RTCDataChannel) => {
    channelsRef.current.set(id, channel);
    channel.onopen = () => console.log(`DataChannel to ${id} open`);
    channel.onmessage = (e) => handleDataMessage(id, e.data);
    channel.onclose = () => cleanupConnection(id);
  }, [cleanupConnection, handleDataMessage]);

  const initiateOffer = useCallback(async (toId: string) => {
    const pc = setupPC(toId);
    const channel = pc.createDataChannel('file-transfer', { ordered: true });
    setupChannel(toId, channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal(toId, { sdp: offer });
  }, [setupPC, setupChannel, sendSignal]);

  const handleSignal = useCallback(async (fromId: string, sdp: any, ice: any) => {
    let pc = pcsRef.current.get(fromId);
    if (!pc) {
      pc = setupPC(fromId);
      pc.ondatachannel = (e) => setupChannel(fromId, e.channel);
    }

    if (sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      if (sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(fromId, { sdp: answer });
      }
    }
    if (ice) {
      await pc.addIceCandidate(new RTCIceCandidate(ice));
    }
  }, [setupPC, setupChannel, sendSignal]);

  return {
    connections,
    activeTransfers,
    filesList,
    setFilesList,
    sharedFilesRef,
    initiateOffer,
    handleSignal,
    sendDataMessage,
    broadcastFileList,
    cleanupConnection
  };
}
