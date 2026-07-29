import { describe, expect, it } from 'vitest';
import { buildOverlayDomPayload } from './overlay-payload';

describe('buildOverlayDomPayload', () => {
  it('resolves every user-facing string through the locale provider', () => {
    const calls: [string, string[]][] = [];
    const result = buildOverlayDomPayload({
      ruleId: 'youtube',
      domain: 'youtube.com',
      kind: 'continuous',
      usage: { sessionMs: 12 * 60_000, dailyMs: 32 * 60_000 },
      limitMinutes: 10,
      snoozeMinutes: 10,
    }, (key, substitutions = []) => {
      calls.push([key, substitutions]);
      return `${key}:${substitutions.join('|')}`;
    });

    expect(result.ruleId).toBe('youtube');
    expect(result.title).toBe('overlayTitle:');
    expect(result.message).toBe('overlayMessage:32|youtube.com');
    expect(result.sessionValue).toBe('minutesShort:12');
    expect(result.todayValue).toBe('minutesShort:32');
    expect(result.snoozeLabel).toBe('overlaySnooze:10');
    expect(calls.map(([key]) => key)).toEqual([
      'overlayTitle',
      'overlayMessage',
      'overlaySessionLabel',
      'minutesShort',
      'overlayTodayLabel',
      'minutesShort',
      'overlayLeave',
      'overlaySnooze',
      'overlayContinue',
    ]);
  });
});
