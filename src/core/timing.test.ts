import { describe, expect, it } from 'vitest';
import {
  alertDecision,
  applyIntentionalContinue,
  applySnooze,
  closeSegment,
  currentUsage,
  discardStartupSegment,
  nextWakeAt,
  openSegment,
  reconcileState,
} from './timing';
import type { ActiveContext, Rule, RuntimeState } from './types';

const minute = 60_000;

function rule(
  id: string,
  domain: string,
  sessionResetAfterMinutes = 5,
  enabled = true,
): Rule {
  return {
    id,
    domain,
    includeSubdomains: true,
    enabled,
    sessionResetAfterMinutes,
    snoozeMinutes: 10,
  };
}

const youtube = rule('youtube', 'youtube.com');
const reddit = rule('reddit', 'reddit.com');

function state(overrides: Partial<RuntimeState> = {}): RuntimeState {
  return {
    dayKey: '2026-01-15',
    dailyMsByRule: {},
    activeSegment: null,
    sessionState: {},
    snoozeUntil: {},
    suppressedUntilSessionEnd: {},
    suppressedUntilDay: {},
    ...overrides,
  };
}

function context(overrides: Partial<ActiveContext> = {}): ActiveContext {
  return {
    focused: true,
    tabId: 7,
    url: 'https://www.youtube.com/watch?v=1',
    ...overrides,
  };
}

describe('closeSegment', () => {
  it('immutably credits one valid interval to session and current-day usage', () => {
    const startedAt = new Date(2026, 0, 15, 10).getTime();
    const now = startedAt + 2 * minute;
    const input = state({
      dailyMsByRule: { youtube: minute, reddit: 3 },
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      sessionState: { youtube: { accumulatedMs: 2 * minute } },
    });
    const snapshot = structuredClone(input);

    const result = closeSegment(input, now, [youtube, reddit]);

    expect(result).toEqual({
      ...input,
      activeSegment: null,
      dailyMsByRule: { youtube: 3 * minute, reddit: 3 },
      sessionState: {
        youtube: { accumulatedMs: 4 * minute, lastLeftAt: now },
      },
    });
    expect(input).toEqual(snapshot);
    expect(result).not.toBe(input);
  });

  it('credits the full session interval but only its current-day portion after midnight', () => {
    const startedAt = new Date(2026, 0, 15, 23, 55).getTime();
    const now = new Date(2026, 0, 16, 0, 5).getTime();
    const input = state({
      dailyMsByRule: { youtube: 30 * minute, reddit: minute },
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      sessionState: { youtube: { accumulatedMs: minute } },
    });

    const result = closeSegment(input, now, [youtube]);

    expect(result.dayKey).toBe('2026-01-16');
    expect(result.dailyMsByRule).toEqual({ youtube: 5 * minute });
    expect(result.sessionState.youtube).toEqual({
      accumulatedMs: 11 * minute,
      lastLeftAt: now,
    });
  });

  it('does not credit the same segment twice', () => {
    const startedAt = new Date(2026, 0, 15, 10).getTime();
    const once = closeSegment(state({
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
    }), startedAt + minute, [youtube]);

    expect(closeSegment(once, startedAt + 2 * minute, [youtube])).toEqual(once);
  });

  it.each([Number.NaN, new Date(2026, 0, 15, 12).getTime()])(
    'clears an invalid or reversed segment without crediting it (startedAt %s)',
    (startedAt) => {
      const now = new Date(2026, 0, 15, 11).getTime();
      const result = closeSegment(state({
        dailyMsByRule: { youtube: 4 },
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
        sessionState: { youtube: { accumulatedMs: 6 } },
      }), now, [youtube]);

      expect(result.activeSegment).toBeNull();
      expect(result.dailyMsByRule.youtube).toBe(4);
      expect(result.sessionState.youtube).toEqual({ accumulatedMs: 6, lastLeftAt: now });
    },
  );

  it('safely clears a segment whose rule no longer exists without crediting it', () => {
    const now = new Date(2026, 0, 15, 11).getTime();
    const input = state({
      dailyMsByRule: { youtube: 4, reddit: 3 },
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now - minute },
      sessionState: { youtube: { accumulatedMs: 6 } },
    });
    const snapshot = structuredClone(input);
    let result = input;

    expect(() => {
      result = closeSegment(input, now, [reddit]);
    }).not.toThrow();

    expect(result.activeSegment).toBeNull();
    expect(result.dailyMsByRule).toEqual(input.dailyMsByRule);
    expect(result.sessionState).toEqual(input.sessionState);
    expect(input).toEqual(snapshot);
  });
});

