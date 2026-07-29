import { describe, expect, it } from 'vitest';
import { configuredRuleForHost, progressPercent, roundedMinutes } from './ui';

const rules = [
  { id: 'root', domain: 'youtube.com', includeSubdomains: true, enabled: false,
    sessionResetAfterMinutes: 5, snoozeMinutes: 10 },
  { id: 'music', domain: 'music.youtube.com', includeSubdomains: false, enabled: true,
    sessionResetAfterMinutes: 5, snoozeMinutes: 10 },
];

describe('UI view helpers', () => {
  it('rounds elapsed milliseconds to readable whole minutes', () => {
    expect(roundedMinutes(0)).toBe(0);
    expect(roundedMinutes(89_000)).toBe(1);
    expect(roundedMinutes(91_000)).toBe(2);
  });

  it('clamps progress between zero and one hundred', () => {
    expect(progressPercent(-1, 10)).toBe(0);
    expect(progressPercent(5, 10)).toBe(50);
    expect(progressPercent(20, 10)).toBe(100);
    expect(progressPercent(5, undefined)).toBe(0);
  });

  it('finds the most specific configured rule even when disabled', () => {
    expect(configuredRuleForHost('music.youtube.com', rules)?.id).toBe('music');
    expect(configuredRuleForHost('www.youtube.com', rules)?.id).toBe('root');
  });

  it('prefers the enabled rule that actually tracks over a disabled child rule', () => {
    expect(configuredRuleForHost('music.youtube.com', [
      { ...rules[0]!, enabled: true },
      { ...rules[1]!, enabled: false },
    ])?.id).toBe('root');
  });
});
