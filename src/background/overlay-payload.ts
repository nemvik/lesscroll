import type { OverlayPayload } from '../core/types';
import type { OverlayDomPayload } from './overlay';

type GetMessage = (key: string, substitutions?: string[]) => string;

function roundedMinutes(milliseconds: number): string {
  return String(Math.max(0, Math.round(milliseconds / 60_000)));
}

export function buildOverlayDomPayload(
  payload: OverlayPayload,
  getMessage: GetMessage,
): OverlayDomPayload {
  const sessionMinutes = roundedMinutes(payload.usage.sessionMs);
  const dailyMinutes = roundedMinutes(payload.usage.dailyMs);
  return {
    ruleId: payload.ruleId,
    title: getMessage('overlayTitle'),
    message: getMessage('overlayMessage', [dailyMinutes, payload.domain]),
    sessionLabel: getMessage('overlaySessionLabel'),
    sessionValue: getMessage('minutesShort', [sessionMinutes]),
    todayLabel: getMessage('overlayTodayLabel'),
    todayValue: getMessage('minutesShort', [dailyMinutes]),
    leaveLabel: getMessage('overlayLeave'),
    snoozeLabel: getMessage('overlaySnooze', [String(payload.snoozeMinutes)]),
    continueLabel: getMessage('overlayContinue'),
  };
}
