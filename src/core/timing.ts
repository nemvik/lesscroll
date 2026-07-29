import { localDayKey, nextLocalMidnight, startOfLocalDay } from './day';
import { hostnameFromUrl, matchingRule } from './domain';
import type { ActiveContext, OverlayPayload, Rule, RuntimeState, Usage } from './types';

const MINUTE_MS = 60_000;
export const MIN_ALARM_DELAY_MS = 30_000;

function isValidTimestamp(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(new Date(value).getTime());
}

function elapsedMs(startedAt: number, now: number): number {
  if (!isValidTimestamp(startedAt) || !isValidTimestamp(now) || now <= startedAt) {
    return 0;
  }

  return now - startedAt;
}

function todayElapsedMs(startedAt: number, now: number): number {
  const elapsed = elapsedMs(startedAt, now);
  if (elapsed === 0) {
    return 0;
  }

  return now - Math.max(startedAt, startOfLocalDay(now));
}

export function closeSegment(
  state: RuntimeState,
  now: number,
  rules: readonly Rule[],
): RuntimeState {
  const active = state.activeSegment;
  if (!active) {
    return state;
  }

  const knownRule = rules.some((rule) => rule.id === active.ruleId);
  const validNow = isValidTimestamp(now);
  const duration = knownRule ? elapsedMs(active.startedAt, now) : 0;
  const currentDayDuration = knownRule ? todayElapsedMs(active.startedAt, now) : 0;
  const currentSession = state.sessionState[active.ruleId];
  const nextDayKey = validNow ? localDayKey(now) : state.dayKey;
  const dailyMsByRule = nextDayKey === state.dayKey ? state.dailyMsByRule : {};

  return {
    ...state,
    dayKey: nextDayKey,
    dailyMsByRule: currentDayDuration > 0
      ? {
          ...dailyMsByRule,
          [active.ruleId]: (dailyMsByRule[active.ruleId] ?? 0) + currentDayDuration,
        }
      : dailyMsByRule,
    activeSegment: null,
    sessionState: knownRule && validNow
      ? {
          ...state.sessionState,
          [active.ruleId]: {
            accumulatedMs: (currentSession?.accumulatedMs ?? 0) + duration,
            lastLeftAt: now,
          },
        }
      : state.sessionState,
  };
}

function contextRule(
  context: ActiveContext,
  rules: readonly Rule[],
  now: number,
): Rule | undefined {
  if (
    !context.focused
    || !Number.isInteger(context.tabId)
    || (context.tabId ?? -1) < 0
    || typeof context.url !== 'string'
    || !isValidTimestamp(now)
  ) {
    return undefined;
  }

  const hostname = hostnameFromUrl(context.url);
  return hostname ? matchingRule(hostname, rules) : undefined;
}

export function openSegment(
  state: RuntimeState,
  context: ActiveContext,
  rules: readonly Rule[],
  now: number,
): RuntimeState {
  if (state.activeSegment) {
    return state;
  }

  const rule = contextRule(context, rules, now);
  if (!rule || context.tabId === undefined) {
    return state;
  }

  const previousSession = state.sessionState[rule.id];
  const lastLeftAt = previousSession?.lastLeftAt;
  const resetAfterMs = rule.sessionResetAfterMinutes * MINUTE_MS;
  const shouldReset = lastLeftAt !== undefined
    && (
      !isValidTimestamp(lastLeftAt)
      || lastLeftAt > now
      || now - lastLeftAt > resetAfterMs
    );
  const accumulatedMs = shouldReset ? 0 : (previousSession?.accumulatedMs ?? 0);
  let suppressedUntilSessionEnd = state.suppressedUntilSessionEnd;

  if (shouldReset && suppressedUntilSessionEnd[rule.id]) {
    const { [rule.id]: _removed, ...remaining } = suppressedUntilSessionEnd;
    suppressedUntilSessionEnd = remaining;
  }

  return {
    ...state,
    activeSegment: { ruleId: rule.id, tabId: context.tabId, startedAt: now },
    sessionState: {
      ...state.sessionState,
      [rule.id]: { accumulatedMs },
    },
    suppressedUntilSessionEnd,
  };
}

export function reconcileState(
  state: RuntimeState,
  context: ActiveContext,
  rules: readonly Rule[],
  now: number,
): RuntimeState {
  const nowDayKey = isValidTimestamp(now) ? localDayKey(now) : state.dayKey;
  const currentState = nowDayKey === state.dayKey
    ? state
    : { ...state, dayKey: nowDayKey, dailyMsByRule: {} };
  const closed = closeSegment(currentState, now, rules);
  return openSegment(closed, context, rules, now);
}

