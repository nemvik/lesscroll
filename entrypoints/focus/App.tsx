import { t } from '../../src/shared/i18n';

export function FocusApp() {
  return (
    <main className="focus-page">
      <div className="orb" aria-hidden="true"><span /></div>
      <p className="brand">{t('extensionName')}</p>
      <section>
        <h1>{t('focusTitle')}</h1>
        <p>{t('focusMessage')}</p>
        <button type="button" onClick={() => window.close()}>{t('focusClose')}</button>
        <small>{t('focusCloseHint')}</small>
      </section>
    </main>
  );
}
