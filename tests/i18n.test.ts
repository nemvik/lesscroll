import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface ChromeMessage {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

function catalog(locale: 'en' | 'cs'): Record<string, ChromeMessage> {
  return JSON.parse(readFileSync(
    new URL(`../public/_locales/${locale}/messages.json`, import.meta.url),
    'utf8',
  )) as Record<string, ChromeMessage>;
}

const requiredKeys = [
  'extensionName', 'extensionDescription', 'loading', 'minutesShort', 'errorGeneric',
  'popupCurrentSite', 'popupNotWebPage', 'popupNotTracked', 'popupTracked', 'popupSession',
  'popupToday', 'popupTrackSite', 'popupPermissionDenied', 'popupTrackedSites', 'popupNoRules',
  'popupOpenOptions', 'trackingDisclosure', 'optionsTitle', 'optionsIntro', 'rulesTitle', 'addSite', 'editRule',
  'domainLabel', 'includeSubdomains', 'enabledLabel', 'continuousLimitLabel', 'dailyLimitLabel',
  'optionalHint', 'sessionResetLabel', 'snoozeLabel', 'saveRule', 'cancel', 'edit', 'delete',
  'invalidDomain', 'invalidNumber', 'duplicateDomain', 'confirmDelete', 'resetToday', 'resetAll',
  'confirmResetToday', 'confirmResetAll', 'focusTitle', 'focusMessage', 'focusClose', 'focusCloseHint',
  'overlayTitle', 'overlayMessage', 'overlaySessionLabel', 'overlayTodayLabel', 'overlayLeave',
  'overlaySnooze', 'overlayContinue', 'progressLabel', 'enableRuleLabel', 'disableRuleLabel',
];

describe('Chrome locale catalogs', () => {
  it('have identical complete non-empty keys', () => {
    const en = catalog('en');
    const cs = catalog('cs');
    expect(Object.keys(cs).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(en)).toEqual(expect.arrayContaining(requiredKeys));
    for (const messages of [en, cs]) {
      for (const entry of Object.values(messages)) {
        expect(entry.message.trim()).not.toBe('');
      }
    }
  });

  it('defines every substitution referenced by a message', () => {
    for (const locale of ['en', 'cs'] as const) {
      for (const [key, entry] of Object.entries(catalog(locale))) {
        const references = [...entry.message.matchAll(/\$([A-Z][A-Z0-9_]*)\$/g)]
          .map((match) => match[1]!.toLowerCase());
        const placeholders = new Set(Object.keys(entry.placeholders ?? {}).map((name) => name.toLowerCase()));
        expect(references.every((reference) => placeholders.has(reference)), key).toBe(true);
      }
    }
  });
});
