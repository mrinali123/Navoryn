import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserTrips } from "@/lib/db/trips";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/profile/ProfileForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — Navoryn",
  description: "Manage your Navoryn profile and travel preferences.",
};

function daysBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1);
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const [{ data: profile }, trips] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getUserTrips(user.id),
  ]);

  const totalDays = trips.reduce((s, t) => s + daysBetween(t.arrival_date, t.departure_date), 0);
  const countries = new Set(trips.map((t) => t.destination.split(",").at(-1)?.trim() ?? t.destination)).size;

  // Favorite destination = most-visited
  const destCount: Record<string, number> = {};
  for (const t of trips) destCount[t.destination] = (destCount[t.destination] ?? 0) + 1;
  const favoriteDestination = trips.length > 0
    ? Object.entries(destCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    : undefined;

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Traveler";

  return (
    <div className="min-h-screen bg-navy text-white pb-20 sm:pb-0">
      <Navbar user={{ email: user.email, full_name: displayName }} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-sky/70">Account</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Your Profile</h1>
        </div>
        <ProfileForm
          profile={{
            id: user.id,
            full_name: profile?.full_name ?? "",
            email: user.email ?? "",
            home_city: profile?.home_city,
            default_budget: profile?.default_budget,
            default_interests: profile?.default_interests,
            default_dietary: profile?.default_dietary,
            preferred_currency: profile?.preferred_currency,
          }}
          stats={{
            totalTrips: trips.length,
            countries,
            days: totalDays,
            favoriteDestination,
          }}
        />
      </main>
    </div>
  );
}
