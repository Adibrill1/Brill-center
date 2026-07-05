import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const translationsRouter = Router();

/**
 * Public: returns a key→value map for the resolved language — this is what
 * the web/mobile clients load for their i18n runtime.
 */
translationsRouter.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.translation.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = req.lang === 'he' ? row.valueHe : row.valueEn;
    }
    res.json({ lang: req.lang, translations: map });
  } catch (err) {
    next(err);
  }
});

const upsertSchema = z.object({
  key: z.string().min(1).max(200),
  valueHe: z.string().min(1),
  valueEn: z.string().min(1),
});

translationsRouter.put('/', requireAuth, requireRole('OPERATOR'), async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const translation = await prisma.translation.upsert({
      where: { key: body.key },
      create: body,
      update: { valueHe: body.valueHe, valueEn: body.valueEn },
    });
    res.json({ translation });
  } catch (err) {
    next(err);
  }
});
