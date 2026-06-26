"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CURRENCIES } from "@/types/budget";
import { createClient } from "@/lib/supabase/client";

const INTERESTS = [
  "History & Culture", "Food & Dining", "Art & Museums", "Nature & Parks",
  "Shopping", "Nightlife", "Architecture", "Photography",
  "Adventure Sports", "Local Markets", "Beaches", "Wellness & Spas",
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-free", "Halal",
  "Kosher", "Dairy-free", "Nut allergy", "Seafood-free",
];

interface ProfileFormProps {
  profile: {
    id: string;
    full_name: string;
    email: string;
    home_city?: string;
    default_budget?: string;
    default_interests?: string[];
    default_dietary?: string[];
    preferred_currency?: string;
  };
  stats: {
    totalTrips: number;
    countries: number;
    days: number;
    favoriteDestination?: string;
  };
}

export default function ProfileForm({ profile, stats }: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [homeCity, setHomeCity] = useState(profile.home_city ?? "");
  const [defaultBudget, setDefaultBudget] = useState(profile.default_budget ?? "mid-range");
  const [interests, setInterests] = useState<string[]>(profile.default_interests ?? []);
  const [dietary, setDietary] = useState<string[]>(profile.default_dietary ?? []);
  const [currency, setCurrency] = useState(profile.preferred_currency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete account");
      // Clear all locally cached trip data and form state
      try {
        const keysToRemove = Object.keys(localStorage).filter((k) =>
          k.startsWith("navoryn-")
        );
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
      // Sign out client-side so the session cookie is cleared before navigating
      await createClient().auth.signOut();
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  function toggleArr(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  const initials = (fullName || profile.email)
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || "?";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          home_city: homeCity,
          default_budget: defaultBudget,
          default_interests: interests,
          default_dietary: dietary,
          preferred_currency: currency,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Avatar + stats */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-sky/20 text-3xl font-bold text-sky border-2 border-sky/30">
          {initials}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-white">{fullName || profile.email}</h2>
          <p className="text-sm text-slate-400">{profile.email}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-4 sm:justify-start">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.totalTrips}</p>
              <p className="text-xs text-slate-500">Trips</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.countries}</p>
              <p className="text-xs text-slate-500">Countries</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.days}</p>
              <p className="text-xs text-slate-500">Days traveled</p>
            </div>
            {stats.favoriteDestination && (
              <div className="text-center">
                <p className="text-xl font-bold text-white text-sm leading-tight">{stats.favoriteDestination}</p>
                <p className="text-xs text-slate-500">Favorite</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic info */}
        <div className="rounded-2xl border border-slate-700/60 bg-navy-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Basic info</h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-700 bg-navy px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-sky/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Home city</label>
            <input
              value={homeCity}
              onChange={(e) => setHomeCity(e.target.value)}
              placeholder="e.g. London"
              className="w-full rounded-xl border border-slate-700 bg-navy px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-sky/50"
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-2xl border border-slate-700/60 bg-navy-800 p-5 space-y-5">
          <h3 className="text-sm font-semibold text-white">Default trip preferences</h3>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Default budget</label>
            <div className="flex gap-2">
              {["budget", "mid-range", "luxury"].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setDefaultBudget(b)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-medium capitalize transition ${
                    defaultBudget === b
                      ? "border-sky/60 bg-sky/10 text-sky"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Preferred currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-navy px-3 py-2 text-sm text-white outline-none focus:border-sky/50"
            >
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Default interests</label>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleArr(interests, setInterests, i)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    interests.includes(i)
                      ? "border-sky/60 bg-sky/10 text-sky"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Dietary preferences</label>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleArr(dietary, setDietary, d)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    dietary.includes(d)
                      ? "border-sky/60 bg-sky/10 text-sky"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-sky py-3 text-sm font-semibold text-navy transition hover:bg-sky-hover disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-800/40 bg-red-900/10 p-5">
        <h3 className="mb-3 text-sm font-semibold text-red-400">Danger zone</h3>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-2 text-xs font-medium text-red-300 transition hover:bg-red-900/40"
          >
            Delete account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-red-300">
              This will permanently delete your account and all trips. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full rounded-xl border border-red-800/60 bg-red-900/10 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
            />
            <div className="flex gap-2">
              <button
                disabled={deleteInput !== "DELETE" || deleting}
                className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-2 text-xs font-medium text-red-300 transition hover:bg-red-900/50 disabled:opacity-40"
                onClick={handleDeleteAccount}
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
