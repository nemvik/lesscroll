import { permissionOrigins } from '../core/domain';
import type { RuntimeMessage } from '../core/types';

export interface ApiResponse {
  ok: boolean;
  error?: 'invalid-message' | 'rule-not-found' | 'duplicate-domain';
  snapshot?: import('../core/types').RuntimeSnapshot;
  rule?: import('../core/types').Rule;
}

export async function sendMessage(message: RuntimeMessage): Promise<ApiResponse> {
  return browser.runtime.sendMessage(message) as Promise<ApiResponse>;
}

export async function requestRulePermission(
  domain: string,
  includeSubdomains: boolean,
): Promise<boolean> {
  return browser.permissions.request({
    origins: permissionOrigins(domain, includeSubdomains),
  });
}
