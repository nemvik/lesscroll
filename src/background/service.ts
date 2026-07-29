import { localDayKey } from '../core/day';
import { normalizeDomain } from '../core/domain';
import { createRule, defaultRuntime, isRuntimeMessage } from '../core/runtime';
import {
  alertDecision,
  applyIntentionalContinue,
  applySnooze,
  closeSegment,
  currentUsage,
  discardStartupSegment,
  MIN_ALARM_DELAY_MS,
  nextWakeAt,
  reconcileState,
} from '../core/timing';
import type {
  ActiveContext,
  OverlayPayload,
  Rule,
  RuntimeMessage,
  RuntimeSnapshot,
  RuntimeState,
} from '../core/types';

const MISSED_WAKE_GRACE_MS = 30_000;

export interface StoredState {
  rules: Rule[];
  runtime: RuntimeState;
}

export interface BackgroundPorts {
  now(): number;
  load(now: number): Promise<StoredState>;
  save(value: StoredState): Promise<void>;
  getContext(): Promise<ActiveContext>;
  setAlarm(when: number): Promise<void>;
  injectOverlay(tabId: number, payload: OverlayPayload): Promise<void>;
  redirectToFocus(tabId: number): Promise<void>;
  removeUnusedPermissions(rules: readonly Rule[]): Promise<void>;
}

export interface MessageSenderLike {
  tab?: { id?: number | undefined } | undefined;
}

type ServiceResponse =
  | { ok: true; snapshot?: RuntimeSnapshot; rule?: Rule }
  | { ok: false; error: 'invalid-message' | 'rule-not-found' | 'duplicate-domain' };

interface Reconciled {
  value: StoredState;
  context: ActiveContext;
  now: number;
}

function withoutKey<T>(map: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...remaining } = map;
  return remaining;
}

function removeRuleRuntime(runtime: RuntimeState, ruleId: string): RuntimeState {
  return {
    ...runtime,
    activeSegment: runtime.activeSegment?.ruleId === ruleId ? null : runtime.activeSegment,
    dailyMsByRule: withoutKey(runtime.dailyMsByRule, ruleId),
    sessionState: withoutKey(runtime.sessionState, ruleId),
    snoozeUntil: withoutKey(runtime.snoozeUntil, ruleId),
    suppressedUntilSessionEnd: withoutKey(runtime.suppressedUntilSessionEnd, ruleId),
    suppressedUntilDay: withoutKey(runtime.suppressedUntilDay, ruleId),
  };
}

function snapshotOf(
  value: StoredState,
  context: ActiveContext,
  now: number,
): RuntimeSnapshot {
  const usageByRule = Object.fromEntries(
    value.rules.map((rule) => [rule.id, currentUsage(value.runtime, rule.id, now)]),
  );
  return {
    context,
    rules: value.rules,
    usageByRule,
    ...(value.runtime.activeSegment
      ? { activeRuleId: value.runtime.activeSegment.ruleId }
      : {}),
  };
}

