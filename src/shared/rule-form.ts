import { normalizeDomain } from '../core/domain';
import type { Rule, RuleInput } from '../core/types';

export interface RuleDraft {
  domain: string;
  includeSubdomains: boolean;
  enabled: boolean;
  continuousLimitMinutes: string;
  dailyLimitMinutes: string;
  sessionResetAfterMinutes: string;
  snoozeMinutes: string;
}

export function emptyRuleDraft(): RuleDraft {
  return {
    domain: '',
    includeSubdomains: true,
    enabled: true,
    continuousLimitMinutes: '20',
    dailyLimitMinutes: '60',
    sessionResetAfterMinutes: '5',
    snoozeMinutes: '10',
  };
}

export function ruleDraft(rule: Rule): RuleDraft {
  return {
    domain: rule.domain,
    includeSubdomains: rule.includeSubdomains,
    enabled: rule.enabled,
    continuousLimitMinutes: rule.continuousLimitMinutes?.toString() ?? '',
    dailyLimitMinutes: rule.dailyLimitMinutes?.toString() ?? '',
    sessionResetAfterMinutes: rule.sessionResetAfterMinutes.toString(),
    snoozeMinutes: rule.snoozeMinutes.toString(),
  };
}

function optionalPositive(value: string): number | undefined | null {
  if (value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function parseRuleDraft(draft: RuleDraft):
  | { ok: true; value: RuleInput }
  | { ok: false; error: 'invalid-domain' | 'invalid-number' } {
  let domain: string;
  try {
    domain = normalizeDomain(draft.domain);
  } catch {
    return { ok: false, error: 'invalid-domain' };
  }

  const continuous = optionalPositive(draft.continuousLimitMinutes);
  const daily = optionalPositive(draft.dailyLimitMinutes);
  const reset = optionalPositive(draft.sessionResetAfterMinutes);
  const snooze = optionalPositive(draft.snoozeMinutes);
  if (continuous === null || daily === null || reset == null || snooze == null) {
    return { ok: false, error: 'invalid-number' };
  }

  return {
    ok: true,
    value: {
      domain,
      includeSubdomains: draft.includeSubdomains,
      enabled: draft.enabled,
      ...(continuous === undefined ? {} : { continuousLimitMinutes: continuous }),
      ...(daily === undefined ? {} : { dailyLimitMinutes: daily }),
      sessionResetAfterMinutes: reset,
      snoozeMinutes: snooze,
    },
  };
}
