import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("home page explains Lesscroll and links to its privacy policy", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Lesscroll — Interrupt mindless scrolling<\/title>/i);
  assert.match(html, /Pause the scroll\. Keep the choice\./i);
  assert.match(html, /A behavioral interrupt, not a website blocker\./i);
  assert.match(html, /Only the sites you choose/i);
  assert.match(html, /Data stays on your device/i);
  assert.match(html, /servers receiving your Lesscroll extension data/i);
  assert.doesNotMatch(html, /servers receiving your data/i);
  assert.match(html, /href="\/privacy"/i);
  assert.match(html, /mailto:lesscroll@nemvik\.com/i);
  assert.match(html, /lesscroll@nemvik\.com/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
});

test("privacy page fully discloses local browsing-data handling", async () => {
  const response = await render("/privacy");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>Privacy Policy — Lesscroll<\/title>/i);
  assert.match(html, /Last updated: July 29, 2026/i);
  assert.match(html, /configured domain names/i);
  assert.match(html, /usage timestamps and durations/i);
  assert.match(html, /settings, limits, snooze, and suppression state/i);
  assert.match(html, /chrome\.storage\.local/i);
  assert.match(html, /does not transmit this data/i);
  assert.match(html, /does not sell or share user data/i);
  assert.match(html, /no accounts, advertising, analytics, or telemetry/i);
  assert.match(html, /storage/i);
  assert.match(html, /alarms/i);
  assert.match(html, /scripting/i);
  assert.match(html, /activeTab/i);
  assert.match(html, /optional host permission/i);
  assert.match(html, /Chrome Web Store User Data Policy/i);
  assert.match(html, /Limited Use requirements/i);
  assert.match(html, /Website hosting and cookies/i);
  assert.match(html, /Cloudflare/i);
  assert.match(html, /essential security cookies/i);
  assert.match(html, /request metadata/i);
  assert.match(html, /extension does not send its data to this website/i);
  assert.match(html, /Reset today/i);
  assert.match(html, /Reset all data/i);
  assert.match(html, /mailto:lesscroll@nemvik\.com/i);
  assert.match(html, /lesscroll@nemvik\.com/i);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
});

test("starter preview is removed from the finished site", async () => {
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});

test("social preview metadata uses the public site URL", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /<meta[^>]+property="og:image"[^>]+content="https:\/\/lesscroll\.nemvik\.chatgpt\.site\/og\.png"/i);
  assert.match(html, /<meta[^>]+name="twitter:card"[^>]+content="summary_large_image"/i);
  await access(new URL("public/og.png", projectRoot));
});