export function createBackgroundService(ports: BackgroundPorts) {
  let queue: Promise<void> = Promise.resolve();

  const removeUnusedPermissions = (rules: readonly Rule[]): Promise<void> => (
    ports.removeUnusedPermissions(rules.filter((rule) => rule.enabled))
  );

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async function computeReconciled(options?: {
    startup?: boolean;
    scheduledTime?: number;
  }): Promise<Reconciled> {
    const now = ports.now();
    const loaded = await ports.load(now);
    const context = await ports.getContext();
    let runtime = options?.startup
      ? discardStartupSegment(loaded.runtime)
      : loaded.runtime;

    const active = runtime.activeSegment;
    const scheduledTime = options?.scheduledTime;
    const hasScheduledTime = typeof scheduledTime === 'number'
      && Number.isFinite(scheduledTime);
    const missedCheckpointAt = active
      ? active.startedAt + MIN_ALARM_DELAY_MS
      : undefined;
    let missedBoundary: number | undefined;
    if (hasScheduledTime && scheduledTime + MISSED_WAKE_GRACE_MS < now) {
      missedBoundary = scheduledTime;
    } else if (
      !hasScheduledTime
      && missedCheckpointAt !== undefined
      && missedCheckpointAt + MISSED_WAKE_GRACE_MS < now
    ) {
      missedBoundary = missedCheckpointAt;
    }

    if (active && missedBoundary !== undefined) {
      const creditedAt = Math.min(now, Math.max(active.startedAt, missedBoundary));
      runtime = closeSegment(runtime, creditedAt, loaded.rules);
      runtime = reconcileState(runtime, context, loaded.rules, now);
    } else {
      runtime = reconcileState(runtime, context, loaded.rules, now);
    }

    return { value: { rules: loaded.rules, runtime }, context, now };
  }

  async function persist(reconciled: Reconciled): Promise<void> {
    await ports.save(reconciled.value);
    const wakeAt = nextWakeAt(
      reconciled.value.runtime,
      reconciled.value.rules,
      reconciled.now,
    );
    if (wakeAt !== null) {
      await ports.setAlarm(wakeAt);
    }

    const alert = alertDecision(
      reconciled.value.runtime,
      reconciled.value.rules,
      reconciled.now,
    );
    const tabId = reconciled.value.runtime.activeSegment?.tabId;
    if (alert && tabId !== undefined) {
      try {
        await ports.injectOverlay(tabId, alert);
      } catch {
        // Restricted pages must not poison the serialized reconciliation queue.
      }
    }
  }

  async function reconcileAndPersist(options?: {
    startup?: boolean;
    scheduledTime?: number;
  }): Promise<void> {
    const reconciled = await computeReconciled(options);
    await persist(reconciled);
  }

  function enqueueReconcile(_reason: string, scheduledTime?: number): Promise<void> {
    return enqueue(() => reconcileAndPersist(
      scheduledTime === undefined ? undefined : { scheduledTime },
    ));
  }

  function enqueueStartup(): Promise<void> {
    return enqueue(() => reconcileAndPersist({ startup: true }));
  }

  function handleMessage(message: unknown, sender: MessageSenderLike): Promise<ServiceResponse> {
    return enqueue(async () => {
      if (!isRuntimeMessage(message)) {
        return { ok: false, error: 'invalid-message' };
      }

      const reconciled = await computeReconciled();
      const response = await applyMessage(reconciled, message, sender);
      return response;
    });
  }

  async function applyMessage(
    reconciled: Reconciled,
    message: RuntimeMessage,
    sender: MessageSenderLike,
  ): Promise<ServiceResponse> {
    let { value } = reconciled;
    const fail = async (
      error: 'rule-not-found' | 'duplicate-domain',
    ): Promise<ServiceResponse> => {
      reconciled.value = value;
      await persist(reconciled);
      return { ok: false, error };
    };

    switch (message.action) {
      case 'get-status':
        await persist(reconciled);
        return { ok: true, snapshot: snapshotOf(value, reconciled.context, reconciled.now) };
      case 'add-rule': {
        const nextRule = createRule(message.rule);
        if (value.rules.some((candidate) => candidate.domain === nextRule.domain)) {
          return fail('duplicate-domain');
        }
        value = { ...value, rules: [...value.rules, nextRule] };
        value = {
          ...value,
          runtime: reconcileState(value.runtime, reconciled.context, value.rules, reconciled.now),
        };
        reconciled.value = value;
        await persist(reconciled);
        return { ok: true, rule: nextRule };
      }
      case 'update-rule': {
        const index = value.rules.findIndex((candidate) => candidate.id === message.rule.id);
        if (index < 0) return fail('rule-not-found');
        const updatedRule = { ...message.rule, domain: normalizeDomain(message.rule.domain) };
        if (value.rules.some((candidate) => (
          candidate.id !== updatedRule.id && candidate.domain === updatedRule.domain
        ))) {
          return fail('duplicate-domain');
        }
        const rules = value.rules.map((candidate) => (
          candidate.id === updatedRule.id ? updatedRule : candidate
        ));
        value = {
          rules,
          runtime: reconcileState(value.runtime, reconciled.context, rules, reconciled.now),
        };
        break;
      }
      case 'delete-rule': {
        if (!value.rules.some((candidate) => candidate.id === message.ruleId)) {
          return fail('rule-not-found');
        }
        value = {
          rules: value.rules.filter((candidate) => candidate.id !== message.ruleId),
          runtime: removeRuleRuntime(value.runtime, message.ruleId),
        };
        break;
      }
      case 'toggle-rule': {
        if (!value.rules.some((candidate) => candidate.id === message.ruleId)) {
          return fail('rule-not-found');
        }
        const rules = value.rules.map((candidate) => (
          candidate.id === message.ruleId
            ? { ...candidate, enabled: message.enabled }
            : candidate
        ));
        value = {
          rules,
          runtime: reconcileState(value.runtime, reconciled.context, rules, reconciled.now),
        };
        break;
      }
      case 'reset-today':
        value = {
          ...value,
          runtime: {
            ...value.runtime,
            dayKey: localDayKey(reconciled.now),
            dailyMsByRule: {},
            suppressedUntilDay: {},
          },
        };
        break;
      case 'reset-all':
        value = { rules: [], runtime: defaultRuntime(reconciled.now) };
        break;
      case 'snooze': {
        const selected = value.rules.find((candidate) => candidate.id === message.ruleId);
        if (!selected) return fail('rule-not-found');
        value = { ...value, runtime: applySnooze(value.runtime, selected, reconciled.now) };
        break;
      }
      case 'continue':
        if (!value.rules.some((candidate) => candidate.id === message.ruleId)) {
          return fail('rule-not-found');
        }
        value = {
          ...value,
          runtime: applyIntentionalContinue(value.runtime, message.ruleId),
        };
        break;
      case 'leave-site': {
        const tabId = sender.tab?.id ?? value.runtime.activeSegment?.tabId;
        reconciled.value = value;
        await persist(reconciled);
        if (tabId !== undefined) await ports.redirectToFocus(tabId);
        return { ok: true };
      }
      case 'remove-unused-permissions':
        reconciled.value = value;
        await persist(reconciled);
        await removeUnusedPermissions(value.rules);
        return { ok: true };
    }

    reconciled.value = value;
    await persist(reconciled);
    if (
      message.action === 'delete-rule'
      || message.action === 'update-rule'
      || message.action === 'toggle-rule'
      || message.action === 'reset-all'
    ) {
      await removeUnusedPermissions(value.rules);
    }
    return { ok: true };
  }

  return { enqueueReconcile, enqueueStartup, handleMessage };
}
