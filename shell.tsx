"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { useSession } from "./session";
import { demo, incomplete } from "./firebase";
export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useSession(),
    path = usePathname(),
    [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const nav = user
    ? [
        ["My matches", "/matches"],
        ["My profile", "/profile"],
        ["Staying safe", "/staying-safe"],
        ["Questions", "/questions"],
      ]
    : [
        ["Home", "/"],
        ["How it works", "/#how-it-works"],
        ["Join", "/join"],
        ["Staying safe", "/staying-safe"],
        ["Questions", "/questions"],
      ];
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {demo && (
        <div className="demo-strip">
          Class demo · fictional students · no emails sent · data stays in this
          browser
        </div>
      )}
      {incomplete && (
        <div role="alert" className="demo-strip">
          Firebase setup is incomplete. Ask your team to check the environment
          variables.
        </div>
      )}
      <header>
        <div className="nav-wrap">
          <Link href="/" className="brand" aria-label="McGill Matched Home">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
            </span>
            <span>
              McGill <strong>Matched</strong>
              <small>A LITTLE COMMON GROUND.</small>
            </span>
          </Link>
          <button
            id="menu-toggle"
            className="menu-btn secondary"
            type="button"
            aria-expanded={open}
            aria-controls="global-nav"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? "Close menu" : "Menu"}
          </button>
          <nav id="global-nav" aria-label="Main" className={open ? "open" : ""}>
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={
                  !href.includes("#") &&
                  (href === "/"
                    ? path === "/"
                    : path === href || path.startsWith(href + "/"))
                    ? "page"
                    : undefined
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="utility">
            {user ? (
              <button className="text-btn" onClick={logout}>
                Log out
              </button>
            ) : (
              <Link href="/join?login=1">
                Log in <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer>
        <div className="footer-top">
          <Link className="footer-brand" href="/">
            McGill Matched<span>A familiar face starts here.</span>
          </Link>
          <div>
            <Link
              href="/privacy"
              aria-current={path === "/privacy" ? "page" : undefined}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              aria-current={path === "/terms" ? "page" : undefined}
            >
              Terms
            </Link>
            <Link
              href="/contact"
              aria-current={path === "/contact" ? "page" : undefined}
            >
              Contact &amp; report a problem
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            Made for INSY 440 · McGill University · Student team project
          </span>
          <span>
            Independent student project. Not an official McGill service.
          </span>
        </div>
      </footer>
    </>
  );
}
