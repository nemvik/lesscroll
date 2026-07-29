export interface OverlayDomPayload {
  ruleId: string;
  title: string;
  message: string;
  sessionLabel: string;
  sessionValue: string;
  todayLabel: string;
  todayValue: string;
  leaveLabel: string;
  snoozeLabel: string;
  continueLabel: string;
}

interface OverlayMountOptions {
  shadowMode?: ShadowRootMode;
  allowUntrustedEvents?: boolean;
}

export function mountLesscrollOverlay(
  payload: OverlayDomPayload,
  options: OverlayMountOptions = {},
): void {
  const hostId = 'lesscroll-overlay-host';
  const ownershipMarker = Symbol.for('lesscroll.overlay.owned-host');
  const existing = document.getElementById(hostId) as (HTMLElement & {
    [key: symbol]: unknown;
  }) | null;
  if (existing?.[ownershipMarker] === true) {
    return;
  }
  existing?.remove();

  const host = document.createElement('div');
  Object.defineProperty(host, ownershipMarker, { value: true });
  host.id = hostId;
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.zIndex = '2147483647';
  host.style.display = 'block';
  host.style.pointerEvents = 'auto';

  const shadow = host.attachShadow({ mode: options.shadowMode ?? 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    .backdrop {
      position: fixed; inset: 0; display: grid; place-items: center; padding: 24px;
      background: rgba(21, 32, 29, .78); backdrop-filter: blur(8px);
      font-family: ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif;
      color: #20302b;
    }
    .dialog {
      width: min(520px, 100%); border: 1px solid rgba(46, 92, 79, .18);
      border-radius: 28px; padding: 34px; background: #f5f0e7;
      box-shadow: 0 28px 90px rgba(4, 20, 15, .34);
    }
    .mark { width: 42px; height: 42px; border-radius: 50%; margin-bottom: 30px;
      background: conic-gradient(#3f816f 0 50%, transparent 50% 100%);
      border: 2px solid #3f816f; transform: rotate(-25deg); }
    h1 { margin: 0; font-size: clamp(34px, 7vw, 52px); line-height: 1; letter-spacing: -.045em; }
    .message { margin: 16px 0 28px; color: #53665f; font-size: 17px; line-height: 1.55; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 28px; }
    .stat { border-radius: 16px; padding: 15px 16px; background: #e9e5dc; }
    .label { display: block; margin-bottom: 5px; color: #66766f; font-size: 12px; font-weight: 700;
      letter-spacing: .06em; text-transform: uppercase; }
    .value { font-size: 20px; font-weight: 750; }
    .actions { display: grid; gap: 10px; }
    button { width: 100%; min-height: 48px; border: 1px solid #b9c3bd; border-radius: 14px;
      padding: 11px 16px; background: transparent; color: #20302b; font: inherit;
      font-size: 15px; font-weight: 750; cursor: pointer; }
    button:hover { background: #ebe7de; }
    button:focus-visible { outline: 3px solid #d18f5a; outline-offset: 3px; }
    button.primary { border-color: #20302b; background: #20302b; color: #fffaf1; }
    button.primary:hover { background: #30453e; }
    button:disabled { cursor: wait; opacity: .62; }
    @media (max-width: 480px) { .dialog { padding: 25px; border-radius: 22px; } .stats { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: no-preference) {
      .dialog { animation: arrive .24s ease-out both; }
      @keyframes arrive { from { opacity: 0; transform: translateY(12px) scale(.985); } }
    }
  `;

  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  const dialog = document.createElement('section');
  dialog.className = 'dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'lesscroll-overlay-title');

  const mark = document.createElement('div');
  mark.className = 'mark';
  mark.setAttribute('aria-hidden', 'true');
  const heading = document.createElement('h1');
  heading.id = 'lesscroll-overlay-title';
  heading.tabIndex = -1;
  heading.textContent = payload.title;
  const message = document.createElement('p');
  message.className = 'message';
  message.textContent = payload.message;

  const stats = document.createElement('div');
  stats.className = 'stats';
  const makeStat = (labelText: string, valueText: string): HTMLElement => {
    const stat = document.createElement('div');
    stat.className = 'stat';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = labelText;
    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = valueText;
    stat.append(label, value);
    return stat;
  };
  stats.append(
    makeStat(payload.sessionLabel, payload.sessionValue),
    makeStat(payload.todayLabel, payload.todayValue),
  );

  const actions = document.createElement('div');
  actions.className = 'actions';
  const makeButton = (label: string, primary = false): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (primary) button.className = 'primary';
    return button;
  };
  const leave = makeButton(payload.leaveLabel, true);
  const snooze = makeButton(payload.snoozeLabel);
  const continueButton = makeButton(payload.continueLabel);
  const buttons = [leave, snooze, continueButton];

  const sendAction = async (action: 'leave-site' | 'snooze' | 'continue'): Promise<void> => {
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const extension = globalThis as unknown as {
        chrome: { runtime: { sendMessage(message: unknown): Promise<{ ok?: boolean }> } };
      };
      const response = await extension.chrome.runtime.sendMessage({
        action,
        ruleId: payload.ruleId,
      });
      if (response?.ok && action !== 'leave-site') {
        host.remove();
        return;
      }
    } catch {
      // Keep the decision visible when the service worker is unavailable.
    }
    buttons.forEach((button) => { button.disabled = false; });
  };

  const activate = (event: MouseEvent, action: 'leave-site' | 'snooze' | 'continue'): void => {
    if (!event.isTrusted && !options.allowUntrustedEvents) return;
    void sendAction(action);
  };
  leave.addEventListener('click', (event) => { activate(event, 'leave-site'); });
  snooze.addEventListener('click', (event) => { activate(event, 'snooze'); });
  continueButton.addEventListener('click', (event) => { activate(event, 'continue'); });
  actions.append(...buttons);
  dialog.append(mark, heading, message, stats, actions);
  backdrop.append(dialog);
  shadow.append(style, backdrop);

  const handleKeydown = (rawEvent: Event): void => {
    const event = rawEvent as KeyboardEvent;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== 'Tab') return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (
      event.shiftKey
      && (shadow.activeElement === heading || shadow.activeElement === first)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && shadow.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  host.addEventListener('keydown', handleKeydown, true);
  shadow.addEventListener('keydown', handleKeydown);
  document.documentElement.append(host);
  heading.focus();
}
