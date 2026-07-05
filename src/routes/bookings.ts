import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ApiError } from '../middleware/errors.js';
import {
  codeValidityWindow,
  encryptCode,
  generateCode,
  hashCode,
} from '../services/accessCodes.js';
import { dispatchToHardware } from '../services/webhooks.js';
import { demandLevelForWindow, shouldAutoConfirm } from '../services/scheduling.js';

export const bookingsRouter = Router();

bookingsRouter.use(requireAuth);

const createSchema = z
  .object({
    spaceId: z.string().uuid(),
    title: z.string().max(200).optional(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((b) => b.endTime > b.startTime, { message: 'endTime must be after startTime' });

bookingsRouter.get('/', async (req, res, next) => {
  try {
    const isOperator = req.user!.role !== 'CLIENT';
    const bookings = await prisma.booking.findMany({
      where: isOperator ? {} : { userId: req.user!.id },
      include: { space: { select: { nameHe: true, nameEn: true } } },
      orderBy: { startTime: 'desc' },
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post('/', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const space = await prisma.space.findUnique({ where: { id: body.spaceId } });
    if (!space) throw new ApiError(404, 'not_found', 'common.not_found');

    const overlap = await prisma.booking.findFirst({
      where: {
        spaceId: body.spaceId,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        startTime: { lt: body.endTime },
        endTime: { gt: body.startTime },
      },
    });
    if (overlap) throw new ApiError(409, 'booking_overlap', 'booking.overlap');

    // Smart coordination: low-demand slots in auto-confirm spaces skip the
    // manual approval queue and get their access code immediately.
    const demandLevel = await demandLevelForWindow(body.spaceId, body.startTime, body.endTime);
    const autoConfirm = shouldAutoConfirm(space.config, demandLevel);

    if (autoConfirm) {
      const code = generateCode();
      const window = codeValidityWindow(body.startTime, body.endTime);
      const booking = await prisma.booking.create({
        data: {
          spaceId: body.spaceId,
          userId: req.user!.id,
          title: body.title,
          startTime: body.startTime,
          endTime: body.endTime,
          status: 'CONFIRMED',
          accessCode: {
            create: {
              codeHash: hashCode(code),
              encryptedCode: encryptCode(code),
              validFrom: window.validFrom,
              expiresAt: window.expiresAt,
            },
          },
        },
        include: { accessCode: { select: { validFrom: true, expiresAt: true } } },
      });
      await dispatchToHardware('access_code.created', {
        bookingId: booking.id,
        spaceId: booking.spaceId,
        encryptedCode: encryptCode(code),
        validFrom: window.validFrom.toISOString(),
        expiresAt: window.expiresAt.toISOString(),
      });
      res.status(201).json({
        message: req.t('booking.auto_confirmed'),
        booking,
        accessCode: code,
        autoConfirmed: true,
        demandLevel,
      });
      return;
    }

    const booking = await prisma.booking.create({
      data: {
        spaceId: body.spaceId,
        userId: req.user!.id,
        title: body.title,
        startTime: body.startTime,
        endTime: body.endTime,
      },
    });
    res.status(201).json({ message: req.t('booking.created'), booking, demandLevel });
  } catch (err) {
    next(err);
  }
});

/**
 * Operator confirmation: generates the dynamic access code, stores only its
 * hash + encrypted form, and pushes the encrypted code to the hardware
 * bridge. The plaintext is returned once in the response so the operator can
 * hand it to the client (analog spaces get it printed/spoken).
 */
bookingsRouter.post('/:id/confirm', requireRole('OPERATOR'), async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw new ApiError(404, 'not_found', 'common.not_found');
    if (booking.status !== 'PENDING') {
      throw new ApiError(409, 'invalid_status', 'common.validation_error');
    }

    const code = generateCode();
    const window = codeValidityWindow(booking.startTime, booking.endTime);

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        accessCode: {
          create: {
            codeHash: hashCode(code),
            encryptedCode: encryptCode(code),
            validFrom: window.validFrom,
            expiresAt: window.expiresAt,
          },
        },
      },
      include: { accessCode: { select: { validFrom: true, expiresAt: true } } },
    });

    await dispatchToHardware('access_code.created', {
      bookingId: booking.id,
      spaceId: booking.spaceId,
      encryptedCode: encryptCode(code),
      validFrom: window.validFrom.toISOString(),
      expiresAt: window.expiresAt.toISOString(),
    });

    res.json({ message: req.t('booking.confirmed'), booking: updated, accessCode: code });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { accessCode: true },
    });
    if (!booking) throw new ApiError(404, 'not_found', 'common.not_found');
    const isOwner = booking.userId === req.user!.id;
    if (!isOwner && req.user!.role === 'CLIENT') {
      throw new ApiError(403, 'forbidden', 'auth.forbidden');
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        ...(booking.accessCode ? { accessCode: { update: { revoked: true } } } : {}),
      },
    });

    if (booking.accessCode) {
      await dispatchToHardware('access_code.revoked', {
        bookingId: booking.id,
        spaceId: booking.spaceId,
      });
    }

    res.json({ message: req.t('booking.cancelled'), booking: updated });
  } catch (err) {
    next(err);
  }
});
