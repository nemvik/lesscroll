import { describe, expect, it } from 'vitest';
import { createContextReader } from './context';
import { createStoragePort } from './storage';

describe('storage adapter', () => {
  it('loads rules and runtime with one local-storage read', async () => {
    const calls: unknown[] = [];
    const storage = createStoragePort({
      get: async (keys) => {
        calls.push(keys);
        return {
          rules: [{
            id: 'youtube',
            domain: 'youtube.com',
            includeSubdomains: true,
            enabled: true,
            sessionResetAfterMinutes: 5,
            snoozeMinutes: 10,
          }],
          runtime: { dailyMsByRule: { youtube: 100 } },
        };
      },
      set: async () => undefined,
    });

    const result = await storage.load(new Date(2026, 6, 27).getTime());
    expect(calls).toEqual([['rules', 'runtime']]);
    expect(result.rules[0]?.domain).toBe('youtube.com');
    expect(result.runtime.dailyMsByRule.youtube).toBe(100);
  });

  it('saves rules and runtime in one combined write', async () => {
    const writes: unknown[] = [];
    const storage = createStoragePort({
      get: async () => ({}),
      set: async (value) => { writes.push(value); },
    });
    const value = await storage.load(new Date(2026, 6, 27).getTime());
    await storage.save(value);
    expect(writes).toEqual([{ rules: [], runtime: value.runtime }]);
  });
});

describe('active context adapter', () => {
  it('does not query tabs when the browser window is unfocused', async () => {
    let queries = 0;
    const read = createContextReader({
      getLastFocusedWindow: async () => ({ id: 2, focused: false }),
      queryActiveTab: async () => { queries += 1; return []; },
    });
    expect(await read()).toEqual({ focused: false });
    expect(queries).toBe(0);
  });

  it('returns only the focused active tab context', async () => {
    const read = createContextReader({
      getLastFocusedWindow: async () => ({ id: 2, focused: true }),
      queryActiveTab: async (windowId) => {
        expect(windowId).toBe(2);
        return [{ id: 7, url: 'https://youtube.com/watch' }];
      },
    });
    expect(await read()).toEqual({
      focused: true,
      tabId: 7,
      url: 'https://youtube.com/watch',
    });
  });

  it('returns a focused context without URL when host access is unavailable', async () => {
    const read = createContextReader({
      getLastFocusedWindow: async () => ({ id: 2, focused: true }),
      queryActiveTab: async () => [{ id: 7 }],
    });
    expect(await read()).toEqual({ focused: true, tabId: 7 });
  });
});
