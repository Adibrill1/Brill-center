import type { NextFunction, Request, Response } from 'express';
import { type Lang, type MessageKey, t } from './messages.js';

export { t, type Lang, type MessageKey } from './messages.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      lang: Lang;
      t: (key: MessageKey) => string;
    }
  }
}

export function resolveLang(raw: string | undefined): Lang | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith('he') || lower.startsWith('iw')) return 'he';
  if (lower.startsWith('en')) return 'en';
  return null;
}

/**
 * Resolution order: explicit ?lang= → Accept-Language header →
 * authenticated user preference (set later by auth middleware) → Hebrew.
 */
export function languageMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const fromQuery = resolveLang(
    typeof req.query.lang === 'string' ? req.query.lang : undefined,
  );
  const fromHeader = resolveLang(req.headers['accept-language']);
  req.lang = fromQuery ?? fromHeader ?? 'he';
  req.t = (key: MessageKey) => t(key, req.lang);
  next();
}
