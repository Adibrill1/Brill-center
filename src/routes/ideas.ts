import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ApiError } from '../middleware/errors.js';
import { detectLanguage, parseProposalXml } from '../services/ideaOrchestrator.js';

export const ideasRouter = Router();

ideasRouter.use(requireAuth);

ideasRouter.get('/', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const ideas = await prisma.idea.findMany({
      where: status ? { status: status as 'PROPOSED' | 'APPROVED' | 'REJECTED' } : {},
      orderBy: [{ votesCount: 'desc' }, { createdAt: 'desc' }],
      include: { user: { select: { id: true, name: true } } },
    });
    res.json({ ideas });
  } catch (err) {
    next(err);
  }
});

const directSchema = z
  .object({
    spaceId: z.string().uuid().optional(),
    contentHe: z.string().min(1).optional(),
    contentEn: z.string().min(1).optional(),
  })
  .refine((b) => b.contentHe || b.contentEn, { message: 'contentHe or contentEn required' });

/** Direct submission (without the orchestrator flow). */
ideasRouter.post('/', async (req, res, next) => {
  try {
    const body = directSchema.parse(req.body);
    const idea = await prisma.idea.create({
      data: { ...body, userId: req.user!.id },
    });
    res.status(201).json({ message: req.t('idea.submitted'), idea });
  } catch (err) {
    next(err);
  }
});

const orchestratorSchema = z.object({
  xml: z.string().min(1),
  spaceId: z.string().uuid().optional(),
});

/**
 * Ingestion endpoint for the Idea Orchestrator agent: accepts its
 * <proposal_data> XML output, converts it to structured JSON and stores the
 * idea (handoff requirement: structured conversion before DB insertion).
 */
ideasRouter.post('/orchestrator', async (req, res, next) => {
  try {
    const body = orchestratorSchema.parse(req.body);
    const proposal = parseProposalXml(body.xml);

    const text = `${proposal.activityTitle} — ${proposal.description}`;
    const lang = detectLanguage(text);

    const idea = await prisma.idea.create({
      data: {
        spaceId: body.spaceId,
        userId: req.user!.id,
        contentHe: lang === 'he' ? text : null,
        contentEn: lang === 'en' ? text : null,
        proposalData: proposal as unknown as Prisma.InputJsonValue,
      },
    });
    res.status(201).json({ message: req.t('idea.submitted'), idea, proposal });
  } catch (err) {
    next(err);
  }
});

ideasRouter.post('/:id/vote', async (req, res, next) => {
  try {
    const idea = await prisma.idea.findUnique({ where: { id: req.params.id } });
    if (!idea) throw new ApiError(404, 'not_found', 'common.not_found');

    try {
      const [, updated] = await prisma.$transaction([
        prisma.ideaVote.create({ data: { ideaId: idea.id, userId: req.user!.id } }),
        prisma.idea.update({
          where: { id: idea.id },
          data: { votesCount: { increment: 1 } },
        }),
      ]);
      res.json({ message: req.t('idea.vote_recorded'), idea: updated });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ApiError(409, 'already_voted', 'idea.already_voted');
      }
      throw e;
    }
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) });

/** Approval workflow (Brill Studio, operators only). */
ideasRouter.post('/:id/status', requireRole('OPERATOR'), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const existing = await prisma.idea.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'not_found', 'common.not_found');
    const idea = await prisma.idea.update({ where: { id: req.params.id }, data: { status } });
    res.json({ message: req.t('idea.status_updated'), idea });
  } catch (err) {
    next(err);
  }
});
