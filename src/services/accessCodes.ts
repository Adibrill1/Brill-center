import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Access codes are dynamic, temporary and encrypted:
 * - Plaintext codes are generated per confirmed booking and NEVER stored.
 * - `hashCode` (HMAC-SHA256, keyed) is stored for verification.
 * - `encryptCode` (AES-256-GCM) is stored only so trusted hardware
 *   (Home Assistant bridge) can receive the code for keypad programming.
 * - Validity is bound to the booking window ± grace minutes.
 */

const CODE_LENGTH = 6;

export function generateCode(): string {
  // crypto-random 6-digit numeric code, uniform distribution
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

export function hashCode(code: string): string {
  return crypto
    .createHmac('sha256', env().ACCESS_CODE_HMAC_SECRET)
    .update(code)
    .digest('hex');
}

export function verifyCodeHash(code: string, storedHash: string): boolean {
  const computed = Buffer.from(hashCode(code), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return computed.length === stored.length && crypto.timingSafeEqual(computed, stored);
}

export function encryptCode(code: string): string {
  const key = Buffer.from(env().ACCESS_CODE_ENC_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${tag.toString('hex')}.${ciphertext.toString('hex')}`;
}

export function decryptCode(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split('.');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted code payload');
  }
  const key = Buffer.from(env().ACCESS_CODE_ENC_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

export function codeValidityWindow(startTime: Date, endTime: Date): {
  validFrom: Date;
  expiresAt: Date;
} {
  const graceMs = env().ACCESS_CODE_GRACE_MINUTES * 60 * 1000;
  return {
    validFrom: new Date(startTime.getTime() - graceMs),
    expiresAt: new Date(endTime.getTime() + graceMs),
  };
}
