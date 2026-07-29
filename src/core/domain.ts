import { parse } from 'tldts';
import type { Rule } from './types';

function hasExplicitPort(input: string, url: URL): boolean {
  if (url.port) {
    return true;
  }

  const protocolSeparator = input.indexOf(':');
  if (protocolSeparator < 0) {
    return false;
  }

  try {
    const portPreservingUrl = new URL(`lesscroll${input.slice(protocolSeparator)}`);
    return Boolean(portPreservingUrl.port);
  } catch {
    return false;
  }
}

function normalizedHostname(url: URL, input: string): string {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS domains are supported');
  }

  if (url.username || url.password) {
    throw new Error('Credentials are not allowed in domains');
  }

  if (hasExplicitPort(input, url)) {
    throw new Error('Ports are not allowed in domains');
  }

  let hostname = url.hostname.toLowerCase();
  if (hostname.endsWith('.')) {
    hostname = hostname.slice(0, -1);
  }
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }

  validateHostname(hostname);
  return hostname;
}

function validateHostname(hostname: string): void {
  if (
    !hostname
    || hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.startsWith('[')
    || hostname.endsWith(']')
    || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  ) {
    throw new Error('A public hostname is required');
  }

  if (hostname.length > 253) {
    throw new Error('The hostname is too long');
  }

  const labels = hostname.split('.');
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new Error('The hostname contains an invalid label');
  }

  const classification = parse(hostname, {
    allowPrivateDomains: true,
    detectSpecialUse: true,
    extractHostname: false,
  });
  if (
    classification.domain === null
    || (!classification.isIcann && !classification.isPrivate)
    || classification.isSpecialUse
  ) {
    throw new Error('A registrable public hostname is required');
  }
}

export function normalizeDomain(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error('A domain is required');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    try {
      url = new URL(`https://${value}`);
      if (url.pathname !== '/' || url.search || url.hash) {
        throw new Error('A bare hostname cannot contain a path, query, or fragment');
      }
    } catch {
      throw new Error('Invalid domain');
    }
  }

  return normalizedHostname(url, value);
}

export function hostnameFromUrl(url: string): string | undefined {
  try {
    const value = url.trim();
    return normalizedHostname(new URL(value), value);
  } catch {
    return undefined;
  }
}

export function permissionOrigins(domain: string, includeSubdomains: boolean): string[] {
  const hostname = normalizeDomain(domain);
  const hostPattern = includeSubdomains ? `*.${hostname}` : hostname;

  return [
    `http://${hostPattern}/*`,
    `https://${hostPattern}/*`,
  ];
}

export function ruleMatches(hostname: string, rule: Rule): boolean {
  return hostname === rule.domain
    || (
      rule.includeSubdomains
      && hostname.length > rule.domain.length
      && hostname.endsWith(rule.domain)
      && hostname.charCodeAt(hostname.length - rule.domain.length - 1) === 46
    );
}

export function matchingRule(hostname: string, rules: readonly Rule[]): Rule | undefined {
  let bestMatch: Rule | undefined;
  let bestDepth = -1;

  for (const rule of rules) {
    if (!rule.enabled || !ruleMatches(hostname, rule)) {
      continue;
    }

    let depth = 1;
    for (let index = 0; index < rule.domain.length; index += 1) {
      if (rule.domain.charCodeAt(index) === 46) {
        depth += 1;
      }
    }

    if (
      depth > bestDepth
      || (depth === bestDepth && rule.domain.length > (bestMatch?.domain.length ?? -1))
    ) {
      bestMatch = rule;
      bestDepth = depth;
    }
  }

  return bestMatch;
}
