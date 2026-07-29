import type { ActiveContext } from '../core/types';

interface WindowInfo {
  id?: number;
  focused: boolean;
}

interface TabInfo {
  id?: number;
  url?: string;
}

export interface ContextBrowserPort {
  getLastFocusedWindow(): Promise<WindowInfo>;
  queryActiveTab(windowId: number): Promise<TabInfo[]>;
}

export function createContextReader(port: ContextBrowserPort) {
  return async (): Promise<ActiveContext> => {
    const window = await port.getLastFocusedWindow();
    if (!window.focused || !Number.isInteger(window.id) || window.id === undefined) {
      return { focused: false };
    }

    const [tab] = await port.queryActiveTab(window.id);
    if (!tab || !Number.isInteger(tab.id) || tab.id === undefined) {
      return { focused: true };
    }

    return {
      focused: true,
      tabId: tab.id,
      ...(typeof tab.url === 'string' ? { url: tab.url } : {}),
    };
  };
}
