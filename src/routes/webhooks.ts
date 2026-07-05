import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errors.js';
import { verifyCodeHash } from '../services/accessCodes.js';
import { recordIncomingEvent, verifySignature } from '../services/webhooks.js';

export const webhooksRouter = Router();

/**
 * Hardware-facing endpoints. Authenticated with an HMAC signature over the
 * raw JSON body (shared secret with the Home Assistant bridge) instead of
 * user JWTs — devices are not users.
 */
function assertSignature(rawBody: string | undefined, signature: string | undefined): void {
  if (!rawBody || !verifySignature(rawBody, signature)) {
    throw new ApiError(401, 'invalid_signature', 'webhook.invalid_signature');
  }
}

const incomingSchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
});

/** Generic ingest for Home Assistant events (door opened, sensor alerts...). */
webhooksRouter.post('/home-assistant', async (req, res, next) => {
  try {
    const signature = req.headers['x-brill-signature'];
    assertSignature(req.rawBody, typeof signature === 'string' ? signature : undefined);
    const body = incomingSchema.parse(req.body);
    await recordIncomingEvent(body.event, body.payload);
    res.json({ message: req.t('webhook.received') });
  } catch (err) {
    next(err);
  }
});

const verifyCodeSchema = z.object({
  spaceId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Keypad validation: hardware submits an entered code; valid only when it
 * matches a non-revoked access code of a confirmed/active booking for that
 * space, inside its validity window.
 */
webhooksRouter.post('/verify-code', async (req, res, next) => {
  try {
    const signature = req.headers['x-brill-signature'];
    assertSignature(req.rawBody, typeof signature === 'string' ? signature : undefined);
    const body = verifyCodeSchema.parse(req.body);

    const now = new Date();
    const candidates = await prisma.accessCode.findMany({
      where: {
        revoked: false,
        validFrom: { lte: now },
        expiresAt: { gte: now },
        booking: { spaceId: body.spaceId, status: { in: ['CONFIRMED', 'ACTIVE'] } },
      },
      include: { booking: { select: { id: true } } },
    });

    const match = candidates.find((c) => verifyCodeHash(body.code, c.codeHash));
    await recordIncomingEvent('access_code.attempt', {
      spaceId: body.spaceId,
      granted: Boolean(match),
      bookingId: match?.booking.id ?? null,
    });

    if (!match) {
      res.status(403).json({ granted: false, message: req.t('access_code.invalid') });
      return;
    }

    // First successful entry activates the booking.
    await prisma.booking.update({
      where: { id: match.booking.id },
      data: { status: 'ACTIVE' },
    });

    res.json({ granted: true, bookingId: match.booking.id, message: req.t('access_code.valid') });
  } catch (err) {
    next(err);
  }
});
