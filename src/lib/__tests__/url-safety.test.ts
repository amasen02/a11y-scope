import { describe, expect, it } from 'vitest';
import { assertPublicUrl } from '../url-safety';

// A resolver stub keeps these tests offline and deterministic. The production path uses
// dns.lookup; the logic under test is what we do with the answers.
const resolvesTo = (...addresses: string[]) =>
  async () => addresses.map(address => ({ address }));

describe('assertPublicUrl', () => {
  it('accepts an ordinary public URL', async () => {
    const result = await assertPublicUrl('https://example.com/page', resolvesTo('93.184.216.34'));
    expect(result.ok).toBe(true);
  });

  it('rejects non-http protocols', async () => {
    for (const url of ['file:///etc/passwd', 'gopher://example.com/', 'ftp://example.com/']) {
      const result = await assertPublicUrl(url, resolvesTo('93.184.216.34'));
      expect(result.ok, url).toBe(false);
    }
  });

  it('rejects credentials embedded in the URL', async () => {
    const result = await assertPublicUrl('https://user:pass@example.com/', resolvesTo('93.184.216.34'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/credentials/i);
  });

  it('rejects loopback and private literals without touching DNS', async () => {
    const literals = [
      'http://127.0.0.1:6379/',
      'http://localhost.localdomain/', // resolved below, kept for symmetry
      'http://10.0.0.5/',
      'http://172.16.4.1/',
      'http://192.168.1.1/',
      'http://[::1]/',
      'http://[fd00::1]/',
    ];
    for (const url of literals) {
      const result = await assertPublicUrl(url, resolvesTo('10.1.2.3'));
      expect(result.ok, url).toBe(false);
    }
  });

  it('rejects the cloud metadata address, the highest-value SSRF target', async () => {
    const direct = await assertPublicUrl('http://169.254.169.254/latest/meta-data/', resolvesTo('1.1.1.1'));
    expect(direct.ok).toBe(false);

    // The same address reached through a hostname that resolves to it must also fail.
    const viaDns = await assertPublicUrl('http://metadata.example/', resolvesTo('169.254.169.254'));
    expect(viaDns.ok).toBe(false);
  });

  it('rejects an IPv4 address smuggled through an IPv6-mapped literal', async () => {
    for (const url of ['http://[::ffff:127.0.0.1]/', 'http://[::ffff:169.254.169.254]/']) {
      const result = await assertPublicUrl(url, resolvesTo('1.1.1.1'));
      expect(result.ok, url).toBe(false);
    }
  });

  it('rejects a hostname where ANY answer is private, not just the first', async () => {
    // A split-horizon or attacker-controlled zone can return one public and one private
    // answer; the client may connect to either, so one bad answer poisons the set.
    const result = await assertPublicUrl('http://mixed.example/', resolvesTo('93.184.216.34', '127.0.0.1'));
    expect(result.ok).toBe(false);
  });

  it('rejects a hostname that does not resolve', async () => {
    const result = await assertPublicUrl('http://nowhere.example/', async () => { throw new Error('ENOTFOUND'); });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty answer set rather than treating it as success', async () => {
    const result = await assertPublicUrl('http://empty.example/', resolvesTo());
    expect(result.ok).toBe(false);
  });

  it('rejects carrier-grade NAT and link-local ranges', async () => {
    for (const address of ['100.64.0.1', '169.254.1.1', '0.0.0.0', '224.0.0.1']) {
      const result = await assertPublicUrl('http://host.example/', resolvesTo(address));
      expect(result.ok, address).toBe(false);
    }
  });

  it('rejects a malformed URL', async () => {
    const result = await assertPublicUrl('not a url', resolvesTo('93.184.216.34'));
    expect(result.ok).toBe(false);
  });
});
