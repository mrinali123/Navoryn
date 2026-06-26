"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { User, Mail, Lock, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { signUp } from "@/lib/auth";
import { getStrength } from "@/lib/password";

interface FormErrors { fullName?: string; email?: string; password?: string; confirmPassword?: string; }

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

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fields,  setFields]  = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [showPw,  setShowPw]  = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!fields.fullName.trim())  next.fullName = "Full name is required.";
    if (!fields.email.trim())     next.email    = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(fields.email)) next.email = "Enter a valid email address.";
    if (!fields.password)         next.password = "Password is required.";
    else if (fields.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (!fields.confirmPassword)  next.confirmPassword = "Please confirm your password.";
    else if (fields.password !== fields.confirmPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(fields.email, fields.password, fields.fullName);
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("rate limit") || msg.includes("rate_limit") || msg.includes("too many")) {
        toast.error("Too many sign-up attempts. Please wait a few minutes and try again.", { duration: 8000 });
      } else if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
        toast.error("An account with this email already exists. Try signing in instead.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Account created! Check your email to verify your account.", { duration: 6000 });
    router.push("/auth/signin");
  }

  const strength = getStrength(fields.password);

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

      {/* ── LEFT: Form panel ── */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center"
        style={{ background: "#060914", padding: "48px 80px", position: "relative" }}
      >
        {/* Decorative corners */}
        <svg aria-hidden="true" style={{ position: "absolute", top: 24, left: 24, opacity: 0.05, pointerEvents: "none" }} width="40" height="40" viewBox="0 0 40 40">
          <line x1="20" y1="0" x2="20" y2="40" stroke="white" strokeWidth="1"/>
          <line x1="0" y1="20" x2="40" y2="20" stroke="white" strokeWidth="1"/>
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
          <h1 style={{ fontSize: 34, fontWeight: 900, color: "white", letterSpacing: "-0.025em", lineHeight: 1.1, fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Create your account
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
            Your next journey starts here.
          </p>

          <form onSubmit={handleSubmit} noValidate style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Full name */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 7 }}>Full name</label>
              <div style={{ position: "relative" }}>
                <User size={16} color="rgba(255,255,255,0.25)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type="text" placeholder="Jane Doe" autoComplete="name" value={fields.fullName}
                  onChange={(e) => setFields({ ...fields, fullName: e.target.value })}
                  onFocus={() => setFocusField("fullName")} onBlur={() => setFocusField(null)}
                  style={inputStyle("fullName", !!errors.fullName)} />
              </div>
              {errors.fullName && <p style={{ color: "#F87171", fontSize: 12, marginTop: 5 }}>{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 7 }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="rgba(255,255,255,0.25)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type="email" placeholder="you@example.com" autoComplete="email" value={fields.email}
                  onChange={(e) => setFields({ ...fields, email: e.target.value })}
                  onFocus={() => setFocusField("email")} onBlur={() => setFocusField(null)}
                  style={inputStyle("email", !!errors.email)} />
              </div>
              {errors.email && <p style={{ color: "#F87171", fontSize: 12, marginTop: 5 }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 7 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="rgba(255,255,255,0.25)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type={showPw ? "text" : "password"} placeholder="Min. 8 characters" autoComplete="new-password"
                  value={fields.password}
                  onChange={(e) => setFields({ ...fields, password: e.target.value })}
                  onFocus={() => setFocusField("password")} onBlur={() => setFocusField(null)}
                  style={{ ...inputStyle("password", !!errors.password), paddingRight: 46 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", padding: 0, transition: "color 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength meter */}
              {fields.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1, 2, 3, 4].map((seg) => (
                      <div key={seg} style={{ flex: 1, height: 3, borderRadius: 999, background: seg <= strength.level ? strength.color : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 5 }}>
                    Password strength: <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                  </p>
                </div>
              )}
              {errors.password && <p style={{ color: "#F87171", fontSize: 12, marginTop: 5 }}>{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 7 }}>Confirm password</label>
              <div style={{ position: "relative" }}>
                <ShieldCheck size={16} color="rgba(255,255,255,0.25)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type="password" placeholder="Repeat your password" autoComplete="new-password"
                  value={fields.confirmPassword}
                  onChange={(e) => setFields({ ...fields, confirmPassword: e.target.value })}
                  onFocus={() => setFocusField("confirm")} onBlur={() => setFocusField(null)}
                  style={inputStyle("confirm", !!errors.confirmPassword)} />
              </div>
              {errors.confirmPassword && <p style={{ color: "#F87171", fontSize: 12, marginTop: 5 }}>{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="white-btn" style={{ width: "100%", height: 52, fontSize: 15, marginTop: 4, opacity: loading ? 0.8 : 1 }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Creating account…
                </span>
              ) : "Create account"}
            </button>

            {/* Sign in link */}
            <p style={{ textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              Already have an account?{" "}
              <Link href="/auth/signin" style={{ color: "#38BDF8", fontWeight: 600, textDecoration: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}>
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* ── RIGHT: Visual panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2"
        style={{ position: "relative", overflow: "hidden", flexDirection: "column", justifyContent: "flex-end" }}
      >
        <Image
          src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=90"
          alt="Patagonia wild landscape"
          fill priority
          className="object-cover"
          sizes="50vw"
          style={{ objectPosition: "center 35%" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(6,9,20,0.35) 0%, rgba(6,9,20,0.55) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,9,20,0.97) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "15%", background: "linear-gradient(to left, rgba(6,9,20,0.6), transparent)" }} />

        <div style={{ position: "relative", zIndex: 10, padding: 64 }}>
          <p style={{ fontSize: 44, fontWeight: 900, color: "white", lineHeight: 1.05, letterSpacing: "-0.03em", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            The journey
          </p>
          <p style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", fontFamily: "var(--font-playfair, Georgia, serif)", color: "#38BDF8" }}>
            of a thousand miles
          </p>
          <p style={{ fontSize: 44, fontWeight: 900, color: "white", lineHeight: 1.05, letterSpacing: "-0.03em", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            begins today.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
