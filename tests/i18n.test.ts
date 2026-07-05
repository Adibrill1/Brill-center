import { describe, expect, it } from 'vitest';
import { messages, t } from '../src/i18n/messages.js';
import { resolveLang } from '../src/i18n/index.js';

describe('i18n', () => {
  it('every message key has both Hebrew and English values', () => {
    for (const [key, value] of Object.entries(messages)) {
      expect(value.he, `${key}.he`).toBeTruthy();
      expect(value.en, `${key}.en`).toBeTruthy();
    }
  });

  it('t() returns the requested language', () => {
    expect(t('booking.confirmed', 'he')).toContain('אושרה');
    expect(t('booking.confirmed', 'en')).toContain('confirmed');
  });

  it('resolves language tags including legacy iw and regional variants', () => {
    expect(resolveLang('he')).toBe('he');
    expect(resolveLang('iw-IL')).toBe('he');
    expect(resolveLang('en-US,en;q=0.9')).toBe('en');
    expect(resolveLang('fr')).toBeNull();
    expect(resolveLang(undefined)).toBeNull();
  });
});
