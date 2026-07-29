// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OptionsApp, type OptionsDependencies } from '../../entrypoints/options/App';

const trackedSnapshot = {
  context: { focused: false as const },
  rules: [{
    id: 'youtube',
    domain: 'youtube.com',
    includeSubdomains: true,
    enabled: true,
    continuousLimitMinutes: 20,
    dailyLimitMinutes: 60,
    sessionResetAfterMinutes: 5,
    snoozeMinutes: 10,
  }],
  usageByRule: { youtube: { sessionMs: 0, dailyMs: 0 } },
};

describe('OptionsApp', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(globalThis, 'browser', {
      configurable: true,
      value: { i18n: { getMessage: (key: string) => key } },
    });
    document.body.textContent = '';
  });

  it('asks for host permission before adding a valid rule', async () => {
    const order: string[] = [];
    const dependencies: OptionsDependencies = {
      send: vi.fn(async (message) => {
        if ((message as { action: string }).action === 'get-status') {
          return { ok: true, snapshot: { context: { focused: false }, rules: [], usageByRule: {} } };
        }
        order.push('add');
        return { ok: true };
      }),
      requestPermission: vi.fn(async () => { order.push('permission'); return true; }),
      confirm: vi.fn(() => true),
    };
    const root = createRoot(document.body.appendChild(document.createElement('div')));
    await act(async () => {
      root.render(<OptionsApp dependencies={dependencies} />);
      await Promise.resolve(); await Promise.resolve();
    });
    const add = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'addSite')!;
    await act(async () => { add.click(); });
    const domain = document.querySelector<HTMLInputElement>('input[aria-label="domainLabel"]')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(domain, 'youtube.com');
      domain.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const save = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'saveRule')!;
    expect(document.body.textContent).toContain('trackingDisclosure');
    await act(async () => {
      save.click();
      await Promise.resolve(); await Promise.resolve();
    });
    expect(order).toEqual(['permission', 'add']);
  });

  it('shows an error when a rule action is rejected', async () => {
    const dependencies: OptionsDependencies = {
      send: vi.fn(async (message) => (
        message.action === 'get-status'
          ? { ok: true, snapshot: trackedSnapshot }
          : { ok: false, error: 'rule-not-found' as const }
      )),
      requestPermission: vi.fn(async () => true),
      confirm: vi.fn(() => true),
    };
    const root = createRoot(document.body.appendChild(document.createElement('div')));
    await act(async () => {
      root.render(<OptionsApp dependencies={dependencies} />);
      await Promise.resolve(); await Promise.resolve();
    });

    const toggle = document.querySelector<HTMLButtonElement>('[aria-label="disableRuleLabel"]')!;
    await act(async () => {
      toggle.click();
      await Promise.resolve(); await Promise.resolve();
    });

    expect(document.querySelector('[role="alert"]')?.textContent).toBe('errorGeneric');
  });

  it('explicitly toggles an optional limit without changing the storage model', async () => {
    const dependencies: OptionsDependencies = {
      send: vi.fn(async () => ({
        ok: true,
        snapshot: { context: { focused: false }, rules: [], usageByRule: {} },
      })),
      requestPermission: vi.fn(async () => true),
      confirm: vi.fn(() => true),
    };
    const root = createRoot(document.body.appendChild(document.createElement('div')));
    await act(async () => {
      root.render(<OptionsApp dependencies={dependencies} />);
      await Promise.resolve(); await Promise.resolve();
    });
    const add = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'addSite')!;
    await act(async () => { add.click(); });

    const toggle = document.querySelector<HTMLInputElement>(
      'input[type="checkbox"][aria-label="continuousLimitLabel"]',
    )!;
    const number = document.querySelector<HTMLInputElement>(
      'input[type="number"][aria-label="continuousLimitLabel"]',
    )!;
    expect(toggle.checked).toBe(true);
    expect(number.value).toBe('20');

    await act(async () => { toggle.click(); });
    expect(number.disabled).toBe(true);
    expect(number.value).toBe('');

    await act(async () => { toggle.click(); });
    expect(number.disabled).toBe(false);
    expect(number.value).toBe('20');
  });
});
