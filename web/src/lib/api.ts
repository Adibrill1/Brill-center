'use client';

/** Thin client for the Brill Center backend API. */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'CLIENT';
  languagePref: 'HE' | 'EN';
  avatarUrl?: string | null;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('brill.token');
}

export function getUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('brill.user');
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function setSession(token: string, user: SessionUser): void {
  window.localStorage.setItem('brill.token', token);
  window.localStorage.setItem('brill.user', JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem('brill.token');
  window.localStorage.removeItem('brill.user');
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; lang?: string } = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}${path.includes('?') ? '&' : '?'}lang=${options.lang ?? 'he'}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiRequestError(res.status, (data.message as string) ?? `HTTP ${res.status}`);
  }
  return data as T;
}
