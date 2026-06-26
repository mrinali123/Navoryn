"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Clock, Timer, Lightbulb, MessageCircle, Navigation, Landmark, Building,
  TreePine, ShoppingBag, Moon, Palette, Camera, Coffee, Zap,
  Train, Hotel, Eye, type LucideIcon,
} from "lucide-react";
import type { Place, PlaceType } from "@/types/trip";
import type { WeatherHour } from "@/types/weather";
import WeatherBadge from "@/components/weather/WeatherBadge";
import { getWeatherForTime } from "@/lib/weather";

// ── type metadata ─────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  landmark:      "#38BDF8",
  museum:        "#A855F7",
  nature:        "#22C55E",
  shopping:      "#F97316",
  bar:           "#EC4899",
  nightlife:     "#EC4899",
  viewpoint:     "#38BDF8",
  market:        "#F59E0B",
  activity:      "#22C55E",
  art:           "#F59E0B",
  restaurant:    "#F97316",
  cafe:          "#F97316",
  transport:     "rgba(255,255,255,0.35)",
  accommodation: "#A855F7",
};

const TYPE_RGB: Record<string, string> = {
  landmark:      "56,189,248",
  museum:        "168,85,247",
  nature:        "34,197,94",
  shopping:      "249,115,22",
  bar:           "236,72,153",
  viewpoint:     "56,189,248",
  market:        "245,158,11",
  activity:      "34,197,94",
  restaurant:    "249,115,22",
  cafe:          "249,115,22",
  transport:     "255,255,255",
  accommodation: "168,85,247",
};

const TYPE_ICON: Record<string, LucideIcon> = {
  landmark:      Landmark,
  museum:        Building,
  nature:        TreePine,
  shopping:      ShoppingBag,
  bar:           Moon,
  nightlife:     Moon,
  viewpoint:     Eye,
  market:        ShoppingBag,
  activity:      Zap,
  art:           Palette,
  restaurant:    Coffee,
  cafe:          Coffee,
  transport:     Train,
  accommodation: Hotel,
};

const TYPE_LABEL: Record<string, string> = {
  landmark: "Landmark", museum: "Museum", nature: "Nature",
  shopping: "Shopping", bar: "Bar", nightlife: "Nightlife",
  viewpoint: "Viewpoint", market: "Market", activity: "Activity",
  art: "Art", restaurant: "Restaurant", cafe: "Café",
  transport: "Transport", accommodation: "Stay",
};

// ── place images ──────────────────────────────────────────────────────────────

const PLACE_IMAGES: Record<string, string[]> = {
  landmark: [
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=85",
    "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=85",
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=85",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=85",
  ],
  museum: [
    "https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=800&q=85",
    "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=85",
    "https://images.unsplash.com/photo-1553152531-b98a2fc8d3bf?w=800&q=85",
  ],
  nature: [
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=85",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=85",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=85",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=85",
  ],
  shopping: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=85",
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=85",
  ],
  bar: [
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=85",
    "https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=800&q=85",
  ],
  viewpoint: [
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=85",
    "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&q=85",
  ],
  market: [
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=85",
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&q=85",
  ],
  activity: [
    "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=800&q=85",
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=85",
  ],
  art: [
    "https://images.unsplash.com/photo-1578926288207-a90a5366a5e4?w=800&q=85",
    "https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=800&q=85",
  ],
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=85";

