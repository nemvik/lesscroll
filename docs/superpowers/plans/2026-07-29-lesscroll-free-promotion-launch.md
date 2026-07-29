# Lesscroll Free Promotion Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a truthful, focused Lesscroll launch on GitHub, Product Hunt, Hacker News, and one rules-compliant Reddit community using only free distribution.

**Architecture:** Treat the repository and website as the canonical product surface, correct their public metadata first, then publish channel-specific English copy from the approved design. Use Sites for the existing website deployment, GitHub for repository discovery metadata, and authenticated Chrome sessions for community submissions; every external write is followed by a direct URL/status check.

**Tech Stack:** pnpm 11.7, npm 10 for the existing Sites subproject, TypeScript, Next.js-compatible vinext/Vite site, Git/GitHub, Sites hosting, Chrome browser automation

---

## Scope and release choice

This is a personal hobby repository with an already established direct-to-`main`
release flow, and the owner has explicitly approved the production launch and
the exact public copy. Keep that flow for this launch so the canonical README is
live before the community submissions. Use `nemvik@users.noreply.github.com` for
every commit; never use the locally configured personal Gmail address.

No product logic or extension permissions change. The only source changes are
canonical URLs, the live Web Store installation CTA, one metadata regression
assertion, and these launch documents.

### Task 1: Add a regression check for the canonical website URL

**Files:**
- Modify: `site/tests/rendered-html.test.mjs`

- [ ] **Step 1: Change the social-preview expectation to the canonical domain**

Replace the old `og:image` assertion with:

```js
assert.match(
  html,
  /<meta[^>]+property="og:image"[^>]+content="https:\/\/lesscroll\.nemvik\.com\/og\.png"/i,
);
assert.doesNotMatch(html, /lesscroll\.nemvik\.chatgpt\.site/i);
```

- [ ] **Step 2: Run the site test and verify the new assertion fails**

Run:

```bash
cd site
npm test
```

Expected: the social-preview test fails because `app/layout.tsx` still emits
`https://lesscroll.nemvik.chatgpt.site/og.png`.

- [ ] **Step 3: Leave the failing assertion in place for Task 2**

Do not weaken the assertion or accept both domains.

### Task 2: Replace stale URLs and expose the live Web Store install path

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Modify: `webstore/listing.md`
- Modify: `site/README.md`
- Modify: `site/app/layout.tsx`

- [ ] **Step 1: Update the README header links**

Use this exact link row:

```html
<a href="https://lesscroll.nemvik.com/">Website</a> ·
<a href="https://chromewebstore.google.com/detail/lesscroll/mmlpldkiccpikaihihbcfkaffigapfjg">Chrome Web Store</a> ·
<a href="https://lesscroll.nemvik.com/privacy">Privacy</a> ·
<a href="https://lesscroll.nemvik.com/#support">Support</a> ·
<a href="SECURITY.md">Security</a> ·
<a href="https://github.com/nemvik/lesscroll/issues">Issues</a> ·
<a href="LICENSE">MIT License</a>
```

- [ ] **Step 2: Replace the outdated installation paragraph**

The start of `README.md`'s Installation section must be:

```markdown
## Installation

[Install Lesscroll from the Chrome Web Store](https://chromewebstore.google.com/detail/lesscroll/mmlpldkiccpikaihihbcfkaffigapfjg).

### Build from source
```

Keep the existing source-build requirements and commands below it.

- [ ] **Step 3: Update the remaining repository metadata URLs**

Make these exact replacements:

```text
package.json homepage:
https://lesscroll.nemvik.com/

README privacy policy:
https://lesscroll.nemvik.com/privacy

webstore/listing.md homepage:
https://lesscroll.nemvik.com/

webstore/listing.md support:
https://lesscroll.nemvik.com/#support

webstore/listing.md privacy:
https://lesscroll.nemvik.com/privacy
```

- [ ] **Step 4: Update the website source metadata**

Use this canonical URL in `site/app/layout.tsx`:

```ts
const publicSiteUrl = "https://lesscroll.nemvik.com";
```

Update `site/README.md` to link to
`[lesscroll.nemvik.com](https://lesscroll.nemvik.com/)`.

- [ ] **Step 5: Run the focused site test and verify it passes**

Run:

```bash
cd site
npm test
```

Expected: all rendered-HTML tests pass, including the new canonical-domain
assertion.

### Task 3: Validate both product surfaces

**Files:**
- Verify only; no source changes expected

- [ ] **Step 1: Verify the extension**

Run from the repository root:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: TypeScript exits 0, all Vitest tests pass, and WXT produces the
Chrome MV3 build in `dist/unpacked-extension`.

- [ ] **Step 2: Verify the website lint and build**

Run:

```bash
cd site
npm run lint
npm run build
```

