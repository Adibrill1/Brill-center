import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { MessageKey } from '../i18n/index.js';

/** Error carrying an i18n message key so responses stay bilingual. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly messageKey: MessageKey,
    public readonly details?: unknown,
  ) {
    super(code);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: req.t('common.not_found') });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: err.code,
      message: req.t(err.messageKey),
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      message: req.t('common.validation_error'),
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: req.t('common.internal_error') });
}
