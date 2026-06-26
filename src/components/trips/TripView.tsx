"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

import toast from "react-hot-toast";
import {
  ChevronLeft, MapPin, Calendar, Users, Building2, Wallet, Map,
  Download, Share2, UserPlus, PenLine, Globe, Cloud, Sun, CloudRain,
  CloudSnow, CloudLightning, CloudFog, MessageCircle, Compass,
} from "lucide-react";
import type { TripWithDays } from "@/types/trip";
import type { WeatherForecast } from "@/types/weather";
import DayTimeline from "@/components/itinerary/DayTimeline";
import WeatherCard from "@/components/itinerary/WeatherCard";
import QuickTipsCard from "@/components/itinerary/QuickTipsCard";
import MealsCard from "@/components/itinerary/MealsCard";
import ShareModal from "@/components/ShareModal";
import ChatPanel from "@/components/chat/ChatPanel";
import BudgetTracker from "@/components/budget/BudgetTracker";
import InviteModal from "@/components/collaborate/InviteModal";
import CollaboratorAvatars from "@/components/collaborate/CollaboratorAvatars";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { cacheTrip } from "@/lib/offline-cache";

import TripMap from "@/components/map/TripMap";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatShortRange(arrival: string, departure: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const fmt = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", opts); };
  return `${fmt(arrival)} – ${fmt(departure)}`;
}

function getWeatherIcon(condition?: string) {
  if (!condition) return Sun;
  const c = condition.toLowerCase();
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return CloudRain;
  if (c.includes("snow") || c.includes("sleet") || c.includes("blizzard")) return CloudSnow;
  if (c.includes("thunder") || c.includes("storm")) return CloudLightning;
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return CloudFog;
  if (c.includes("cloud") || c.includes("overcast") || c.includes("partly")) return Cloud;
  return Sun;
}

interface Collab {
  id: string; invited_email: string; accepted_at: string | null; role: string;
}
interface TripViewProps {
  trip: TripWithDays; readOnly?: boolean; userEmail?: string; isOwner?: boolean;
}
type ActiveTab = number | "budget";

// ── destination images ────────────────────────────────────────────────────────

const DEST_IMAGES: Record<string, string> = {
  paris:          "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80",
  tokyo:          "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80",
  bali:           "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80",
  maldives:       "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&q=80",
  santorini:      "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=1600&q=80",
  kyoto:          "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=80",
  dubai:          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80",
  goa:            "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1600&q=80",
  manali:         "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1600&q=80",
  jaipur:         "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1600&q=80",
  kerala:         "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1600&q=80",
  ladakh:         "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1600&q=80",
  new_york:       "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1600&q=80",
  new_york_city:  "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1600&q=80",
  london:         "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80",
  rome:           "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&q=80",
  singapore:      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1600&q=80",
  thailand:       "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=1600&q=80",
  barcelona:      "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1600&q=80",
  amsterdam:      "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1600&q=80",
  istanbul:       "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&q=80",
  prague:         "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1600&q=80",
  vienna:         "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1600&q=80",
  munich:         "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=1600&q=80",
  new_delhi:      "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1600&q=80",
  mumbai:         "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1600&q=80",
  kolkata:        "https://images.unsplash.com/photo-1558431382-27e303142255?w=1600&q=80",
  varanasi:       "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1600&q=80",
};

