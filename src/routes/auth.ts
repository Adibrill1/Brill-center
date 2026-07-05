import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../middleware/errors.js';
import { verifyGoogleIdToken } from '../services/googleAuth.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  languagePref: z.enum(['HE', 'EN']).default('HE'),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new ApiError(409, 'email_taken', 'auth.email_taken');
    }
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 12),
        languagePref: body.languagePref,
        // Public registration always creates CLIENT accounts; operators are
        // promoted explicitly (seed / admin tooling).
        role: 'CLIENT',
      },
    });
    const token = signToken({ id: user.id, role: user.role, languagePref: user.languagePref });
    res.status(201).json({
      message: req.t('auth.registered'),
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, languagePref: user.languagePref },
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (user && !user.passwordHash) {
      throw new ApiError(409, 'password_login_unavailable', 'auth.password_login_unavailable');
    }
    const ok =
      user && user.passwordHash && (await bcrypt.compare(body.password, user.passwordHash));
    if (!ok) {
      throw new ApiError(401, 'invalid_credentials', 'auth.invalid_credentials');
    }
    const token = signToken({ id: user.id, role: user.role, languagePref: user.languagePref });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, languagePref: user.languagePref },
    });
  } catch (err) {
    next(err);
  }
});

const googleSchema = z.object({
  idToken: z.string().min(1),
  languagePref: z.enum(['HE', 'EN']).optional(),
});

/**
 * "Sign in with Google": verifies the Google ID token, then finds or creates
 * the matching user (linking by verified email when it already exists).
 */
authRouter.post('/google', async (req, res, next) => {
  try {
    const body = googleSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(body.idToken);

    let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
      user = byEmail
        ? await prisma.user.update({
            where: { id: byEmail.id },
            data: { googleId: profile.googleId, avatarUrl: profile.avatarUrl },
          })
        : await prisma.user.create({
            data: {
              name: profile.name,
              email: profile.email,
              googleId: profile.googleId,
              avatarUrl: profile.avatarUrl,
              role: 'CLIENT',
              languagePref: body.languagePref ?? 'HE',
            },
          });
    }

    const token = signToken({ id: user.id, role: user.role, languagePref: user.languagePref });
    res.json({
      message: req.t('auth.google_signed_in'),
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        languagePref: user.languagePref,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});