describe('openSegment', () => {
  it('resumes a session after a short absence and removes lastLeftAt while active', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const input = state({
      sessionState: {
        youtube: { accumulatedMs: 2 * minute, lastLeftAt: now - 4 * minute },
      },
    });

    const result = openSegment(input, context(), [youtube], now);

    expect(result.activeSegment).toEqual({ ruleId: 'youtube', tabId: 7, startedAt: now });
    expect(result.sessionState.youtube).toEqual({ accumulatedMs: 2 * minute });
    expect(input.sessionState.youtube).toHaveProperty('lastLeftAt', now - 4 * minute);
  });

  it('resumes when absence equals the reset threshold', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const result = openSegment(state({
      sessionState: {
        youtube: { accumulatedMs: minute, lastLeftAt: now - 5 * minute },
      },
    }), context(), [youtube], now);

    expect(result.sessionState.youtube).toEqual({ accumulatedMs: minute });
  });

  it('resets after a long absence and clears only that rule session suppression', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const input = state({
      sessionState: {
        youtube: { accumulatedMs: minute, lastLeftAt: now - 5 * minute - 1 },
      },
      suppressedUntilSessionEnd: { youtube: true, reddit: true },
    });

    const result = openSegment(input, context(), [youtube, reddit], now);

    expect(result.sessionState.youtube).toEqual({ accumulatedMs: 0 });
    expect(result.suppressedUntilSessionEnd).toEqual({ reddit: true });
    expect(input.suppressedUntilSessionEnd).toEqual({ youtube: true, reddit: true });
  });

  it.each([
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
    ['outside the Date range', 8_640_000_000_000_001],
    ['in the future', new Date(2026, 0, 15, 12).getTime() + 1],
  ])('resets after an invalid last-left timestamp (%s)', (_label, lastLeftAt) => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const input = state({
      sessionState: {
        youtube: { accumulatedMs: minute, lastLeftAt },
      },
      suppressedUntilSessionEnd: { youtube: true, reddit: true },
    });

    const result = openSegment(input, context(), [youtube, reddit], now);

    expect(result.sessionState.youtube).toEqual({ accumulatedMs: 0 });
    expect(result.suppressedUntilSessionEnd).toEqual({ reddit: true });
    expect(input.sessionState.youtube).toEqual({ accumulatedMs: minute, lastLeftAt });
    expect(input.suppressedUntilSessionEnd).toEqual({ youtube: true, reddit: true });
  });

  it.each([
    [{ focused: false }, [youtube], new Date(2026, 0, 15, 12).getTime()],
    [{ tabId: Number.NaN }, [youtube], new Date(2026, 0, 15, 12).getTime()],
    [{ tabId: Number.POSITIVE_INFINITY }, [youtube], new Date(2026, 0, 15, 12).getTime()],
    [{ tabId: -1 }, [youtube], new Date(2026, 0, 15, 12).getTime()],
    [{ tabId: 1.5 }, [youtube], new Date(2026, 0, 15, 12).getTime()],
    [{ url: 'chrome://settings' }, [youtube], new Date(2026, 0, 15, 12).getTime()],
    [{ url: 'https://reddit.com' }, [youtube], new Date(2026, 0, 15, 12).getTime()],
    [{}, [rule('disabled', 'youtube.com', 5, false)], new Date(2026, 0, 15, 12).getTime()],
    [{}, [], new Date(2026, 0, 15, 12).getTime()],
    [{}, [youtube], Number.NaN],
  ] satisfies [Partial<ActiveContext>, Rule[], number][])(
    'does not open for an unfocused, invalid, unmatched, disabled, missing, or untimed context',
    (contextOverrides, rules, now) => {
      const input = state();

      expect(openSegment(input, context(contextOverrides), rules, now)).toBe(input);
    },
  );

  it('does not replace an already active segment when called directly', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const input = state({
      activeSegment: { ruleId: 'reddit', tabId: 2, startedAt: now - minute },
    });

    expect(openSegment(input, context(), [youtube], now)).toBe(input);
  });
});

