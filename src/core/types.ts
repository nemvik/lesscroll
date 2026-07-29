export interface Rule {
  id: string;
  domain: string;
  includeSubdomains: boolean;
  enabled: boolean;
  continuousLimitMinutes?: number;
  dailyLimitMinutes?: number;
  sessionResetAfterMinutes: number;
  snoozeMinutes: number;
}

export type RuleInput = Omit<Rule, 'id'>;

export interface SessionState {
  accumulatedMs: number;
  lastLeftAt?: number;
}

export interface ActiveSegment {
  ruleId: string;
  tabId: number;
  startedAt: number;
}

export interface RuntimeState {
  dayKey: string;
  dailyMsByRule: Record<string, number>;
  activeSegment: ActiveSegment | null;
  sessionState: Record<string, SessionState>;
  snoozeUntil: Record<string, number>;
  suppressedUntilSessionEnd: Record<string, boolean>;
  suppressedUntilDay: Record<string, string>;
}

export interface ActiveContext {
  focused: boolean;
  tabId?: number;
  url?: string;
}

export interface Usage {
  sessionMs: number;
  dailyMs: number;
}

export type AlertKind = 'continuous' | 'daily';

export interface OverlayPayload {
  ruleId: string;
  domain: string;
  kind: AlertKind;
  usage: Usage;
  limitMinutes: number;
  snoozeMinutes: number;
}

export type OverlayAction = 'snooze' | 'continue' | 'leave-site';

export interface RuntimeSnapshot {
  context: ActiveContext;
  rules: Rule[];
  usageByRule: Record<string, Usage>;
  activeRuleId?: string;
}

export type RuntimeMessage =
  | { action: 'get-status' }
  | { action: 'add-rule'; rule: RuleInput }
  | { action: 'update-rule'; rule: Rule }
  | { action: 'delete-rule'; ruleId: string }
  | { action: 'toggle-rule'; ruleId: string; enabled: boolean }
  | { action: 'reset-today' }
  | { action: 'reset-all' }
  | { action: 'snooze'; ruleId: string }
  | { action: 'continue'; ruleId: string }
  | { action: 'leave-site'; ruleId: string }
  | { action: 'remove-unused-permissions' };
