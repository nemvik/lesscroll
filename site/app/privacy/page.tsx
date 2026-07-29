import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Lesscroll",
  description:
    "How the Lesscroll extension handles local browsing data and how its public website is hosted.",
};

export default function PrivacyPolicy() {
  return (
    <main className="policy-page shell">
      <div className="policy-hero">
        <p className="eyebrow">Privacy policy</p>
        <h1>Clear by design.<br />Local by default.</h1>
        <p className="policy-lead">
          The Lesscroll extension processes only the browsing data required to measure focused time
          on websites you explicitly choose. It does not send that data anywhere.
        </p>
        <p className="updated">Last updated: July 29, 2026</p>
      </div>

      <div className="policy-layout">
        <nav className="policy-nav" aria-label="Privacy policy sections">
          <strong>On this page</strong>
          <a href="#scope">Scope</a>
          <a href="#data">Data processed</a>
          <a href="#use">How data is used</a>
          <a href="#storage">Storage and deletion</a>
          <a href="#permissions-policy">Permissions</a>
          <a href="#sharing">Sharing</a>
          <a href="#website">Website hosting</a>
          <a href="#security-policy">Security</a>
          <a href="#limited-use">Limited Use</a>
          <a href="#contact">Contact</a>
        </nav>

        <article className="policy-content">
          <section id="scope">
            <h2>1. Scope and single purpose</h2>
            <p>
              This policy covers the Lesscroll Chrome extension and its public informational website.
              The extension&apos;s single purpose is to help users interrupt mindless scrolling by
              measuring focused time on websites they explicitly choose and showing an intentional
              decision overlay when a configured limit is reached.
            </p>
            <p>
              Lesscroll is not a website blocker. The user can leave, snooze the alert, or continue intentionally.
            </p>
          </section>

          <section id="data">
            <h2>2. Data processed</h2>
            <p>Lesscroll processes and stores the minimum data needed for that purpose:</p>
            <ul>
              <li>Configured domain names and whether their subdomains are included.</li>
              <li>Usage timestamps and durations for active sessions and the current local day.</li>
              <li>Settings, limits, snooze, and suppression state for each configured rule.</li>
              <li>The active page URL temporarily, to select the most specific matching rule. Page content is not read or stored.</li>
            </ul>
            <p>
              Chrome Web Store policy categorizes domains, URLs, and time spent as browsing activity,
              even when processing happens only on the user&apos;s device.
            </p>
          </section>

          <section id="use">
            <h2>3. How data is used</h2>
            <p>The data is used only to:</p>
            <ul>
              <li>Match the active website to a rule the user created.</li>
              <li>Measure continuous-session and current-day active time.</li>
              <li>Schedule and show a limit reminder.</li>
              <li>Remember a snooze or intentional-continuation choice for its stated duration.</li>
              <li>Show current timers and rule status inside the extension.</li>
            </ul>
            <p>There are no accounts, advertising, analytics, or telemetry.</p>
          </section>

          <section id="storage">
            <h2>4. Local storage, retention, and deletion</h2>
            <p>
              All Lesscroll data is stored in <code>chrome.storage.local</code> on the user&apos;s device.
              Lesscroll does not use Chrome Sync, a backend, or cloud storage.
            </p>
            <p>
              Rules and their settings remain until the user edits or deletes them. Current-day time
              resets at local midnight. Snooze and suppression values expire according to the configured
              behavior. From Lesscroll Options, users can choose <strong>Reset today&apos;s stats</strong> or
              <strong> Reset all data</strong>. Removing the extension also removes its local extension data.
            </p>
          </section>

          <section id="permissions-policy">
            <h2>5. Permissions</h2>
            <dl className="policy-permissions">
              <div><dt><code>storage</code></dt><dd>Stores rules, counters, session state, snooze state, and alert suppression state locally.</dd></div>
              <div><dt><code>alarms</code></dt><dd>Schedules timestamp checkpoints, upcoming alerts, snooze expiry, and the local-midnight reset without interval timers.</dd></div>
              <div><dt><code>scripting</code></dt><dd>Injects the self-contained full-screen decision overlay when a configured limit is reached.</dd></div>
              <div><dt><code>activeTab</code></dt><dd>Temporarily reads the current URL when the user opens the popup, avoiding the broader tabs permission.</dd></div>
              <div><dt>Optional host permission</dt><dd>Requested only after the user adds or enables a specific domain. It enables time measurement and overlay injection on that domain and selected subdomains.</dd></div>
            </dl>
          </section>

          <section id="sharing">
            <h2>6. Transmission, sharing, and sale</h2>
            <p>
              Lesscroll does not transmit this data to the developer or any third party. The developer
              cannot access it. Lesscroll does not sell or share user data, use it for advertising,
              or allow humans to read it.
            </p>
            <p>
              The extension contains no external API integration.
            </p>
          </section>

          <section id="website">
            <h2>7. Website hosting and cookies</h2>
            <p>
              This public website is delivered through Cloudflare. The hosting and CDN provider may
              process request metadata such as IP address, request headers, browser information, and
              timestamps to deliver and protect the site. It may also set essential security cookies,
              including <code>__cf_bm</code>, for bot detection and abuse prevention.
            </p>
            <p>
              These hosting controls are not used by Lesscroll for advertising or analytics. The
              extension does not send its data to this website. The website has no account, sign-in,
              submission form, advertising, or analytics code.
            </p>
          </section>

          <section id="security-policy">
            <h2>8. Security</h2>
            <p>
              Lesscroll uses Manifest V3 and contains no remote code. Its alert is built with pure DOM
              methods inside Shadow DOM and does not use <code>innerHTML</code>, <code>eval</code>, remote CSS,
              or remote JavaScript. Stored data and runtime messages are validated before use.
            </p>
            <p>
              Host access is optional and user-initiated per domain. Permissions that are no longer
              needed are removed when corresponding rules are disabled, changed, or deleted.
            </p>
          </section>

          <section id="limited-use" className="limited-use">
            <p className="eyebrow">Chrome Web Store disclosure</p>
            <h2>9. Limited Use</h2>
            <p>
              Lesscroll&apos;s use of information received from Chrome APIs complies with the
              Chrome Web Store User Data Policy, including the Limited Use requirements.
              The information is used only for Lesscroll&apos;s disclosed single purpose.
            </p>
            <p>
              It is not transferred, sold, used for personalized advertising or creditworthiness,
              or read by the developer or any third party.
            </p>
          </section>

          <section id="changes">
            <h2>10. Changes to this policy</h2>
            <p>
              If Lesscroll&apos;s data practices change, this policy and the Chrome Web Store disclosures
              will be updated before the new behavior is released. Material changes that require consent
              will also be disclosed inside the extension.
            </p>
          </section>

          <section id="contact">
            <h2>11. Contact and support</h2>
            <p>
              For privacy questions, support requests, or security reports, email the publisher at{` `}
              <a className="text-link" href="mailto:lesscroll@nemvik.com">lesscroll@nemvik.com</a>.
              Do not include passwords or private page content.
            </p>
          </section>

          <p className="policy-back"><Link href="/">← Back to Lesscroll</Link></p>
        </article>
      </div>
    </main>
  );
}
