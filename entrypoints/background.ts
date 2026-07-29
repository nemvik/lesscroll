import { createContextReader } from '../src/background/context';
import { buildOverlayDomPayload } from '../src/background/overlay-payload';
import { mountLesscrollOverlay } from '../src/background/overlay';
import { createBackgroundService } from '../src/background/service';
import { createStoragePort } from '../src/background/storage';
import { permissionOrigins } from '../src/core/domain';
import type { ActiveContext, Rule } from '../src/core/types';

const alarmName = 'lesscroll-next';

export default defineBackground(() => {
  const storagePort = createStoragePort({
    get: async (keys) => browser.storage.local.get(keys),
    set: async (value) => browser.storage.local.set(value),
  });
  const readContext = createContextReader({
    getLastFocusedWindow: async () => {
      const window = await browser.windows.getLastFocused();
      return {
        focused: window.focused ?? false,
        ...(window.id === undefined ? {} : { id: window.id }),
      };
    },
    queryActiveTab: async (windowId) => {
      const tabs = await browser.tabs.query({ active: true, windowId });
      return tabs.map((tab) => ({
        ...(tab.id === undefined ? {} : { id: tab.id }),
        ...(typeof tab.url === 'string' ? { url: tab.url } : {}),
      }));
    },
  });

  const getContext = async (): Promise<ActiveContext> => {
    try {
      return await readContext();
    } catch {
      return { focused: false };
    }
  };

  const removeUnusedPermissions = async (rules: readonly Rule[]): Promise<void> => {
    const desired = new Set(rules.flatMap((rule) => (
      permissionOrigins(rule.domain, rule.includeSubdomains)
    )));
    const granted = await browser.permissions.getAll();
    const unused = (granted.origins ?? []).filter((origin) => {
      if (desired.has(origin)) return false;
      const broadOptional = origin === 'http://*/*' || origin === 'https://*/*';
      return !broadOptional || desired.size === 0;
    });
    if (unused.length > 0) {
      await browser.permissions.remove({ origins: unused });
    }
  };

  const service = createBackgroundService({
    now: Date.now,
    load: storagePort.load,
    save: storagePort.save,
    getContext,
    setAlarm: async (when) => {
      await browser.alarms.clear(alarmName);
      await browser.alarms.create(alarmName, { when });
    },
    injectOverlay: async (tabId, payload) => {
      const getMessage = browser.i18n.getMessage as unknown as (
        key: string,
        substitutions?: string[],
      ) => string;
      const localized = buildOverlayDomPayload(payload, (key, substitutions) => (
        getMessage(key, substitutions)
      ));
      await browser.scripting.executeScript({
        target: { tabId },
        func: mountLesscrollOverlay,
        args: [localized],
      });
    },
    redirectToFocus: async (tabId) => {
      const getUrl = browser.runtime.getURL as unknown as (path: string) => string;
      await browser.tabs.update(tabId, { url: getUrl('focus.html') });
    },
    removeUnusedPermissions,
  });

  const reconcile = (reason: string, scheduledTime?: number): void => {
    void service.enqueueReconcile(reason, scheduledTime).catch(() => undefined);
  };

  browser.tabs.onActivated.addListener(() => { reconcile('tab-activated'); });
  browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo.status === 'complete' || changeInfo.url) reconcile('tab-updated');
  });
  browser.tabs.onRemoved.addListener(() => { reconcile('tab-removed'); });
  browser.windows.onFocusChanged.addListener(() => { reconcile('window-focus'); });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === alarmName) reconcile('alarm', alarm.scheduledTime);
  });
  browser.runtime.onStartup.addListener(() => {
    void service.enqueueStartup().catch(() => undefined);
  });
  browser.runtime.onInstalled.addListener(() => { reconcile('installed'); });
  browser.runtime.onMessage.addListener((message, sender) => (
    service.handleMessage(message, sender)
  ));
});
