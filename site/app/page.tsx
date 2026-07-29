import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lesscroll — Interrupt mindless scrolling",
  description:
    "A private, local-first Chrome extension that helps you pause mindless scrolling and choose what to do next.",
};

const permissions = [
  {
    name: "storage",
    copy: "Keeps your rules, timers, snoozes, and alert choices in Chrome's local extension storage.",
  },
  {
    name: "alarms",
    copy: "Schedules limit checks, snooze expiry, and the local-midnight reset without a continuous timer.",
  },
  {
    name: "scripting",
    copy: "Shows the self-contained decision overlay when a limit is reached on a site you approved.",
  },
  {
    name: "activeTab",
    copy: "Reads the current page only when you open Lesscroll, so it can show status without the tabs permission.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">Mindful browsing, on your terms</p>
          <h1>Pause the scroll.<br />Keep the choice.</h1>
          <p className="hero-intro">
            Lesscroll notices when focused time on a site you chose crosses your limit,
            then asks one useful question. It never blocks the site for you.
          </p>
          <div className="hero-actions">
            <a className="button button-dark" href="#how-it-works">How it works</a>
            <Link className="button button-light" href="/privacy">Read the privacy policy</Link>
          </div>
          <p className="microcopy">No account · No cloud · No analytics</p>
        </div>

        <div className="interrupt-demo" aria-label="Example Lesscroll interruption">
          <div className="demo-browser-bar" aria-hidden="true">
            <span /><span /><span />
            <div>youtube.com</div>
          </div>
          <div className="demo-scrim">
            <div className="demo-modal">
              <p className="eyebrow">A moment of choice</p>
              <h2>Still here?</h2>
              <p>You&apos;ve spent 32 minutes on YouTube.</p>
              <div className="demo-stats">
                <span><small>This session</small><strong>32 min</strong></span>
                <span><small>Today</small><strong>47 min</strong></span>
              </div>
              <div className="demo-actions" aria-hidden="true">
                <span className="leave">Leave site</span>
                <span>Snooze</span>
                <span>Continue intentionally</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="principles" aria-label="Lesscroll principles">
        <div className="shell principle-grid">
          <div><strong>0</strong><span>servers receiving your Lesscroll extension data</span></div>
          <div><strong>0</strong><span>analytics or ad trackers</span></div>
          <div><strong>1</strong><span>intentional choice at a time</span></div>
        </div>
      </section>

      <section className="section shell" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>A behavioral interrupt, not a website blocker.</h2>
        </div>
        <ol className="steps">
          <li>
            <span>01</span>
            <h3>Choose a site</h3>
            <p>Only the sites you choose are tracked. Permission is requested for that domain at that moment.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Set your limits</h3>
            <p>Use a continuous-session limit, a daily limit, or both. Time counts only while the tab and window are active.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Make a choice</h3>
            <p>Leave, snooze, or continue intentionally. Lesscroll creates friction, then leaves the decision to you.</p>
          </li>
        </ol>
      </section>

      <section className="privacy-callout" id="privacy">
        <div className="shell privacy-grid">
          <div>
            <p className="eyebrow light">Private by design</p>
            <h2>Data stays on your device.</h2>
          </div>
          <div className="privacy-copy">
            <p>
              Lesscroll locally processes the domains you explicitly track and the time you
              actively spend there. This is necessary to provide its single purpose.
            </p>
            <ul className="check-list">
              <li>Stored only in <code>chrome.storage.local</code></li>
              <li>Never sent to the developer or a third party</li>
              <li>No accounts, advertising, analytics, or telemetry</li>
              <li>Delete today&apos;s counters or all Lesscroll data at any time</li>
            </ul>
            <Link className="inline-link light-link" href="/privacy">
              Full privacy policy <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section shell" id="permissions">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Minimum permissions</p>
          <h2>Every permission has one job.</h2>
          <p>
            Website access is optional and requested only for a domain you add or enable.
            Lesscroll does not request the broad <code>tabs</code> permission.
          </p>
        </div>
        <div className="permission-grid">
          {permissions.map((permission) => (
            <article key={permission.name}>
              <code>{permission.name}</code>
              <p>{permission.copy}</p>
            </article>
          ))}
        </div>
        <div className="host-permission">
          <span>Optional host permission</span>
          <p>
            Allows active-time measurement and overlay injection only on a site you approved,
            including subdomains when you choose that setting. Unused access is removed.
          </p>
        </div>
      </section>

      <section className="section security-section" id="security">
        <div className="shell security-grid">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Security</p>
            <h2>Small surface.<br />Clear boundaries.</h2>
          </div>
          <div className="security-list">
            <article><span>01</span><div><h3>No remote code</h3><p>No remote JavaScript, CSS, APIs, or dynamic code execution.</p></div></article>
            <article><span>02</span><div><h3>Isolated overlay</h3><p>Pure DOM creation inside Shadow DOM, with no <code>innerHTML</code> or <code>eval</code>.</p></div></article>
            <article><span>03</span><div><h3>Validated boundaries</h3><p>Stored data and extension messages are parsed before the background worker uses them.</p></div></article>
            <article><span>04</span><div><h3>Local control</h3><p>Rules, permissions, counters, snoozes, and resets remain under the user&apos;s control.</p></div></article>
          </div>
        </div>
      </section>

      <section className="support-section shell" id="support">
        <p className="eyebrow">Support</p>
        <h2>Need help or found a security issue?</h2>
        <p>
          Email the publisher at <a className="text-link" href="mailto:lesscroll@nemvik.com">lesscroll@nemvik.com</a>.
          Include your Chrome version and the steps that reproduce the problem; never include
          passwords or private page content.
        </p>
        <div className="support-actions">
          <a className="inline-link" href="mailto:lesscroll@nemvik.com">Contact support <span aria-hidden="true">→</span></a>
          <Link className="inline-link" href="/privacy">Privacy and data details <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
