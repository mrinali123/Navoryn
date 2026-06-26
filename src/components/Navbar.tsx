"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProfileDropdown from "@/components/ProfileDropdown";

interface NavbarProps {
  user?: { email?: string; full_name?: string } | null;
}

const NavorynLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#060914"/>
    <path d="M14 4C10.1 4 7 7.3 7 11.3C7 16.1 14 24 14 24C14 24 21 16.1 21 11.3C21 7.3 17.9 4 14 4Z" fill="#38BDF8"/>
    <circle cx="14" cy="11" r="3.2" fill="#060914"/>
  </svg>
);

export default function Navbar({ user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background:    scrolled ? "rgba(6,9,20,0.90)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom:  scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        transition:    "background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease",
        height: 64,
      }}
    >
      <div
        className="mx-auto flex max-w-7xl items-center justify-between"
        style={{ height: "100%", padding: "0 64px" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <NavorynLogo />
          <span
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "white",
            }}
          >
            Navoryn
          </span>
        </Link>

        {/* Desktop nav links — unauthenticated only */}
        {!user && (
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it works"].map((label, i) => (
              <a
                key={label}
                href={i === 0 ? "/#features" : "/#how-it-works"}
                className="nav-link"
              >
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/dashboard"
                style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "white"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.55)"; }}
              >
                Dashboard
              </Link>
              <ProfileDropdown user={user} />
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "white"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.55)"; }}
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="white-btn"
                style={{ padding: "10px 22px", fontSize: 14 }}
              >
                Start Planning
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 flex flex-col justify-center gap-1.5"
          aria-label="Toggle menu"
          style={{ marginRight: -8 }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: "block", height: 1.5, width: 22, borderRadius: 999,
                background: "rgba(255,255,255,0.8)",
                transition: "all 0.3s ease",
                ...(mobileOpen && i === 0 && { transform: "rotate(45deg) translate(2px, 3.5px)" }),
                ...(mobileOpen && i === 1 && { opacity: 0 }),
                ...(mobileOpen && i === 2 && { transform: "rotate(-45deg) translate(2px, -3.5px)" }),
              }}
            />
          ))}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: mobileOpen ? "300px" : "0", opacity: mobileOpen ? 1 : 0 }}
      >
        <div
          style={{
            padding: "20px 24px",
            background: "rgba(6,8,15,0.98)",
            backdropFilter: "blur(40px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", gap: 4,
          }}
        >
          {!user && (
            <>
              <a href="/#features" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", padding: "10px 0", textDecoration: "none" }}>Features</a>
              <a href="/#how-it-works" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", padding: "10px 0", textDecoration: "none" }}>How it works</a>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
              <Link href="/auth/signup" onClick={() => setMobileOpen(false)} className="white-btn" style={{ padding: "13px 20px", fontSize: 15, marginTop: 4 }}>
                Start Planning
              </Link>
            </>
          )}
          {user && (
            <>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", padding: "10px 0", textDecoration: "none" }}>Dashboard</Link>
              <Link href="/trips/new" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", padding: "10px 0", textDecoration: "none" }}>New Trip</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