function getPlaceImage(type: string, order: number): string {
  const list = PLACE_IMAGES[type];
  if (!list?.length) return FALLBACK_IMAGE;
  return list[order % list.length];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── component ─────────────────────────────────────────────────────────────────

interface PlaceCardProps {
  place: Place;
  index: number;
  isLast?: boolean;
  weatherHourly?: WeatherHour[];
  dayDate?: string;
}

export default function PlaceCard({ place, index, isLast, weatherHourly, dayDate }: PlaceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const color = TYPE_COLOR[place.type] ?? "#38BDF8";
  const rgb   = TYPE_RGB[place.type]   ?? "56,189,248";
  const TypeIcon = TYPE_ICON[place.type] ?? Landmark;
  const label = TYPE_LABEL[place.type] ?? place.type;
  const imgSrc = getPlaceImage(place.type, place.order);

  const placeWeather = weatherHourly && dayDate
    ? getWeatherForTime(weatherHourly, dayDate, place.best_time)
    : null;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(1000px) rotateX(${y * -3}deg) rotateY(${x * 3}deg) translateZ(6px) translateX(4px)`;
    card.style.transition = "transform 0.08s ease";
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateZ(0) translateX(0)";
    card.style.transition = "transform 0.5s cubic-bezier(0.4,0,0.2,1)";
  }

  function handleFlyTo() {
    if (!place.lat || !place.lng) return;
    window.dispatchEvent(new CustomEvent("navoryn:flyto", {
      detail: { lat: place.lat, lng: place.lng, name: place.name },
    }));
    // Scroll is handled by TripView after mapOpen state updates and DOM renders
  }

  function handleAskAI() {
    window.dispatchEvent(new CustomEvent("navoryn:ask-ai", {
      detail: { message: `Tell me more about ${place.name} and give me tips for visiting.` },
    }));
  }

  const descLong = place.description?.length > 140;

  return (
    <div style={{ position: "relative", marginLeft: 56, marginBottom: 24, animationDelay: `${index * 80}ms` }} className="animate-step-enter">

      {/* Timeline dot */}
      <div style={{ position: "absolute", left: -44, top: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 4, letterSpacing: "0.04em" }}>
          {String(place.order).padStart(2, "0")}
        </span>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.35)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 10px rgba(${rgb},0.7)` }} />
        </div>
        {!isLast && (
          <div style={{ width: 1, flex: 1, minHeight: 24, marginTop: 4, background: `linear-gradient(to bottom, rgba(${rgb},0.3), rgba(56,189,248,0.1))` }} />
        )}
      </div>

      {/* Main card */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20,
          overflow: "hidden",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          willChange: "transform",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = `rgba(${rgb},0.22)`;
          el.style.boxShadow = `-4px 0 32px rgba(${rgb},0.08), 0 24px 64px rgba(0,0,0,0.3)`;
        }}
      >
        {/* Left accent bar */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color, opacity: 0.9 }} />

        <div style={{ padding: "24px 28px 24px 32px" }}>

          {/* Top row: time badge + duration + cost */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "6px 12px", background: `rgba(${rgb},0.10)`, border: `1px solid rgba(${rgb},0.22)` }}>
                <Clock size={13} color={color} />
                <span style={{ fontSize: 13, fontWeight: 600, color }}>{place.best_time}</span>
              </div>
              {place.why_this_time && (
                <p style={{ marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.38)", fontStyle: "italic", lineHeight: 1.4 }}>
                  {place.why_this_time}
                </p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                <Timer size={12} />
                <span>~{formatDuration(place.duration_minutes)}</span>
              </div>
              {place.estimated_cost && place.estimated_cost !== "Free" && (
                <div style={{ borderRadius: 8, padding: "4px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B" }}>{place.estimated_cost}</span>
                </div>
              )}
              {place.estimated_cost === "Free" && (
                <div style={{ borderRadius: 8, padding: "4px 10px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.22)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#22C55E" }}>Free</span>
                </div>
              )}
            </div>
          </div>

          {/* Place name row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TypeIcon size={18} color={color} style={{ flexShrink: 0 }} />
              <h4 style={{ fontSize: 21, fontWeight: 700, color: "white", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{place.name}</h4>
            </div>
            <div style={{ borderRadius: 6, padding: "4px 10px", background: `rgba(${rgb},0.10)`, border: `1px solid rgba(${rgb},0.28)`, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
            </div>
          </div>

          {/* Place image */}
          <div style={{ position: "relative", height: 180, borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
            <Image
              src={imgSrc}
              alt={place.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 560px"
              style={{ transition: "transform 0.6s ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1)"; }}
            />
            {/* Bottom gradient */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(7,9,15,0.75), transparent)", pointerEvents: "none" }} />
            {/* Photo tip */}
            {place.photo_tip && (
              <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "4px 10px", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}>
                <Camera size={11} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{place.photo_tip}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginTop: 16 }}>
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.68)", lineHeight: 1.75,
              overflow: expanded ? "visible" : "hidden",
              display: expanded ? "block" : "-webkit-box",
              WebkitLineClamp: expanded ? "unset" : 3,
              WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
            }}>
              {place.description}
            </p>
            {descLong && (
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>

          {/* Pro tip box */}
          {place.tips && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, borderRadius: "0 10px 10px 0", borderLeft: "3px solid #F59E0B", background: "rgba(245,158,11,0.06)", padding: "12px 16px" }}>
              <Lightbulb size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: "rgba(245,158,11,0.85)", lineHeight: 1.55, fontStyle: "italic" }}>{place.tips}</p>
            </div>
          )}

          {/* Weather badge */}
          <WeatherBadge hourlyWeather={placeWeather} placeType={place.type as PlaceType} />

          {/* Bottom action row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={handleAskAI}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#38BDF8", background: "none", border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 10px", transition: "background 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(56,189,248,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <MessageCircle size={14} /> Ask AI
            </button>
            {place.lat && place.lng ? (
              <button
                onClick={handleFlyTo}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.38)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.38)"; }}
              >
                <Navigation size={13} /> Show on map
              </button>
            ) : <div />}
          </div>
        </div>
      </div>
    </div>
  );
}
