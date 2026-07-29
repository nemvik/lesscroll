import { describe, expect, it } from 'vitest';
import type { ActiveContext, Rule, RuntimeState } from '../core/types';
import { defaultRuntime } from '../core/runtime';
import { createBackgroundService, type BackgroundPorts, type StoredState } from './service';

const minute = 60_000;

function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'youtube',
    domain: 'youtube.com',
    includeSubdomains: true,
    enabled: true,
    continuousLimitMinutes: 1,
    dailyLimitMinutes: 60,
    sessionResetAfterMinutes: 5,
    snoozeMinutes: 10,
    ...overrides,
  };
}

function context(overrides: Partial<ActiveContext> = {}): ActiveContext {
  return {
    focused: true,
    tabId: 7,
    url: 'https://youtube.com/watch?v=1',
    ...overrides,
  };
}

function runtime(now: number, overrides: Partial<RuntimeState> = {}): RuntimeState {
  return { ...defaultRuntime(now), ...overrides };
}

function harness(
  initial: StoredState,
  now: number,
  overrides: Partial<BackgroundPorts> = {},
) {
  let stored = structuredClone(initial);
  const events: string[] = [];
  const ports: BackgroundPorts = {
    now: () => now,
    load: async () => structuredClone(stored),
    save: async (value) => {
      events.push('save');
      stored = structuredClone(value);
    },
    getContext: async () => context(),
    setAlarm: async () => undefined,
    injectOverlay: async () => {
      events.push('inject');
    },
    redirectToFocus: async () => undefined,
    removeUnusedPermissions: async () => undefined,
    ...overrides,
  };
  return {
    service: createBackgroundService(ports),
    events,
    stored: () => structuredClone(stored),
  };
}

describe('background service reconciliation', () => {
  it('serializes simultaneous reconciliations', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    let loads = 0;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const h = harness({ rules: [rule()], runtime: runtime(now) }, now, {
      load: async () => {
        loads += 1;
        if (loads === 1) await firstGate;
        return { rules: [rule()], runtime: runtime(now) };
      },
    });

    const first = h.service.enqueueReconcile('first');
    const second = h.service.enqueueReconcile('second');
    await Promise.resolve();
    await Promise.resolve();
    expect(loads).toBe(1);
    releaseFirst();
    await Promise.all([first, second]);
    expect(loads).toBe(2);
  });

  it('persists state before injecting an alert', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    const h = harness({
      rules: [rule()],
      runtime: runtime(now, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now - minute },
      }),
    }, now);

    await h.service.enqueueReconcile('alarm', now);
    expect(h.events.slice(0, 2)).toEqual(['save', 'inject']);
  });

  it('uses a delayed alarm scheduled time as the credited boundary', async () => {
    const startedAt = new Date(2026, 6, 27, 12).getTime();
    const scheduledTime = startedAt + 30_000;
    const now = startedAt + 10 * minute;
    const h = harness({
      rules: [rule({ continuousLimitMinutes: 60 })],
      runtime: runtime(startedAt, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      }),
    }, now);

    await h.service.enqueueReconcile('alarm', scheduledTime);
    expect(h.stored().runtime.dailyMsByRule.youtube).toBe(30_000);
    expect(h.stored().runtime.sessionState.youtube?.accumulatedMs).toBe(0);
    expect(h.stored().runtime.activeSegment).toEqual({
      ruleId: 'youtube',
      tabId: 7,
      startedAt: now,
    });
  });

  it('reconciles the local day when a delayed alarm crosses midnight', async () => {
    const startedAt = new Date(2026, 6, 27, 23, 59, 20).getTime();
    const scheduledTime = new Date(2026, 6, 27, 23, 59, 50).getTime();
    const now = new Date(2026, 6, 28, 0, 1).getTime();
    const h = harness({
      rules: [rule({ continuousLimitMinutes: 60 })],
      runtime: runtime(startedAt, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      }),
    }, now, { getContext: async () => context({ focused: false }) });

    await h.service.enqueueReconcile('alarm', scheduledTime);

    expect(h.stored().runtime.dayKey).toBe('2026-07-28');
    expect(h.stored().runtime.dailyMsByRule).toEqual({});
    expect(h.stored().runtime.activeSegment).toBeNull();
  });

  it('does not credit a long suspended gap when another event arrives before the alarm', async () => {
    const startedAt = new Date(2026, 6, 27, 12).getTime();
    const now = startedAt + 10 * minute;
    const h = harness({
      rules: [rule({ continuousLimitMinutes: 60 })],
      runtime: runtime(startedAt, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      }),
    }, now);

    await h.service.enqueueReconcile('tab-updated');

    expect(h.stored().runtime.dailyMsByRule.youtube).toBe(30_000);
    expect(h.stored().runtime.sessionState.youtube?.accumulatedMs).toBe(0);
    expect(h.stored().runtime.activeSegment?.startedAt).toBe(now);
  });

  it('allows alarm delivery grace when another event arrives first', async () => {
    const startedAt = new Date(2026, 6, 27, 12).getTime();
    const now = startedAt + 50_000;
    const h = harness({
      rules: [rule({
        continuousLimitMinutes: 0.1,
        sessionResetAfterMinutes: 0.1,
      })],
      runtime: runtime(startedAt, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      }),
    }, now);

    await h.service.enqueueReconcile('tab-updated');

    expect(h.stored().runtime.dailyMsByRule.youtube).toBe(50_000);
    expect(h.stored().runtime.sessionState.youtube?.accumulatedMs).toBe(50_000);
    expect(h.events).toContain('inject');
  });

  it('honors the packaged Chrome alarm floor without resetting a short session', async () => {
    const startedAt = new Date(2026, 6, 27, 12).getTime();
    const scheduledTime = startedAt + 30_000;
    const now = scheduledTime + 10_000;
    const h = harness({
      rules: [rule({
        continuousLimitMinutes: 0.1,
        sessionResetAfterMinutes: 0.1,
      })],
      runtime: runtime(startedAt, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      }),
    }, now);

    await h.service.enqueueReconcile('alarm', scheduledTime);

    expect(h.stored().runtime.dailyMsByRule.youtube).toBe(40_000);
    expect(h.stored().runtime.sessionState.youtube?.accumulatedMs).toBe(40_000);
    expect(h.events).toContain('inject');
  });

  it('discards an uncommitted startup segment before reopening context', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    const h = harness({
      rules: [rule()],
      runtime: runtime(now, {
        dailyMsByRule: { youtube: minute },
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now - 20_000 },
        sessionState: { youtube: { accumulatedMs: minute } },
      }),
    }, now);

    await h.service.enqueueStartup();
    expect(h.stored().runtime.dailyMsByRule.youtube).toBe(minute);
    expect(h.stored().runtime.sessionState.youtube).toEqual({ accumulatedMs: minute });
    expect(h.stored().runtime.activeSegment?.startedAt).toBe(now);
  });

  it('cannot credit browser downtime when a restore event arrives before startup', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    const startedAt = now - 10 * minute;
    const h = harness({
      rules: [rule({ continuousLimitMinutes: 60 })],
      runtime: runtime(startedAt, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt },
      }),
    }, now);

    await h.service.enqueueReconcile('tab-updated');
    await h.service.enqueueStartup();

    expect(h.stored().runtime.dailyMsByRule.youtube).toBe(30_000);
    expect(h.stored().runtime.sessionState.youtube?.accumulatedMs).toBe(0);
    expect(h.stored().runtime.activeSegment?.startedAt).toBe(now);
  });

  it('contains injection failure so the next reconcile still runs', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    let injections = 0;
    let saves = 0;
    const h = harness({
      rules: [rule()],
      runtime: runtime(now, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now - minute },
      }),
    }, now, {
      save: async () => { saves += 1; },
      injectOverlay: async () => {
        injections += 1;
        throw new Error('restricted page');
      },
    });

    await expect(h.service.enqueueReconcile('alarm', now)).resolves.toBeUndefined();
    await expect(h.service.enqueueReconcile('retry')).resolves.toBeUndefined();
    expect(injections).toBeGreaterThan(0);
    expect(saves).toBe(2);
  });
});

