import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('12h'),

  ACCESS_CODE_HMAC_SECRET: z.string().min(16),
  ACCESS_CODE_ENC_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'must be 32 bytes hex (64 hex chars)'),
  ACCESS_CODE_GRACE_MINUTES: z.coerce.number().int().min(0).default(15),

  HA_WEBHOOK_URL: z.string().default(''),
  HA_WEBHOOK_SECRET: z.string().min(8),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new Error(`Invalid environment configuration — ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}
