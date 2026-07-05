import type { BookingStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Smart, demand-aware scheduling:
 * - Free slots are computed from existing bookings for a requested date.
 * - Historical demand per (weekday, hour) is aggregated from all past and
 *   future bookings of the space; slots are ranked so users are nudged
 *   toward quieter times.
 * - Spaces with `config.autoConfirm: true` auto-approve bookings in
 *   low-demand slots — coordination happens automatically, tied to
 *   operator-controlled configuration.
 */

const ACTIVE_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'ACTIVE'];

export type DemandLevel = 'low' | 'medium' | 'high';

export interface SlotSuggestion {
  startTime: string;
  endTime: string;
  demandLevel: DemandLevel;
  /** 0 (quiet) .. 1 (busiest observed) relative demand score */
  demandScore: number;
  autoConfirm: boolean;
}

interface SpaceHours {
  openHour: number;
  closeHour: number;
  slotMinutes: number;
}

function spaceHours(config: unknown): SpaceHours {
  const c = (config ?? {}) as Record<string, unknown>;
  const hours = (c.openingHours ?? {}) as Record<string, unknown>;
  return {
    openHour: typeof hours.open === 'number' ? hours.open : 8,
    closeHour: typeof hours.close === 'number' ? hours.close : 22,
    slotMinutes: typeof c.slotMinutes === 'number' ? c.slotMinutes : 60,
  };
}

/** Aggregate demand per (weekday, hour) from the space's booking history. */
async function demandMatrix(spaceId: string): Promise<Map<string, number>> {
  const bookings = await prisma.booking.findMany({
    where: { spaceId, status: { in: [...ACTIVE_STATUSES, 'COMPLETED'] } },
    select: { startTime: true, endTime: true },
  });
  const matrix = new Map<string, number>();
  for (const b of bookings) {
    const cursor = new Date(b.startTime);
    while (cursor < b.endTime) {
      const key = `${cursor.getUTCDay()}:${cursor.getUTCHours()}`;
      matrix.set(key, (matrix.get(key) ?? 0) + 1);
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
  }
  return matrix;
}

function levelFor(score: number): DemandLevel {
  if (score >= 0.66) return 'high';
  if (score >= 0.33) return 'medium';
  return 'low';
}

export async function suggestSlots(
  spaceId: string,
  date: Date,
  durationMinutes: number,
): Promise<SlotSuggestion[]> {
  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) return [];

  const { openHour, closeHour, slotMinutes } = spaceHours(space.config);
  const autoConfirmEnabled = Boolean(
    ((space.config ?? {}) as Record<string, unknown>).autoConfirm,
  );

  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [existing, matrix] = await Promise.all([
    prisma.booking.findMany({
      where: {
        spaceId,
        status: { in: ACTIVE_STATUSES },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    }),
    demandMatrix(spaceId),
  ]);

  const maxDemand = Math.max(1, ...matrix.values());
  const suggestions: SlotSuggestion[] = [];
  const stepMs = slotMinutes * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;

  for (
    let start = new Date(dayStart.getTime() + openHour * 3600_000);
    start.getTime() + durationMs <= dayStart.getTime() + closeHour * 3600_000;
    start = new Date(start.getTime() + stepMs)
  ) {
    const end = new Date(start.getTime() + durationMs);
    if (end <= new Date()) continue; // past slots are useless

    const overlaps = existing.some((b) => b.startTime < end && b.endTime > start);
    if (overlaps) continue;

    // Average historical demand across the hours the slot covers.
    let total = 0;
    let hours = 0;
    const cursor = new Date(start);
    while (cursor < end) {
      total += matrix.get(`${cursor.getUTCDay()}:${cursor.getUTCHours()}`) ?? 0;
      hours += 1;
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
    const demandScore = hours ? total / hours / maxDemand : 0;
    const demandLevel = levelFor(demandScore);

    suggestions.push({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      demandLevel,
      demandScore: Number(demandScore.toFixed(2)),
      autoConfirm: autoConfirmEnabled && demandLevel === 'low',
    });
  }

  // Quietest slots first — the "smart" nudge that spreads demand.
  return suggestions.sort((a, b) => a.demandScore - b.demandScore);
}

export function shouldAutoConfirm(config: unknown, demandLevel: DemandLevel): boolean {
  return Boolean(((config ?? {}) as Record<string, unknown>).autoConfirm) && demandLevel === 'low';
}

/** Demand level for one specific window — used at booking time. */
export async function demandLevelForWindow(
  spaceId: string,
  start: Date,
  end: Date,
): Promise<DemandLevel> {
  const matrix = await demandMatrix(spaceId);
  const maxDemand = Math.max(1, ...matrix.values());
  let total = 0;
  let hours = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    total += matrix.get(`${cursor.getUTCDay()}:${cursor.getUTCHours()}`) ?? 0;
    hours += 1;
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }
  return levelFor(hours ? total / hours / maxDemand : 0);
}

/** Public activity feed: upcoming confirmed bookings + approved ideas. */
export async function scheduleFeed(days: number) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const [bookings, ideas] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'ACTIVE'] },
        startTime: { gte: now, lte: until },
      },
      include: { space: { select: { nameHe: true, nameEn: true } } },
      orderBy: { startTime: 'asc' },
    }),
    prisma.idea.findMany({
      where: { status: 'APPROVED' },
      include: { space: { select: { nameHe: true, nameEn: true } } },
      orderBy: { votesCount: 'desc' },
      take: 10,
    }),
  ]);

  return { bookings, ideas };
}
