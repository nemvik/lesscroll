import { parseRules, parseRuntime } from '../core/runtime';
import type { StoredState } from './service';

export interface LocalStorageArea {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(value: Record<string, unknown>): Promise<void>;
}

export function createStoragePort(area: LocalStorageArea) {
  return {
    async load(now: number): Promise<StoredState> {
      const stored = await area.get(['rules', 'runtime']);
      return {
        rules: parseRules(stored.rules),
        runtime: parseRuntime(stored.runtime, now),
      };
    },
    async save(value: StoredState): Promise<void> {
      await area.set({ rules: value.rules, runtime: value.runtime });
    },
  };
}