describe('background service messages', () => {
  it('removes host access after disabling a rule', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    let permissionRules: readonly Rule[] | undefined;
    const h = harness({ rules: [rule()], runtime: runtime(now) }, now, {
      removeUnusedPermissions: async (rules) => {
        permissionRules = rules;
      },
    });

    expect(await h.service.handleMessage({
      action: 'toggle-rule',
      ruleId: 'youtube',
      enabled: false,
    }, {})).toEqual({ ok: true });
    expect(h.stored().rules[0]?.enabled).toBe(false);
    expect(permissionRules).toEqual([]);
  });

  it('resets today without deleting rules or session state', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    const h = harness({
      rules: [rule()],
      runtime: runtime(now, {
        dailyMsByRule: { youtube: minute },
        sessionState: { youtube: { accumulatedMs: minute } },
        suppressedUntilDay: { youtube: '2026-07-27' },
      }),
    }, now, { getContext: async () => context({ focused: false }) });

    expect(await h.service.handleMessage({ action: 'reset-today' }, {})).toEqual({ ok: true });
    expect(h.stored().rules).toHaveLength(1);
    expect(h.stored().runtime.dailyMsByRule).toEqual({});
    expect(h.stored().runtime.sessionState.youtube?.accumulatedMs).toBe(minute);
    expect(h.stored().runtime.suppressedUntilDay).toEqual({});
  });

  it('resets all rules and runtime data', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    let permissionRules: readonly Rule[] | undefined;
    const h = harness({ rules: [rule()], runtime: runtime(now) }, now, {
      removeUnusedPermissions: async (rules) => {
        permissionRules = rules;
      },
    });

    expect(await h.service.handleMessage({ action: 'reset-all' }, {})).toEqual({ ok: true });
    expect(h.stored()).toEqual({ rules: [], runtime: defaultRuntime(now) });
    expect(permissionRules).toEqual([]);
  });

  it('rejects malformed messages without changing storage', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    const h = harness({ rules: [rule()], runtime: runtime(now) }, now);
    expect(await h.service.handleMessage({ action: 'wat' }, {})).toEqual({
      ok: false,
      error: 'invalid-message',
    });
    expect(h.stored().rules).toHaveLength(1);
  });

  it('persists elapsed timing within delivery grace before a domain error', async () => {
    const now = new Date(2026, 6, 27, 12).getTime();
    const h = harness({
      rules: [rule()],
      runtime: runtime(now, {
        activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now - minute },
      }),
    }, now);

    expect(await h.service.handleMessage({ action: 'delete-rule', ruleId: 'missing' }, {}))
      .toEqual({ ok: false, error: 'rule-not-found' });
    expect(h.stored().runtime.dailyMsByRule.youtube).toBe(minute);
    expect(h.stored().runtime.activeSegment?.startedAt).toBe(now);
  });
});
