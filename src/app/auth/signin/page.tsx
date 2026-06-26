"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth";

interface FormErrors { email?: string; password?: string; }

const CompassLogo = () => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <circle cx="14" cy="14" r="13" stroke="#38BDF8" strokeWidth="1"/>
    <path d="M14 4L16.5 12H14H11.5L14 4Z" fill="#38BDF8"/>
    <path d="M14 24L11.5 16H14H16.5L14 24Z" fill="rgba(255,255,255,0.3)"/>
    <path d="M4 14L12 11.5V14V16.5L4 14Z" fill="rgba(255,255,255,0.3)"/>
    <path d="M24 14L16 16.5V14V11.5L24 14Z" fill="#38BDF8" opacity="0.6"/>
    <circle cx="14" cy="14" r="2" fill="#38BDF8"/>
  </svg>
);

const DEST_PILLS = [
  { city: "Santorini", img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=100&q=80" },
  { city: "Tokyo",     img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100&q=80" },
  { city: "Bali",      img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=100&q=80" },
];

export default function SignInPage() {
  const router = useRouter();
  const [loading,  setLoading]  = useState(false);
  const [fields,   setFields]   = useState({ email: "", password: "" });
  const [errors,   setErrors]   = useState<FormErrors>({});
  const [showPw,   setShowPw]   = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!fields.email.trim()) next.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(fields.email)) next.email = "Enter a valid email address.";
    if (!fields.password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signIn(fields.email, fields.password);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  function inputStyle(name: string, hasError?: boolean): React.CSSProperties {
    const focused = focusField === name;
    return {
      width: "100%", padding: "16px 16px 16px 46px",
      background: focused ? "rgba(56,189,248,0.04)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${hasError ? "rgba(239,68,68,0.5)" : focused ? "rgba(56,189,248,0.5)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 12, color: "white", fontSize: 15, outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
      boxSizing: "border-box",
      boxShadow: hasError ? "0 0 0 3px rgba(239,68,68,0.08)" : focused ? "0 0 0 3px rgba(56,189,248,0.10)" : "none",
    };
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#060914" }}>

      {/* ── LEFT: Visual panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2"
        style={{ position: "relative", overflow: "hidden", flexDirection: "column", justifyContent: "flex-end" }}
      >
        <Image
          src="https://images.unsplash.com/photo-1527824404775-dce343118ebc?w=1400&q=90"
          alt="Mountain landscape"
          fill priority
          className="object-cover"
          sizes="50vw"
          style={{ objectPosition: "center 50%" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(6,9,20,0.55) 0%, rgba(6,9,20,0.15) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,9,20,0.97) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "20%", background: "linear-gradient(to right, rgba(6,9,20,0.7), transparent)" }} />

        <div style={{ position: "relative", zIndex: 10, padding: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CompassLogo />
            <span style={{ fontFamily: "var(--font-playfair, Georgia, serif)", fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Navoryn</span>
          </div>

          <div style={{ marginTop: 64 }}>
            <p style={{ fontSize: 42, fontWeight: 900, color: "white", lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Not all those
            </p>
            <p style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "var(--font-playfair, Georgia, serif)", color: "#38BDF8" }}>
              who wander
            </p>
            <p style={{ fontSize: 42, fontWeight: 900, color: "white", lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              are lost.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>— J.R.R. Tolkien</p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 40 }}>
            {DEST_PILLS.map((d) => (
              <div key={d.city} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "4px 12px 4px 4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(10px)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                  <Image src={d.img} alt={d.city} fill className="object-cover" sizes="28px" />
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{d.city}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Form panel ── */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center"
        style={{ background: "#060914", padding: "60px 80px", position: "relative" }}
      >
        {/* Decorative corner elements */}
        <svg aria-hidden="true" style={{ position: "absolute", top: 24, right: 24, opacity: 0.05, pointerEvents: "none" }} width="40" height="40" viewBox="0 0 40 40">
          <line x1="20" y1="0" x2="20" y2="40" stroke="white" strokeWidth="1"/>
          <line x1="0" y1="20" x2="40" y2="20" stroke="white" strokeWidth="1"/>
        </svg>
        <svg aria-hidden="true" style={{ position: "absolute", bottom: 40, left: 40, opacity: 0.04, pointerEvents: "none" }} width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="39" stroke="white" strokeWidth="1" fill="none"/>
        </svg>

        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <CompassLogo />
              <span style={{ fontFamily: "var(--font-playfair, Georgia, serif)", fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Navoryn</span>
            </Link>
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "white", letterSpacing: "-0.025em", lineHeight: 1.1, fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
            Sign in to continue your journey.
          </p>

          <form onSubmit={handleSubmit} noValidate style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="rgba(255,255,255,0.25)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={fields.email}
                  onChange={(e) => setFields({ ...fields, email: e.target.value })}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField(null)}
                  style={inputStyle("email", !!errors.email)}
                />
              </div>
              {errors.email && <p style={{ color: "#F87171", fontSize: 12, marginTop: 5 }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="rgba(255,255,255,0.25)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Your password"
                  autoComplete="current-password"
                  value={fields.password}
                  onChange={(e) => setFields({ ...fields, password: e.target.value })}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField(null)}
                  style={{ ...inputStyle("password", !!errors.password), paddingRight: 46 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", padding: 0, transition: "color 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: "#F87171", fontSize: 12, marginTop: 5 }}>{errors.password}</p>}
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginTop: -4 }}>
              <Link href="/auth/forgot-password" style={{ fontSize: 13, fontWeight: 500, color: "#38BDF8", textDecoration: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="white-btn"
              style={{ width: "100%", height: 52, fontSize: 15, opacity: loading ? 0.8 : 1 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Signing in…
                </span>
              ) : "Sign in"}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.22)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Sign up link */}
            <p style={{ textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" style={{ color: "#38BDF8", fontWeight: 600, textDecoration: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
              >
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
