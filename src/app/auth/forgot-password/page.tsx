"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { sendPasswordResetEmail } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sent, setSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  function validate(): boolean {
    if (!email.trim()) { setEmailError("Email is required."); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError("Enter a valid email address."); return false; }
    setEmailError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await sendPasswordResetEmail(email);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    setResendCountdown(60);
    toast.success("Password reset email sent!");
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setLoading(true);
    await sendPasswordResetEmail(email);
    setLoading(false);
    setResendCountdown(60);
    toast.success("Reset link resent!");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ position: "relative", background: "#0A0F1E" }}
    >
      {/* BG image */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Image
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80"
          alt="Misty mountains"
          fill priority
          className="object-cover"
          style={{ opacity: 0.15 }}
          sizes="100vw"
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,30,0.85)" }} />
      </div>

      {/* Card */}
      <div
        style={{
          position: "relative", zIndex: 10, width: "100%", maxWidth: 480,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
          borderRadius: 24, padding: "48px 40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 no-underline">
            <span className="text-2xl">✈️</span>
            <span className="gradient-text text-2xl font-bold" style={{ letterSpacing: "-0.02em" }}>Navoryn</span>
          </Link>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            style={{
              width: 72, height: 72, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
              background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)",
              boxShadow: "0 0 40px rgba(56,189,248,0.2)",
            }}
          >
            ✉️
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          Reset your password
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center", marginBottom: 32 }}>
          Enter your email and we&apos;ll send you a reset link
        </p>

        {sent ? (
          /* ── Success state ── */
          <div>
            <div
              style={{
                textAlign: "center", padding: "24px 20px", borderRadius: 16, marginBottom: 24,
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Check your inbox!</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
                We sent a reset link to{" "}
                <strong style={{ color: "white" }}>{email}</strong>
              </p>
            </div>

            <button
              onClick={handleResend}
              disabled={resendCountdown > 0 || loading}
              style={{
                width: "100%", padding: "12px 20px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                color: resendCountdown > 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)",
                fontSize: 14, cursor: resendCountdown > 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s", marginBottom: 16,
              }}
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend reset link"}
            </button>

            <div className="text-center">
              <Link href="/auth/signin" style={{ color: "#38BDF8", fontSize: 14, textDecoration: "none" }} className="hover:underline">
                ← Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                  Email address
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>✉️</span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                    style={{
                      width: "100%", padding: "14px 16px 14px 44px", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.05)", border: `1px solid ${emailError ? "#F87171" : "rgba(255,255,255,0.10)"}`,
                      borderRadius: 12, color: "white", fontSize: 15, outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#38BDF8"; e.target.style.boxShadow = "0 0 0 3px rgba(56,189,248,0.15)"; }}
                    onBlur={(e) => { e.target.style.borderColor = emailError ? "#F87171" : "rgba(255,255,255,0.10)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                {emailError && <p style={{ color: "#F87171", fontSize: 12, marginTop: 4 }}>{emailError}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="gradient-btn w-full"
                style={{ height: 52, fontSize: 16, borderRadius: 12, opacity: loading ? 0.75 : 1 }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" style={{ display: "inline-block" }} />
                    Sending…
                  </span>
                ) : "Send reset link"}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link href="/auth/signin" style={{ color: "#38BDF8", fontSize: 14, textDecoration: "none" }} className="hover:underline">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
