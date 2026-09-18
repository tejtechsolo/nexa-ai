import { describe, expect, it } from 'vitest';

describe('PWA installation contract', () => {
  it('uses standalone display mode', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile('app/manifest.ts', 'utf8'));
    expect(source).toContain("display: 'standalone'");
    expect(source).toContain("start_url: '/app'");
  });

  it('includes the install prompt component', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile('components/pwa/install-prompt.tsx', 'utf8'));
    expect(source).toContain('beforeinstallprompt');
    expect(source).toContain('appinstalled');
    expect(source).toContain('Add to Home Screen');
  });
});
