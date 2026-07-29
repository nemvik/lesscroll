import { localDayKey } from './day';
import { normalizeDomain } from './domain';
import type { Rule, RuleInput, RuntimeMessage, RuntimeState, SessionState } from './types';

export const DEFAULT_RULE_VALUES: Omit<RuleInput, 'domain'> = {
  includeSubdomains: true,
  enabled: true,
  continuousLimitMinutes: 20,
  dailyLimitMinutes: 60,
  sessionResetAfterMinutes: 5,
  snoozeMinutes: 10,
};

export function createRule(input: RuleInput): Rule {
  return {
    ...input,
    id: crypto.randomUUID(),
    domain: normalizeDomain(input.domain),
  };
}

export function defaultRuntime(now = Date.now()): RuntimeState {
  return {
    dayKey: localDayKey(now),
    dailyMsByRule: {},
    activeSegment: null,
    sessionState: {},
    snoozeUntil: {},
    suppressedUntilSessionEnd: {},
    suppressedUntilDay: {},
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && !Number.isNaN(new Date(value).getTime());
}

function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function parseRuleInput(value: unknown): RuleInput | undefined {
  try {
    if (!isPlainObject(value)) {
      return undefined;
    }

    const hasContinuousLimit = Object.hasOwn(value, 'continuousLimitMinutes');
    const hasDailyLimit = Object.hasOwn(value, 'dailyLimitMinutes');
    const {
      domain,
      includeSubdomains,
      enabled,
      continuousLimitMinutes,
      dailyLimitMinutes,
      sessionResetAfterMinutes,
      snoozeMinutes,
    } = value;

    if (
      typeof domain !== 'string'
      || typeof includeSubdomains !== 'boolean'
      || typeof enabled !== 'boolean'
      || !isPositiveFinite(sessionResetAfterMinutes)
      || !isPositiveFinite(snoozeMinutes)
      || (hasContinuousLimit && !isPositiveFinite(continuousLimitMinutes))
      || (hasDailyLimit && !isPositiveFinite(dailyLimitMinutes))
    ) {
      return undefined;
    }

    return {
      domain: normalizeDomain(domain),
      includeSubdomains,
      enabled,
      ...(hasContinuousLimit
        ? { continuousLimitMinutes: continuousLimitMinutes as number }
        : {}),
      ...(hasDailyLimit ? { dailyLimitMinutes: dailyLimitMinutes as number } : {}),
      sessionResetAfterMinutes,
      snoozeMinutes,
    };
  } catch {
    return undefined;
  }
}

function parseRule(value: unknown): Rule | undefined {
  try {
    if (!isPlainObject(value)) {
      return undefined;
    }

    const input = parseRuleInput(value);
    if (typeof value.id !== 'string' || value.id.trim() === '' || !input) {
      return undefined;
    }

    return {
      id: value.id,
      ...input,
    };
  } catch {
    return undefined;
  }
}

export function parseRules(value: unknown): Rule[] {
  try {
    if (!Array.isArray(value)) {
      return [];
    }

    const rules: Rule[] = [];
    const ids = new Set<string>();
    for (const candidate of value) {
      const rule = parseRule(candidate);
      if (!rule || ids.has(rule.id)) {
        continue;
      }

      ids.add(rule.id);
      rules.push(rule);
    }

    return rules;
  } catch {
    return [];
  }
}

function parseMap<T>(
  value: unknown,
  parseValue: (entry: unknown) => T | undefined,
): Record<string, T> {
  const result: Record<string, T> = {};
  try {
    if (!isPlainObject(value)) {
      return result;
    }

    for (const key of Object.keys(value)) {
      if (!key) {
        continue;
      }
      try {
        const parsed = parseValue(value[key]);
        if (parsed !== undefined) {
          result[key] = parsed;
        }
      } catch {
        // Skip only the hostile entry and preserve valid siblings.
      }
    }
  } catch {
    return {};
  }
  return result;
}

function parseNonNegative(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function parseSession(value: unknown): SessionState | undefined {
  try {
    if (!isPlainObject(value)) {
      return undefined;
    }
    const accumulatedMs = parseNonNegative(value.accumulatedMs);
    if (accumulatedMs === undefined) {
      return undefined;
    }
    if (Object.hasOwn(value, 'lastLeftAt')) {
      return isValidTimestamp(value.lastLeftAt)
        ? { accumulatedMs, lastLeftAt: value.lastLeftAt }
        : undefined;
    }
    return { accumulatedMs };
  } catch {
    return undefined;
  }
}

function parseActiveSegment(value: unknown): RuntimeState['activeSegment'] {
  try {
    if (!isPlainObject(value)) {
      return null;
    }
    return typeof value.ruleId === 'string'
      && value.ruleId.trim() !== ''
      && typeof value.tabId === 'number'
      && Number.isInteger(value.tabId)
      && value.tabId >= 0
      && isValidTimestamp(value.startedAt)
      ? { ruleId: value.ruleId, tabId: value.tabId, startedAt: value.startedAt }
      : null;
  } catch {
    return null;
  }
}

export function parseRuntime(value: unknown, now = Date.now()): RuntimeState {
  const fallback = defaultRuntime(now);
  try {
    if (!isPlainObject(value)) {
      return fallback;
    }

    return {
      dayKey: isDayKey(value.dayKey) ? value.dayKey : fallback.dayKey,
      dailyMsByRule: parseMap(value.dailyMsByRule, parseNonNegative),
      activeSegment: parseActiveSegment(value.activeSegment),
      sessionState: parseMap(value.sessionState, parseSession),
      snoozeUntil: parseMap(value.snoozeUntil, (entry) => (
        isValidTimestamp(entry) ? entry : undefined
      )),
      suppressedUntilSessionEnd: parseMap(value.suppressedUntilSessionEnd, (entry) => (
        typeof entry === 'boolean' ? entry : undefined
      )),
      suppressedUntilDay: parseMap(value.suppressedUntilDay, (entry) => (
        isDayKey(entry) ? entry : undefined
      )),
    };
  } catch {
    return fallback;
  }
}

function isRuleId(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  try {
    if (!isPlainObject(value) || typeof value.action !== 'string') {
      return false;
    }

    switch (value.action) {
      case 'get-status':
      case 'reset-today':
      case 'reset-all':
      case 'remove-unused-permissions':
        return true;
      case 'add-rule':
        return parseRuleInput(value.rule) !== undefined;
      case 'update-rule':
        return parseRule(value.rule) !== undefined;
      case 'delete-rule':
      case 'snooze':
      case 'continue':
      case 'leave-site':
        return isRuleId(value.ruleId);
      case 'toggle-rule':
        return isRuleId(value.ruleId) && typeof value.enabled === 'boolean';
      default:
        return false;
    }
  } catch {
    return false;
  }
}
