import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

/** HMAC signature over the raw JSON body — shared with Home Assistant. */
export function signPayload(rawBody: string): string {
  return crypto.createHmac('sha256', env().HA_WEBHOOK_SECRET).update(rawBody).digest('hex');
}

export function verifySignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signPayload(rawBody), 'hex');
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

/**
 * Dispatch an event to the Home Assistant bridge (fire-and-forget with audit
 * trail). Events include: access_code.created, access_code.revoked,
 * inventory.low_stock.
 */
export async function dispatchToHardware(event: string, payload: Record<string, unknown>): Promise<void> {
  await prisma.webhookEvent.create({
    data: { direction: 'OUTGOING', event, payload: payload as Prisma.InputJsonValue },
  });

  const url = env().HA_WEBHOOK_URL;
  if (!url) return; // Hardware bridge not configured (e.g. analog-only deployment)

  const body = JSON.stringify({ event, ...payload });
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-brill-signature': signPayload(body),
      },
      body,
    });
  } catch (err) {
    // Never let hardware connectivity break the API flow — the audit row remains.
    console.error(`Failed to dispatch webhook "${event}":`, err);
  }
}

export async function recordIncomingEvent(event: string, payload: Record<string, unknown>): Promise<void> {
  await prisma.webhookEvent.create({
    data: { direction: 'INCOMING', event, payload: payload as Prisma.InputJsonValue },
  });
}