function getDestinationImage(dest: string): string {
  const key = dest.toLowerCase().split(",")[0].trim().replace(/\s+/g, "_");
  for (const [k, v] of Object.entries(DEST_IMAGES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80";
}

// ── main component ────────────────────────────────────────────────────────────

export default function TripView({ trip, readOnly = false, userEmail, isOwner = true }: TripViewProps) {
  const [activeTab, setActiveTab]           = useState<ActiveTab>(0);
  const [mapOpen, setMapOpen]               = useState(false);
  const [shareOpen, setShareOpen]           = useState(false);
  const [inviteOpen, setInviteOpen]         = useState(false);
  const [chatOpen, setChatOpen]             = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>();
  const [isPublic, setIsPublic]             = useState(trip.is_public ?? false);
  const [shareToken, setShareToken]         = useState(trip.share_token ?? null);
  const [pdfLoading, setPdfLoading]         = useState(false);
  const [weather, setWeather]               = useState<WeatherForecast | null>(null);
  const [collaborators, setCollaborators]   = useState<Collab[]>([]);
  const [mounted, setMounted]               = useState(false);
  const [isOffline, setIsOffline]           = useState(false);

  const heroImgRef  = useRef<HTMLDivElement>(null);
  const navRef      = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const days       = trip.itinerary_days;
  const activeDay  = typeof activeTab === "number" ? activeTab : 0;
  const currentDay = days[activeDay];
  const currency   = trip.preferred_currency ?? "INR";
  const destImage  = getDestinationImage(trip.destination);
  const totalPlaces = days.reduce((s, d) => s + d.places.length, 0);

  // Page load animation
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  // Cache trip for offline access + detect connectivity
  useEffect(() => {
    cacheTrip(trip);
    setIsOffline(!navigator.onLine);
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [trip]);

  // Parallax
  useEffect(() => {
    function onScroll() {
      if (heroImgRef.current) {
        heroImgRef.current.style.transform = `translateY(${window.scrollY * 0.28}px)`;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Weather fetch
  useEffect(() => {
    if (readOnly) return;
    fetch(`/api/trips/${trip.id}/weather`).then((r) => r.ok ? r.json() : null).then((d) => d && setWeather(d)).catch(() => null);
  }, [trip.id, readOnly]);

  // Collaborators fetch
  useEffect(() => {
    if (readOnly) return;
    fetch(`/api/trips/${trip.id}/collaborators`).then((r) => r.ok ? r.json() : null).then((d) => d && setCollaborators(d.collaborators ?? [])).catch(() => null);
  }, [trip.id, readOnly]);

  // Map flyto event — open map then scroll to it after DOM updates
  useEffect(() => {
    const h = () => {
      setMapOpen(true);
      // setTimeout lets React re-render and mount #trip-map-section before scrolling
      setTimeout(() => {
        document.getElementById("trip-map-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    };
    window.addEventListener("navoryn:flyto", h);
    return () => window.removeEventListener("navoryn:flyto", h);
  }, []);

  // Ask AI event
  useEffect(() => {
    function h(e: Event) {
      const { message } = (e as CustomEvent<{ message: string }>).detail;
      setChatInitialMessage(message);
      setChatOpen(true);
    }
    window.addEventListener("navoryn:ask-ai", h);
    return () => window.removeEventListener("navoryn:ask-ai", h);
  }, []);

  // Touch swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || activeTab === "budget") return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current ?? 0));
    if (Math.abs(dx) > 50 && dy < 60) {
      const nextDay = typeof activeTab === "number"
        ? (dx < 0 ? Math.min(activeTab + 1, days.length - 1) : Math.max(activeTab - 1, 0))
        : activeTab;
      setActiveTab(nextDay);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/export-pdf`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `navoryn-${trip.destination.toLowerCase().replace(/\s+/g, "-")}-${trip.arrival_date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  const weatherForDay = useCallback(
    (date: string) => weather?.daily.find((d) => d.date === date) ?? null,
    [weather]
  );

  const currentApiWeather = currentDay ? weatherForDay(currentDay.date) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#07090F", color: "white", position: "relative" }}>

      {/* ── Offline banner ── */}
      {isOffline && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "rgba(15,23,42,0.96)", borderBottom: "1px solid rgba(56,189,248,0.2)", backdropFilter: "blur(12px)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0, boxShadow: "0 0 8px #f59e0b" }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            You are offline — viewing cached itinerary. AI chat, maps and PDF export are unavailable.
          </span>
        </div>
      )}

      {/* ── Fixed ambient background ── */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-5%", right: "-3%", width: 800, height: 800, borderRadius: "50%", background: "rgba(56,189,248,0.04)", filter: "blur(150px)" }} />
        <div style={{ position: "absolute", top: "40%", left: "-5%", width: 600, height: 600, borderRadius: "50%", background: "rgba(56,189,248,0.02)", filter: "blur(120px)" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "30%", width: 400, height: 400, borderRadius: "50%", background: "rgba(245,158,11,0.025)", filter: "blur(100px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <div style={{ position: "relative", height: "clamp(300px, 42vw, 500px)", overflow: "hidden", zIndex: 1 }}>
        {/* Parallax image container */}
        <div ref={heroImgRef} style={{ position: "absolute", inset: "-60px -0px", willChange: "transform" }}>
          <Image
            src={destImage} alt={trip.destination} fill priority
            className="object-cover" sizes="100vw"
            style={{ objectPosition: "center 40%" }}
          />
        </div>

        {/* Overlay stack */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(7,9,15,0.38)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(7,9,15,0.82) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #07090F 0%, transparent 55%)" }} />
        {/* Film grain */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")", opacity: 0.5 }} />

        {/* Top nav row */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          padding: "24px 60px",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {!readOnly ? (
              <>
                <Link
                  href="/dashboard"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.85)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)"; }}
                >
                  <ChevronLeft size={17} /> Back to trips
                </Link>
                <CollaboratorAvatars collaborators={collaborators} ownerEmail={userEmail} onManage={() => setInviteOpen(true)} />
              </>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "6px 16px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", fontSize: 13, color: "#38BDF8" }}>
                <Globe size={13} />
                Crafted with Navoryn —{" "}
                <Link href="/auth/signup" style={{ color: "#38BDF8", textDecoration: "underline" }}>plan yours free</Link>
              </div>
            )}
          </div>
        </div>

        {/* 3D Floating stat cards (desktop only) */}
        <div style={{
          position: "absolute", top: 64, right: 60, zIndex: 10, display: "flex", flexDirection: "column", gap: 12,
          opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease 0.3s",
        }} className="hidden lg:flex">
          {/* Card 1 — front */}
          <div style={{
            background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "16px 20px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)",
            transform: "perspective(1000px) rotateY(-8deg) rotateX(4deg)",
          }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Total Places</p>
            <p style={{ fontSize: 34, fontWeight: 800, color: "#38BDF8", lineHeight: 1 }}>{totalPlaces}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 5 }}>across {days.length} day{days.length !== 1 ? "s" : ""}</p>
          </div>
          {/* Card 2 — behind */}
          {trip.estimated_budget && (
            <div style={{
              background: "rgba(255,255,255,0.05)", backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 18px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
              transform: "perspective(1000px) rotateY(-12deg) rotateX(5deg) translateX(14px) translateY(6px)",
            }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>Est. Budget</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", lineHeight: 1.3 }}>{trip.estimated_budget}</p>
            </div>
          )}
        </div>

        {/* Hero bottom content */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "0 60px 44px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
        }}>
          {/* Destination badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <MapPin size={13} color="#38BDF8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#38BDF8", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {trip.destination.split(",")[0]}
            </span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: "clamp(28px, 4.5vw, 54px)", fontWeight: 800, color: "white", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16, maxWidth: 700 }}>
            {trip.trip_title}
          </h1>

          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 22 }}>
            {[
              { icon: Calendar,  text: formatShortRange(trip.arrival_date, trip.departure_date) },
              { icon: Users,     text: `${trip.num_travelers} Traveler${trip.num_travelers !== 1 ? "s" : ""}` },
              { icon: Building2, text: trip.hotel_name },
              { icon: Wallet,    text: trip.budget_level.charAt(0).toUpperCase() + trip.budget_level.slice(1) },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "rgba(255,255,255,0.58)" }}>
                <Icon size={14} color="rgba(255,255,255,0.38)" />
                {text}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {!readOnly && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { icon: Map,      label: mapOpen ? "Hide Map" : "Map View", onClick: () => setMapOpen((v) => !v), active: mapOpen },
                { icon: Download, label: pdfLoading ? "Generating…" : "Download PDF", onClick: handleDownloadPdf, disabled: pdfLoading },
                { icon: Share2,   label: "Share",  onClick: () => setShareOpen(true) },
                ...(isOwner ? [{ icon: UserPlus, label: "Invite", onClick: () => setInviteOpen(true) }] : []),
              ].map(({ icon: Icon, label, onClick, active, disabled }) => (
                <button
                  key={label}
                  onClick={onClick}
                  disabled={disabled}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500,
                    background: active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.08)",
                    border: active ? "1px solid rgba(56,189,248,0.45)" : "1px solid rgba(255,255,255,0.13)",
                    color: active ? "#38BDF8" : "rgba(255,255,255,0.82)",
                    backdropFilter: "blur(12px)", cursor: "pointer",
                    transition: "all 0.2s ease",
                    opacity: disabled ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.transform = "translateY(-1px)";
                      el.style.borderColor = active ? "rgba(56,189,248,0.7)" : "rgba(255,255,255,0.28)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = "translateY(0)";
                    el.style.borderColor = active ? "rgba(56,189,248,0.45)" : "rgba(255,255,255,0.13)";
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
              {isOwner && (
                <Link
                  href={`/trips/${trip.id}/edit`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none",
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)",
                    color: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = "translateY(-1px)";
                    el.style.borderColor = "rgba(255,255,255,0.28)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = "translateY(0)";
                    el.style.borderColor = "rgba(255,255,255,0.13)";
                  }}
                >
                  <PenLine size={14} /> Edit
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════ STICKY DAY NAV ══════════════════════════ */}
      <div
        ref={navRef}
        style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(7,9,15,0.88)", backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(-16px)",
          transition: "opacity 0.5s ease 0.4s, transform 0.5s ease 0.4s",
        }}
      >
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 60px", display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: 16 }}>
          {/* Day tabs */}
          <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
            {days.map((day, idx) => {
              const isActive = activeTab === idx;
              const apiW     = weatherForDay(day.date);
              const aiW      = day.weather;
              const condStr  = aiW?.condition ?? apiW?.condition;
              const WIcon    = getWeatherIcon(condStr);
              const tempStr  = aiW?.temperature_high ?? (apiW ? `${apiW.maxTemp}°` : null);

              return (
                <button
                  key={day.id}
                  onClick={() => setActiveTab(idx)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", flexShrink: 0,
                    padding: "20px 22px", cursor: "pointer", position: "relative",
                    background: isActive ? "rgba(56,189,248,0.05)" : "transparent",
                    border: "none", borderRight: "1px solid rgba(255,255,255,0.05)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: isActive ? "#38BDF8" : "rgba(255,255,255,0.3)", marginBottom: 4 }}>
                    Day {String(day.day_number).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? "white" : "rgba(255,255,255,0.42)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {day.theme}
                  </span>
                  {tempStr && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
                      <WIcon size={11} color={isActive ? "#38BDF8" : "rgba(255,255,255,0.22)"} />
                      <span style={{ fontSize: 11, color: isActive ? "white" : "rgba(255,255,255,0.25)" }}>{tempStr}</span>
                    </div>
                  )}
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#38BDF8" }} />
                  )}
                </button>
              );
            })}

            {/* Budget tab */}
            {!readOnly && (
              <button
                onClick={() => setActiveTab("budget")}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", flexShrink: 0,
                  padding: "20px 22px", cursor: "pointer", position: "relative",
                  background: activeTab === "budget" ? "rgba(16,185,129,0.05)" : "transparent",
                  border: "none", transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { if (activeTab !== "budget") (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (activeTab !== "budget") (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: activeTab === "budget" ? "#10B981" : "rgba(255,255,255,0.3)", marginBottom: 4 }}>Budget</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: activeTab === "budget" ? "white" : "rgba(255,255,255,0.42)" }}>Tracker</span>
                {activeTab === "budget" && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#10B981" }} />
                )}
              </button>
            )}
          </div>

          {/* View toggle: Timeline | Map */}
          {typeof activeTab === "number" && (
            <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 4 }}>
                {[
                  { key: "timeline", icon: Compass, label: "Timeline" },
                  { key: "map",      icon: Map,      label: "Map" },
                ].map(({ key, icon: Icon, label }) => {
                  const isActive = key === "timeline" ? !mapOpen : mapOpen;
                  return (
                    <button
                      key={key}
                      onClick={() => setMapOpen(key === "map")}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
                        color: isActive ? "white" : "rgba(255,255,255,0.38)",
                        fontSize: 12, fontWeight: 500, transition: "all 0.18s",
                      }}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════ MAIN CONTENT ══════════════════════════ */}
      <div style={{ position: "relative", maxWidth: 1300, margin: "0 auto", padding: "48px 60px 80px" }}>

        {activeTab === "budget" ? (
          <BudgetTracker tripId={trip.id} estimatedBudget={trip.estimated_budget} currency={currency} />
        ) : (
          <>
            {/* Map section */}
            {mapOpen && !readOnly && (
              <div id="trip-map-section" className="animate-step-enter" style={{ marginBottom: 40 }}>
                <ErrorBoundary label="Map" fallback={
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
                    Map unavailable — view the timeline instead
                  </div>
                }>
                  <TripMap trip={trip} activeDayIndex={activeDay} />
                </ErrorBoundary>
              </div>
            )}

            {/* Two-column layout */}
            <div
              style={{ display: "flex", gap: 32, alignItems: "flex-start" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Left: timeline (65%) */}
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                {currentDay ? (
                  <DayTimeline
                    key={currentDay.id}
                    day={currentDay}
                    weatherHourly={weather?.hourly}
                  />
                ) : (
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>No days found for this trip.</p>
                )}
              </div>

              {/* Right: sidebar (35%, sticky) */}
              {currentDay && (
                <div
                  className="hidden lg:flex"
                  style={{
                    width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16,
                    position: "sticky", top: 88,
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateX(0)" : "translateX(20px)",
                    transition: "opacity 0.5s ease 0.6s, transform 0.5s ease 0.6s",
                  }}
                >
                  <WeatherCard
                    aiWeather={currentDay.weather}
                    apiWeather={currentApiWeather ?? undefined}
                  />
                  {currentDay.quick_tips && currentDay.quick_tips.length > 0 && (
                    <QuickTipsCard tips={currentDay.quick_tips} />
                  )}
                  {currentDay.meals && currentDay.meals.length > 0 && (
                    <MealsCard meals={currentDay.meals} />
                  )}
                </div>
              )}
            </div>

            {/* Mobile: right column cards above (shown below timeline on mobile) */}
            {currentDay && (
              <div className="lg:hidden mt-8 flex flex-col gap-4">
                <WeatherCard aiWeather={currentDay.weather} apiWeather={currentApiWeather ?? undefined} />
                {currentDay.quick_tips && currentDay.quick_tips.length > 0 && (
                  <QuickTipsCard tips={currentDay.quick_tips} />
                )}
                {currentDay.meals && currentDay.meals.length > 0 && (
                  <MealsCard meals={currentDay.meals} />
                )}
              </div>
            )}

            {/* General tips */}
            {trip.general_tips?.length > 0 && (
              <div style={{ marginTop: 48, borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Compass size={16} color="#38BDF8" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "white" }}>General Travel Tips</h3>
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {trip.general_tips.map((tip, i) => (
                    <li key={i} style={{ display: "flex", gap: 12, fontSize: 14, color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                      <span style={{ color: "#38BDF8", flexShrink: 0, marginTop: 3, fontSize: 10 }}>●</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile sticky bottom bar */}
      {typeof activeTab === "number" && days.length > 1 && (
        <div className="lg:hidden" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(7,9,15,0.96)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Day {activeDay + 1} of {days.length}
            {currentDay && <span style={{ color: "rgba(255,255,255,0.28)" }}> · {currentDay.theme}</span>}
          </p>
          {activeDay < days.length - 1 && (
            <button
              onClick={() => setActiveTab(activeDay + 1)}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#38BDF8", background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 10, padding: "8px 16px", cursor: "pointer" }}
            >
              Next Day <ChevronLeft size={13} style={{ transform: "rotate(180deg)" }} />
            </button>
          )}
        </div>
      )}

      {/* ── Floating AI chat button ── */}
      {!readOnly && (
        <>
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              style={{
                position: "fixed", bottom: 88, right: 24, zIndex: 40,
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, #38BDF8, #0EA5E9)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 24px rgba(56,189,248,0.45)",
                animation: "pulse-ring 2s ease-in-out infinite",
                transition: "transform 0.2s",
              }}
              className="sm:bottom-6 hover:scale-110 active:scale-95"
              title="Chat with Navoryn AI"
            >
              <MessageCircle size={22} color="white" />
              <span style={{ position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: "50%", background: "#07090F", border: "2px solid #07090F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#38BDF8", boxShadow: "0 0 8px rgba(56,189,248,0.5)" }}>
                AI
              </span>
            </button>
          )}
          <ChatPanel
            trip={trip}
            currentDayIndex={activeDay}
            isOpen={chatOpen}
            onClose={() => { setChatOpen(false); setChatInitialMessage(undefined); }}
            initialMessage={chatInitialMessage}
          />
        </>
      )}

      {/* Share modal */}
      {shareOpen && (
        <ShareModal
          tripId={trip.id} tripTitle={trip.trip_title} destination={trip.destination}
          isPublic={isPublic} shareToken={shareToken}
          onClose={() => setShareOpen(false)}
          onShareSettingsChange={(pub, token) => { setIsPublic(pub); setShareToken(token); }}
        />
      )}

      {/* Invite modal */}
      {inviteOpen && <InviteModal tripId={trip.id} onClose={() => setInviteOpen(false)} />}
    </div>
  );
}
