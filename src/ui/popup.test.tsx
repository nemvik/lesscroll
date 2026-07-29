// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupApp, type PopupDependencies } from '../../entrypoints/popup/App';

describe('PopupApp', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(globalThis, 'browser', {
      configurable: true,
      value: { i18n: { getMessage: (key: string) => key } },
    });
    document.body.textContent = '';
  });

  it('requests scoped permission before quick-adding the current domain', async () => {
    const messages: unknown[] = [];
    const order: string[] = [];
    const dependencies: PopupDependencies = {
      send: vi.fn(async (message) => {
        messages.push(message);
        if ((message as { action: string }).action === 'get-status') {
          return {
            ok: true,
            snapshot: {
              context: { focused: true, tabId: 7, url: 'https://www.youtube.com/watch' },
              rules: [],
              usageByRule: {},
            },
          };
        }
        order.push('add');
        return { ok: true };
      }),
      requestPermission: vi.fn(async () => { order.push('permission'); return true; }),
      openOptions: vi.fn(async () => undefined),
    };
    const root = createRoot(document.body.appendChild(document.createElement('div')));
    await act(async () => {
      root.render(<PopupApp dependencies={dependencies} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    const track = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'popupTrackSite');
    expect(track).toBeDefined();
    expect(document.body.textContent).toContain('trackingDisclosure');
    await act(async () => {
      track!.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(order).toEqual(['permission', 'add']);
    expect(messages).toContainEqual({
      action: 'add-rule',
      rule: {
        domain: 'youtube.com',
        includeSubdomains: true,
        enabled: true,
        continuousLimitMinutes: 20,
        dailyLimitMinutes: 60,
        sessionResetAfterMinutes: 5,
        snoozeMinutes: 10,
      },
    });
  });
});
