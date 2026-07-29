import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const description =
  "Pause mindless scrolling with intentional reminders. Private, local-first, and always your choice.";
const publicSiteUrl = "https://lesscroll.nemvik.com";
const ogImage = `${publicSiteUrl}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: { default: "Lesscroll", template: "%s" },
  description,
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
  openGraph: {
    title: "Lesscroll — Pause the scroll. Keep the choice.",
    description,
    type: "website",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Lesscroll" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lesscroll — Pause the scroll. Keep the choice.",
    description,
    images: [ogImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="site-header">
          <div className="shell header-inner">
            <Link className="brand" href="/" aria-label="Lesscroll home">
              <span className="brand-mark" aria-hidden="true" />
              <strong>Lesscroll</strong>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/#security">Security</Link>
              <Link href="/#support">Support</Link>
            </nav>
          </div>
        </header>
        <div id="main-content">{children}</div>
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <Link className="brand" href="/">
                <span className="brand-mark" aria-hidden="true" />
                <strong>Lesscroll</strong>
              </Link>
              <p>Pause the scroll. Keep the choice.</p>
            </div>
            <div className="footer-links">
              <Link href="/privacy">Privacy policy</Link>
              <Link href="/#permissions">Permissions</Link>
              <Link href="/#support">Support</Link>
            </div>
            <p className="copyright">© 2026 Lesscroll</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
