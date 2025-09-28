// Simple API helper using axios to perform a GET request against a backend on port 8090.
// For now BASE_URL is fixed to the gateway running in Docker at localhost:8090.
// Usage: import { getFromBackend } from './callsAPI';
// const { data, error } = await getFromBackend('/health');

import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://localhost:8090'; // fixed per request; replace with env var when environments expand

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export async function getGateway<T = unknown>(path: string, signal?: AbortSignal): Promise<{ data: T | null; error: ApiError | null; }> {
  try {
    const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
    const response = await axios.get<T>(url, { signal });
    return { data: response.data, error: null };
  } catch (err) {
    const error = err as AxiosError;
    return {
      data: null,
      error: {
        message: error.message,
        status: error.response?.status,
        details: error.response?.data
      }
    };
  }
}

// Convenience example wrapper (commented out until needed)
// export async function getHealth() {
//   return getFromBackend<{ status: string }>('/health');
// }
