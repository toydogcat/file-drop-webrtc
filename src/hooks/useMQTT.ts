import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import type { SignalingMessage } from '../types';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'luna/file-drop';

export function useMQTT(roomId: string, myId: string, myName: string) {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<{ id: string, name: string }[]>([]);
  
  // Callbacks for signaling
  const onSignalReceived = useRef<(data: { from: string, sdp?: any, ice?: any }) => void>(() => {});
  const onPlayerJoined = useRef<(id: string, name: string) => void>(() => {});

  useEffect(() => {
    if (!roomId) return;

    const mqttClient = mqtt.connect(BROKER_URL, {
      clientId: `fd_${myId}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 2000,
    });

    mqttClient.on('connect', () => {
      console.log('MQTT Connected');
      setIsConnected(true);
      
      // Subscribe to room topics
      mqttClient.subscribe(`${TOPIC_PREFIX}/${roomId}/join`);
      mqttClient.subscribe(`${TOPIC_PREFIX}/${roomId}/lobby_sync`);
      mqttClient.subscribe(`${TOPIC_PREFIX}/${roomId}/signal/${myId}`);
      
      // Publish join message
      const joinMsg: SignalingMessage = { type: 'join', id: myId, name: myName };
      mqttClient.publish(`${TOPIC_PREFIX}/${roomId}/join`, JSON.stringify(joinMsg));
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const msg = JSON.parse(payload.toString()) as SignalingMessage;
        
        if (topic === `${TOPIC_PREFIX}/${roomId}/join`) {
          if (msg.type === 'join' && msg.id !== myId) {
            console.log('Player joined:', msg.name);
            onPlayerJoined.current(msg.id, msg.name);
          }
        } else if (topic === `${TOPIC_PREFIX}/${roomId}/lobby_sync`) {
          if (msg.type === 'lobby_sync') {
            setLobbyPlayers(msg.players);
          }
        } else if (topic === `${TOPIC_PREFIX}/${roomId}/signal/${myId}`) {
          if (msg.type === 'signal') {
            onSignalReceived.current({ from: msg.from, sdp: msg.sdp, ice: msg.ice });
          }
        }
      } catch (err) {
        console.error('Failed to parse MQTT message:', err);
      }
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT Error:', err);
      setIsConnected(false);
    });

    setClient(mqttClient);

    return () => {
      mqttClient.end();
    };
  }, [roomId, myId, myName]);

  const sendSignal = useCallback((toId: string, data: { sdp?: any, ice?: any }) => {
    if (client && isConnected) {
      const signalMsg: SignalingMessage = { type: 'signal', from: myId, ...data };
      client.publish(`${TOPIC_PREFIX}/${roomId}/signal/${toId}`, JSON.stringify(signalMsg));
    }
  }, [client, isConnected, myId, roomId]);

  const syncLobby = useCallback((players: { id: string, name: string }[]) => {
    if (client && isConnected) {
      const syncMsg: SignalingMessage = { type: 'lobby_sync', players };
      client.publish(`${TOPIC_PREFIX}/${roomId}/lobby_sync`, JSON.stringify(syncMsg));
    }
  }, [client, isConnected, roomId]);

  return {
    isConnected,
    lobbyPlayers,
    sendSignal,
    syncLobby,
    onSignalReceived,
    onPlayerJoined
  };
}
