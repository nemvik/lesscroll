import { describe, expect, it } from 'vitest';
import {
  hostnameFromUrl,
  matchingRule,
  normalizeDomain,
  permissionOrigins,
  ruleMatches,
} from './domain';
import type { Rule } from './types';

function rule(
  domain: string,
  includeSubdomains = true,
  enabled = true,
): Rule {
  return {
    id: domain,
    domain,
    includeSubdomains,
    enabled,
    sessionResetAfterMinutes: 5,
    snoozeMinutes: 10,
  };
}

describe('normalizeDomain', () => {
  it('normalizes a full HTTP(S) URL and strips one conventional www prefix', () => {
    expect(normalizeDomain(' HTTPS://WWW.YouTube.com/watch?v=1 ')).toBe('youtube.com');
  });

  it('normalizes a bare hostname', () => {
    expect(normalizeDomain('music.youtube.com')).toBe('music.youtube.com');
  });

  it('trims, lowercases, and strips a trailing dot', () => {
    expect(normalizeDomain('  YOUTUBE.COM.  ')).toBe('youtube.com');
  });

  it('supports public multi-label and internationalized hostnames', () => {
    expect(normalizeDomain('docs.example.co.uk')).toBe('docs.example.co.uk');
    expect(normalizeDomain('bbc.co.uk')).toBe('bbc.co.uk');
    expect(normalizeDomain('https://BÜCHER.de/catalog')).toBe('xn--bcher-kva.de');
  });

  it.each([
    'chrome://settings',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com:8080/path',
    'https://example.com:443/path',
    'example.com:443',
    'example.com:80',
    'example..com',
    '-example.com',
    'example-.com',
    'localhost',
    '127.0.0.1',
    'https://[::1]/',
    'intranet',
    'printer.local',
    'example.internal',
    'co.uk',
    'foo.test',
    'router.lan',
    'home.arpa',
    'example.com',
  ])('rejects unsupported, ambiguous, or non-public input: %s', (input) => {
    expect(() => normalizeDomain(input)).toThrow();
  });
});

describe('hostnameFromUrl', () => {
  it('returns a normalized hostname for an HTTP(S) URL', () => {
    expect(hostnameFromUrl('https://WWW.YouTube.com./feed')).toBe('youtube.com');
  });

  it.each([
    'chrome://settings',
    'ftp://example.com',
    'not a url',
    'http://localhost',
    'https://user:pass@example.com',
    'https://example.com:443/path',
    'http://example.com:80/path',
    'https://example.com:8443/path',
    'http://127.0.0.1',
    'https://[::1]/',
  ]) (
    'returns undefined for unsupported or malformed URL: %s',
    (url) => {
      expect(hostnameFromUrl(url)).toBeUndefined();
    },
  );
});

describe('ruleMatches', () => {
  it('matches an exact hostname', () => {
    expect(ruleMatches('youtube.com', rule('youtube.com', false))).toBe(true);
  });

  it('matches a subdomain only when enabled', () => {
    expect(ruleMatches('music.youtube.com', rule('youtube.com'))).toBe(true);
    expect(ruleMatches('music.youtube.com', rule('youtube.com', false))).toBe(false);
  });

  it('does not cross a domain-label boundary', () => {
    expect(ruleMatches('notyoutube.com', rule('youtube.com'))).toBe(false);
  });
});

describe('matchingRule', () => {
  it('does not select disabled rules', () => {
    expect(matchingRule('youtube.com', [rule('youtube.com', true, false)]))
      .toBeUndefined();
  });

  it('selects the most specific enabled match', () => {
    expect(
      matchingRule('music.youtube.com', [
        rule('youtube.com'),
        rule('music.youtube.com'),
      ])?.id,
    ).toBe('music.youtube.com');
  });

  it('does not mutate the caller rule order', () => {
    const rules = [rule('youtube.com'), rule('music.youtube.com')];
    const originalOrder = [...rules];

    matchingRule('music.youtube.com', rules);

    expect(rules).toEqual(originalOrder);
  });
});

describe('permissionOrigins', () => {
  it('returns only wildcard-subdomain HTTP and HTTPS origins when requested', () => {
    expect(permissionOrigins('youtube.com', true)).toEqual([
      'http://*.youtube.com/*',
      'https://*.youtube.com/*',
    ]);
  });

  it('returns only exact HTTP and HTTPS origins otherwise', () => {
    expect(permissionOrigins('youtube.com', false)).toEqual([
      'http://youtube.com/*',
      'https://youtube.com/*',
    ]);
  });

  it.each(['co.uk', 'foo.test', 'router.lan', 'home.arpa', 'example.com'])(
    'does not create origins for public-suffix or special-use input: %s',
    (domain) => {
      expect(() => permissionOrigins(domain, true)).toThrow();
    },
  );
});
