/**
 * API-related type definitions for the DiscoCord application.
 * This file contains all types used for API requests, responses, and error handling.
 */

export interface ApiError {
    message: string;
    status?: number;
    details?: unknown;
}

export type ChannelResponse = {
    id: number | string;
    guildId: number | string;
    name: string;
    position: number | string;
};

export type GuildResponse = {
    id: string | number;
    name: string;
    iconUrl?: string | null;
    iconURL?: string | null;
    ownerId?: string | number;
    ownerID?: string | number;
    channels?: ChannelResponse[];
    messages?: import('../me/displayDataModels').GuildMessage[];
};

export type AttachmentResponseRaw = {
    url: string;
    type: string;
    size: number;
};

/**
 * Raw message response shape from chat service
 */
export type MessageResponseRaw = {
    id: string;
    channel_id: number | string;
    author_id: string;
    content: string;
    created_at: string; // RFC3339
    attachment?: AttachmentResponseRaw | null;
};

export type GetMessagesResponseRaw = {
    channel_id: number | string;
    messages: MessageResponseRaw[];
};

export type PersonalDataSnapshot = {
    status: string;
    data?: unknown;
    error?: string;
};

export type PersonalDataBundle = {
    userId: string;
    requestedAt: string;
    sources: Record<string, PersonalDataSnapshot>;
};