export function currentUsage(
  state: RuntimeState,
  ruleId: string,
  now: number,
): Usage {
  const activeElapsed = state.activeSegment?.ruleId === ruleId
    ? elapsedMs(state.activeSegment.startedAt, now)
    : 0;
  const activeTodayElapsed = state.activeSegment?.ruleId === ruleId
    ? todayElapsedMs(state.activeSegment.startedAt, now)
    : 0;
  const todayKey = isValidTimestamp(now) ? localDayKey(now) : undefined;

  return {
    sessionMs: (state.sessionState[ruleId]?.accumulatedMs ?? 0) + activeElapsed,
    dailyMs: (todayKey === state.dayKey ? (state.dailyMsByRule[ruleId] ?? 0) : 0)
      + activeTodayElapsed,
  };
}

export function discardStartupSegment(state: RuntimeState): RuntimeState {
  const active = state.activeSegment;
  if (!active) {
    return state;
  }

  return {
    ...state,
    activeSegment: null,
    sessionState: {
      ...state.sessionState,
      [active.ruleId]: {
        accumulatedMs: state.sessionState[active.ruleId]?.accumulatedMs ?? 0,
        lastLeftAt: active.startedAt,
      },
    },
  };
}

function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function alertDecision(
  state: RuntimeState,
  rules: readonly Rule[],
  now: number,
): OverlayPayload | null {
  const active = state.activeSegment;
  if (!active || !isValidTimestamp(now)) {
    return null;
  }

  const rule = rules.find((candidate) => candidate.id === active.ruleId && candidate.enabled);
  if (!rule || (state.snoozeUntil[rule.id] ?? 0) > now) {
    return null;
  }

  const usage = currentUsage(state, rule.id, now);
  const currentDayKey = localDayKey(now);
  const continuousReached = isPositiveFinite(rule.continuousLimitMinutes)
    && usage.sessionMs >= rule.continuousLimitMinutes * MINUTE_MS
    && !state.suppressedUntilSessionEnd[rule.id];
  const dailyReached = isPositiveFinite(rule.dailyLimitMinutes)
    && usage.dailyMs >= rule.dailyLimitMinutes * MINUTE_MS
    && state.suppressedUntilDay[rule.id] !== currentDayKey;

  if (!continuousReached && !dailyReached) {
    return null;
  }

  const kind = continuousReached ? 'continuous' : 'daily';
  return {
    ruleId: rule.id,
    domain: rule.domain,
    kind,
    usage,
    limitMinutes: kind === 'continuous'
      ? rule.continuousLimitMinutes!
      : rule.dailyLimitMinutes!,
    snoozeMinutes: rule.snoozeMinutes,
  };
}

export function applySnooze(
  state: RuntimeState,
  rule: Rule,
  now: number,
): RuntimeState {
  if (!isValidTimestamp(now) || !isPositiveFinite(rule.snoozeMinutes)) {
    return state;
  }

  const expiry = now + rule.snoozeMinutes * MINUTE_MS;
  if (!isValidTimestamp(expiry)) {
    return state;
  }

  return {
    ...state,
    snoozeUntil: {
      ...state.snoozeUntil,
      [rule.id]: expiry,
    },
  };
}

export function applyIntentionalContinue(
  state: RuntimeState,
  ruleId: string,
): RuntimeState {
  return {
    ...state,
    suppressedUntilSessionEnd: {
      ...state.suppressedUntilSessionEnd,
      [ruleId]: true,
    },
    suppressedUntilDay: {
      ...state.suppressedUntilDay,
      [ruleId]: state.dayKey,
    },
  };
}

export function nextWakeAt(
  state: RuntimeState,
  rules: readonly Rule[],
  now: number,
): number | null {
  if (!isValidTimestamp(now)) {
    return null;
  }

  const candidates: number[] = [];
  const addCandidate = (candidate: number): void => {
    if (isValidTimestamp(candidate) && candidate > now) {
      candidates.push(candidate);
    }
  };
  const earliestCandidate = (): number | null => (
    candidates.length > 0
      ? Math.max(now + MIN_ALARM_DELAY_MS, Math.min(...candidates))
      : null
  );

  addCandidate(nextLocalMidnight(now));

  const active = state.activeSegment;
  const rule = active
    ? rules.find((candidate) => candidate.id === active.ruleId && candidate.enabled)
    : undefined;
  if (!rule) {
    return earliestCandidate();
  }

  addCandidate(now + MIN_ALARM_DELAY_MS);

  const snoozeUntil = state.snoozeUntil[rule.id];
  if (
    typeof snoozeUntil === 'number'
    && isValidTimestamp(snoozeUntil)
    && snoozeUntil > now
  ) {
    addCandidate(snoozeUntil);
    return earliestCandidate();
  }

  const usage = currentUsage(state, rule.id, now);
  if (
    isPositiveFinite(rule.continuousLimitMinutes)
    && !state.suppressedUntilSessionEnd[rule.id]
  ) {
    addCandidate(now + rule.continuousLimitMinutes * MINUTE_MS - usage.sessionMs);
  }

  if (
    isPositiveFinite(rule.dailyLimitMinutes)
    && state.suppressedUntilDay[rule.id] !== localDayKey(now)
  ) {
    addCandidate(now + rule.dailyLimitMinutes * MINUTE_MS - usage.dailyMs);
  }

  return earliestCandidate();
}
