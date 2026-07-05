import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ApiError } from '../middleware/errors.js';

export const spacesRouter = Router();

const spaceBodySchema = z.object({
  nameHe: z.string().min(1),
  nameEn: z.string().min(1),
  type: z.enum(['DIGITAL', 'ANALOG', 'HYBRID']),
  config: z.record(z.unknown()).optional(),
});

/** Localized projection: expose `name` in the caller's language alongside both originals. */
function localizeSpace<T extends { nameHe: string; nameEn: string }>(space: T, lang: 'he' | 'en') {
  return { ...space, name: lang === 'he' ? space.nameHe : space.nameEn };
}

spacesRouter.get('/', async (req, res, next) => {
  try {
    const spaces = await prisma.space.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ spaces: spaces.map((s) => localizeSpace(s, req.lang)) });
  } catch (err) {
    next(err);
  }
});

spacesRouter.get('/:id', async (req, res, next) => {
  try {
    const space = await prisma.space.findUnique({
      where: { id: req.params.id },
      include: { inventory: true, treasury: true },
    });
    if (!space) throw new ApiError(404, 'not_found', 'common.not_found');
    res.json({ space: localizeSpace(space, req.lang) });
  } catch (err) {
    next(err);
  }
});

spacesRouter.post('/', requireAuth, requireRole('OPERATOR'), async (req, res, next) => {
  try {
    const body = spaceBodySchema.parse(req.body);
    const space = await prisma.space.create({
      data: {
        nameHe: body.nameHe,
        nameEn: body.nameEn,
        type: body.type,
        config: body.config as Prisma.InputJsonValue | undefined,
        ownerId: req.user!.id,
        // Every space gets a treasury for internal clearing.
        treasury: { create: {} },
      },
      include: { treasury: true },
    });
    res.status(201).json({ message: req.t('space.created'), space: localizeSpace(space, req.lang) });
  } catch (err) {
    next(err);
  }
});

spacesRouter.patch('/:id', requireAuth, requireRole('OPERATOR'), async (req, res, next) => {
  try {
    const body = spaceBodySchema.partial().parse(req.body);
    const existing = await prisma.space.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'not_found', 'common.not_found');
    if (existing.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'forbidden', 'auth.forbidden');
    }
    const space = await prisma.space.update({
      where: { id: req.params.id },
      data: { ...body, config: body.config as Prisma.InputJsonValue | undefined },
    });
    res.json({ message: req.t('space.updated'), space: localizeSpace(space, req.lang) });
  } catch (err) {
    next(err);
  }
});
