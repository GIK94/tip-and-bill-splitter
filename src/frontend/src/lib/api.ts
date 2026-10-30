import type { CalculationInput, CalculationResult, SplitMethod } from '@shared/calc';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface SavedCalculationSummary {
  id: string;
  title: string | null;
  method: SplitMethod;
  totalCents: number;
  peopleCount: number;
  createdAt: string;
}

export interface SavedCalculation extends SavedCalculationSummary {
  input: CalculationInput;
  result: CalculationResult;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages.join(' '));
  }
}

let onSessionExpired: (() => void) | null = null;

/** Called when a protected request fails with 401 (e.g. the 24-hour session ran out). */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

function fallbackMessage(status: number): string {
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return 'Request failed. Please try again.';
}

async function request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, ['Could not reach the server. Check your connection and try again.']);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onSessionExpired?.();
    const message = res.status === 429 || res.status >= 500 ? undefined : data?.message;
    const messages = Array.isArray(message) ? message : [typeof message === 'string' ? message : fallbackMessage(res.status)];
    throw new ApiError(res.status, messages);
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: User | null }>('GET', '/auth/me'),
  signup: (body: { name: string; email: string; password: string }) => request<{ user: User }>('POST', '/auth/signup', body),
  login: (body: { email: string; password: string }) => request<{ user: User }>('POST', '/auth/login', body),
  logout: () => request<void>('POST', '/auth/logout'),
  listCalculations: () => request<SavedCalculationSummary[]>('GET', '/calculations'),
  getCalculation: (id: string) => request<SavedCalculation>('GET', `/calculations/${encodeURIComponent(id)}`),
  saveCalculation: (body: { title?: string; input: CalculationInput }) => request<SavedCalculation>('POST', '/calculations', body),
  deleteCalculation: (id: string) => request<void>('DELETE', `/calculations/${encodeURIComponent(id)}`),
};
