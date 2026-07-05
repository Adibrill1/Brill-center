import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ApiError } from '../middleware/errors.js';
import { applyTransaction } from '../services/treasury.js';

export const treasuryRouter = Router();

treasuryRouter.use(requireAuth, requireRole('OPERATOR'));

treasuryRouter.get('/:spaceId', async (req, res, next) => {
  try {
    const treasury = await prisma.treasury.findUnique({ where: { spaceId: req.params.spaceId } });
    if (!treasury) throw new ApiError(404, 'not_found', 'common.not_found');
    res.json({ treasury });
  } catch (err) {
    next(err);
  }
});

const txSchema = z.object({
  type: z.enum(['credit', 'debit']),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
});

treasuryRouter.post('/:spaceId/transactions', async (req, res, next) => {
  try {
    const body = txSchema.parse(req.body);
    const { treasury, transaction } = await applyTransaction(
      req.params.spaceId,
      body.type,
      body.amount,
      body.reason,
      req.user!.id,
    );
    res.status(201).json({
      message: req.t('treasury.transaction_recorded'),
      balance: treasury.balance,
      transaction,
    });
  } catch (err) {
    next(err);
  }
});
