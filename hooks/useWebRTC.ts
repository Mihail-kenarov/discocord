"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

export type VoiceParticipant = {
    id: string;
    stream?: MediaStream;
    isMuted: boolean;
};

export type VoiceConnectionState = "disconnected" | "connecting" | "connected" | "error";

export type UseWebRTCOptions = {
    channelId: number | null;
    onParticipantJoined?: (userId: string) => void;
    onParticipantLeft?: (userId: string) => void;
};

export type UseWebRTCReturn = {
    connectionState: VoiceConnectionState;
    participants: Map<string, VoiceParticipant>;
    isMuted: boolean;
    localStream: MediaStream | null;
    error: string | null;
    join: () => Promise<void>;
    leave: () => void;
    toggleMute: () => void;
};

type SignalingMessage = {
    type: string;
    channelId: number;
    userId?: string;
    targetId?: string;
    payload?: unknown;
};

const ICE_SERVERS_ENDPOINT = "/gw/voice/ice-servers";
const SIGNALING_ENDPOINT = "/gw/voice/signal";

/**
 * Custom hook for WebRTC voice channel functionality
 */
export function useWebRTC({
    channelId,
    onParticipantJoined,
    onParticipantLeft,
}: UseWebRTCOptions): UseWebRTCReturn {
    const { getToken } = useAuth();

    const [connectionState, setConnectionState] = useState<VoiceConnectionState>("disconnected");
    const [participants, setParticipants] = useState<Map<string, VoiceParticipant>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs for WebSocket and peer connections
    const wsRef = useRef<WebSocket | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const iceServersRef = useRef<RTCIceServer[]>([]);
    const currentChannelIdRef = useRef<number | null>(null);

    // Fetch ICE server configuration
    const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
        try {
            const token = await getToken();
            const response = await fetch(ICE_SERVERS_ENDPOINT, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!response.ok) {
                throw new Error("Failed to fetch ICE servers");
            }
            const data = await response.json();
            return data.iceServers || [];
        } catch (err) {
            console.warn("[WebRTC] Failed to fetch ICE servers, using fallback:", err);
            // Fallback to local Coturn
            return [
                { urls: "stun:localhost:3478" },
                { urls: "turn:localhost:3478", username: "discocord", credential: "discocord123" },
            ];
        }
    }, [getToken]);

    // Create peer connection for a remote user
    const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
        const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

        // Add local stream tracks to the connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: "ice-candidate",
                    channelId: currentChannelIdRef.current,
                    targetId: remoteUserId,
                    payload: event.candidate,
                }));
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log("[WebRTC] Received remote track from:", remoteUserId);
            const [remoteStream] = event.streams;
            setParticipants((prev) => {
                const next = new Map(prev);
                const existing = next.get(remoteUserId);
                next.set(remoteUserId, {
                    id: remoteUserId,
                    stream: remoteStream,
                    isMuted: existing?.isMuted ?? false,
                });
                return next;
            });
        };

        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] Connection state with ${remoteUserId}:`, pc.connectionState);
        };

        peerConnectionsRef.current.set(remoteUserId, pc);
        return pc;
    }, []);

    // Handle incoming signaling messages
    const handleSignalingMessage = useCallback(async (msg: SignalingMessage) => {
        switch (msg.type) {
            case "joined": {
                // We joined the channel, initiate connections to existing participants
                const existingUsers = msg.payload as string[];
                console.log("[WebRTC] Joined channel, existing users:", existingUsers);

                for (const userId of existingUsers) {
                    const pc = createPeerConnection(userId);

                    // Create and send offer
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    wsRef.current?.send(JSON.stringify({
                        type: "offer",
                        channelId: currentChannelIdRef.current,
                        targetId: userId,
                        payload: offer,
                    }));
                }
                setConnectionState("connected");
                break;
            }

            case "user-joined": {
                // New user joined, they will send us an offer
                console.log("[WebRTC] User joined:", msg.userId);
                if (msg.userId) {
                    setParticipants((prev) => {
                        const next = new Map(prev);
                        next.set(msg.userId!, { id: msg.userId!, isMuted: false });
                        return next;
                    });
                    onParticipantJoined?.(msg.userId);
                }
                break;
            }

            case "user-left": {
                // User left, cleanup their connection
                console.log("[WebRTC] User left:", msg.userId);
                if (msg.userId) {
                    const pc = peerConnectionsRef.current.get(msg.userId);
                    if (pc) {
                        pc.close();
                        peerConnectionsRef.current.delete(msg.userId);
                    }
                    setParticipants((prev) => {
                        const next = new Map(prev);
                        next.delete(msg.userId!);
                        return next;
                    });
                    onParticipantLeft?.(msg.userId);
                }
                break;
            }

            case "offer": {
                // Received offer from remote peer
                console.log("[WebRTC] Received offer from:", msg.userId);
                if (!msg.userId) break;

                let pc = peerConnectionsRef.current.get(msg.userId);
                if (!pc) {
                    pc = createPeerConnection(msg.userId);
                }

                await pc.setRemoteDescription(new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                wsRef.current?.send(JSON.stringify({
                    type: "answer",
                    channelId: currentChannelIdRef.current,
                    targetId: msg.userId,
                    payload: answer,
                }));
                break;
            }

            case "answer": {
                // Received answer from remote peer
                console.log("[WebRTC] Received answer from:", msg.userId);
                if (!msg.userId) break;

                const pc = peerConnectionsRef.current.get(msg.userId);
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit));
                }
                break;
            }

            case "ice-candidate": {
                // Received ICE candidate from remote peer
                if (!msg.userId) break;

                const pc = peerConnectionsRef.current.get(msg.userId);
                if (pc && msg.payload) {
                    await pc.addIceCandidate(new RTCIceCandidate(msg.payload as RTCIceCandidateInit));
                }
                break;
            }
        }
    }, [createPeerConnection, onParticipantJoined, onParticipantLeft]);

    // Join voice channel
    const join = useCallback(async () => {
        if (channelId === null) return;

        try {
            setConnectionState("connecting");
            setError(null);

            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            setLocalStream(stream);

            // Fetch ICE servers
            iceServersRef.current = await fetchIceServers();

            // Get auth token
            const token = await getToken();

            // Build WebSocket URL
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${wsProtocol}//${window.location.host}${SIGNALING_ENDPOINT}`;

            // Connect to signaling server
            const ws = new WebSocket(wsUrl, token ? [token] : undefined);

            // For auth, we'll pass token via query or header if supported
            // Since WebSocket doesn't support custom headers easily, we'll rely on cookies or modify approach
            wsRef.current = ws;
            currentChannelIdRef.current = channelId;

            ws.onopen = () => {
                console.log("[WebRTC] WebSocket connected, joining channel:", channelId);
                ws.send(JSON.stringify({ type: "join", channelId }));
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data) as SignalingMessage;
                    handleSignalingMessage(msg);
                } catch (err) {
                    console.error("[WebRTC] Failed to parse message:", err);
                }
            };

            ws.onerror = (event) => {
                console.error("[WebRTC] WebSocket error:", event);
                setError("Connection error occurred");
                setConnectionState("error");
            };

            ws.onclose = () => {
                console.log("[WebRTC] WebSocket closed");
                if (connectionState !== "disconnected") {
                    setConnectionState("disconnected");
                }
            };
        } catch (err) {
            console.error("[WebRTC] Failed to join:", err);
            setError(err instanceof Error ? err.message : "Failed to join voice channel");
            setConnectionState("error");
        }
    }, [channelId, fetchIceServers, getToken, handleSignalingMessage, connectionState]);

    // Leave voice channel
    const leave = useCallback(() => {
        // Send leave message
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "leave", channelId: currentChannelIdRef.current }));
        }

        // Close WebSocket
        wsRef.current?.close();
        wsRef.current = null;

        // Close all peer connections
        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();

        // Stop local stream
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);

        // Reset state
        setParticipants(new Map());
        setConnectionState("disconnected");
        setError(null);
        currentChannelIdRef.current = null;
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    // Cleanup on unmount or channel change
    useEffect(() => {
        return () => {
            leave();
        };
    }, [leave]);

    return {
        connectionState,
        participants,
        isMuted,
        localStream,
        error,
        join,
        leave,
        toggleMute,
    };
}
