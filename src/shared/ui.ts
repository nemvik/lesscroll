import { ruleMatches } from '../core/domain';
import type { Rule } from '../core/types';

export function roundedMinutes(milliseconds: number): number {
  return Math.max(0, Math.round(milliseconds / 60_000));
}

export function progressPercent(used: number, limit: number | undefined): number {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit === undefined || limit <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (used / limit) * 100));
}

export function configuredRuleForHost(
  hostname: string,
  rules: readonly Rule[],
): Rule | undefined {
  let best: Rule | undefined;
  for (const rule of rules) {
    if (
      ruleMatches(hostname, rule)
      && (
        !best
        || (rule.enabled && !best.enabled)
        || (rule.enabled === best.enabled && rule.domain.length > best.domain.length)
      )
    ) {
      best = rule;
    }
  }
  return best;
}
