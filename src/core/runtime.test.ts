import { describe, expect, it, vi } from 'vitest';
import { localDayKey } from './day';
import {
  DEFAULT_RULE_VALUES,
  createRule,
  defaultRuntime,
  isRuntimeMessage,
  parseRules,
  parseRuntime,
} from './runtime';

describe('DEFAULT_RULE_VALUES', () => {
  it('contains the exact quick-add defaults', () => {
    expect(DEFAULT_RULE_VALUES).toEqual({
      includeSubdomains: true,
      enabled: true,
      continuousLimitMinutes: 20,
      dailyLimitMinutes: 60,
      sessionResetAfterMinutes: 5,
      snoozeMinutes: 10,
    });
  });
});

describe('createRule', () => {
  it('normalizes the domain and assigns a random UUID', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const randomUuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue(id);

    expect(createRule({
      domain: ' HTTPS://WWW.YouTube.com/watch?v=1 ',
      ...DEFAULT_RULE_VALUES,
    })).toEqual({
      id,
      domain: 'youtube.com',
      ...DEFAULT_RULE_VALUES,
    });
    expect(randomUuid).toHaveBeenCalledOnce();

    randomUuid.mockRestore();
  });
});

describe('defaultRuntime', () => {
  it('creates an empty runtime for the current local day', () => {
    const now = new Date(2026, 6, 27, 12, 34, 56).getTime();

    expect(defaultRuntime(now)).toEqual({
      dayKey: localDayKey(now),
      dailyMsByRule: {},
      activeSegment: null,
      sessionState: {},
      snoozeUntil: {},
      suppressedUntilSessionEnd: {},
      suppressedUntilDay: {},
    });
  });
});

