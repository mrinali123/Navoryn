"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, CheckCircle, Calendar, Users, Building2, ArrowRight, Copy, Trash2 } from "lucide-react";
import type { Trip } from "@/types/trip";

const CITY_IMAGES: { city: string; url: string }[] = [
  { city: "paris",      url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80" },
  { city: "tokyo",      url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80" },
  { city: "santorini",  url: "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800&q=80" },
  { city: "bali",       url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80" },
  { city: "new york",   url: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&q=80" },
  { city: "london",     url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80" },
  { city: "dubai",      url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80" },
  { city: "sydney",     url: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&q=80" },
  { city: "barcelona",  url: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80" },
  { city: "amsterdam",  url: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80" },
  { city: "rome",       url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80" },
  { city: "prague",     url: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80" },
  { city: "istanbul",   url: "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&q=80" },
  { city: "singapore",  url: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80" },
  { city: "bangkok",    url: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80" },
  { city: "kyoto",      url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80" },
  { city: "venice",     url: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80" },
  { city: "maldives",   url: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&q=80" },
  { city: "mumbai",     url: "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&q=80" },
  { city: "delhi",      url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80" },
  { city: "new delhi",  url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80" },
  { city: "goa",        url: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80" },
  { city: "jaipur",     url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80" },
  { city: "kerala",     url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80" },
  { city: "varanasi",   url: "https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800&q=80" },
  { city: "agra",       url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80" },
];

const FALLBACK_POOL = [
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&q=80",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
];

function getImage(destination: string): string {
  const lower = destination.toLowerCase();
  const match = CITY_IMAGES.find((c) => lower.includes(c.city));
  if (match) return match.url;
  let h = 0;
  for (let i = 0; i < lower.length; i++) h = ((h << 5) - h + lower.charCodeAt(i)) | 0;
  return FALLBACK_POOL[Math.abs(h) % FALLBACK_POOL.length];
}

function fmtRange(arrival: string, departure: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", opts);
  };
  return `${fmt(arrival)} – ${fmt(departure)}`;
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1);
}

const BUDGET_LABEL: Record<string, string> = {
  budget: "Budget",
  "mid-range": "Mid-range",
  luxury: "Luxury",
};

interface DashboardTripCardProps {
  trip:          Trip;
  isPast?:       boolean;
  showTemplate?: boolean;
  index?:        number;
  onDelete?:     (id: string) => void;
}

export default function DashboardTripCard({
  trip,
  isPast = false,
  showTemplate = false,
  index = 0,
  onDelete,
}: DashboardTripCardProps) {
  const imgUrl = getImage(trip.destination);
  const days   = daysBetween(trip.arrival_date, trip.departure_date);

  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleteHover,   setDeleteHover]   = useState(false);

  function handleTemplate() {
    try {
      localStorage.setItem("navoryn-trip-form", JSON.stringify({
        destination: trip.destination,
        arrivalDate: "", arrivalTime: "",
        departureDate: "", departureTime: "",
        numTravelers: trip.num_travelers,
        tripPurpose: trip.trip_purpose,
        hotelName: trip.hotel_name,
        hotelAddress: trip.hotel_address ?? "",
        checkInTime: "15:00", checkOutTime: "11:00",
        budgetLevel: trip.budget_level,
        interests: trip.interests,
        pace: trip.pace,
        mustVisit: trip.must_visit ?? "",
        dietaryPrefs: trip.dietary_prefs,
      }));
      window.location.href = "/trips/new?from=template";
    } catch {}
  }

  function confirmDelete() {
    setPendingDelete(false);
    onDelete?.(trip.id);
  }

  return (
    <div
      className="animate-fade-up flex flex-col"
      style={{ animationDelay: `${300 + index * 100}ms`, position: "relative" }}
    >
      {/* ── Delete confirmation overlay ── */}
      {pendingDelete && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 20,
            borderRadius: 20,
            background: "rgba(6,8,15,0.93)",
            border: "1px solid rgba(248,113,113,0.2)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 12, padding: "0 24px",
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={20} color="#F87171" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.3 }}>
            Delete this trip?
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.5, maxWidth: 200 }}>
            <strong style={{ color: "rgba(255,255,255,0.65)" }}>{trip.destination.split(",")[0]}</strong>
            {" "}will be permanently removed. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={() => setPendingDelete(false)}
              style={{
                padding: "9px 20px", borderRadius: 10,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: "9px 20px", borderRadius: 10,
                background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.35)",
                color: "#FCA5A5", fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.25)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.15)"; }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Delete icon button (top-left, always visible when onDelete provided) ── */}
      {onDelete && !pendingDelete && (
        <button
          onClick={() => setPendingDelete(true)}
          aria-label="Delete trip"
          onMouseEnter={() => setDeleteHover(true)}
          onMouseLeave={() => setDeleteHover(false)}
          style={{
            position: "absolute", top: 10, left: 10, zIndex: 10,
            width: 30, height: 30, borderRadius: 8,
            background: deleteHover ? "rgba(248,113,113,0.2)" : "rgba(6,8,15,0.65)",
            border: deleteHover ? "1px solid rgba(248,113,113,0.4)" : "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s ease",
            opacity: deleteHover ? 1 : 0.55,
          }}
        >
          <Trash2 size={13} color={deleteHover ? "#FCA5A5" : "rgba(255,255,255,0.75)"} />
        </button>
      )}

      {/* ── Card ── */}
      <Link
        href={`/trips/${trip.id}`}
        className="group relative block overflow-hidden"
        style={{ height: 240, borderRadius: 20, boxShadow: "0 2px 20px rgba(0,0,0,0.4)", textDecoration: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = "0 0 0 1.5px rgba(56,189,248,0.35) inset, 0 16px 48px rgba(0,0,0,0.5)";
          el.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = "0 2px 20px rgba(0,0,0,0.4)";
          el.style.transform = "translateY(0)";
        }}
      >
        {/* Image */}
        <Image
          src={imgUrl} alt={trip.destination} fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Noise grain */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")" }} />

        {/* Overlays */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,8,15,0.95) 0%, rgba(6,8,15,0.4) 50%, transparent 100%)" }} />

        {/* Status badge */}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          {isPast ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "4px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
              <CheckCircle size={10} /> Completed
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "4px 10px", background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", fontSize: 11, fontWeight: 600, color: "#38BDF8" }}>
              <Clock size={10} /> Upcoming
            </span>
          )}
        </div>

        {/* Card content */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 6, fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            {trip.destination.split(",")[0]}
          </h3>

          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              <Calendar size={12} color="rgba(255,255,255,0.35)" />
              {fmtRange(trip.arrival_date, trip.departure_date)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              <Users size={12} color="rgba(255,255,255,0.35)" />
              {trip.num_travelers}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}>{days}d</span>
              <span style={{ borderRadius: 999, padding: "3px 10px", fontSize: 11, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>{BUDGET_LABEL[trip.budget_level] ?? trip.budget_level}</span>
            </div>
            <ArrowRight size={16} color="#38BDF8" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
            <Building2 size={11} color="rgba(255,255,255,0.25)" />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90%" }}>{trip.hotel_name}</span>
          </div>
        </div>
      </Link>

      {showTemplate && (
        <button
          onClick={handleTemplate}
          style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(56,189,248,0.55)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.2s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#38BDF8"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(56,189,248,0.55)"; }}
        >
          <Copy size={11} /> Use as template
        </button>
      )}
    </div>
  );
}