describe('reconcileState', () => {
  it('checkpoints and reopens an unchanged rule and tab at the reconciliation time', () => {
    const startedAt = new Date(2026, 0, 15, 10).getTime();
    const now = startedAt + minute;
    const input = state({
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
    });

    const result = reconcileState(input, context(), [youtube], now);

    expect(result.activeSegment).toEqual({ ruleId: 'youtube', tabId: 7, startedAt: now });
    expect(result.dailyMsByRule.youtube).toBe(minute);
    expect(result.sessionState.youtube).toEqual({ accumulatedMs: minute });
    expect(input.activeSegment).toEqual({ ruleId: 'youtube', tabId: 7, startedAt });
  });

  it('rolls an idle state into the current local day and clears stale daily usage', () => {
    const now = new Date(2026, 0, 16, 0, 5).getTime();
    const input = state({
      dailyMsByRule: { youtube: 20 * minute },
    });

    const result = reconcileState(input, context({ focused: false }), [youtube], now);

    expect(result.dayKey).toBe('2026-01-16');
    expect(result.dailyMsByRule).toEqual({});
    expect(result.activeSegment).toBeNull();
    expect(input.dayKey).toBe('2026-01-15');
    expect(input.dailyMsByRule).toEqual({ youtube: 20 * minute });
  });

  it('closes the old rule and opens at most one new rule at the same timestamp', () => {
    const startedAt = new Date(2026, 0, 15, 10).getTime();
    const now = startedAt + minute;
    const input = state({
      activeSegment: { ruleId: 'youtube', tabId: 1, startedAt },
    });

    const result = reconcileState(
      input,
      context({ tabId: 2, url: 'https://reddit.com/r/typescript' }),
      [youtube, reddit],
      now,
    );

    expect(result.activeSegment).toEqual({ ruleId: 'reddit', tabId: 2, startedAt: now });
    expect(result.sessionState.youtube).toEqual({ accumulatedMs: minute, lastLeftAt: now });
    expect(result.sessionState.reddit).toEqual({ accumulatedMs: 0 });
    expect(input.activeSegment).toEqual({ ruleId: 'youtube', tabId: 1, startedAt });
  });

  it('switches tabs on one rule without creating overlapping time', () => {
    const startedAt = new Date(2026, 0, 15, 10).getTime();
    const now = startedAt + minute;
    const result = reconcileState(state({
      activeSegment: { ruleId: 'youtube', tabId: 1, startedAt },
    }), context({ tabId: 2 }), [youtube], now);

    expect(result.activeSegment).toEqual({ ruleId: 'youtube', tabId: 2, startedAt: now });
    expect(result.sessionState.youtube).toEqual({ accumulatedMs: minute });
  });

  it('only closes when the new context is invalid or unfocused', () => {
    const startedAt = new Date(2026, 0, 15, 10).getTime();
    const now = startedAt + minute;
    const result = reconcileState(state({
      activeSegment: { ruleId: 'youtube', tabId: 1, startedAt },
    }), context({ focused: false }), [youtube], now);

    expect(result.activeSegment).toBeNull();
    expect(result.sessionState.youtube).toEqual({ accumulatedMs: minute, lastLeftAt: now });
  });
});