Expected: both commands exit 0 and `site/dist/server/index.js` exists.

- [ ] **Step 3: Scan public source for stale production references**

Run from the repository root:

```bash
rg -n "lesscroll\.nemvik\.chatgpt\.site|Chrome Web Store link will be added" \
  README.md package.json webstore site/app site/README.md
```

Expected: no matches.

- [ ] **Step 4: Verify all public entry points**

Run:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://lesscroll.nemvik.com/
curl -fsS -o /dev/null -w '%{http_code}\n' https://lesscroll.nemvik.com/privacy
curl -fsS -o /dev/null -w '%{http_code}\n' https://chromewebstore.google.com/detail/lesscroll/mmlpldkiccpikaihihbcfkaffigapfjg
curl -fsS -o /dev/null -w '%{http_code}\n' https://github.com/nemvik/lesscroll
```

Expected: four `200` responses.

### Task 4: Publish the canonical website metadata through Sites

**Files:**
- Commit in the existing nested site source: `site/README.md`
- Commit in the existing nested site source: `site/app/layout.tsx`
- Commit in the existing nested site source: `site/tests/rendered-html.test.mjs`

- [ ] **Step 1: Inspect the nested site diff**

Run:

```bash
git -C site status --short --branch
git -C site diff --check
git -C site diff -- README.md app/layout.tsx tests/rendered-html.test.mjs
```

Expected: only the three intended canonical-domain changes are present.

- [ ] **Step 2: Commit the validated site source with the noreply identity**

Run:

```bash
git -C site add README.md app/layout.tsx tests/rendered-html.test.mjs
git -C site -c user.name='Viktor Nemčok' \
  -c user.email='nemvik@users.noreply.github.com' \
  commit -m 'Use canonical Lesscroll domain'
```

Expected: one commit containing only the three site files.

- [ ] **Step 3: Push the exact site commit to its Sites source repository**

Read `project_id` from `site/.openai/hosting.json`, call the Sites source-write
credential operation once, and use the returned `remote_url`, `branch`, and
short-lived token for a per-command authenticated push. Do not store the token
in Git configuration or print it. Record `git -C site rev-parse HEAD` as the
version `commit_sha`.

Expected: the source repository accepts the exact nested-site HEAD.

- [ ] **Step 4: Package the already validated build**

Run the Sites plugin helper with:

```bash
/Users/viktornemcok/.codex/plugins/cache/openai-bundled/sites/0.1.31/scripts/package-site.sh \
  /Users/viktornemcok/Projects/nemvik/lesscroll/site \
  /tmp/lesscroll-site-v4.tar.gz
```

Expected: the archive contains `dist/server/index.js`, static assets, and
`.openai/hosting.json`.

- [ ] **Step 5: Save and deploy one public production version**

Call `save_site_version` with the exact `project_id`, site HEAD `commit_sha`, and
`/tmp/lesscroll-site-v4.tar.gz`. Then call `deploy_site_version` with the
returned version ID; public production deployment was explicitly approved by
the owner in this thread.

Expected: one new Sites version and one production deployment.

- [ ] **Step 6: Poll the deployment to a terminal state**

Call `get_deployment_status` using identifiers from the same deployment flow
until the status is `succeeded` or `failed`.

Expected: `succeeded`; open the returned production URL in Codex and recheck
that the custom domain still returns `200`.

### Task 5: Publish repository corrections and GitHub discovery metadata

**Files:**
- Commit: `README.md`
- Commit: `package.json`
- Commit: `webstore/listing.md`
- Commit: `site/README.md`
- Commit: `site/app/layout.tsx`
- Commit: `site/tests/rendered-html.test.mjs`
- Commit: `docs/superpowers/plans/2026-07-29-lesscroll-free-promotion-launch.md`
- Already committed: `docs/superpowers/specs/2026-07-29-lesscroll-promotion-design.md`

- [ ] **Step 1: Review root repository scope**

Run:

```bash
git status --short --branch
git diff --check
git diff -- README.md package.json webstore/listing.md site/README.md site/app/layout.tsx site/tests/rendered-html.test.mjs docs/superpowers/plans/2026-07-29-lesscroll-free-promotion-launch.md
```

Expected: `main` is ahead by the approved spec commit and only the listed
launch files are modified or new.

- [ ] **Step 2: Commit only the launch corrections with the noreply identity**

Run:

```bash
git add README.md package.json webstore/listing.md \
  site/README.md site/app/layout.tsx site/tests/rendered-html.test.mjs \
  docs/superpowers/plans/2026-07-29-lesscroll-free-promotion-launch.md
git -c user.name='Viktor Nemčok' \
  -c user.email='nemvik@users.noreply.github.com' \
  commit -m 'Prepare Lesscroll public launch'
