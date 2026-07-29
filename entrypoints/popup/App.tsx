import { useCallback, useEffect, useMemo, useState } from 'react';
import { hostnameFromUrl, permissionOrigins } from '../../src/core/domain';
import { DEFAULT_RULE_VALUES } from '../../src/core/runtime';
import type { RuntimeMessage, RuntimeSnapshot } from '../../src/core/types';
import { requestRulePermission, sendMessage, type ApiResponse } from '../../src/shared/api';
import { t } from '../../src/shared/i18n';
import { configuredRuleForHost, progressPercent, roundedMinutes } from '../../src/shared/ui';

export interface PopupDependencies {
  send(message: RuntimeMessage): Promise<ApiResponse>;
  requestPermission(domain: string, includeSubdomains: boolean): Promise<boolean>;
  openOptions(): Promise<void>;
}

const defaultDependencies: PopupDependencies = {
  send: sendMessage,
  requestPermission: requestRulePermission,
  openOptions: () => browser.runtime.openOptionsPage(),
};

function Progress({ used, limit }: { used: number; limit: number | undefined }) {
  if (limit === undefined) return null;
  const usedMinutes = roundedMinutes(used);
  const label = t('progressLabel', [String(usedMinutes), String(limit)]);
  return (
    <div className="progress" aria-label={label} role="progressbar" aria-valuemin={0}
      aria-valuemax={limit} aria-valuenow={Math.min(limit, usedMinutes)}>
      <span style={{ width: `${progressPercent(usedMinutes, limit)}%` }} />
    </div>
  );
}

export function PopupApp({ dependencies = defaultDependencies }: {
  dependencies?: PopupDependencies;
}) {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await dependencies.send({ action: 'get-status' });
    if (response.ok && response.snapshot) setSnapshot(response.snapshot);
    else setError(t('errorGeneric'));
  }, [dependencies]);

  useEffect(() => { void refresh().catch(() => setError(t('errorGeneric'))); }, [refresh]);

  const hostname = snapshot?.context.url ? hostnameFromUrl(snapshot.context.url) : undefined;
  const currentRule = useMemo(() => (
    hostname && snapshot ? configuredRuleForHost(hostname, snapshot.rules) : undefined
  ), [hostname, snapshot]);
  const currentUsage = currentRule && snapshot
    ? snapshot.usageByRule[currentRule.id]
    : undefined;

  const trackCurrent = async (): Promise<void> => {
    if (!hostname) return;
    setBusy(true);
    setError('');
    try {
      const granted = await dependencies.requestPermission(hostname, true);
      if (!granted) {
        setError(t('popupPermissionDenied'));
        return;
      }
      const response = await dependencies.send({
        action: 'add-rule',
        rule: { domain: hostname, ...DEFAULT_RULE_VALUES },
      });
      if (!response.ok) {
        setError(response.error === 'duplicate-domain' ? t('duplicateDomain') : t('errorGeneric'));
        return;
      }
      await refresh();
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean): Promise<void> => {
    const selected = snapshot?.rules.find((rule) => rule.id === ruleId);
    if (!selected) return;
    setBusy(true);
    try {
      if (enabled) {
        const granted = await dependencies.requestPermission(
          selected.domain,
          selected.includeSubdomains,
        );
        if (!granted) {
          setError(t('popupPermissionDenied'));
          return;
        }
      }
      const response = await dependencies.send({ action: 'toggle-rule', ruleId, enabled });
      if (!response.ok) {
        setError(t('errorGeneric'));
        return;
      }
      await refresh();
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) {
    return <main className="popup"><p className="loading">{t('loading')}</p></main>;
  }

  return (
    <main className="popup">
      <header className="brand"><span className="mark" aria-hidden="true" />
        <strong>{t('extensionName')}</strong></header>
      <section className="current" aria-labelledby="current-title">
        <p className="eyebrow" id="current-title">{t('popupCurrentSite')}</p>
        <div className="current-heading">
          <h1>{hostname ?? t('popupNotWebPage')}</h1>
          {hostname && <span className={`status ${currentRule ? 'on' : ''}`}>
            {currentRule ? t('popupTracked') : t('popupNotTracked')}
          </span>}
        </div>
        {currentRule && currentUsage ? (
          <div className="usage-grid">
            <div><span>{t('popupSession')}</span><strong>
              {t('minutesShort', [String(roundedMinutes(currentUsage.sessionMs))])}
            </strong><Progress used={currentUsage.sessionMs}
              limit={currentRule.continuousLimitMinutes} /></div>
            <div><span>{t('popupToday')}</span><strong>
              {t('minutesShort', [String(roundedMinutes(currentUsage.dailyMs))])}
            </strong><Progress used={currentUsage.dailyMs} limit={currentRule.dailyLimitMinutes} /></div>
          </div>
        ) : hostname ? (
          <div className="track-action">
            <p className="tracking-disclosure">{t('trackingDisclosure')}</p>
            <button className="primary" type="button" disabled={busy} onClick={() => { void trackCurrent(); }}>
              {t('popupTrackSite')}
            </button>
          </div>
        ) : null}
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="rules" aria-labelledby="rules-title">
        <div className="section-heading"><h2 id="rules-title">{t('popupTrackedSites')}</h2>
          <span>{snapshot.rules.length}</span></div>
        {snapshot.rules.length === 0 ? <p className="empty">{t('popupNoRules')}</p> : (
          <ul>{snapshot.rules.map((rule) => (
            <li key={rule.id}>
              <div><strong>{rule.domain}</strong><span>
                {t('minutesShort', [String(roundedMinutes(snapshot.usageByRule[rule.id]?.dailyMs ?? 0))])}
              </span></div>
              <button className={`switch ${rule.enabled ? 'enabled' : ''}`} type="button"
                disabled={busy} aria-pressed={rule.enabled}
                aria-label={t(rule.enabled ? 'disableRuleLabel' : 'enableRuleLabel', [rule.domain])}
                onClick={() => { void toggleRule(rule.id, !rule.enabled); }}><span /></button>
            </li>
          ))}</ul>
        )}
      </section>
      <button className="text-button" type="button" onClick={() => { void dependencies.openOptions(); }}>
        {t('popupOpenOptions')} <span aria-hidden="true">↗</span>
      </button>
    </main>
  );
}
