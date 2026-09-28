import React from "react";
import "./footer.css";

/**
 * Site-wide footer. Render this once in your app shell/layout
 * (AppShell.tsx) so it appears on every page, not just the homepage.
 */
const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Cookie Policy", href: "/cookie-policy" },
];

export default function Footer() {
const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__container">
        <div className="site-footer__brand-row">
          <img
            src="/favicon.png"
            alt="F1 Race Vision"
            className="site-footer__logo-img"
          />

          <div className="site-footer__icons">
            <a
              href="mailto:f1racevision.contact@gmail.com"
              className="site-footer__icon"
              aria-label="Email us"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Zm2 .3V18h16V6.3l-7.42 5.94a1 1 0 0 1-1.16 0L4 6.3Zm.5-1.3 7.5 6 7.5-6h-15Z"
                />
              </svg>
            </a>

            <a
              href="https://x.com/REPLACE_WITH_YOUR_HANDLE"
              className="site-footer__icon"
              target="_blank"
              rel="noreferrer"
              aria-label="Follow on X"
            >
              <span className="site-footer__x-icon">𝕏</span>
            </a>
          </div>
        </div>

        <nav className="site-footer__links" aria-label="Site">
        {FOOTER_LINKS.map((link, i) => (
            <React.Fragment key={link.href}>
            {i > 0 && <span aria-hidden="true">·</span>}
            <a href={link.href}>{link.label}</a>
            </React.Fragment>
        ))}
        </nav>

        <p className="site-footer__disclaimer">
          F1 Race Vision is an independent fan project and is not affiliated
          with Formula 1, the FIA, or any team or driver.
        </p>

        <p className="site-footer__copyright">© {year} F1 Race Vision</p>
      </div>
    </footer>
  );
}