import crypto from 'node:crypto';
import { Prisma, type Treasury } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errors.js';

export interface TreasuryTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: string;
  balanceAfter: string;
  reason: string;
  actorId: string;
  at: string;
}

/**
 * Internal clearing: balance changes are applied inside a DB transaction and
 * every movement is appended to the JSONB audit log (append-only).
 */
export async function applyTransaction(
  spaceId: string,
  type: 'credit' | 'debit',
  amount: number,
  reason: string,
  actorId: string,
): Promise<{ treasury: Treasury; transaction: TreasuryTransaction }> {
  if (amount <= 0) {
    throw new ApiError(400, 'validation_error', 'common.validation_error');
  }

  return prisma.$transaction(async (tx) => {
    const treasury = await tx.treasury.findUnique({ where: { spaceId } });
    if (!treasury) {
      throw new ApiError(404, 'not_found', 'common.not_found');
    }

    const delta = new Prisma.Decimal(amount);
    const newBalance =
      type === 'credit' ? treasury.balance.add(delta) : treasury.balance.sub(delta);

    if (newBalance.isNegative()) {
      throw new ApiError(409, 'insufficient_funds', 'treasury.insufficient_funds');
    }

    const transaction: TreasuryTransaction = {
      id: crypto.randomUUID(),
      type,
      amount: delta.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      reason,
      actorId,
      at: new Date().toISOString(),
    };

    const log = Array.isArray(treasury.transactionsJson)
      ? (treasury.transactionsJson as unknown as TreasuryTransaction[])
      : [];

    const updated = await tx.treasury.update({
      where: { spaceId },
      data: {
        balance: newBalance,
        transactionsJson: [...log, transaction] as unknown as Prisma.InputJsonValue,
      },
    });

    return { treasury: updated, transaction };
  });
}
