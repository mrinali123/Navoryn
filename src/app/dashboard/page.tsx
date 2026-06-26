import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import DashboardChatButton from "@/components/chat/DashboardChatButton";
import DashboardTabs from "@/components/DashboardTabs";
import HeroCarousel from "@/components/dashboard/HeroCarousel";
import StatCard from "@/components/dashboard/StatCard";
import InspirationStrip from "@/components/dashboard/InspirationStrip";
import { createClient } from "@/lib/supabase/server";
import { getUserTrips } from "@/lib/db/trips";
import type { Profile } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Navoryn",
  description: "Your travel dashboard. View and manage all your AI-planned trips.",
};

function daysBetween(arrival: string, departure: string): number {
  return Math.max(1, Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86_400_000) + 1);
}

function getFavourite(destinations: string[]): string {
  if (!destinations.length) return "—";
  const counts: Record<string, number> = {};
  for (const d of destinations) {
    const city = d.split(",")[0].trim();
    counts[city] = (counts[city] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const [profile, trips] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>().then(({ data }) => data),
    getUserTrips(user.id),
  ]);

  const displayName =
    profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Traveler";
  const firstName = displayName.split(" ")[0];

  const today = new Date().toISOString().split("T")[0];
  const upcoming = trips.filter((t) => t.departure_date >= today);
  const past     = trips.filter((t) => t.departure_date < today);

  const totalDays       = trips.reduce((s, t) => s + daysBetween(t.arrival_date, t.departure_date), 0);
  const uniqueCountries = new Set(trips.map((t) => t.destination.split(",").at(-1)?.trim() ?? t.destination)).size;
  const favourite       = getFavourite(trips.map((t) => t.destination));

  const stats = [
    { value: trips.length,    label: "Trips Planned", subtitle: "adventures planned and crafted",    accent: "#38BDF8", accentSecondary: "#0EA5E9", type: "trips"     as const },
    { value: uniqueCountries, label: "Countries",     subtitle: "unique destinations explored", accent: "#10B981", accentSecondary: "#34D399", type: "countries" as const },
    { value: totalDays,       label: "Days Traveled", subtitle: "days of exploration & wonder", accent: "#F59E0B", accentSecondary: "#FBBF24", type: "days"      as const },
    { value: favourite,       label: "Favourite",     subtitle: "your most-visited destination",accent: "#F0B429", accentSecondary: "#FBBF24", type: "favourite" as const },
  ];


  return (
    <div
      className="min-h-screen pb-20 text-white sm:pb-0"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.08) 0%, transparent 70%), rgb(var(--color-navy))",
        position: "relative",
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
      <Navbar user={{ email: user.email, full_name: displayName }} />

      {/* ── Full-width hero carousel ── */}
      <HeroCarousel userName={firstName} />

      {/* ── Indian destinations inspiration strip ── */}
      <InspirationStrip />

      {/* ── Content (scoped so light mode CSS overrides apply) ── */}
      <main className="mx-auto max-w-5xl px-4 py-10">

        {/* ── Stats bar ── */}
        <div className="mb-10 flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0">
          {stats.map((s, i) => (
            <StatCard
              key={s.label}
              value={s.value}
              label={s.label}
              subtitle={s.subtitle}
              accent={s.accent}
              accentSecondary={s.accentSecondary}
              type={s.type}
              delay={100 + i * 100}
            />
          ))}
        </div>

        {/* ── Trips section with tourist-place background ── */}
        <section
          className="animate-fade-up relative overflow-hidden rounded-3xl p-6 sm:p-8"
          style={{ animationDelay: "200ms" }}
        >
          {/* Tourist background image */}
          <div className="pointer-events-none absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&q=80"
              alt=""
              fill
              className="object-cover"
              style={{ opacity: 0.055 }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgb(var(--color-navy) / 0.97) 0%, rgb(var(--color-navy-800) / 0.93) 100%)",
              }}
            />
          </div>

          {/* Subtle border */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          />

          {/* Content */}
          <div className="relative">
            <DashboardTabs upcoming={upcoming} past={past} />
          </div>
        </section>

        {/* ── New Trip CTA (desktop) ── */}
        <div
          className="mt-6 animate-fade-up hidden sm:flex items-center justify-between rounded-2xl px-8 py-6 relative overflow-hidden"
          style={{
            animationDelay: "350ms",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(56,189,248,0.15)",
          }}
        >
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 4 }}>
              Ready for your next adventure?
            </p>
          </div>
          <Link
            href="/trips/new"
            className="white-btn shrink-0"
            style={{ padding: "11px 24px", fontSize: 14, whiteSpace: "nowrap" }}
          >
            Plan a Trip
          </Link>
        </div>
      </main>

      {/* ── Mobile floating action button ── */}
      <Link
        href="/trips/new"
        aria-label="Plan a new trip"
        className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sky text-white animate-fab-pulse sm:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><line x1="10" y1="3" x2="10" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="17" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
      </Link>

      <DashboardChatButton />
      </div>{/* /relative z-1 */}
    </div>
  );
}
