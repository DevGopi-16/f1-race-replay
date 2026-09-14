import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";

import {
  primaryNavigation,
  moreNavigation,
} from "./navigation.config";

import UserMenu from "../auth/UserMenu";

function NavigationLink({
  label,
  path,
  icon: Icon,
  onNavigate,
}: {
  label: string;
  path: string;
  icon: typeof primaryNavigation[number]["icon"];
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={path}
      end={path === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `floating-nav-link ${
          isActive ? "is-active" : ""
        }`
      }
    >
      <Icon
        size={15}
        strokeWidth={1.8}
      />
      <span>{label}</span>
    </NavLink>
  );
}

export default function FloatingNav() {
  const [scrolled, setScrolled] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [moreOpen, setMoreOpen] =
    useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = () => setMoreOpen(false);
    document.addEventListener("click", handleClick);
    return () =>
      document.removeEventListener("click", handleClick);
  }, [moreOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className={`floating-nav-wrapper ${
          scrolled ? "is-scrolled" : ""
        }`}
      >
        <nav
          className="floating-nav"
          aria-label="Primary navigation"
        >
          <NavLink
            to="/"
            end
            className="floating-nav-brand"
            onClick={closeMobile}
            aria-label="F1 Race Replay home"
          >
            <span className="brand-f1">
              F1
            </span>

            <span className="brand-name">
              RACE REPLAY
            </span>
          </NavLink>

                    <div className="floating-nav-links">
            {primaryNavigation
              .filter(
                (item) =>
                  item.path !== "/",
              )
              .map((item) => (
                <NavigationLink
                  key={item.path}
                  {...item}
                />
              ))}

            <div
              className={`floating-nav-more ${
                moreOpen ? "is-open" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setMoreOpen((v) => !v);
              }}
            >
              <button
                type="button"
                className="floating-nav-link floating-nav-more-trigger"
              >
                <span>More</span>
                <ChevronDown
                  size={14}
                  strokeWidth={1.8}
                  className="more-chevron"
                />
              </button>

              <div className="floating-nav-more-menu">
                {moreNavigation.map(
                  (item) => (
                    <NavigationLink
                      key={item.path}
                      {...item}
                      onNavigate={() =>
                        setMoreOpen(false)
                      }
                    />
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="floating-nav-actions">
            <div className="floating-nav-user">
              <UserMenu />
            </div>
            <button
              type="button"
              className="floating-nav-menu-button"
              onClick={() =>
                setMobileOpen(true)
              }
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Menu
                size={20}
                strokeWidth={1.8}
              />
            </button>
          </div>
        </nav>
      </header>

      <div
        className={`mobile-nav-overlay ${
          mobileOpen
            ? "is-open"
            : ""
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-nav-panel">
          <div className="mobile-nav-header">
            <NavLink
              to="/"
              end
              className="floating-nav-brand"
              onClick={closeMobile}
            >
              <span className="brand-f1">
                F1
              </span>

              <span className="brand-name">
                RACE REPLAY
              </span>
            </NavLink>

            <button
              type="button"
              className="mobile-nav-close"
              onClick={closeMobile}
              aria-label="Close navigation"
            >
              <X
                size={22}
                strokeWidth={1.8}
              />
            </button>
          </div>

          <div className="mobile-nav-content">
            {primaryNavigation.map(
              (item) => (
                <NavigationLink
                  key={item.path}
                  {...item}
                  onNavigate={
                    closeMobile
                  }
                />
              ),
            )}

            <div className="mobile-nav-divider" />

            {moreNavigation.map(
              (item) => (
                <NavigationLink
                  key={item.path}
                  {...item}
                  onNavigate={
                    closeMobile
                  }
                />
              ),
            )}

            <div className="mobile-nav-divider" />

            <div
              className="mobile-nav-user"
              onClick={closeMobile}
            >
              <UserMenu />
            </div>
          </div>

          <div className="mobile-nav-footer">
            <span>
              F1 RACE REPLAY
            </span>

            <span>
              EVERY LAP. EVERY DETAIL.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}