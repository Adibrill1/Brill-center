import { describe, expect, it } from 'vitest';
import {
  codeValidityWindow,
  decryptCode,
  encryptCode,
  generateCode,
  hashCode,
  verifyCodeHash,
} from '../src/services/accessCodes.js';

describe('access codes (dynamic, temporary, encrypted)', () => {
  it('generates 6-digit numeric codes', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it('verifies a code against its stored hash only', () => {
    const code = generateCode();
    const stored = hashCode(code);
    expect(stored).not.toContain(code); // plaintext never stored
    expect(verifyCodeHash(code, stored)).toBe(true);
    expect(verifyCodeHash('000000' === code ? '111111' : '000000', stored)).toBe(false);
  });

  it('encrypts and decrypts codes round-trip (AES-256-GCM)', () => {
    const code = '123456';
    const payload = encryptCode(code);
    expect(payload).not.toContain(code);
    expect(decryptCode(payload)).toBe(code);
    // Fresh IV per encryption → different ciphertexts for same code
    expect(encryptCode(code)).not.toBe(payload);
  });

  it('rejects tampered ciphertext', () => {
    const payload = encryptCode('654321');
    const parts = payload.split('.');
    const data = parts[2]!;
    const flipped = (parseInt(data[0]!, 16) ^ 0x1).toString(16);
    const tampered = `${parts[0]}.${parts[1]}.${flipped}${data.slice(1)}`;
    expect(() => decryptCode(tampered)).toThrow();
  });

  it('binds validity to the booking window with grace margin', () => {
    const start = new Date('2026-07-10T10:00:00Z');
    const end = new Date('2026-07-10T12:00:00Z');
    const { validFrom, expiresAt } = codeValidityWindow(start, end);
    expect(validFrom.getTime()).toBeLessThan(start.getTime());
    expect(expiresAt.getTime()).toBeGreaterThan(end.getTime());
  });
});
