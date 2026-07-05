import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../middleware/errors.js';

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
    const ok = user && (await bcrypt.compare(body.password, user.passwordHash));
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
