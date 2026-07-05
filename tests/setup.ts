// Deterministic env for unit tests (no DB required).
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-16ch';
process.env.ACCESS_CODE_HMAC_SECRET ??= 'test-hmac-secret-16chars!';
process.env.ACCESS_CODE_ENC_KEY ??=
  'a3f1c2d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
process.env.HA_WEBHOOK_SECRET ??= 'test-webhook-secret';
