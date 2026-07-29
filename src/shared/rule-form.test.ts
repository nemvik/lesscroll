import { describe, expect, it } from 'vitest';
import { emptyRuleDraft, parseRuleDraft, ruleDraft } from './rule-form';

describe('rule form conversion', () => {
  it('creates quick defaults for a new form', () => {
    expect(emptyRuleDraft()).toEqual({
      domain: '', includeSubdomains: true, enabled: true,
      continuousLimitMinutes: '20', dailyLimitMinutes: '60',
      sessionResetAfterMinutes: '5', snoozeMinutes: '10',
    });
  });

  it('turns empty optional limits into omitted properties', () => {
    expect(parseRuleDraft({
      ...emptyRuleDraft(), domain: 'https://www.youtube.com/watch',
      continuousLimitMinutes: '', dailyLimitMinutes: '',
    })).toEqual({ ok: true, value: {
      domain: 'youtube.com', includeSubdomains: true, enabled: true,
      sessionResetAfterMinutes: 5, snoozeMinutes: 10,
    } });
  });

  it.each(['0', '-1', 'nope', 'Infinity'])('rejects invalid positive numbers: %s', (value) => {
    expect(parseRuleDraft({ ...emptyRuleDraft(), domain: 'youtube.com', snoozeMinutes: value }))
      .toEqual({ ok: false, error: 'invalid-number' });
  });

  it('rejects invalid domains and round-trips an existing rule', () => {
    expect(parseRuleDraft({ ...emptyRuleDraft(), domain: 'localhost' }))
      .toEqual({ ok: false, error: 'invalid-domain' });
    expect(ruleDraft({ id: 'x', domain: 'youtube.com', includeSubdomains: false, enabled: false,
      continuousLimitMinutes: 12, sessionResetAfterMinutes: 7, snoozeMinutes: 8 }))
      .toEqual({ domain: 'youtube.com', includeSubdomains: false, enabled: false,
        continuousLimitMinutes: '12', dailyLimitMinutes: '',
        sessionResetAfterMinutes: '7', snoozeMinutes: '8' });
  });
});
