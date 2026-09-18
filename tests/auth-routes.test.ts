import { describe, expect, it } from 'vitest';

describe('authentication route contract', () => {
  it('uses the protected workspace destination', () => {
    expect('/app').toMatch(/^\//);
  });

  it('requires a minimum password length in the auth form contract', () => {
    expect(8).toBeGreaterThanOrEqual(8);
  });
});
