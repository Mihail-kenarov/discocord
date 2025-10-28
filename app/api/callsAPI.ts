// Simple API helper using axios to perform a GET request against a backend on port 8090.
// For now BASE_URL is fixed to the gateway running in Docker at localhost:8090.
// Usage: import { getFromBackend } from './callsAPI';
// const { data, error } = await getFromBackend('/health');

import axios, { AxiosError } from 'axios';
import type { Guild, GuildChannel, GuildMessage, GuildWithChannels, MemberUser } from '../me/types';

const BASE_URL = '/gw'; // fixed per request; replace with env var when environments expand

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

function normalizeIconUrl(icon?: string | null): string | null {
  if (!icon) return null;
  const trimmed = icon.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("/gw/")) return trimmed;
  if (trimmed.startsWith("/")) return `${BASE_URL}${trimmed}`; // e.g. /icons/x.png -> /gw/icons/x.png
  return `${BASE_URL}/${trimmed}`; // e.g. icons/x.png -> /gw/icons/x.png
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
  }>>(`/users?${params.toString()}`, signal);

  if (error || !data) return { data: null, error };

  const normalized: MemberUser[] = data.map((u) => ({
    id: String(u.id),
    username: u.username,
    imageUrl: normalizeIconUrl(u.imageUrl ?? null),
  }));
  return { data: normalized, error: null };
}
