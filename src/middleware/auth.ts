import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { resolveLang } from '../i18n/index.js';

export interface AuthUser {
  id: string;
  role: Role;
  languagePref: 'HE' | 'EN';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: string;
  role: Role;
  lang: 'HE' | 'EN';
}

export function signToken(user: AuthUser): string {
  const payload: Omit<TokenPayload, 'sub'> & { sub: string } = {
    sub: user.id,
    role: user.role,
    lang: user.languagePref,
  };
  return jwt.sign(payload, env().JWT_SECRET, {
    expiresIn: env().JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: req.t('auth.unauthorized') });
    return;
  }
  try {
    const decoded = jwt.verify(token, env().JWT_SECRET) as unknown as TokenPayload;
    req.user = { id: decoded.sub, role: decoded.role, languagePref: decoded.lang };
    // No explicit ?lang / Accept-Language override → fall back to user preference.
    const hasExplicit =
      resolveLang(typeof req.query.lang === 'string' ? req.query.lang : undefined) ??
      resolveLang(req.headers['accept-language']);
    if (!hasExplicit) {
      req.lang = decoded.lang === 'EN' ? 'en' : 'he';
    }
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized', message: req.t('auth.unauthorized') });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized', message: req.t('auth.unauthorized') });
      return;
    }
    // ADMIN can do everything an OPERATOR can.
    const effective = req.user.role === 'ADMIN' ? [...roles, 'ADMIN' as Role] : roles;
    if (!effective.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden', message: req.t('auth.forbidden') });
      return;
    }
    next();
  };
}