```

Expected: one focused launch-preparation commit after the approved design
commit.

- [ ] **Step 3: Push `main`**

Run:

```bash
git push origin main
```

Expected: `origin/main` advances to the launch-preparation commit.

- [ ] **Step 4: Update GitHub repository discovery fields**

Run:

```bash
gh repo edit nemvik/lesscroll \
  --description "A private, local-first Chrome extension that interrupts mindless scrolling without blocking websites." \
  --homepage "https://lesscroll.nemvik.com/" \
  --add-topic chrome-extension \
  --add-topic manifest-v3 \
  --add-topic digital-wellbeing \
  --add-topic productivity \
  --add-topic privacy \
  --add-topic typescript \
  --add-topic wxt
```

Expected: the command exits 0.

- [ ] **Step 5: Read back GitHub metadata and author identity**

Run:

```bash
gh repo view nemvik/lesscroll --json description,homepageUrl,repositoryTopics,url,visibility
git log -2 --format='%h %an <%ae> %s'
```

Expected: public visibility, the canonical homepage, all seven topics, and only
`nemvik@users.noreply.github.com` for the new commits.

### Task 6: Establish authenticated publication sessions and recheck rules

**Files:**
- No repository changes

- [ ] **Step 1: Initialize Chrome control once**

Initialize the Chrome browser runtime with:

```js
if (globalThis.agent?.browsers == null) {
  const { setupBrowserRuntime } = await import(
    "/Users/viktornemcok/.codex/plugins/cache/openai-bundled/chrome/26.721.81911/scripts/browser-client.mjs"
  );
  await setupBrowserRuntime({ globals: globalThis });
}
```

Then call `browser.documentation()` and emit the complete documentation with:

```js
nodeRepl.write(await browser.documentation());
```

Read the complete returned documentation before any interaction.

- [ ] **Step 2: Select the appropriate browser for each target URL**

Use `agent.browsers.getForUrl()` for:

```text
https://www.producthunt.com/posts/new
https://news.ycombinator.com/submit
https://www.reddit.com/r/chrome_extensions/about/rules
```

Expected: each operation uses an existing browser session that owns the target
URL or the default Chrome browser.

- [ ] **Step 3: Check authentication without inspecting session data**

Read only the visible page state. If a platform presents a login, onboarding,
CAPTCHA, or identity-verification screen, stop work on that channel and request
the owner's visible interaction. Never inspect cookies, local storage,
passwords, or session stores.

- [ ] **Step 4: Recheck the live community rules**

Confirm the current Show HN rules and the visible
`r/chrome_extensions` community rules immediately before submission. If Reddit
does not clearly permit a maker post, skip Reddit and record the reason.

Expected: a documented go/skip decision for each community channel.

### Task 7: Create and schedule the Product Hunt launch

**Files:**
- Upload existing: `promo/01-interruption.png`
- Upload existing: `promo/02-local-private.png`
- Upload existing: `promo/03-your-choice.png`

- [ ] **Step 1: Start a Product Hunt product submission**

Use the product website as the primary URL:

```text
https://lesscroll.nemvik.com/
```

Add the Chrome Web Store link:

```text
https://chromewebstore.google.com/detail/lesscroll/mmlpldkiccpikaihihbcfkaffigapfjg
```

- [ ] **Step 2: Fill the approved core fields**

Use exactly:

```text
Name: Lesscroll
Tagline: Pause mindless scrolling. Keep the final choice.
Description: Lesscroll is a private, local-first Chrome extension that interrupts mindless scrolling without blocking sites. Set limits for chosen domains, see focused-time reminders, then leave, snooze, or continue intentionally. No account, analytics, or backend.
```

Identify the signed-in owner as the maker. Do not add a promo code or unsupported
social account.

- [ ] **Step 3: Upload the three approved gallery images**

Upload the three PNG files in numeric order. Verify the preview shows readable
English text and does not crop the product UI materially.

- [ ] **Step 4: Add the approved maker comment**

Use exactly:

```text
I built Lesscroll because conventional website blockers felt too rigid for the problem I wanted to solve. I did not want another tool to make the final decision for me; I wanted a deliberate pause before continuing.

Lesscroll measures focused time only on domains you choose. When a continuous or daily limit is reached, it offers three honest options: leave, snooze, or continue intentionally.

Privacy was part of the design, not an afterthought. There is no account, backend, analytics, telemetry, advertising, or remote code. Rules and usage counters stay in Chrome's local extension storage, and the complete source is available on GitHub under the MIT License.