describe('parseRules', () => {
  const requiredRule = {
    id: 'youtube',
    domain: 'youtube.com',
    includeSubdomains: true,
    enabled: true,
    sessionResetAfterMinutes: 5,
    snoozeMinutes: 10,
  };

  it.each([
    undefined,
    null,
    true,
    1,
    '[]',
    {},
    new Date(),
  ])('returns an empty list for a non-array root: %s', (input) => {
    expect(parseRules(input)).toEqual([]);
  });

  it('normalizes domains, preserves valid siblings, and skips invalid siblings', () => {
    expect(parseRules([
      {
        ...requiredRule,
        domain: ' HTTPS://WWW.YouTube.com/watch?v=1 ',
        continuousLimitMinutes: 20,
        dailyLimitMinutes: 60,
      },
      { ...requiredRule, id: 'bad-domain', domain: 'localhost' },
      {
        ...requiredRule,
        id: 'reddit',
        domain: 'WWW.Reddit.com.',
        includeSubdomains: false,
        enabled: false,
      },
    ])).toEqual([
      {
        ...requiredRule,
        domain: 'youtube.com',
        continuousLimitMinutes: 20,
        dailyLimitMinutes: 60,
      },
      {
        ...requiredRule,
        id: 'reddit',
        domain: 'reddit.com',
        includeSubdomains: false,
        enabled: false,
      },
    ]);
  });

  it('requires unique non-empty string ids and boolean flags', () => {
    expect(parseRules([
      requiredRule,
      { ...requiredRule, id: 'youtube', domain: 'reddit.com' },
      { ...requiredRule, id: '' },
      { ...requiredRule, id: '   ' },
      { ...requiredRule, id: 7 },
      { ...requiredRule, id: 'missing-subdomains', includeSubdomains: undefined },
      { ...requiredRule, id: 'string-subdomains', includeSubdomains: 'true' },
      { ...requiredRule, id: 'missing-enabled', enabled: undefined },
      { ...requiredRule, id: 'number-enabled', enabled: 1 },
    ])).toEqual([requiredRule]);
  });

  it('omits absent optional limits and accepts only positive finite limits', () => {
    const validContinuous = {
      ...requiredRule,
      id: 'continuous',
      continuousLimitMinutes: 0.5,
    };
    const validDaily = {
      ...requiredRule,
      id: 'daily',
      dailyLimitMinutes: 120,
    };

    const parsed = parseRules([
      requiredRule,
      validContinuous,
      validDaily,
      { ...requiredRule, id: 'zero-continuous', continuousLimitMinutes: 0 },
      { ...requiredRule, id: 'negative-continuous', continuousLimitMinutes: -1 },
      { ...requiredRule, id: 'infinite-continuous', continuousLimitMinutes: Infinity },
      { ...requiredRule, id: 'nan-daily', dailyLimitMinutes: Number.NaN },
      { ...requiredRule, id: 'string-daily', dailyLimitMinutes: '60' },
    ]);

    expect(parsed).toEqual([requiredRule, validContinuous, validDaily]);
    expect(parsed[0]).not.toHaveProperty('continuousLimitMinutes');
    expect(parsed[0]).not.toHaveProperty('dailyLimitMinutes');
    expect(parsed[1]).not.toHaveProperty('dailyLimitMinutes');
    expect(parsed[2]).not.toHaveProperty('continuousLimitMinutes');
  });

  it('rejects optional limit properties that are present with undefined values', () => {
    expect(parseRules([
      requiredRule,
      { ...requiredRule, id: 'continuous', continuousLimitMinutes: undefined },
      { ...requiredRule, id: 'daily', dailyLimitMinutes: undefined },
    ])).toEqual([requiredRule]);
  });

  it('requires positive finite reset and snooze durations', () => {
    expect(parseRules([
      requiredRule,
      { ...requiredRule, id: 'missing-reset', sessionResetAfterMinutes: undefined },
      { ...requiredRule, id: 'zero-reset', sessionResetAfterMinutes: 0 },
      { ...requiredRule, id: 'infinite-reset', sessionResetAfterMinutes: Infinity },
      { ...requiredRule, id: 'missing-snooze', snoozeMinutes: undefined },
      { ...requiredRule, id: 'negative-snooze', snoozeMinutes: -1 },
      { ...requiredRule, id: 'nan-snooze', snoozeMinutes: Number.NaN },
    ])).toEqual([requiredRule]);
  });

  it('rejects null, arrays, and unusual prototypes without throwing', () => {
    const inherited = Object.create(requiredRule) as unknown;
    const nullPrototype = Object.assign(Object.create(null), requiredRule) as unknown;
    const throwingGetter = { ...requiredRule };
    Object.defineProperty(throwingGetter, 'domain', {
      enumerable: true,
      get() {
        throw new Error('hostile getter');
      },
    });

    let result: ReturnType<typeof parseRules> = [];
    expect(() => {
      result = parseRules([
        null,
        [],
        inherited,
        nullPrototype,
        throwingGetter,
        requiredRule,
      ]);
    }).not.toThrow();
    expect(result).toEqual([requiredRule]);
  });

  it('returns an empty list without throwing for a revoked Proxy root', () => {
    const { proxy, revoke } = Proxy.revocable([], {});
    revoke();

    expect(() => parseRules(proxy)).not.toThrow();
    expect(parseRules(proxy)).toEqual([]);
  });

  it('returns an empty list without throwing for a hostile array iterator', () => {
    const input = [requiredRule];
    Object.defineProperty(input, Symbol.iterator, {
      get() {
        throw new Error('hostile iterator');
      },
    });

    expect(() => parseRules(input)).not.toThrow();
    expect(parseRules(input)).toEqual([]);
  });
});

