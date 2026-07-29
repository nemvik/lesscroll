export function t(key: string, substitutions?: string[]): string {
  const getMessage = browser.i18n.getMessage as unknown as (
    messageName: string,
    substitutions?: string[],
  ) => string;
  return getMessage(key, substitutions);
}
