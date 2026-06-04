export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface FileTransferState {
  id: string; // file ID
  name: string;
  size: number;
  progress: number; // 0 to 100
  status: "idle" | "requesting" | "transferring" | "completed" | "failed";
  direction: "incoming" | "outgoing";
  action?: "preview" | "download";
  blob?: Blob;
  chunksReceived?: number;
  totalChunks?: number;
  error?: string;
}

export interface PeerDetails {
  socketId: string; // In MQTT context, this is the client ID
  connectionState: RTCIceConnectionState;
  connectionType: "detecting" | "local" | "stun" | "turn" | "disconnected";
}

// DataChannel messaging protocol
export type DataChannelMessage =
  | { type: "FILE_LIST"; files: FileMetadata[] }
  | { type: "REQUEST_FILE"; fileId: string; action: "preview" | "download" }
  | { type: "FILE_START"; fileId: string; totalChunks: number; name: string; mimeType: string; size: number; action?: "preview" | "download" }
  | { type: "FILE_CHUNK"; fileId: string; chunkIndex: number; data: string } // base64 string
  | { type: "FILE_END"; fileId: string }
  | { type: "TRANSFER_CANCEL"; fileId: string; reason: string };

// MQTT Signaling Protocol
export type SignalingMessage = 
  | { type: 'join', id: string, name: string }
  | { type: 'lobby_sync', players: { id: string, name: string }[] }
  | { type: 'signal', from: string, sdp?: any, ice?: any };
