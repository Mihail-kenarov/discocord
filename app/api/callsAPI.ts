// Simple API helper using axios to perform a GET request against a backend on port 8090.
// For now BASE_URL is fixed to the gateway running in Docker at localhost:8090.
// Usage: import { getFromBackend } from './callsAPI';
// const { data, error } = await getFromBackend('/health');

import axios, { AxiosError } from 'axios';
import type { Guild, GuildChannel, GuildMessage, GuildWithChannels, MemberUser } from '../me/types';

const BASE_URL = '/gw'; // fixed per request; replace with env var when environments expand
const GATEWAY_HOST_HINTS = ['discocord_gw', 'discocord_gw:8080', 'localhost:8080', 'localhost:8090'];

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

type ChannelResponse = {
  id: number | string;
  guildId: number | string;
  name: string;
  position: number | string;
};

type GuildResponse = {
  id: string | number;
  name: string;
  iconUrl?: string | null;
  iconURL?: string | null;
  ownerId?: string | number;
  ownerID?: string | number;
  channels?: ChannelResponse[];
  messages?: GuildMessage[];
};

type AttachmentResponseRaw = {
  url: string;
  type: string;
  size: number;
};

// Raw message response shapes from chat service
type MessageResponseRaw = {
  id: string;
  channel_id: number | string;
  author_id: string;
  content: string;
  created_at: string; // RFC3339
  attachment?: AttachmentResponseRaw | null;
};

type GetMessagesResponseRaw = {
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

function normalizeChannel(channel: ChannelResponse): GuildChannel {
  return {
    id: Number(channel.id),
    guildId: Number(channel.guildId),
    name: channel.name,
    position: Number(channel.position),
  };
}

function isAbsoluteUrl(url: string) {
  return /^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith("data:");
}

function normalizeGatewayAssetUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isAbsoluteUrl(trimmed)) {
    // data URLs and fully-qualified CDN assets remain untouched.
    if (trimmed.startsWith("data:")) return trimmed;
    try {
      const parsed = new URL(trimmed);
      if (GATEWAY_HOST_HINTS.some((host) => parsed.host === host)) {
        return `${BASE_URL}${parsed.pathname}${parsed.search ?? ""}`;
      }
    } catch {
      // fall back to returning the original absolute URL if parsing fails
    }
    return trimmed;
  }
  if (trimmed.startsWith("/gw/")) return trimmed;
  if (trimmed.startsWith("/")) return `${BASE_URL}${trimmed}`; // e.g. /icons/x.png -> /gw/icons/x.png
  return `${BASE_URL}/${trimmed}`; // e.g. icons/x.png -> /gw/icons/x.png
}

function normalizeIconUrl(icon?: string | null): string | null {
  if (!icon) return null;
  const normalized = normalizeGatewayAssetUrl(icon);
  return normalized || null;
}

function normalizeAttachmentInfo(attachment?: AttachmentResponseRaw | null): AttachmentResponseRaw | null {
  if (!attachment || !attachment.url) return null;
  return {
    url: normalizeGatewayAssetUrl(attachment.url),
    type: attachment.type,
    size: attachment.size,
  };
}

function normalizeGuildResponse(guild: GuildResponse): GuildWithChannels {
  return {
    id: String(guild.id),
    name: guild.name,
    iconUrl: normalizeIconUrl(guild.iconUrl ?? guild.iconURL ?? null),
    ownerId: guild.ownerId !== undefined ? String(guild.ownerId) : guild.ownerID !== undefined ? String(guild.ownerID) : "",
    channels: (guild.channels ?? []).map(normalizeChannel),
    messages: guild.messages ?? []
  };
}


function buildGatewayUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}

function toApiError(error: AxiosError): ApiError {
  const responseData = error.response?.data as { message?: string } | undefined;
  return {
    message: responseData?.message ?? error.message,
    status: error.response?.status,
    details: error.response?.data
  };
}

export async function getGateway<T = unknown>(path: string, signal?: AbortSignal): Promise<{ data: T | null; error: ApiError | null; }> {
  try {
    const url = buildGatewayUrl(path);
    const response = await axios.get<T>(url, { signal });
    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: toApiError(err as AxiosError) };
  }
}

// Direct convenience call specifically for the users collection at the gateway.
// Returns whatever the gateway responds with at /users/.
export async function getGatewayUsers<T = unknown>(signal?: AbortSignal): Promise<{ data: T | null; error: ApiError | null; }> {
  return getGateway<T>('/users', signal);
}

// Returns whatever the gateway responds with at /users/.
export async function getGatewayUserwithId<T = unknown>(id: string | number, signal?: AbortSignal): Promise<{ data: T | null; error: ApiError | null; }> {
  return getGateway<T>(`/users/${id}`, signal);
}