describe('currentUsage', () => {
  it('returns committed plus virtual active usage without mutating state', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const input = state({
      dailyMsByRule: { youtube: 2 * minute },
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now - minute },
      sessionState: { youtube: { accumulatedMs: 3 * minute } },
    });
    const snapshot = structuredClone(input);

    expect(currentUsage(input, 'youtube', now)).toEqual({
      sessionMs: 4 * minute,
      dailyMs: 3 * minute,
    });
    expect(input).toEqual(snapshot);
  });

  it('counts all active time for the session but only today for daily usage', () => {
    const startedAt = new Date(2026, 0, 15, 23, 55).getTime();
    const now = new Date(2026, 0, 16, 0, 5).getTime();
    const input = state({
      dailyMsByRule: { youtube: 20 * minute },
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      sessionState: { youtube: { accumulatedMs: minute } },
    });

    expect(currentUsage(input, 'youtube', now)).toEqual({
      sessionMs: 11 * minute,
      dailyMs: 5 * minute,
    });
  });

  it('returns zero safely for a missing rule state or reversed active interval', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    expect(currentUsage(state(), 'deleted', now)).toEqual({ sessionMs: 0, dailyMs: 0 });
    expect(currentUsage(state({
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now + 1 },
    }), 'youtube', now)).toEqual({ sessionMs: 0, dailyMs: 0 });
  });
});

describe('discardStartupSegment', () => {
  it('clears a persisted active segment without credit and records its start as last-left', () => {
    const startedAt = new Date(2026, 0, 15, 10).getTime();
    const input = state({
      dailyMsByRule: { youtube: 2 * minute },
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      sessionState: { youtube: { accumulatedMs: 3 * minute } },
    });
    const snapshot = structuredClone(input);

    const result = discardStartupSegment(input);

    expect(result.activeSegment).toBeNull();
    expect(result.dailyMsByRule.youtube).toBe(2 * minute);
    expect(result.sessionState.youtube).toEqual({
      accumulatedMs: 3 * minute,
      lastLeftAt: startedAt,
    });
    expect(input).toEqual(snapshot);
  });
});

describe('alertDecision', () => {
  it('alerts at an exactly reached continuous limit with the complete overlay payload', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = { ...youtube, continuousLimitMinutes: 5 };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      sessionState: { youtube: { accumulatedMs: 4 * minute } },
      dailyMsByRule: { youtube: 2 * minute },
    });

    expect(alertDecision(input, [limitedRule], now)).toEqual({
      ruleId: youtube.id,
      domain: youtube.domain,
      kind: 'continuous',
      usage: { sessionMs: 5 * minute, dailyMs: 3 * minute },
      limitMinutes: 5,
      snoozeMinutes: youtube.snoozeMinutes,
    });
  });

  it('does not alert below either configured limit', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = {
      ...youtube,
      continuousLimitMinutes: 5,
      dailyLimitMinutes: 10,
    };

    expect(alertDecision(state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      sessionState: { youtube: { accumulatedMs: 4 * minute - 1 } },
      dailyMsByRule: { youtube: 9 * minute - 1 },
    }), [limitedRule], now)).toBeNull();
  });

  it('alerts at an exactly reached daily limit', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = { ...youtube, dailyLimitMinutes: 3 };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      dailyMsByRule: { youtube: 2 * minute },
    });

    expect(alertDecision(input, [limitedRule], now)?.kind).toBe('daily');
  });

  it('deterministically prefers the continuous alert when both limits are reached', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = {
      ...youtube,
      continuousLimitMinutes: 2,
      dailyLimitMinutes: 2,
    };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      sessionState: { youtube: { accumulatedMs: minute } },
      dailyMsByRule: { youtube: minute },
    });

    expect(alertDecision(input, [limitedRule], now)?.kind).toBe('continuous');
  });

  it('tracks usage through snooze, suppresses before expiry, and re-enables at equality', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const expiry = now + minute;
    const limitedRule = { ...youtube, continuousLimitMinutes: 1 };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      snoozeUntil: { youtube: expiry },
    });

    expect(alertDecision(input, [limitedRule], expiry - 1)).toBeNull();
    expect(alertDecision(input, [limitedRule], expiry)?.usage.sessionMs).toBe(2 * minute);
  });

  it('keeps continuous and current-day suppression independent', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = {
      ...youtube,
      continuousLimitMinutes: 1,
      dailyLimitMinutes: 1,
    };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
    });

    expect(alertDecision({
      ...input,
      suppressedUntilSessionEnd: { youtube: true },
    }, [limitedRule], now)?.kind).toBe('daily');
    expect(alertDecision({
      ...input,
      suppressedUntilDay: { youtube: input.dayKey },
    }, [limitedRule], now)?.kind).toBe('continuous');
  });

  it('expires daily suppression when its stored day is not the current local day', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = { ...youtube, dailyLimitMinutes: 1 };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      suppressedUntilDay: { youtube: '2026-01-14' },
    });

    expect(alertDecision(input, [limitedRule], now)?.kind).toBe('daily');
  });

  it.each([
    ['no active segment', state(), [youtube]],
    ['missing active rule', state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: 0 },
    }), [reddit]],
    ['disabled active rule', state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: 0 },
    }), [{ ...youtube, enabled: false, continuousLimitMinutes: 1 }]],
  ] satisfies [string, RuntimeState, Rule[]][])('does not alert for %s', (_label, input, rules) => {
    expect(alertDecision(input, rules, new Date(2026, 0, 15, 12).getTime())).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'ignores an invalid continuous limit (%s) while retaining a valid daily limit',
    (continuousLimitMinutes) => {
      const now = new Date(2026, 0, 15, 12).getTime();
      const limitedRule = {
        ...youtube,
        continuousLimitMinutes,
        dailyLimitMinutes: 1,
      };
      const input = state({
        activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      });

      expect(alertDecision(input, [limitedRule], now)?.kind).toBe('daily');
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'ignores an invalid daily limit (%s)',
    (dailyLimitMinutes) => {
      const now = new Date(2026, 0, 15, 12).getTime();
      const limitedRule = { ...youtube, dailyLimitMinutes };
      const input = state({
        activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      });

      expect(alertDecision(input, [limitedRule], now)).toBeNull();
    },
  );
});

