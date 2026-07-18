import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { sendAlertEmail } from '../email';

describe('sendAlertEmail', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Ensure SMTP_HOST is not set
    delete process.env.SMTP_HOST;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('skips sending and logs when SMTP_HOST is not configured', async () => {
    await expect(
      sendAlertEmail({
        to: 'admin@example.com',
        siteName: 'Test Site',
        siteUrl: 'https://example.com',
        violationCount: 15,
        threshold: 10,
        scanId: 'test-scan-id',
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('SMTP not configured')
    );
  });

  it('does not throw when SMTP_HOST is empty string', async () => {
    process.env.SMTP_HOST = '';

    await expect(
      sendAlertEmail({
        to: 'admin@example.com',
        siteName: 'My Site',
        siteUrl: 'https://mysite.com',
        violationCount: 5,
        threshold: 5,
        scanId: 'scan-123',
      })
    ).resolves.toBeUndefined();
  });
});
