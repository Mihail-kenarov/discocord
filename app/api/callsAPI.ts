// Simple API helper using axios to perform a GET request against a backend on port 8090.
// For now BASE_URL is fixed to the gateway running in Docker at localhost:8090.
// Usage: import { getFromBackend } from './callsAPI';
// const { data, error } = await getFromBackend('/health');

import axios, { AxiosError } from 'axios';
import type { Guild } from '../me/types';

const BASE_URL = '/gw'; // fixed per request; replace with env var when environments expand

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
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

