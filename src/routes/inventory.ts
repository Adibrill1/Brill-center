import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { reportUsage } from '../services/inventory.js';

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

const itemSchema = z.object({
  spaceId: z.string().uuid(),
  itemNameHe: z.string().min(1),
  itemNameEn: z.string().min(1),
  quantity: z.number().int().min(0),
  threshold: z.number().int().min(0),
  attributes: z.record(z.unknown()).optional(),
});

function localizeItem<T extends { itemNameHe: string; itemNameEn: string }>(item: T, lang: 'he' | 'en') {
  return { ...item, itemName: lang === 'he' ? item.itemNameHe : item.itemNameEn };
}

inventoryRouter.get('/', async (req, res, next) => {
  try {
    const spaceId = typeof req.query.spaceId === 'string' ? req.query.spaceId : undefined;
    const items = await prisma.inventoryItem.findMany({
      where: spaceId ? { spaceId } : {},
      orderBy: { createdAt: 'asc' },
    });
    res.json({ items: items.map((i) => localizeItem(i, req.lang)) });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post('/', requireRole('OPERATOR'), async (req, res, next) => {
  try {
    const body = itemSchema.parse(req.body);
    const item = await prisma.inventoryItem.create({
      data: { ...body, attributes: body.attributes as Prisma.InputJsonValue | undefined },
    });
    res.status(201).json({ message: req.t('inventory.created'), item: localizeItem(item, req.lang) });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.patch('/:id', requireRole('OPERATOR'), async (req, res, next) => {
  try {
    const body = itemSchema.partial().omit({ spaceId: true }).parse(req.body);
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { ...body, attributes: body.attributes as Prisma.InputJsonValue | undefined },
    });
    res.json({ item: localizeItem(item, req.lang) });
  } catch (err) {
    next(err);
  }
});

const usageSchema = z.object({ amount: z.number().int().positive() });

/** Usage report — threshold is checked on every report (handoff requirement). */
inventoryRouter.post('/:id/usage', async (req, res, next) => {
  try {
    const { amount } = usageSchema.parse(req.body);
    const { item, lowStock } = await reportUsage(req.params.id, amount);
    res.json({
      message: req.t('inventory.usage_recorded'),
      item: localizeItem(item, req.lang),
      lowStock,
      ...(lowStock ? { alert: req.t('inventory.low_stock') } : {}),
    });
  } catch (err) {
    next(err);
  }
});