export async function createGuild(payload: {
  name: string;
  ownerId: string;
  iconFile?: File | null;
}): Promise<Guild> {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("ownerId", payload.ownerId);
  if (payload.iconFile) {
    form.append("icon", payload.iconFile);
  }

  const url = buildGatewayUrl("/guilds");
  const response = await axios.post<Guild>(url, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function getGuildById(
  id: string | number,
  signal?: AbortSignal
): Promise<{ data: GuildWithChannels | null; error: ApiError | null; }> {
  const encodedId = encodeURIComponent(String(id));
  const { data, error } = await getGateway<GuildResponse>(`/guilds/${encodedId}`, signal);

  if (error || !data) {
    return { data: null, error };
  }

  const normalized = normalizeGuildResponse(data);

  return { data: normalized, error: null };
}

export async function listMyGuilds(
  userId: string,
  signal?: AbortSignal
): Promise<{ data: GuildWithChannels[] | null; error: ApiError | null; }> {
  if (!userId) {
    return {
      data: null,
      error: { message: "userId is required to list guilds" }
    };
  }

  const params = new URLSearchParams({ userId });
  const { data, error } = await getGateway<GuildResponse[]>(`/my/guilds?${params.toString()}`, signal);

  if (error || !data) {
    return { data: null, error };
  }

  const normalized = data.map(normalizeGuildResponse);
  return { data: normalized, error: null };
}

// Fetch only IDs of guild members from guild service
export async function getGuildMembers(
  guildId: string | number,
  signal?: AbortSignal
): Promise<{ data: { ownerId: string; memberIds: string[] } | null; error: ApiError | null; }> {
  const encodedId = encodeURIComponent(String(guildId));
  const { data, error } = await getGateway<{
    ownerId?: string | number;
    ownerID?: string | number;
    memberIds?: Array<string | number>;
    memberIDs?: Array<string | number>;
  }>(`/guilds/${encodedId}/members`, signal);

  if (error || !data) return { data: null, error };

  const owner = data.ownerId ?? data.ownerID ?? '';
  const members = (data.memberIds ?? data.memberIDs ?? []).map((v) => String(v));
  return { data: { ownerId: String(owner), memberIds: members }, error: null };
}

// Batch resolve users via user service
export async function getUsersByIds(
  ids: string[],
  signal?: AbortSignal
): Promise<{ data: MemberUser[] | null; error: ApiError | null; }> {
  if (!ids || ids.length === 0) return { data: [], error: null };
  const params = new URLSearchParams({ ids: ids.join(',') });
  const { data, error } = await getGateway<Array<{
    id: string;
    username: string;
    imageUrl?: string | null;
    avatarUrl?: string | null;
  }>>(`/users?${params.toString()}`, signal);

  if (error || !data) return { data: null, error };

  const normalized: MemberUser[] = data.map((u) => ({
    id: String(u.id),
    username: u.username,
    imageUrl: normalizeIconUrl(u.imageUrl ?? u.avatarUrl ?? null),
  }));
  return { data: normalized, error: null };
}

// Retrieve aggregated personal data for a user (user service + downstream providers)
export async function getUserPersonalData(
  userId: string,
  signal?: AbortSignal
): Promise<{ data: PersonalDataBundle | null; error: ApiError | null; }> {
  const trimmed = userId?.trim();
  if (!trimmed) {
    return { data: null, error: { message: "userId is required to retrieve personal data" } };
  }

  const path = `/users/${encodeURIComponent(trimmed)}/personal-data`;
  const { data, error } = await getGateway<PersonalDataBundle>(path, signal);
  if (!error) {
    return { data, error: null };
  }
  const payload =
    typeof error.details === "object" && error.details && "payload" in error.details
      ? (error.details as { payload?: PersonalDataBundle }).payload ?? null
      : null;
  return { data: payload ?? null, error };
}

// Create a message in a channel
export async function postChannelMessage(
  channelId: number | string,
  payload: { authorId: string; content: string; attachmentFile?: File | null }
): Promise<{ data: MessageResponseRaw | null; error: ApiError | null; }> {
  try {
    const url = buildGatewayUrl(`/channels/${encodeURIComponent(String(channelId))}/messages`);
    let response;
    if (payload.attachmentFile) {
      const form = new FormData();
      form.append("author_id", payload.authorId);
      form.append("content", payload.content);
      form.append("attachment", payload.attachmentFile);
      response = await axios.post<MessageResponseRaw>(url, form);
    } else {
      const body = { author_id: payload.authorId, content: payload.content } as const;
      response = await axios.post<MessageResponseRaw>(url, body);
    }
    const normalizedAttachment = normalizeAttachmentInfo(response.data.attachment);
    const normalizedData: MessageResponseRaw = normalizedAttachment
      ? { ...response.data, attachment: normalizedAttachment }
      : { ...response.data, attachment: response.data.attachment ?? null };
    return { data: normalizedData, error: null };
  } catch (err) {
    return { data: null, error: toApiError(err as AxiosError) };
  }
}

// Fetch messages for a channel and enrich with author profiles
export async function getChannelMessages(
  channelId: number | string,
  options?: { limit?: number; before?: string | number },
  signal?: AbortSignal
): Promise<{ data: GuildMessage[] | null; error: ApiError | null; }> {
  try {
    const params = new URLSearchParams();
    if (options?.limit && options.limit > 0) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', String(options.before));
    const url = buildGatewayUrl(`/channels/${encodeURIComponent(String(channelId))}/messages${params.toString() ? `?${params.toString()}` : ''}`);
    const response = await axios.get<GetMessagesResponseRaw>(url, { signal });
    const raw = response.data;
    const authorIds = Array.from(new Set(raw.messages.map((m) => m.author_id)));
    const { data: users } = await getUsersByIds(authorIds, signal);
    const byId = new Map((users ?? []).map((u) => [u.id, u] as const));

    const normalized: GuildMessage[] = raw.messages.map((m) => {
      const profile = byId.get(String(m.author_id));
      const date = new Date(m.created_at);
      const attachment = normalizeAttachmentInfo(m.attachment);
      return {
        id: String(m.id),
        channelId: Number(m.channel_id),
        author: {
          username: profile?.username ?? String(m.author_id),
          imageUrl: profile?.imageUrl ?? null,
        },
        timestamp: isNaN(date.getTime()) ? String(m.created_at) : date.toLocaleString(),
        content: m.content,
        attachment,
      };
    });

    return { data: normalized, error: null };
  } catch (err) {
    return { data: null, error: toApiError(err as AxiosError) };
  }
}
