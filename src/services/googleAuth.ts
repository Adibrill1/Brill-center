import { z } from 'zod';
import { ApiError } from '../middleware/errors.js';

/**
 * "Sign in with Google": the web client obtains an ID token via Google
 * Identity Services and posts it here. We verify it against Google's
 * tokeninfo endpoint and check the audience matches our OAuth client id.
 */

const tokenInfoSchema = z.object({
  aud: z.string(),
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.union([z.literal('true'), z.literal(true)]).optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
  exp: z.coerce.number(),
});

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new ApiError(501, 'google_not_configured', 'auth.google_not_configured');
  }

  let payload: unknown;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) {
      throw new Error(`tokeninfo returned ${res.status}`);
    }
    payload = await res.json();
  } catch {
    throw new ApiError(401, 'invalid_google_token', 'auth.invalid_google_token');
  }

  const parsed = tokenInfoSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(401, 'invalid_google_token', 'auth.invalid_google_token');
  }
  const info = parsed.data;

  if (info.aud !== clientId || info.exp * 1000 < Date.now()) {
    throw new ApiError(401, 'invalid_google_token', 'auth.invalid_google_token');
  }

  return {
    googleId: info.sub,
    email: info.email,
    name: info.name ?? info.email.split('@')[0]!,
    avatarUrl: info.picture,
  };
}
