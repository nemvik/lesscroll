# Lesscroll — Chrome Web Store listing

## Store listing (English, default)

**Name**

Lesscroll

**Summary**

Pause mindless scrolling with private, local timers and intentional reminders on sites you choose.

**Category**

Productivity

**Detailed description**

Lesscroll helps you pause mindless scrolling without blocking websites. It processes the active URL and focused time only for sites you explicitly choose, stores that information locally in `chrome.storage.local`, and never sends it to the developer or a third party.

Choose the sites where you want a gentle interruption, then set a continuous-session limit, a daily limit, or both. Lesscroll counts time only while the matching tab is active and the Chrome window is focused. When a limit is reached, a full-screen prompt asks you to make an intentional choice: leave the site, snooze the reminder, or continue intentionally.

Your browsing data stays on your device. Lesscroll stores configured domains, settings, timers, snoozes, and alert state only in `chrome.storage.local`. It has no account, backend, cloud sync, advertising, analytics, or telemetry.

Key features:

- Continuous-session and current-day limits
- Time measured only in the active tab and focused browser window
- Per-site snooze and intentional-continuation choices
- Per-domain permission requests only when you add or enable a site
- Local data reset controls
- English and Czech interface

Lesscroll is a behavioral interrupt, not a website blocker. The final choice always remains yours.

**Homepage URL**

`https://lesscroll.nemvik.chatgpt.site`

**Support URL**

`https://lesscroll.nemvik.chatgpt.site/#support`

**Privacy policy URL**

`https://lesscroll.nemvik.chatgpt.site/privacy`

**Support email**

`lesscroll@nemvik.com`

## Store listing (Czech)

**Název**

Lesscroll

**Krátký popis**

Omezte bezmyšlenkovité scrollování pomocí lokálních časovačů a vědomých připomenutí.

**Podrobný popis**

Lesscroll vám pomůže zastavit bezmyšlenkovité scrollování, aniž by weby blokoval. Aktivní URL a čas v popředí zpracovává pouze u webů, které výslovně vyberete, ukládá je lokálně do `chrome.storage.local` a nikdy je neposílá vývojáři ani třetí straně.

Vyberte weby, na kterých chcete jemné přerušení, a nastavte limit souvislé relace, denní limit nebo oba. Lesscroll počítá čas pouze tehdy, když je odpovídající karta aktivní a okno Chromu je v popředí. Po dosažení limitu se zobrazí celoobrazovková výzva, ve které můžete web opustit, připomenutí odložit nebo vědomě pokračovat.

Data o prohlížení zůstávají ve vašem zařízení. Lesscroll ukládá nastavené domény, pravidla, časy, odložení a stav upozornění pouze do `chrome.storage.local`. Nemá účet, backend, cloudovou synchronizaci, reklamy, analytiku ani telemetrii.

Hlavní funkce:

- Limit souvislé relace a denní limit
- Měření času pouze v aktivní kartě a aktivním okně prohlížeče
- Odložení a vědomé pokračování pro každý web
- Oprávnění vyžádané až při přidání nebo zapnutí konkrétní domény
- Lokální ovládání a mazání dat
- Anglické a české rozhraní

Lesscroll je behaviorální přerušení, ne blokátor webů. Konečné rozhodnutí je vždy na vás.

## Privacy practices

**Single purpose**

Lesscroll helps users interrupt mindless scrolling by measuring focused time only on websites they explicitly choose and showing an intentional decision overlay when a configured limit is reached.

**Data types handled**

- Web history: the active URL and hostname are processed to match a user-created rule.
- User activity: focused time, session duration, and current-day duration are calculated locally.
- Website content: do not select this data type. Lesscroll does not read or store page content.

**Data transmission**

No user data is transmitted to the developer or any third party. Data is processed and stored only in `chrome.storage.local`.

**Remote code**

No. Lesscroll does not use remote code.

**Limited Use certification**

Lesscroll's use of information received from Chrome APIs complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. The information is used only to provide Lesscroll's disclosed single purpose. It is not sold, transferred, used for advertising, or read by the developer or any third party.

## Permission justifications

**storage**

Stores site rules, local usage counters, session state, snooze state, and alert suppression state in `chrome.storage.local` so settings and timers survive service-worker and browser restarts.

**alarms**

Schedules timestamp checkpoints, upcoming limit alerts, snooze expiry, and the local-midnight reset without continuous interval timers.

**scripting**

Injects the self-contained full-screen intentional-decision overlay when a configured limit is reached on a user-approved tracked site.

**activeTab**

Temporarily reads the current page URL when the user opens the extension popup so Lesscroll can show the current-site status and offer “Track this site” without requesting the `tabs` permission.

**Optional host permissions**

Requested only after the user explicitly adds or enables a specific domain. They allow Lesscroll to measure active usage and inject the decision overlay on that domain and, when selected, its subdomains. Unused permissions are removed.

## Distribution dashboard checklist

Confirm these settings in the Chrome Web Store dashboard immediately before submission:

- [ ] Visibility is Public.
- [ ] Regions are set to All regions.
- [ ] Pricing is Free.
- [ ] In-app purchases is No.
- [ ] Mature content is No.
- [ ] The intended publish-after-review option is selected.
- [ ] The legally accurate Trader or Non-Trader status is selected.

These are intended release settings, not claims about the current listing status.

## Test instructions

No account, credentials, backend, or external service is required.

1. Open Lesscroll Options.
2. Add `youtube.com`, allow the requested domain permission, and set a short continuous limit.
3. Keep YouTube active in a focused Chrome window until the limit is reached.
4. Confirm the full-screen “Still here?” overlay appears and shows session and current-day time.
5. Verify Leave site, Snooze, and Continue intentionally.
6. Switch tabs or blur Chrome and confirm time pauses.

## Assets

- Package: `dist/lesscroll-<version>-chrome.zip` (use the version generated by `pnpm zip`)
- Store icon: `webstore/assets/icon-128.png`
- Screenshot: `webstore/assets/screenshot-options-1280x800.png`
- Small promo tile: `webstore/assets/promo-small-440x280.png`
