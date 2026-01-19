"use client";

import * as React from "react";
import { useWebRTC, VoiceConnectionState, VoiceParticipant } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemberUser } from "./displayDataModels";

type VoiceChannelRoomProps = {
    channelId: number;
    channelName: string;
    currentUserId: string;
    members: MemberUser[] | null;
    getToken: () => Promise<string | undefined>;
};

export function VoiceChannelRoom({
    channelId,
    channelName,
    currentUserId,
    members,
}: VoiceChannelRoomProps) {
    const {
        connectionState,
        participants,
        isMuted,
        error,
        join,
        leave,
        toggleMute,
    } = useWebRTC({ channelId });

    const isConnected = connectionState === "connected";
    const isConnecting = connectionState === "connecting";

    // Get member info by ID
    const getMemberInfo = React.useCallback(
        (userId: string): MemberUser => {
            const member = members?.find((m) => m.id === userId);
            return member ?? { id: userId, username: userId.slice(0, 8), imageUrl: null };
        },
        [members]
    );

    // Render participant audio elements (hidden, just for playing audio)
    const audioRefs = React.useRef<Map<string, HTMLAudioElement>>(new Map());

    React.useEffect(() => {
        // Attach streams to audio elements
        participants.forEach((participant, id) => {
            if (participant.stream) {
                let audio = audioRefs.current.get(id);
                if (!audio) {
                    audio = document.createElement("audio");
                    audio.autoplay = true;
                    audioRefs.current.set(id, audio);
                }
                if (audio.srcObject !== participant.stream) {
                    audio.srcObject = participant.stream;
                }
            }
        });

        // Cleanup removed participants
        audioRefs.current.forEach((audio, id) => {
            if (!participants.has(id)) {
                audio.srcObject = null;
                audioRefs.current.delete(id);
            }
        });
    }, [participants]);

    // Cleanup audio on unmount
    React.useEffect(() => {
        return () => {
            audioRefs.current.forEach((audio) => {
                audio.srcObject = null;
            });
            audioRefs.current.clear();
        };
    }, []);

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-[#0b0b0b]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
                <div className="flex items-center gap-3">
                    <Volume2 className="size-5 text-emerald-400" />
                    <div>
                        <h2 className="text-lg font-semibold text-white">{channelName}</h2>
                        <p className="text-xs text-neutral-500">
                            {isConnected
                                ? `${participants.size + 1} connected`
                                : connectionState === "connecting"
                                    ? "Connecting..."
                                    : "Not connected"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
                {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {!isConnected && !isConnecting && (
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="flex size-24 items-center justify-center rounded-full border-2 border-dashed border-neutral-700 bg-neutral-900/50">
                            <Volume2 className="size-10 text-neutral-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">Voice Channel</h3>
                            <p className="mt-1 text-sm text-neutral-500">
                                Join to talk with other members
                            </p>
                        </div>
                        <Button
                            onClick={join}
                            className="bg-emerald-500 px-8 py-2 text-black hover:bg-emerald-400"
                        >
                            Join Voice
                        </Button>
                    </div>
                )}

                {isConnecting && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="size-12 animate-spin text-emerald-400" />
                        <p className="text-neutral-400">Connecting...</p>
                    </div>
                )}

                {isConnected && (
                    <>
                        {/* Participants grid */}
                        <div className="flex flex-wrap justify-center gap-6">
                            {/* Current user */}
                            <ParticipantCard
                                user={getMemberInfo(currentUserId)}
                                isMuted={isMuted}
                                isCurrentUser
                                isSpeaking={false}
                            />

                            {/* Remote participants */}
                            {Array.from(participants.values()).map((participant) => (
                                <ParticipantCard
                                    key={participant.id}
                                    user={getMemberInfo(participant.id)}
                                    isMuted={participant.isMuted}
                                    isCurrentUser={false}
                                    isSpeaking={false}
                                />
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-4 rounded-xl bg-black/60 px-6 py-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMute}
                                className={cn(
                                    "size-12 rounded-full transition",
                                    isMuted
                                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                                        : "bg-white/10 text-white hover:bg-white/20"
                                )}
                                aria-label={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={leave}
                                className="size-12 rounded-full bg-red-500/20 text-red-400 transition hover:bg-red-500/30 hover:text-red-300"
                                aria-label="Leave voice channel"
                            >
                                <PhoneOff className="size-5" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

type ParticipantCardProps = {
    user: MemberUser;
    isMuted: boolean;
    isCurrentUser: boolean;
    isSpeaking: boolean;
};

function ParticipantCard({ user, isMuted, isCurrentUser, isSpeaking }: ParticipantCardProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center gap-3 rounded-xl border p-6 transition",
                isSpeaking
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-white/10 bg-black/40"
            )}
        >
            <div className="relative">
                <Avatar
                    className={cn(
                        "size-20 border-2 transition",
                        isSpeaking ? "border-emerald-400" : "border-transparent"
                    )}
                >
                    <AvatarImage src={user.imageUrl ?? undefined} alt={user.username} />
                    <AvatarFallback className="bg-neutral-800 text-xl text-neutral-300">
                        {user.username?.charAt(0)?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                </Avatar>
                {isMuted && (
                    <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-red-500">
                        <VolumeX className="size-3 text-white" />
                    </div>
                )}
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-white">
                    {user.username}
                    {isCurrentUser && <span className="text-neutral-500"> (you)</span>}
                </p>
            </div>
        </div>
    );
}