describe('parseRuntime', () => {
  const now = new Date(2026, 6, 27, 12).getTime();

  it('falls back to a complete default for invalid roots', () => {
    expect(parseRuntime(null, now)).toEqual(defaultRuntime(now));
    expect(parseRuntime([], now)).toEqual(defaultRuntime(now));
  });

  it('preserves valid map siblings and drops invalid values', () => {
    expect(parseRuntime({
      dayKey: '2026-07-26',
      dailyMsByRule: { youtube: 1_000, negative: -1, nan: Number.NaN, text: '1' },
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now - 1_000 },
      sessionState: {
        youtube: { accumulatedMs: 2_000, lastLeftAt: now - 3_000 },
        fresh: { accumulatedMs: 0 },
        negative: { accumulatedMs: -1 },
        hostile: null,
      },
      snoozeUntil: { youtube: now + 1_000, nan: Number.NaN, text: 'later' },
      suppressedUntilSessionEnd: { youtube: true, falseRule: false, text: 'yes' },
      suppressedUntilDay: { youtube: '2026-07-26', invalid: '2026-02-31', text: 1 },
    }, now)).toEqual({
      dayKey: '2026-07-26',
      dailyMsByRule: { youtube: 1_000 },
      activeSegment: { ruleId: 'youtube', tabId: 7, startedAt: now - 1_000 },
      sessionState: {
        youtube: { accumulatedMs: 2_000, lastLeftAt: now - 3_000 },
        fresh: { accumulatedMs: 0 },
      },
      snoozeUntil: { youtube: now + 1_000 },
      suppressedUntilSessionEnd: { youtube: true, falseRule: false },
      suppressedUntilDay: { youtube: '2026-07-26' },
    });
  });

  it.each([
    null,
    {},
    { ruleId: '', tabId: 1, startedAt: now },
    { ruleId: 'youtube', tabId: -1, startedAt: now },
    { ruleId: 'youtube', tabId: 1.5, startedAt: now },
    { ruleId: 'youtube', tabId: 1, startedAt: Number.NaN },
  ])('drops an invalid active segment: %j', (activeSegment) => {
    expect(parseRuntime({ activeSegment }, now).activeSegment).toBeNull();
  });

  it('does not throw for hostile roots or map entries', () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    const throwingEntry = {};
    Object.defineProperty(throwingEntry, 'accumulatedMs', {
      get() {
        throw new Error('hostile getter');
      },
    });

    expect(() => parseRuntime(proxy, now)).not.toThrow();
    expect(parseRuntime({ sessionState: { hostile: throwingEntry, safe: { accumulatedMs: 1 } } }, now)
      .sessionState).toEqual({ safe: { accumulatedMs: 1 } });
  });
});

describe('isRuntimeMessage', () => {
  const inputRule = {
    domain: 'youtube.com',
    includeSubdomains: true,
    enabled: true,
    continuousLimitMinutes: 20,
    dailyLimitMinutes: 60,
    sessionResetAfterMinutes: 5,
    snoozeMinutes: 10,
  };

  it.each([
    { action: 'get-status' },
    { action: 'add-rule', rule: inputRule },
    { action: 'update-rule', rule: { id: 'youtube', ...inputRule } },
    { action: 'delete-rule', ruleId: 'youtube' },
    { action: 'toggle-rule', ruleId: 'youtube', enabled: false },
    { action: 'reset-today' },
    { action: 'reset-all' },
    { action: 'snooze', ruleId: 'youtube' },
    { action: 'continue', ruleId: 'youtube' },
    { action: 'leave-site', ruleId: 'youtube' },
    { action: 'remove-unused-permissions' },
  ])('accepts valid message $action', (message) => {
    expect(isRuntimeMessage(message)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    { action: 'unknown' },
    { action: 'delete-rule' },
    { action: 'delete-rule', ruleId: '' },
    { action: 'toggle-rule', ruleId: 'youtube', enabled: 'true' },
    { action: 'add-rule', rule: { ...inputRule, dailyLimitMinutes: Number.NaN } },
    { action: 'add-rule', rule: { ...inputRule, dailyLimitMinutes: undefined } },
    { action: 'update-rule', rule: inputRule },
    { action: 'update-rule', rule: { id: 'youtube', ...inputRule, snoozeMinutes: 0 } },
  ])('rejects malformed message: %j', (message) => {
    expect(isRuntimeMessage(message)).toBe(false);
  });

  it('does not throw for a revoked Proxy', () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(() => isRuntimeMessage(proxy)).not.toThrow();
    expect(isRuntimeMessage(proxy)).toBe(false);
  });
});
