# Lesscroll website

This directory contains the public Lesscroll website and privacy policy served
at [lesscroll.nemvik.chatgpt.site](https://lesscroll.nemvik.chatgpt.site).

It is a static informational site built with Next.js-compatible components,
vinext, Vite, and the Cloudflare runtime. It has no database, authentication,
user accounts, analytics, tracking scripts, or external API integration.

## Requirements

- Node.js 22.13 or newer
- npm 10 or newer

## Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build  # production build
npm run lint   # ESLint
npm test       # build and rendered-HTML tests
```

## Structure

```text
app/page.tsx          Product page
app/privacy/page.tsx Privacy policy
app/globals.css       Shared visual styles
worker/index.ts       Cloudflare worker entrypoint
public/               Icon and social preview image
tests/                Rendered-HTML acceptance tests
```

`.openai/hosting.json` contains only the non-secret hosting binding declaration.
Environment files and local Wrangler state are ignored.