describe('alert actions', () => {
  it('immutably applies snooze as an absolute expiry', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const input = state({ snoozeUntil: { reddit: now + minute } });
    const snapshot = structuredClone(input);

    const result = applySnooze(input, youtube, now);

    expect(result.snoozeUntil).toEqual({
      reddit: now + minute,
      youtube: now + youtube.snoozeMinutes * minute,
    });
    expect(result).not.toBe(input);
    expect(input).toEqual(snapshot);
  });

  it.each([
    ['NaN now', youtube, Number.NaN],
    ['infinite now', youtube, Number.POSITIVE_INFINITY],
    ['out-of-range now', youtube, 8_640_000_000_000_001],
    ['zero minutes', { ...youtube, snoozeMinutes: 0 }, 1_000],
    ['negative minutes', { ...youtube, snoozeMinutes: -1 }, 1_000],
    ['NaN minutes', { ...youtube, snoozeMinutes: Number.NaN }, 1_000],
    ['infinite minutes', { ...youtube, snoozeMinutes: Number.POSITIVE_INFINITY }, 1_000],
  ] satisfies [string, Rule, number][])('safely ignores %s', (_label, invalidRule, now) => {
    const input = state({ snoozeUntil: { reddit: 123 } });

    expect(applySnooze(input, invalidRule, now)).toBe(input);
  });

  it('immutably suppresses both alert kinds for intentional continue', () => {
    const input = state({
      suppressedUntilSessionEnd: { reddit: true },
      suppressedUntilDay: { reddit: '2026-01-14' },
    });
    const snapshot = structuredClone(input);

    const result = applyIntentionalContinue(input, youtube.id);

    expect(result.suppressedUntilSessionEnd).toEqual({ reddit: true, youtube: true });
    expect(result.suppressedUntilDay).toEqual({
      reddit: '2026-01-14',
      youtube: input.dayKey,
    });
    expect(result).not.toBe(input);
    expect(input).toEqual(snapshot);
  });
});

