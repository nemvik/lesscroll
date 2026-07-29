// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountLesscrollOverlay, type OverlayDomPayload } from './overlay';

const payload: OverlayDomPayload = {
  ruleId: 'youtube',
  title: 'Still here?',
  message: "You've spent 32 minutes on YouTube",
  sessionLabel: 'This session',
  sessionValue: '12 min',
  todayLabel: 'Today',
  todayValue: '32 min',
  leaveLabel: 'Leave site',
  snoozeLabel: 'Snooze (10 min)',
  continueLabel: 'Continue intentionally',
};

function runtimeSendMessage() {
  return (globalThis as unknown as {
    chrome: { runtime: { sendMessage: ReturnType<typeof vi.fn> } };
  }).chrome.runtime.sendMessage;
}

function host(): HTMLElement {
  const result = document.getElementById('lesscroll-overlay-host');
  if (!(result instanceof HTMLElement)) throw new Error('overlay host missing');
  return result;
}

function mount(): void {
  mountLesscrollOverlay(payload, {
    shadowMode: 'open',
    allowUntrustedEvents: true,
  });
}

describe('mountLesscrollOverlay', () => {
  beforeEach(() => {
    document.body.textContent = '';
    document.getElementById('lesscroll-overlay-host')?.remove();
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: { runtime: { sendMessage: vi.fn().mockResolvedValue({ ok: true }) } },
    });
  });

  it('mounts one fullscreen accessible Shadow DOM dialog', () => {
    mount();
    mount();
    expect(document.querySelectorAll('#lesscroll-overlay-host')).toHaveLength(1);
    expect(host().style.zIndex).toBe('2147483647');
    const shadow = host().shadowRoot;
    expect(shadow).not.toBeNull();
    expect(shadow?.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(shadow?.textContent).toContain('Still here?');
    expect(shadow?.querySelectorAll('button')).toHaveLength(3);
  });

  it('cannot be dismissed with Escape or backdrop interaction', () => {
    mount();
    host().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    host().click();
    expect(document.getElementById('lesscroll-overlay-host')).not.toBeNull();
  });

  it('traps keyboard focus between the three actions', () => {
    mount();
    const heading = host().shadowRoot!.querySelector('h1') as HTMLHeadingElement;
    const buttons = [...host().shadowRoot!.querySelectorAll('button')];
    const first = buttons[0] as HTMLButtonElement;
    const last = buttons[2] as HTMLButtonElement;
    expect(host().shadowRoot!.activeElement).toBe(heading);
    host().shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', shiftKey: true, bubbles: true, cancelable: true,
    }));
    expect(host().shadowRoot!.activeElement).toBe(last);
    last.focus();
    host().shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true, cancelable: true,
    }));
    expect(host().shadowRoot!.activeElement).toBe(first);
    first.focus();
    host().shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', shiftKey: true, bubbles: true, cancelable: true,
    }));
    expect(host().shadowRoot!.activeElement).toBe(last);
  });

  it.each([
    ['leave-site', 0, false],
    ['snooze', 1, true],
    ['continue', 2, true],
  ] as const)('sends %s and only removes after a successful resolving action', async (
    action,
    buttonIndex,
    removes,
  ) => {
    mount();
    const button = host().shadowRoot!.querySelectorAll('button')[buttonIndex] as HTMLButtonElement;
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(runtimeSendMessage()).toHaveBeenCalledWith({ action, ruleId: 'youtube' });
    expect(document.getElementById('lesscroll-overlay-host') === null).toBe(removes);
  });

  it('keeps the interrupt visible when an action fails', async () => {
    runtimeSendMessage().mockRejectedValueOnce(new Error('worker unavailable'));
    mount();
    const snooze = host().shadowRoot!.querySelectorAll('button')[1] as HTMLButtonElement;
    snooze.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.getElementById('lesscroll-overlay-host')).not.toBeNull();
  });

  it('replaces a colliding page host and defaults to a closed shadow root', () => {
    const collision = document.createElement('div');
    collision.id = 'lesscroll-overlay-host';
    document.body.append(collision);

    mountLesscrollOverlay(payload);

    expect(host()).not.toBe(collision);
    expect(host().shadowRoot).toBeNull();
  });

  it('ignores synthetic page activation by default', async () => {
    mountLesscrollOverlay(payload, { shadowMode: 'open' });
    const snooze = host().shadowRoot!.querySelectorAll('button')[1] as HTMLButtonElement;
    snooze.click();
    await Promise.resolve();

    expect(runtimeSendMessage()).not.toHaveBeenCalled();
    expect(document.getElementById('lesscroll-overlay-host')).not.toBeNull();
  });

  it('does not use unsafe HTML or dynamic code execution', () => {
    const source = mountLesscrollOverlay.toString();
    expect(source).not.toContain('innerHTML');
    expect(source).not.toContain('eval(');
  });
});
