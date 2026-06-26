"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Collab {
  id: string;
  invited_email: string;
  role: string;
  accepted_at: string | null;
  invited_at: string;
}

interface InviteModalProps {
  tripId: string;
  onClose: () => void;
}

export default function InviteModal({ tripId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [collaborators, setCollaborators] = useState<Collab[]>([]);
  const [inviteResult, setInviteResult] = useState<{ email: string; url: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/collaborators`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCollaborators(d.collaborators ?? []))
      .catch(() => null);
  }, [tripId]);

  async function fetchCollaborators() {
    const res = await fetch(`/api/trips/${tripId}/collaborators`);
    if (res.ok) {
      const json = await res.json();
      setCollaborators(json.collaborators ?? []);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setInviteResult(null);
    const trimmed = email.trim();
    try {
      const res = await fetch(`/api/trips/${tripId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role: "viewer" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setInviteResult({
        email: trimmed,
        url: json.invite_url,
        emailSent: json.email_sent ?? false,
      });
      setEmail("");
      fetchCollaborators();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/trips/${tripId}/collaborators?collaboratorId=${id}`, {
      method: "DELETE",
    });
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
    toast.success("Collaborator removed");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-[#0B1523] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Invite collaborators</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">✕</button>
        </div>

        {/* Invite form */}
        <form onSubmit={handleInvite} className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 rounded-xl border border-slate-700 bg-navy px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-sky/50"
          />
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="rounded-xl bg-sky px-4 py-2 text-sm font-semibold text-navy transition hover:bg-sky-hover disabled:opacity-40"
          >
            {sending ? "…" : "Invite"}
          </button>
        </form>

        {/* Invite result */}
        {inviteResult && (
          <div className="mb-5 rounded-xl border border-slate-700/60 bg-navy-800 p-4 space-y-3">
            {inviteResult.emailSent ? (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-sm">✓</span>
                <p className="text-xs text-emerald-300">
                  Email sent to <strong>{inviteResult.email}</strong>
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Share this link with <strong className="text-white">{inviteResult.email}</strong>:
              </p>
            )}
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate rounded-lg bg-navy px-3 py-1.5 text-xs font-mono text-slate-300 select-all border border-slate-700/60">
                {inviteResult.url}
              </p>
              <button
                onClick={copyLink}
                className="shrink-0 rounded-lg border border-sky/40 bg-sky/10 px-3 py-1.5 text-xs font-semibold text-sky hover:bg-sky/20 transition"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Collaborator list */}
        {collaborators.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">
              People with access
            </p>
            {collaborators.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-navy-800 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                    {c.invited_email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{c.invited_email}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {c.accepted_at ? `Accepted · ${c.role}` : "Invite sent"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(c.id)}
                  className="text-xs text-slate-500 hover:text-red-400 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {collaborators.length === 0 && !inviteResult && (
          <p className="text-center text-sm text-slate-500">
            No collaborators yet — invite someone above
          </p>
        )}
      </div>
    </div>
  );
}