describe('nextWakeAt', () => {
  it('clamps a near continuous limit to Chrome production alarm granularity', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = { ...youtube, continuousLimitMinutes: 2 };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      sessionState: { youtube: { accumulatedMs: minute - 5_000 } },
    });

    expect(nextWakeAt(input, [limitedRule], now)).toBe(now + 30_000);
  });

  it('clamps a near daily limit to Chrome production alarm granularity', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = { ...youtube, dailyLimitMinutes: 2 };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      dailyMsByRule: { youtube: minute - 4_000 },
    });

    expect(nextWakeAt(input, [limitedRule], now)).toBe(now + 30_000);
  });

  it('uses a future snooze expiry and excludes limit candidates while snoozed', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = { ...youtube, continuousLimitMinutes: 2 };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      sessionState: { youtube: { accumulatedMs: minute - 5_000 } },
      snoozeUntil: { youtube: now + 10_000 },
    });

    expect(nextWakeAt(input, [limitedRule], now)).toBe(now + 30_000);
  });

  it('uses the active checkpoint when alert candidates are farther away', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = {
      ...youtube,
      continuousLimitMinutes: 60,
      dailyLimitMinutes: 120,
    };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now },
    });

    expect(nextWakeAt(input, [limitedRule], now)).toBe(now + 30_000);
  });

  it('rolls a near midnight wake to the production alarm floor', () => {
    const now = new Date(2026, 0, 15, 23, 59, 50).getTime();
    const midnight = new Date(2026, 0, 16).getTime();
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now },
    });

    expect(nextWakeAt(input, [youtube], now)).toBe(midnight + 20_000);
    expect(nextWakeAt(state(), [], now)).toBe(midnight + 20_000);
  });

  it('falls back to local midnight with no active, missing, or disabled rule', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const midnight = new Date(2026, 0, 16).getTime();
    const active = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now },
    });

    expect(nextWakeAt(state(), [youtube], now)).toBe(midnight);
    expect(nextWakeAt(active, [reddit], now)).toBe(midnight);
    expect(nextWakeAt(active, [{ ...youtube, enabled: false }], now)).toBe(midnight);
  });

  it('excludes only the suppressed threshold and expires stale daily suppression', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = {
      ...youtube,
      continuousLimitMinutes: 2,
      dailyLimitMinutes: 2,
    };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      sessionState: { youtube: { accumulatedMs: minute - 3_000 } },
      dailyMsByRule: { youtube: minute - 7_000 },
    });

    expect(nextWakeAt({
      ...input,
      suppressedUntilSessionEnd: { youtube: true },
    }, [limitedRule], now)).toBe(now + 30_000);
    expect(nextWakeAt({
      ...input,
      suppressedUntilDay: { youtube: input.dayKey },
    }, [limitedRule], now)).toBe(now + 30_000);
    expect(nextWakeAt({
      ...input,
      suppressedUntilSessionEnd: { youtube: true },
      suppressedUntilDay: { youtube: '2026-01-14' },
    }, [limitedRule], now)).toBe(now + 30_000);
  });

  it('does not schedule an immediate loop for already reached limits or expired snooze', () => {
    const now = new Date(2026, 0, 15, 12).getTime();
    const limitedRule = {
      ...youtube,
      continuousLimitMinutes: 1,
      dailyLimitMinutes: 1,
    };
    const input = state({
      activeSegment: { ruleId: youtube.id, tabId: 7, startedAt: now - minute },
      snoozeUntil: { youtube: now },
    });

    expect(nextWakeAt(input, [limitedRule], now)).toBe(now + 30_000);
  });

  it.each([
    ['spring-forward day', new Date(2026, 2, 29).getTime(), new Date(2026, 2, 30).getTime(), 23],
    ['fall-back day', new Date(2026, 9, 25).getTime(), new Date(2026, 9, 26).getTime(), 25],
  ] as const)('uses the correct local midnight on a %s', (_label, now, expected, hours) => {
    expect(nextWakeAt(state(), [], now)).toBe(expected);
    expect(expected - now).toBe(hours * 60 * minute);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 8_640_000_000_000_001])(
    'returns null safely for invalid now (%s)',
    (now) => {
      expect(nextWakeAt(state(), [youtube], now)).toBeNull();
    },
  );
});
