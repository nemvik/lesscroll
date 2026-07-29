# Lesscroll Free Promotion Design

**Status:** Approved direction, pending final copy review  
**Date:** 2026-07-29  
**Product:** [Lesscroll](https://lesscroll.nemvik.com/)  
**Chrome Web Store:** [Install Lesscroll](https://chromewebstore.google.com/detail/lesscroll/mmlpldkiccpikaihihbcfkaffigapfjg)

## Goal

Launch Lesscroll publicly through a small number of relevant, free channels and
make it easy to install, inspect, and discuss. The launch should seek useful
feedback and early users without mass posting, paid promotion, artificial
engagement, or exaggerated claims.

## Audience and positioning

Primary audiences:

- people who want a gentler alternative to website blockers;
- privacy-conscious Chrome users;
- developers interested in local-first, open-source browser extensions.

Core message:

> Pause mindless scrolling. Keep the final choice.

Supporting facts:

- Lesscroll interrupts instead of blocking a website.
- Users choose the domains and continuous or daily limits.
- Only focused time in the active tab and Chrome window is counted.
- Users can leave, snooze, or continue intentionally.
- The extension has no account, backend, analytics, telemetry, advertising, or
  remote code.
- Configuration and counters remain in Chrome's local extension storage.
- The source is public under the MIT License.

## Pre-launch hygiene

Before submitting public posts:

1. Replace obsolete `lesscroll.nemvik.chatgpt.site` links with
   `lesscroll.nemvik.com` in public project metadata and documentation.
2. Add a visible Chrome Web Store installation link to the README.
3. Set the GitHub repository description, homepage, and focused discovery
   topics.
4. Verify the website, privacy page, Web Store listing, and repository are
   publicly accessible.
5. Reuse the existing reproducible screenshots and demo GIF. Adapt image size
   only where a platform requires it.

## Channel plan

### 1. GitHub repository metadata

Use the website as the homepage and this description:

> A private, local-first Chrome extension that interrupts mindless scrolling without blocking websites.

Suggested topics:

`chrome-extension`, `manifest-v3`, `digital-wellbeing`, `productivity`,
`privacy`, `typescript`, `wxt`

### 2. Product Hunt

Create a launch from the owner's personal account and identify the owner as the
maker.

**Name**

> Lesscroll

**Tagline**

> Pause mindless scrolling. Keep the final choice.

**Description**

> Lesscroll is a private, local-first Chrome extension that interrupts mindless scrolling without blocking sites. Set limits for chosen domains, see focused-time reminders, then leave, snooze, or continue intentionally. No account, analytics, or backend.

**Maker comment**

> I built Lesscroll because conventional website blockers felt too rigid for the problem I wanted to solve. I did not want another tool to make the final decision for me; I wanted a deliberate pause before continuing.
>
> Lesscroll measures focused time only on domains you choose. When a continuous or daily limit is reached, it offers three honest options: leave, snooze, or continue intentionally.
>
> Privacy was part of the design, not an afterthought. There is no account, backend, analytics, telemetry, advertising, or remote code. Rules and usage counters stay in Chrome's local extension storage, and the complete source is available on GitHub under the MIT License.
>
> This is a hobby project and the first public release. I would especially value feedback on whether the interruption feels useful without becoming annoying, and whether the setup is clear.

Use the product website as the primary URL and the Chrome Web Store listing as
the store link. Use at least two existing screenshots in the gallery. Schedule
the nearest available launch rather than soliciting advance votes.

### 3. Hacker News

Submit the product website once as a Show HN. Do not request votes or arrange
booster comments.

**Title**

> Show HN: Lesscroll – a local-first Chrome extension that interrupts scrolling

**First comment**

> I built Lesscroll because blockers were too absolute for what I wanted. The extension tracks focused time only on domains you choose, then creates a pause when a continuous or daily limit is reached. You can leave, snooze, or continue intentionally.
>
> It is a Chrome Manifest V3 extension with no account, backend, analytics, telemetry, ads, or remote code. Rules and counters stay in `chrome.storage.local`, and the source is MIT licensed.
>
> One implementation detail I cared about was avoiding inflated usage totals: time accrues only while the matching tab is active and the Chrome window is focused, and browser downtime is not counted after a restart.
>
> The Chrome Web Store version is live. I would appreciate feedback on the interaction model and on anything that looks surprising from a browser-extension or privacy perspective.

### 4. Reddit

Publish one tailored post only if a clearly relevant community's current rules
allow self-promotion. `r/chrome_extensions` is the first candidate. Do not reuse
the HN text verbatim, cross-post broadly, send unsolicited messages, or ask for
votes. If the community rules are ambiguous, skip the post.

**Title**

> I made a local-first Chrome extension that interrupts scrolling without blocking sites

**Body**

> I wanted something less rigid than a website blocker, so I built Lesscroll as a hobby project.
>
> You choose which domains to track and set a continuous limit, a daily limit, or both. When the limit is reached, Lesscroll shows a pause with three choices: leave, snooze, or continue intentionally. It counts time only while the matching tab and Chrome window are active.
>
> It is free, open source, and intentionally local-first: no account, backend, cloud sync, ads, analytics, telemetry, or remote code. The Chrome Web Store version is now public.
>
> Website: https://lesscroll.nemvik.com/
>
> Chrome Web Store: https://chromewebstore.google.com/detail/lesscroll/mmlpldkiccpikaihihbcfkaffigapfjg
>
> Source: https://github.com/nemvik/lesscroll
>
> I would be glad to hear whether the interruption model feels more useful than a hard block and where the setup could be clearer.

## Publication boundaries

- All public copy is in English and clearly written in the first person as the
  maker.
- No claim may imply guaranteed behavior on every website or device.
- Do not invent user counts, testimonials, rankings, endorsements, or privacy
  guarantees beyond the documented implementation.
- Do not post to personal LinkedIn, X, or Mastodon profiles in this launch.
- Do not pay for promotion, solicit votes, mass-post, or send unsolicited direct
  messages.
- Use only already authenticated browser sessions. Never inspect or expose
  credentials, cookies, or session storage.
- Stop and request owner action if authentication, CAPTCHA, account onboarding,
  identity verification, or ambiguous community rules block publication.

## Success criteria

The launch is complete when:

- public project links and GitHub metadata use the canonical domain and live
  Chrome Web Store listing;
- the website, privacy page, Web Store listing, and repository have been
  rechecked successfully;
- a Product Hunt launch is scheduled or public and its URL is recorded;
- a Show HN submission is public and its URL is recorded;
- one compliant Reddit submission is public and its URL is recorded, or the
  channel is explicitly skipped because its rules do not permit the post;
- no paid spend, artificial engagement, or unsupported marketing claim was
  used.

## Operational risks

- Product Hunt requires a personal account and may require onboarding before a
  launch can be scheduled.
- Hacker News may restrict Show HN submissions from accounts that are too new or
  unfamiliar with the community.
- Subreddit rules and moderator interpretations can change; Reddit is optional,
  not a launch blocker.
- Public comments require timely human judgment. Publication includes the
  initial post, but ongoing replies remain the owner's responsibility unless
  separately requested.
