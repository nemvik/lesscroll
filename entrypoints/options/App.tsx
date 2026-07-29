import { useCallback, useEffect, useState } from 'react';
import type { RuntimeMessage, RuntimeSnapshot } from '../../src/core/types';
import { requestRulePermission, sendMessage, type ApiResponse } from '../../src/shared/api';
import { t } from '../../src/shared/i18n';
import { emptyRuleDraft, parseRuleDraft, ruleDraft, type RuleDraft } from '../../src/shared/rule-form';
import { roundedMinutes } from '../../src/shared/ui';

export interface OptionsDependencies {
  send(message: RuntimeMessage): Promise<ApiResponse>;
  requestPermission(domain: string, includeSubdomains: boolean): Promise<boolean>;
  confirm(message: string): boolean;
}

const defaultDependencies: OptionsDependencies = {
  send: sendMessage,
  requestPermission: requestRulePermission,
  confirm: (message) => window.confirm(message),
};

export function OptionsApp({ dependencies = defaultDependencies }: {
  dependencies?: OptionsDependencies;
}) {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>();
  const [draft, setDraft] = useState<RuleDraft>();
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await dependencies.send({ action: 'get-status' });
    if (response.ok && response.snapshot) setSnapshot(response.snapshot);
    else setError(t('errorGeneric'));
  }, [dependencies]);
  useEffect(() => { void refresh().catch(() => setError(t('errorGeneric'))); }, [refresh]);

  const updateDraft = <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]): void => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const toggleLimit = (
    key: 'continuousLimitMinutes' | 'dailyLimitMinutes',
    enabled: boolean,
    defaultValue: string,
  ): void => {
    updateDraft(key, enabled ? defaultValue : '');
  };

  const save = async (): Promise<void> => {
    if (!draft) return;
    const parsed = parseRuleDraft(draft);
    if (!parsed.ok) {
      setError(t(parsed.error === 'invalid-domain' ? 'invalidDomain' : 'invalidNumber'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const granted = await dependencies.requestPermission(
        parsed.value.domain,
        parsed.value.includeSubdomains,
      );
      if (!granted) {
        setError(t('popupPermissionDenied'));
        return;
      }
      const message: RuntimeMessage = editingId
        ? { action: 'update-rule', rule: { id: editingId, ...parsed.value } }
        : { action: 'add-rule', rule: parsed.value };
      const response = await dependencies.send(message);
      if (!response.ok) {
        setError(response.error === 'duplicate-domain' ? t('duplicateDomain') : t('errorGeneric'));
        return;
      }
      setDraft(undefined);
      setEditingId(undefined);
      await refresh();
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (ruleId: string, enabled: boolean): Promise<void> => {
    const selected = snapshot?.rules.find((rule) => rule.id === ruleId);
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      if (
        enabled
        && !await dependencies.requestPermission(selected.domain, selected.includeSubdomains)
      ) {
        setError(t('popupPermissionDenied'));
        return;
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

  const deleteRule = async (ruleId: string, domain: string): Promise<void> => {
    if (!dependencies.confirm(t('confirmDelete', [domain]))) return;
    setBusy(true);
    setError('');
    try {
      const response = await dependencies.send({ action: 'delete-rule', ruleId });
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

  const reset = async (all: boolean): Promise<void> => {
    if (!dependencies.confirm(t(all ? 'confirmResetAll' : 'confirmResetToday'))) return;
    setBusy(true);
    setError('');
    try {
      const response = await dependencies.send({ action: all ? 'reset-all' : 'reset-today' });
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

  if (!snapshot) return <main className="options"><p>{t('loading')}</p></main>;

  return (
    <main className="options">
      <header className="hero">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />
          <strong>{t('extensionName')}</strong></div>
        <p className="kicker">{t('rulesTitle')}</p>
        <h1>{t('optionsTitle')}</h1>
        <p className="intro">{t('optionsIntro')}</p>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="rule-section" aria-labelledby="rules-heading">
        <div className="section-head"><div><p className="kicker">{t('rulesTitle')}</p>
          <h2 id="rules-heading">{snapshot.rules.length}</h2></div>
          <button className="primary compact" type="button" disabled={busy} onClick={() => {
            setEditingId(undefined); setDraft(emptyRuleDraft()); setError('');
          }}>{t('addSite')}</button></div>
        {snapshot.rules.length === 0 ? <p className="empty">{t('popupNoRules')}</p> : (
          <div className="rule-grid">{snapshot.rules.map((rule) => (
            <article className="rule-card" key={rule.id}>
              <div className="rule-top"><div><h3>{rule.domain}</h3><p>
                {t('popupToday')}: {t('minutesShort', [String(roundedMinutes(
                  snapshot.usageByRule[rule.id]?.dailyMs ?? 0,
                ))])}
              </p></div>
              <button className={`switch ${rule.enabled ? 'enabled' : ''}`} type="button"
                disabled={busy}
                aria-pressed={rule.enabled}
                aria-label={t(rule.enabled ? 'disableRuleLabel' : 'enableRuleLabel', [rule.domain])}
                onClick={() => { void toggle(rule.id, !rule.enabled); }}><span /></button></div>
              <dl><div><dt>{t('continuousLimitLabel')}</dt><dd>
                {rule.continuousLimitMinutes ?? '—'}</dd></div>
                <div><dt>{t('dailyLimitLabel')}</dt><dd>{rule.dailyLimitMinutes ?? '—'}</dd></div></dl>
              <div className="card-actions">
                <button type="button" disabled={busy} onClick={() => {
                  setEditingId(rule.id); setDraft(ruleDraft(rule)); setError('');
                }}>{t('edit')}</button>
                <button className="danger-link" type="button" disabled={busy}
                  onClick={() => { void deleteRule(rule.id, rule.domain); }}>{t('delete')}</button>
              </div>
            </article>
          ))}</div>
        )}
      </section>

      {draft && <div className="modal-backdrop" role="presentation">
        <form className="rule-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div><p className="kicker">{editingId ? t('editRule', [draft.domain]) : t('addSite')}</p>
            <h2>{editingId ? t('edit') : t('addSite')}</h2></div>
          <label>{t('domainLabel')}<input autoFocus aria-label={t('domainLabel')} value={draft.domain}
            placeholder="youtube.com" onChange={(event) => updateDraft('domain', event.target.value)} /></label>
          <div className="check-row"><label><input type="checkbox" checked={draft.includeSubdomains}
            onChange={(event) => updateDraft('includeSubdomains', event.target.checked)} />
            {t('includeSubdomains')}</label><label><input type="checkbox" checked={draft.enabled}
              onChange={(event) => updateDraft('enabled', event.target.checked)} />{t('enabledLabel')}</label></div>
          <div className="field-grid">
            <div className="limit-field">
              <label className="limit-toggle"><input type="checkbox"
                aria-label={t('continuousLimitLabel')}
                checked={draft.continuousLimitMinutes !== ''}
                onChange={(event) => toggleLimit(
                  'continuousLimitMinutes', event.target.checked, '20',
                )} />{t('continuousLimitLabel')}</label>
              <input type="number" min="0.1" step="0.1"
                aria-label={t('continuousLimitLabel')}
                disabled={draft.continuousLimitMinutes === ''}
                value={draft.continuousLimitMinutes}
                onChange={(event) => updateDraft('continuousLimitMinutes', event.target.value)} />
            </div>
            <div className="limit-field">
              <label className="limit-toggle"><input type="checkbox"
                aria-label={t('dailyLimitLabel')}
                checked={draft.dailyLimitMinutes !== ''}
                onChange={(event) => toggleLimit(
                  'dailyLimitMinutes', event.target.checked, '60',
                )} />{t('dailyLimitLabel')}</label>
              <input type="number" min="0.1" step="0.1"
                aria-label={t('dailyLimitLabel')}
                disabled={draft.dailyLimitMinutes === ''}
                value={draft.dailyLimitMinutes}
                onChange={(event) => updateDraft('dailyLimitMinutes', event.target.value)} />
            </div>
          </div>
          <p className="hint">{t('optionalHint')}</p>
          <div className="field-grid">
            <label>{t('sessionResetLabel')}<input type="number" min="0.1" step="0.1"
              value={draft.sessionResetAfterMinutes}
              onChange={(event) => updateDraft('sessionResetAfterMinutes', event.target.value)} /></label>
            <label>{t('snoozeLabel')}<input type="number" min="0.1" step="0.1"
              value={draft.snoozeMinutes}
              onChange={(event) => updateDraft('snoozeMinutes', event.target.value)} /></label>
          </div>
          <p className="tracking-disclosure">{t('trackingDisclosure')}</p>
          <div className="form-actions"><button type="button" onClick={() => {
            setDraft(undefined); setEditingId(undefined);
          }}>{t('cancel')}</button><button className="primary" disabled={busy} type="submit">
            {t('saveRule')}</button></div>
        </form>
      </div>}

      <section className="data-section"><div><h2>{t('resetToday')}</h2>
        <button type="button" disabled={busy}
          onClick={() => { void reset(false); }}>{t('resetToday')}</button></div>
        <div className="danger-zone"><h2>{t('resetAll')}</h2>
          <button type="button" disabled={busy}
            onClick={() => { void reset(true); }}>{t('resetAll')}</button></div></section>
    </main>
  );
}