This is a hobby project and the first public release. I would especially value feedback on whether the interruption feels useful without becoming annoying, and whether the setup is clear.
```

Do not paraphrase or introduce metrics.

- [ ] **Step 5: Schedule the nearest available launch date**

Choose the nearest date offered by Product Hunt. Do not solicit advance votes
or enable any paid placement.

Expected: Product Hunt displays a scheduled launch or a public launch URL.
Record the URL and launch date in the final report.

### Task 8: Publish the Show HN submission

**Files:**
- No repository changes

- [ ] **Step 1: Submit the approved URL and title once**

```text
URL: https://lesscroll.nemvik.com/
Title: Show HN: Lesscroll – a local-first Chrome extension that interrupts scrolling
```

Do not resubmit if the result looks delayed or receives no immediate votes.

- [ ] **Step 2: Add the approved first comment**

Use exactly once:

```text
I built Lesscroll because blockers were too absolute for what I wanted. The extension tracks focused time only on domains you choose, then creates a pause when a continuous or daily limit is reached. You can leave, snooze, or continue intentionally.

It is a Chrome Manifest V3 extension with no account, backend, analytics, telemetry, ads, or remote code. Rules and counters stay in chrome.storage.local, and the source is MIT licensed.

One implementation detail I cared about was avoiding inflated usage totals: time accrues only while the matching tab is active and the Chrome window is focused, and browser downtime is not counted after a restart.

The Chrome Web Store version is live. I would appreciate feedback on the interaction model and on anything that looks surprising from a browser-extension or privacy perspective.
```

Do not ask for votes, comments, or artificial engagement.

- [ ] **Step 3: Verify the public item**

Open the resulting `news.ycombinator.com/item?id=...` page and confirm the title,
target URL, and first comment are visible.

Expected: one public Show HN item URL recorded for the final report.

### Task 9: Publish one rules-compliant Reddit post or skip

**Files:**
- No repository changes

- [ ] **Step 1: Apply the Task 6 rules decision**

Proceed only if the visible `r/chrome_extensions` rules clearly allow a maker
to share a relevant Chrome extension. Do not infer permission from the absence
of a rule page; ambiguity means skip.

- [ ] **Step 2: Submit the approved Reddit title and body once**

Use exactly:

```text
Title: I made a local-first Chrome extension that interrupts scrolling without blocking sites

I wanted something less rigid than a website blocker, so I built Lesscroll as a hobby project.

You choose which domains to track and set a continuous limit, a daily limit, or both. When the limit is reached, Lesscroll shows a pause with three choices: leave, snooze, or continue intentionally. It counts time only while the matching tab and Chrome window are active.

It is free, open source, and intentionally local-first: no account, backend, cloud sync, ads, analytics, telemetry, or remote code. The Chrome Web Store version is now public.

Website: https://lesscroll.nemvik.com/

Chrome Web Store: https://chromewebstore.google.com/detail/lesscroll/mmlpldkiccpikaihihbcfkaffigapfjg

Source: https://github.com/nemvik/lesscroll

I would be glad to hear whether the interruption model feels more useful than a hard block and where the setup could be clearer.
```

Add a required self-promotion or project flair if the community rules specify
one.

- [ ] **Step 3: Verify the post or record the skip**

If published, open the permalink and confirm all three product links resolve.
If skipped, record the specific visible rule or ambiguity; do not substitute a
different subreddit without a fresh rules check.

Expected: one verified Reddit permalink or a clear compliant skip reason.

### Task 10: Final verification and handoff

**Files:**
- No repository changes

- [ ] **Step 1: Recheck Git and public product state**

Run:

```bash
git status --short --branch
git log -2 --format='%h %an <%ae> %s'
curl -fsS -o /dev/null -w '%{http_code}\n' https://lesscroll.nemvik.com/
curl -fsS -o /dev/null -w '%{http_code}\n' https://lesscroll.nemvik.com/privacy
curl -fsS -o /dev/null -w '%{http_code}\n' https://chromewebstore.google.com/detail/lesscroll/mmlpldkiccpikaihihbcfkaffigapfjg
```

Expected: clean `main...origin/main`, noreply authors for the new commits, and
three `200` responses.

- [ ] **Step 2: Verify external publication URLs**

Open the Product Hunt, Show HN, and Reddit URLs gathered in Tasks 7–9. Confirm
each visible title and destination; for a scheduled Product Hunt launch, verify
the scheduled date instead of expecting a public feed entry.

- [ ] **Step 3: Report the outcome without claiming engagement**

Return:

- the canonical website and Chrome Web Store links;
- the Product Hunt URL and scheduled/public status;
- the Show HN item URL;
- the Reddit permalink or the exact compliant skip reason;
- GitHub metadata and deployment confirmation;
- any channel requiring the owner's login, CAPTCHA, onboarding, or follow-up.

Do not claim views, installs, votes, ranking, or community approval unless the
platform visibly reports it at verification time.
