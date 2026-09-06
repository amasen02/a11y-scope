import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Guards against server-side request forgery.
 *
 * The scanner launches a headless browser against a caller-supplied URL, so any endpoint
 * that accepts a URL is an outbound-request primitive. Syntax validation with `new URL()`
 * is not enough: it happily accepts `http://169.254.169.254/`, `http://localhost:6379/`
 * and `file:///etc/passwd`.
 *
 * This module rejects a URL unless every address its hostname resolves to is public, and
 * reports the addresses it validated. Validating a name and then letting the client resolve
 * it again leaves a DNS-rebinding window, so a caller that opens the connection must pin it
 * to those addresses — see `hostResolverRules`.
 */

export type UrlCheck =
  | { ok: true; url: URL; addresses: string[] }
  | { ok: false; reason: string };

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/** Decimal-dotted IPv4 inside a private, loopback, link-local or otherwise non-public range. */
function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true;                        // "this network"
  if (a === 10) return true;                       // RFC 1918
  if (a === 127) return true;                      // loopback
  if (a === 169 && b === 254) return true;         // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918
  if (a === 192 && b === 168) return true;         // RFC 1918
  if (a === 192 && b === 0) return true;           // IETF protocol assignments / RFC 5737
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 100 && b >= 64 && b <= 127) return true;    // carrier-grade NAT
  if (a >= 224) return true;                       // multicast and reserved
  return false;
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase().split('%')[0];
  if (value === '::' || value === '::1') return true;          // unspecified, loopback
  // IPv4-mapped and IPv4-compatible forms smuggle a v4 address through a v6 literal.
  const mapped = /^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/.exec(value);
  if (mapped) return isPrivateIPv4(mapped[1]);
  // WHATWG URL parsing normalises ::ffff:127.0.0.1 to its hex form ::ffff:7f00:1, so the
  // dotted pattern above never sees it. Decode the two hextets back into an IPv4 address.
  const mappedHex = /^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(value);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    const dotted = [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
    return isPrivateIPv4(dotted);
  }
  if (/^f[cd]/.test(value)) return true;                        // unique local fc00::/7
  if (value.startsWith('fe8') || value.startsWith('fe9')
    || value.startsWith('fea') || value.startsWith('feb')) return true; // link-local fe80::/10
  if (value.startsWith('ff')) return true;                      // multicast
  if (value.startsWith('2002:')) return true;                   // 6to4
  if (value.startsWith('2001:0:') || value.startsWith('2001:')) {
    if (value.startsWith('2001:db8')) return true;              // documentation
  }
  if (value.startsWith('64:ff9b:')) return true;                // NAT64
  return false;
}

function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true; // not a recognisable address: refuse rather than guess
}

/**
 * Resolve and validate a caller-supplied URL.
 *
 * `resolver` is injectable so tests can exercise the private-range logic without DNS.
 * A hostname resolving to several addresses must have ALL of them public: one public
 * answer is not enough, because the client may connect to any of them.
 */
export async function assertPublicUrl(
  raw: string,
  resolver: (host: string) => Promise<Array<{ address: string }>> =
    host => lookup(host, { all: true })
): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: 'Only http and https URLs may be scanned' };
  }
  // Credentials in a URL are a redirect-and-replay hazard and are never needed here.
  if (url.username || url.password) {
    return { ok: false, reason: 'URLs must not embed credentials' };
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) return { ok: false, reason: 'URL has no hostname' };

  // A literal address needs no DNS and must be checked directly.
  if (isIP(hostname)) {
    return isPrivateAddress(hostname)
      ? { ok: false, reason: 'URL resolves to a non-public address' }
      : { ok: true, url, addresses: [hostname] };
  }

  let records: Array<{ address: string }>;
  try {
    records = await resolver(hostname);
  } catch {
    return { ok: false, reason: 'Hostname could not be resolved' };
  }
  if (!records.length) return { ok: false, reason: 'Hostname could not be resolved' };
  if (records.some(record => isPrivateAddress(record.address))) {
    return { ok: false, reason: 'URL resolves to a non-public address' };
  }
  return { ok: true, url, addresses: records.map(record => record.address) };
}

/**
 * Chromium `--host-resolver-rules` value pinning a hostname to an address `assertPublicUrl`
 * already accepted.
 *
 * Without it the guard and the connection resolve the name independently: a short-TTL zone
 * under the caller's control can answer with a public address for the check and with
 * 169.254.169.254 for the browser moments later. Mapping the name means the browser never
 * makes that second lookup.
 *
 * Returns null when there is nothing to pin — a literal address is already the thing that
 * was checked.
 */
export function hostResolverRules(url: URL, addresses: string[]): string | null {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname || isIP(hostname)) return null;
  // Every entry was checked above; re-check so a caller cannot pin to something private.
  const target = addresses.find(address => isIP(address) !== 0 && !isPrivateAddress(address));
  if (!target) return null;
  return `MAP ${hostname} ${isIP(target) === 6 ? `[${target}]` : target}`;
}
