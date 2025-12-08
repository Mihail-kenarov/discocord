// Simple API helper using axios to perform a GET request against a backend on port 8090.
// For now BASE_URL is fixed to the gateway running in Docker at localhost:8090.
// Usage: import { getFromBackend } from './callsAPI';
// const { data, error } = await getFromBackend('/health');

import axios, { AxiosError } from 'axios';
import type { Guild, GuildChannel, GuildMessage, GuildWithChannels, MemberUser } from '../me/displayDataModels';
import type {
  ApiError,
  ChannelResponse,
  GuildResponse,
  AttachmentResponseRaw,
  MessageResponseRaw,
  GetMessagesResponseRaw,
  PersonalDataSnapshot,
  PersonalDataBundle,
} from './types';

// Re-export types that are part of the public API
export type { ApiError, PersonalDataSnapshot, PersonalDataBundle };

// Single, fixed gateway entrypoint. The Next rewrite in next.config.mjs maps /gw/* to the gateway service.
const BASE_URL = "/gw";
const GATEWAY_HOST_HINTS = ['discocord_gw', 'discocord_gw:8080', 'localhost:8080', 'localhost:8090'];

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

export async function getGateway<T = unknown>(
  path: string,
  signal?: AbortSignal,
  token?: string
): Promise<{ data: T | null; error: ApiError | null; }> {
  try {
    const url = buildGatewayUrl(path);
    const response = await axios.get<T>(url, {
      signal,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
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

export async function createGuild(
  payload: {
    name: string;
    ownerId: string;
    iconFile?: File | null;
  },
  token?: string
): Promise<Guild> {
  try {
    const form = new FormData();
    form.append("name", payload.name);
    form.append("ownerId", payload.ownerId);
    if (payload.iconFile) {
      form.append("icon", payload.iconFile);
    }

    const url = buildGatewayUrl("/guilds");
    const response = await axios.post<Guild>(url, form, {
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    return response.data;
  } catch (err) {
    const error = toApiError(err as AxiosError);
    throw error;
  }
}

export async function getGuildById(
  id: string | number,
  signal?: AbortSignal,
  token?: string
): Promise<{ data: GuildWithChannels | null; error: ApiError | null; }> {
  const encodedId = encodeURIComponent(String(id));
  const { data, error } = await getGateway<GuildResponse>(`/guilds/${encodedId}`, signal, token);

  if (error || !data) {
    return { data: null, error };
  }

  const normalized = normalizeGuildResponse(data);

  return { data: normalized, error: null };
}

export async function listMyGuilds(
  userId: string,
  signal?: AbortSignal,
  token?: string
): Promise<{ data: GuildWithChannels[] | null; error: ApiError | null; }> {
  if (!userId) {
    return {
      data: null,
      error: { message: "userId is required to list guilds" }
    };
  }

  const params = new URLSearchParams({ userId });
  const { data, error } = await getGateway<GuildResponse[]>(
    `/my/guilds?${params.toString()}`,
    signal,
    token
  );

  if (error || !data) {
    return { data: null, error };
  }

  const normalized = data.map(normalizeGuildResponse);
  return { data: normalized, error: null };
}

// Fetch only IDs of guild members from guild service
export async function getGuildMembers(
  guildId: string | number,
  signal?: AbortSignal,
  token?: string
): Promise<{ data: { ownerId: string; memberIds: string[] } | null; error: ApiError | null; }> {
  const encodedId = encodeURIComponent(String(guildId));
  const { data, error } = await getGateway<{
    ownerId?: string | number;
    ownerID?: string | number;
    memberIds?: Array<string | number>;
    memberIDs?: Array<string | number>;
  }>(`/guilds/${encodedId}/members`, signal, token);

  if (error || !data) return { data: null, error };

  const owner = data.ownerId ?? data.ownerID ?? '';
  const members = (data.memberIds ?? data.memberIDs ?? []).map((v) => String(v));
  return { data: { ownerId: String(owner), memberIds: members }, error: null };
}

// Batch resolve users via user service
export async function getUsersByIds(
  ids: string[],
  signal?: AbortSignal,
  token?: string
): Promise<{ data: MemberUser[] | null; error: ApiError | null; }> {
  if (!ids || ids.length === 0) return { data: [], error: null };
  const params = new URLSearchParams({ ids: ids.join(',') });
  const { data, error } = await getGateway<Array<{
    id: string;
    username: string;
    imageUrl?: string | null;
    avatarUrl?: string | null;
  }>>(`/users?${params.toString()}`, signal, token);

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
  signal?: AbortSignal,
  token?: string
): Promise<{ data: PersonalDataBundle | null; error: ApiError | null; }> {
  const trimmed = userId?.trim();
  if (!trimmed) {
    return { data: null, error: { message: "userId is required to retrieve personal data" } };
  }

  const path = `/users/${encodeURIComponent(trimmed)}/personal-data`;
  const { data, error } = await getGateway<PersonalDataBundle>(path, signal, token);
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
  payload: { authorId: string; content: string; attachmentFile?: File | null },
  token?: string
): Promise<{ data: MessageResponseRaw | null; error: ApiError | null; }> {
  try {
    const url = buildGatewayUrl(`/channels/${encodeURIComponent(String(channelId))}/messages`);
    let response;
    if (payload.attachmentFile) {
      const form = new FormData();
      form.append("author_id", payload.authorId);
      form.append("content", payload.content);
      form.append("attachment", payload.attachmentFile);
      response = await axios.post<MessageResponseRaw>(url, form, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
    } else {
      const body = { author_id: payload.authorId, content: payload.content } as const;
      response = await axios.post<MessageResponseRaw>(url, body, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
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
  signal?: AbortSignal,
  token?: string
): Promise<{ data: GuildMessage[] | null; error: ApiError | null; }> {
  try {
    const params = new URLSearchParams();
    if (options?.limit && options.limit > 0) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', String(options.before));
    const url = buildGatewayUrl(`/channels/${encodeURIComponent(String(channelId))}/messages${params.toString() ? `?${params.toString()}` : ''}`);
    const response = await axios.get<GetMessagesResponseRaw>(url, {
      signal,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    const raw = response.data;
    const authorIds = Array.from(new Set(raw.messages.map((m) => m.author_id)));
    const { data: users } = await getUsersByIds(authorIds, signal, token);
    const byId = new Map((users ?? []).map((u) => [u.id, u] as const));

    const normalized: GuildMessage[] = raw.messages.map((m) => {
      const profile = byId.get(String(m.author_id));
      const date = new Date(m.created_at);
      const attachment = normalizeAttachmentInfo(m.attachment);
      return {
        id: String(m.id),
        channelId: Number(m.channel_id),
        authorId: String(m.author_id),
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

export function createWebSocketConnection(
  channelId: string | number,
  token?: string
): WebSocket | null {
  if (typeof window === "undefined") return null;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  // We use the /gw proxy similarly to REST. Next.js middleware/rewrites usually handle WS upgrades if configured,
  // or if we are hitting the gateway directly (dev setup). 
  // If /gw is a rewrite to a backend that supports WS, this works.
  const url = `${protocol}//${host}${BASE_URL}/channels/${encodeURIComponent(String(channelId))}/ws`;

  // Standard WebSockets don't support custom headers (like Authorization) in the constructor
  // except via the "protocols" argument (which is a hack) or query params.
  // Our gateway/backend might not support query param auth out of the box unless we implemented it.
  // The backend middleware checks the "Authorization" header.
  // 
  // LIMITATION: Browser WebSocket API does NOT allow setting custom headers.
  // Workaround: We will use a library or, more commonly, send the token as the first message 
  // OR rely on cookies if available. 
  // 
  // However, looking at the backend code `ClerkAuthMiddleware`:
  // authHeader := c.GetHeader("Authorization")
  // It ONLY checks the header. This is a problem for standard WebSockets in browsers.
  //
  // BUT: The user asked to "look into" the backend. I can modify the backend to accept 
  // the token in the query string for WS upgrades if needed.
  // 
  // Let's assume for now I will modify the backend to also check Query params ("token") 
  // or "Sec-WebSocket-Protocol".
  // 
  // Let's try sending it via the subprotocol header which is often allowed.
  // const ws = new WebSocket(url, [token]); 
  // But the server needs to accept that subprotocol.
  
  // Alternative: The backend uses `github.com/clerk/clerk-sdk-go/v2/jwt`.
  // 
  // Let's assume I'll fix the backend to check query params too.
  
  const urlWithAuth = token ? `${url}?token=${encodeURIComponent(token)}` : url;
  return new WebSocket(urlWithAuth);
}

