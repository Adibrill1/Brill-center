import { Router } from 'express';
import { z } from 'zod';
import { scheduleFeed, suggestSlots } from '../services/scheduling.js';

export const scheduleRouter = Router();

/**
 * Public activity feed: upcoming confirmed activities + top approved ideas.
 * This is what the home screen shows and what content generation feeds on.
 */
scheduleRouter.get('/feed', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 14, 60);
    const { bookings, ideas } = await scheduleFeed(days);
    res.json({
      activities: bookings.map((b) => ({
        id: b.id,
        title: b.title,
        spaceName: req.lang === 'he' ? b.space.nameHe : b.space.nameEn,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
      })),
      ideas: ideas.map((i) => ({
        id: i.id,
        content: req.lang === 'he' ? (i.contentHe ?? i.contentEn) : (i.contentEn ?? i.contentHe),
        votesCount: i.votesCount,
        spaceName: i.space ? (req.lang === 'he' ? i.space.nameHe : i.space.nameEn) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const suggestSchema = z.object({
  date: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(30).max(480).default(60),
});

/**
 * Smart slot suggestions: free windows for the requested date, ranked by
 * historical demand (quietest first), with auto-confirm eligibility.
 */
scheduleRouter.get('/:spaceId/suggestions', async (req, res, next) => {
  try {
    const query = suggestSchema.parse({
      date: req.query.date,
      durationMinutes: req.query.durationMinutes ?? 60,
    });
    const slots = await suggestSlots(req.params.spaceId, query.date, query.durationMinutes);
    res.json({ slots });
  } catch (err) {
    next(err);
  }
});
