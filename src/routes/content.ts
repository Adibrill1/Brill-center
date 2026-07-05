import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateContent } from '../services/contentGenerator.js';

export const contentRouter = Router();

contentRouter.use(requireAuth, requireRole('OPERATOR'));

const generateSchema = z.object({
  kind: z.enum(['whatsapp', 'flyer', 'social']),
  language: z.enum(['he', 'en']).default('he'),
  spaceId: z.string().uuid().optional(),
  days: z.number().int().min(1).max(60).default(14),
  extraInstructions: z.string().max(2000).optional(),
});

/** Generate marketing content from the real schedule (Claude or template engine). */
contentRouter.post('/generate', async (req, res, next) => {
  try {
    const body = generateSchema.parse(req.body);
    const content = await generateContent({ ...body, userId: req.user!.id });
    res.status(201).json({ message: req.t('content.generated'), content });
  } catch (err) {
    next(err);
  }
});

/** History of generated materials (Brill Studio content library). */
contentRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.generatedContent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});
