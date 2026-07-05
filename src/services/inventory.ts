import type { InventoryItem } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errors.js';
import { dispatchToHardware } from './webhooks.js';

export interface UsageResult {
  item: InventoryItem;
  lowStock: boolean;
}

/**
 * Handoff requirement: every usage report must check `threshold`.
 * Decrements atomically; when quantity drops to/below threshold a
 * low-stock alert is dispatched to the operator channel (webhook).
 */
export async function reportUsage(itemId: string, amount: number): Promise<UsageResult> {
  const item = await prisma.$transaction(async (tx) => {
    const current = await tx.inventoryItem.findUnique({ where: { id: itemId } });
    if (!current) {
      throw new ApiError(404, 'not_found', 'common.not_found');
    }
    if (current.quantity < amount) {
      throw new ApiError(409, 'insufficient_stock', 'inventory.insufficient');
    }
    return tx.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: { decrement: amount } },
    });
  });

  const lowStock = item.quantity <= item.threshold;
  if (lowStock) {
    await dispatchToHardware('inventory.low_stock', {
      itemId: item.id,
      spaceId: item.spaceId,
      itemNameHe: item.itemNameHe,
      itemNameEn: item.itemNameEn,
      quantity: item.quantity,
      threshold: item.threshold,
    });
  }
  return { item, lowStock };
}
