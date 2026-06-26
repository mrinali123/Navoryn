"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  MapPin, Calendar, Clock, Users, Globe, Heart, Mountain, Briefcase,
  Building2, Navigation, Wallet, CreditCard, Crown, Check, ChevronLeft,
  Minus, Plus, Landmark, UtensilsCrossed, ShoppingBag, Leaf, Moon, Palette,
  Zap, Coffee, Compass, Star, Sparkles, Camera, Sprout, Fish,
  AlertTriangle, Droplet, Waves, LogIn, LogOut, CheckCircle, Backpack,
  type LucideIcon,
} from "lucide-react";
import PlaceAutocomplete, { type SelectedPlace } from "@/components/form/PlaceAutocomplete";
import HotelAutocomplete, { type SelectedHotel } from "@/components/form/HotelAutocomplete";
import type { TripFormData, TripPurpose, BudgetLevel, Pace } from "@/types/trip";
import { validateTripStep } from "@/lib/trip-validation";
import { countNights } from "@/lib/trip-utils";

// ── constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "navoryn-trip-form";

const DEFAULT_FORM: TripFormData = {
  destination: "",
  arrivalDate: "",
  arrivalTime: "",
  departureDate: "",
  departureTime: "",
  numTravelers: 2,
  tripPurpose: "tourism",
  hotelName: "",
  hotelAddress: "",
  checkInTime: "15:00",
  checkOutTime: "11:00",
  budgetLevel: "mid-range",
  interests: [],
  pace: "balanced",
  mustVisit: "",
  dietaryPrefs: [],
};

const PURPOSES: { value: TripPurpose; label: string; Icon: LucideIcon }[] = [
  { value: "tourism",     label: "Tourism",     Icon: Globe },
  { value: "honeymoon",   label: "Honeymoon",   Icon: Heart },
  { value: "family",      label: "Family",      Icon: Users },
  { value: "adventure",   label: "Adventure",   Icon: Mountain },
  { value: "backpacking", label: "Backpacking", Icon: Backpack },
  { value: "business",    label: "Business",    Icon: Briefcase },
];

const INTERESTS = [
  "History & Culture", "Food & Dining", "Art & Museums", "Nature & Parks",
  "Shopping", "Nightlife", "Architecture", "Photography",
  "Adventure Sports", "Local Markets", "Beaches", "Wellness & Spas",
];

const INTEREST_ICONS: Record<string, LucideIcon> = {
  "History & Culture": Landmark,
  "Food & Dining":     UtensilsCrossed,
  "Art & Museums":     Palette,
  "Nature & Parks":    Leaf,
  "Shopping":          ShoppingBag,
  "Nightlife":         Moon,
  "Architecture":      Building2,
  "Photography":       Camera,
  "Adventure Sports":  Zap,
  "Local Markets":     MapPin,
  "Beaches":           Waves,
  "Wellness & Spas":   Heart,
};

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-free", "Halal",
  "Kosher", "Dairy-free", "Nut allergy", "Seafood-free",
];

const DIET_ICONS: Record<string, LucideIcon> = {
  "Vegetarian": Leaf,
  "Vegan":      Sprout,
  "Gluten-free": AlertTriangle,
  "Halal":      Check,
  "Kosher":     Star,
  "Dairy-free": Droplet,
  "Nut allergy": AlertTriangle,
  "Seafood-free": Fish,
};

const LEFT_PANEL_IMG = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=90";

const STEP_META = [
  { title: "Where are you headed?",      sub: "Tell us your destination and travel dates", label: "Destination", panelLabel: "PLAN YOUR JOURNEY",         panelQuote: "The journey of a thousand miles begins with a single destination." },
  { title: "Where will you stay?",       sub: "Your hotel is our routing starting point",  label: "Stay Details", panelLabel: "YOUR HOME AWAY FROM HOME",  panelQuote: "Where you stay shapes how you experience a city." },
  { title: "How do you like to travel?", sub: "We’ll personalise every recommendation", label: "Preferences", panelLabel: "CURATE YOUR EXPERIENCE", panelQuote: "Travel is the only thing you buy that makes you richer." },
];

// ── generating screen ─────────────────────────────────────────────────────────

function GeneratingScreen({ status, progress }: { status: string; progress: number }) {

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#080D1A", padding: 24 }}>
      <style>{`
        @keyframes gs-orbit1 { from { transform: rotateX(72deg) rotateZ(0deg); }   to { transform: rotateX(72deg) rotateZ(360deg); } }
        @keyframes gs-orbit2 { from { transform: rotateX(58deg) rotateZ(0deg); }   to { transform: rotateX(58deg) rotateZ(-360deg); } }
        @keyframes gs-orbit3 { from { transform: rotateY(68deg) rotateZ(0deg); }   to { transform: rotateY(68deg) rotateZ(360deg); } }
        @keyframes gs-dot1   { from { transform: rotateX(72deg) rotateZ(0deg); }   to { transform: rotateX(72deg) rotateZ(360deg); } }
        @keyframes gs-dot2   { from { transform: rotateX(58deg) rotateZ(0deg); }   to { transform: rotateX(58deg) rotateZ(-360deg); } }
        @keyframes gs-globe-pulse { 0%,100%{ box-shadow:0 0 55px rgba(56,189,248,0.55),0 0 110px rgba(56,189,248,0.2); } 50%{ box-shadow:0 0 90px rgba(56,189,248,0.85),0 0 180px rgba(56,189,248,0.35); } }
        @keyframes gs-bg-pulse { 0%,100%{ opacity:0.5; transform:scale(1); } 50%{ opacity:0.9; transform:scale(1.1); } }
      `}</style>

      {/* Ambient orbs */}
      <div aria-hidden="true" style={{ position: "absolute", top: "8%", right: "6%", width: 500, height: 500, borderRadius: "50%", background: "rgba(56,189,248,0.06)", filter: "blur(100px)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", bottom: "8%", left: "4%", width: 380, height: 380, borderRadius: "50%", background: "rgba(56,189,248,0.03)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", top: "45%", left: "18%", width: 220, height: 220, borderRadius: "50%", background: "rgba(245,158,11,0.04)", filter: "blur(60px)", pointerEvents: "none" }} />

      {/* 3D Globe */}
      <div style={{ position: "relative", width: 240, height: 240, marginBottom: 48, perspective: "700px" }}>
        {/* Outer glow pulse */}
        <div style={{ position: "absolute", inset: -50, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 68%)", animation: "gs-bg-pulse 3s ease-in-out infinite", pointerEvents: "none" }} />

        {/* Orbit ring 1 — sky blue, near-horizontal */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 224, height: 224, marginLeft: -112, marginTop: -112, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.7)", boxShadow: "0 0 18px rgba(56,189,248,0.3)", animation: "gs-orbit1 3.6s linear infinite" }} />

        {/* Orbit ring 2 — amber */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 182, height: 182, marginLeft: -91, marginTop: -91, borderRadius: "50%", border: "1.5px solid rgba(245,158,11,0.5)", boxShadow: "0 0 14px rgba(245,158,11,0.18)", animation: "gs-orbit2 2.7s linear infinite" }} />

        {/* Orbit ring 3 — amber, perpendicular */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 140, height: 140, marginLeft: -70, marginTop: -70, borderRadius: "50%", border: "1.5px solid rgba(245,158,11,0.55)", boxShadow: "0 0 12px rgba(245,158,11,0.18)", animation: "gs-orbit3 4.8s linear infinite" }} />

        {/* Satellite dot on ring 1 */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 224, height: 224, marginLeft: -112, marginTop: -112, borderRadius: "50%", animation: "gs-dot1 3.6s linear infinite" }}>
          <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)", width: 10, height: 10, borderRadius: "50%", background: "#38BDF8", boxShadow: "0 0 16px rgba(56,189,248,1), 0 0 30px rgba(56,189,248,0.6)" }} />
        </div>

        {/* Satellite dot on ring 2 */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 182, height: 182, marginLeft: -91, marginTop: -91, borderRadius: "50%", animation: "gs-dot2 2.7s linear infinite" }}>
          <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 14px rgba(245,158,11,0.9), 0 0 24px rgba(245,158,11,0.5)" }} />
        </div>

        {/* Central sphere */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 90, height: 90, marginLeft: -45, marginTop: -45, borderRadius: "50%", background: "radial-gradient(circle at 33% 28%, rgba(190,235,255,1) 0%, rgba(56,189,248,0.95) 28%, rgba(14,165,233,0.65) 58%, rgba(8,13,26,0.98) 100%)", animation: "gs-globe-pulse 2.2s ease-in-out infinite", overflow: "hidden" }}>
          {/* Highlight spec */}
          <div style={{ position: "absolute", top: "14%", left: "16%", width: "32%", height: "26%", borderRadius: "50%", background: "rgba(255,255,255,0.55)", filter: "blur(5px)" }} />
          {/* Secondary shimmer */}
          <div style={{ position: "absolute", bottom: "20%", right: "18%", width: "16%", height: "12%", borderRadius: "50%", background: "rgba(255,255,255,0.2)", filter: "blur(3px)" }} />
        </div>
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 10, textAlign: "center" }}>
        Building your itinerary
      </h2>
      <p key={status} className="animate-fade-in" style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, textAlign: "center", maxWidth: 300, lineHeight: 1.7, marginBottom: 36 }}>
        {status}
      </p>
      <div style={{ width: 240, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${progress}%`, background: "linear-gradient(90deg, #38BDF8, #0EA5E9)", transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </div>
      <p style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>This may take 15–30 seconds</p>
    </div>
  );
}

// ── day count chip ────────────────────────────────────────────────────────────

function DayCountChip({ arrival, departure }: { arrival: string; departure: string }) {
  if (!arrival || !departure || departure < arrival) return null;
  const nights = countNights(arrival, departure);
  const days = nights + 1;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "6px 14px", background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.25)", marginTop: 8 }}>
      <Calendar size={12} color="#38BDF8" />
      <span style={{ fontSize: 12, fontWeight: 600, color: "#38BDF8" }}>
        {nights} night{nights !== 1 ? "s" : ""} · {days} day{days !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── step props ────────────────────────────────────────────────────────────────

interface StepProps {
  data: TripFormData;
  onChange: (patch: Partial<TripFormData>) => void;
  errors: Record<string, string>;
}

// ── step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props extends StepProps {
  destinationConfirmed: boolean;
  destinationLabel: string;
  destinationLat?: number;
  destinationLng?: number;
  onDestinationSelect: (place: SelectedPlace) => void;
  onDestinationClear: () => void;
}

function Step1({ data, onChange, errors, destinationConfirmed, destinationLabel, onDestinationSelect, onDestinationClear }: Step1Props) {
  return (
    <div className="nf-step-enter" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Destination */}
      <div>
        <label className="nf-label">Destination *</label>
        <PlaceAutocomplete
          value={data.destination}
          onTextChange={(t) => onChange({ destination: t })}
          onSelect={onDestinationSelect}
          onClear={onDestinationClear}
          isConfirmed={destinationConfirmed}
          confirmedLabel={destinationLabel}
          placeholder="Search cities worldwide…"
          types={["(cities)"]}
          error={errors.destination}
        />
        {errors.destination && <p className="nf-err">{errors.destination}</p>}
      </div>

      {/* Arrival row */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label className="nf-label">Arrival date *</label>
          <div className="nf-field">
            <span className="nf-field-icon"><Calendar size={15} /></span>
            <input type="date" value={data.arrivalDate} onChange={(e) => onChange({ arrivalDate: e.target.value })} className={`nf-input${errors.arrivalDate ? " nf-input-error" : ""}`} />
          </div>
          {errors.arrivalDate && <p className="nf-err">{errors.arrivalDate}</p>}
        </div>
        <div>
          <label className="nf-label">Arrival time</label>
          <div className="nf-field">
            <span className="nf-field-icon"><Clock size={15} /></span>
            <input type="time" value={data.arrivalTime} onChange={(e) => onChange({ arrivalTime: e.target.value })} className="nf-input" />
          </div>
        </div>
      </div>

      {/* Departure row */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label className="nf-label">Departure date *</label>
          <div className="nf-field">
            <span className="nf-field-icon"><Calendar size={15} /></span>
            <input type="date" value={data.departureDate} min={data.arrivalDate || undefined} onChange={(e) => onChange({ departureDate: e.target.value })} className={`nf-input${errors.departureDate ? " nf-input-error" : ""}`} />
          </div>
          {errors.departureDate && <p className="nf-err">{errors.departureDate}</p>}
        </div>
        <div>
          <label className="nf-label">Departure time</label>
          <div className="nf-field">
            <span className="nf-field-icon"><Clock size={15} /></span>
            <input type="time" value={data.departureTime} onChange={(e) => onChange({ departureTime: e.target.value })} className="nf-input" />
          </div>
        </div>
      </div>

      <DayCountChip arrival={data.arrivalDate} departure={data.departureDate} />

      {/* Travelers */}
      <div>
        <label className="nf-label">Travelers</label>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="nf-stepper">
            <button type="button" onClick={() => onChange({ numTravelers: Math.max(1, data.numTravelers - 1) })} className="nf-step-btn" aria-label="Decrease">
              <Minus size={15} />
            </button>
            <div className="nf-step-count">{data.numTravelers}</div>
            <button type="button" onClick={() => onChange({ numTravelers: Math.min(20, data.numTravelers + 1) })} className="nf-step-btn nf-step-plus" aria-label="Increase">
              <Plus size={15} />
            </button>
          </div>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.38)" }}>
            {data.numTravelers === 1 ? "Solo trip" : `${data.numTravelers} people`}
          </span>
        </div>
      </div>

      {/* Trip purpose */}
      <div>
        <label className="nf-label">Trip purpose</label>
        {errors.tripPurpose && <p className="nf-err">{errors.tripPurpose}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {PURPOSES.map((p) => {
            const sel = data.tripPurpose === p.value;
            return (
              <button key={p.value} type="button" onClick={() => onChange({ tripPurpose: p.value })} className={`nf-purpose-card${sel ? " selected" : ""}`}>
                <p.Icon size={17} color={sel ? "#38BDF8" : "rgba(255,255,255,0.38)"} />
                <span style={{ fontSize: 13, fontWeight: 500, color: sel ? "white" : "rgba(255,255,255,0.55)" }}>{p.label}</span>
                {sel && <Check size={11} color="#38BDF8" style={{ position: "absolute", top: 8, right: 8 }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props extends StepProps {
  hotelConfirmed: boolean;
  hotelAutoFilledAddress: boolean;
  destinationLat?: number;
  destinationLng?: number;
  onHotelSelect: (hotel: SelectedHotel) => void;
  onHotelClear: () => void;
}

function Step2({ data, onChange, errors, hotelConfirmed, hotelAutoFilledAddress, destinationLat, destinationLng, onHotelSelect, onHotelClear }: Step2Props) {
  const budgets: { value: BudgetLevel; label: string; sub: string; tag: string; accent: string; rgb: string; Icon: LucideIcon }[] = [
    { value: "budget",    label: "Budget",    sub: "₹1,500 – ₹3,500 per person / day", tag: "Best value",   accent: "#22C55E", rgb: "34,197,94",  Icon: Wallet },
    { value: "mid-range", label: "Mid-range", sub: "₹3,500 – ₹8,000 per person / day", tag: "Most popular", accent: "#38BDF8", rgb: "56,189,248", Icon: CreditCard },
    { value: "luxury",    label: "Luxury",    sub: "₹8,000+ per person / day",          tag: "Premium",      accent: "#F59E0B", rgb: "245,158,11", Icon: Crown },
  ];

  return (
    <div className="nf-step-enter" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Hotel name */}
      <div>
        <label className="nf-label">Hotel name *</label>
        <HotelAutocomplete
          value={data.hotelName}
          onTextChange={(t) => onChange({ hotelName: t })}
          onSelect={onHotelSelect}
          onClear={onHotelClear}
          isConfirmed={hotelConfirmed}
          destinationLat={destinationLat}
          destinationLng={destinationLng}
          error={errors.hotelName}
          placeholder="Search hotels in your destination…"
        />
        {errors.hotelName && !hotelConfirmed && <p className="nf-err">{errors.hotelName}</p>}
      </div>

      {/* Hotel address */}
      <div>
        <label className="nf-label">Address</label>
        <div className="nf-field">
          <span className="nf-field-icon"><Navigation size={15} /></span>
          <input
            type="text"
            placeholder="e.g. Apollo Bunder, Colaba, Mumbai"
            value={data.hotelAddress}
            onChange={(e) => onChange({ hotelAddress: e.target.value })}
            className="nf-input"
          />
          {hotelAutoFilledAddress && (
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}>
              <CheckCircle size={15} color="#22C55E" />
            </span>
          )}
        </div>
        {hotelAutoFilledAddress && (
          <p style={{ marginTop: 5, fontSize: 11, color: "rgba(34,197,94,0.7)", display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={10} /> Address filled automatically — you can edit it if needed
          </p>
        )}
      </div>

      {/* Check-in / check-out */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label className="nf-label">Check-in time</label>
          <div className="nf-field">
            <span className="nf-field-icon"><LogIn size={15} /></span>
            <input type="time" value={data.checkInTime} onChange={(e) => onChange({ checkInTime: e.target.value })} className="nf-input" />
          </div>
        </div>
        <div>
          <label className="nf-label">Check-out time</label>
          <div className="nf-field">
            <span className="nf-field-icon"><LogOut size={15} /></span>
            <input type="time" value={data.checkOutTime} onChange={(e) => onChange({ checkOutTime: e.target.value })} className="nf-input" />
          </div>
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="nf-label">Budget level</label>
        {errors.budgetLevel && <p className="nf-err">{errors.budgetLevel}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {budgets.map((b) => {
            const sel = data.budgetLevel === b.value;
            return (
              <button
                key={b.value}
                type="button"
                onClick={() => onChange({ budgetLevel: b.value })}
                className={`nf-budget-card${sel ? " selected" : ""}`}
                style={{ borderColor: sel ? b.accent : undefined, background: sel ? `rgba(${b.rgb},0.07)` : undefined, boxShadow: sel ? `0 0 24px rgba(${b.rgb},0.15)` : undefined } as React.CSSProperties}
              >
                {/* Left accent bar */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, borderRadius: "16px 0 0 16px", background: b.accent, opacity: sel ? 1 : 0.3 }} />
                <div style={{ paddingLeft: 12, display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
                  <b.Icon size={20} color={b.accent} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: sel ? "white" : "rgba(255,255,255,0.65)", lineHeight: 1 }}>{b.label}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 4 }}>{b.sub}</p>
                  </div>
                  <div style={{ borderRadius: 999, padding: "3px 10px", background: `rgba(${b.rgb},0.14)`, border: `1px solid rgba(${b.rgb},0.28)`, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: b.accent, letterSpacing: "0.05em" }}>{b.tag}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── step 3 ───────────────────────────────────────────────────────────────────

function Step3({ data, onChange, errors }: StepProps) {
  const paces: { value: Pace; label: string; sub: string; accent: string; Icon: LucideIcon }[] = [
    { value: "relaxed",  label: "Relaxed",  sub: "2–3 places/day", accent: "#10B981", Icon: Coffee },
    { value: "balanced", label: "Balanced", sub: "4–5 places/day", accent: "#38BDF8", Icon: Compass },
    { value: "packed",   label: "Packed",   sub: "6+ places/day",  accent: "#F59E0B", Icon: Zap },
  ];

  function toggleInterest(i: string) {
    const cur = data.interests;
    onChange({ interests: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] });
  }
  function toggleDiet(d: string) {
    const cur = data.dietaryPrefs;
    onChange({ dietaryPrefs: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] });
  }

  return (
    <div className="nf-step-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Summary card */}
      <div style={{ borderRadius: 14, border: "1px solid rgba(56,189,248,0.15)", background: "rgba(56,189,248,0.04)", padding: "14px 18px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 10 }}>Trip summary</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={12} color="#38BDF8" /><span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{data.destination || "—"}</span></div>
            <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={12} color="#38BDF8" /><span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{data.arrivalDate || "—"} → {data.departureDate || "—"}</span></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Building2 size={12} color="#38BDF8" /><span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{data.hotelName || "—"}</span></div>
            <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Wallet size={12} color="#38BDF8" /><span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", textTransform: "capitalize" }}>{data.budgetLevel}</span></div>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="nf-label">
          Your interests{" "}
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "rgba(255,255,255,0.28)" }}>(select at least one) *</span>
        </label>
        {errors.interests && <p className="nf-err">{errors.interests}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {INTERESTS.map((i) => {
            const sel = data.interests.includes(i);
            const IIcon = INTEREST_ICONS[i];
            return (
              <button key={i} type="button" onClick={() => toggleInterest(i)} className={`nf-interest${sel ? " selected" : ""}`}>
                <IIcon size={13} color={sel ? "#38BDF8" : "rgba(255,255,255,0.38)"} />
                {i}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pace */}
      <div>
        <label className="nf-label">Travel pace</label>
        {errors.pace && <p className="nf-err">{errors.pace}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {paces.map((p) => {
            const sel = data.pace === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange({ pace: p.value })}
                className={`nf-pace-card${sel ? " selected" : ""}`}
                style={{ borderColor: sel ? p.accent : undefined, background: sel ? `rgba(${p.accent.replace("#","").match(/.{2}/g)?.map(h=>parseInt(h,16)).join(",") || "56,189,248"},0.07)` : undefined } as React.CSSProperties}
              >
                {p.value === "balanced" && (
                  <div style={{ position: "absolute", top: 0, right: 8, borderRadius: "0 0 7px 7px", background: "rgba(56,189,248,0.14)", border: "1px solid rgba(56,189,248,0.28)", borderTop: "none", padding: "2px 7px" }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "#38BDF8", letterSpacing: "0.1em" }}>POPULAR</span>
                  </div>
                )}
                <p.Icon size={20} color={sel ? p.accent : "rgba(255,255,255,0.35)"} />
                <p style={{ fontSize: 14, fontWeight: 600, color: sel ? "white" : "rgba(255,255,255,0.55)", marginTop: 6 }}>{p.label}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>{p.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Must-visit */}
      <div>
        <label className="nf-label">
          Must-visit places{" "}
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "rgba(255,255,255,0.28)" }}>(optional)</span>
        </label>
        <div className="nf-field">
          <span className="nf-field-icon" style={{ top: 17, transform: "none" }}><Star size={15} /></span>
          <textarea
            rows={3}
            placeholder="e.g. Eiffel Tower, Colosseum, Sagrada Família…"
            value={data.mustVisit}
            onChange={(e) => onChange({ mustVisit: e.target.value })}
            className="nf-input"
            style={{ resize: "none" }}
          />
        </div>
        <p style={{ marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.22)" }}>Optional &mdash; we&apos;ll make sure to include these</p>
      </div>

      {/* Dietary */}
      <div>
        <label className="nf-label">
          Dietary preferences{" "}
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "rgba(255,255,255,0.28)" }}>(optional)</span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {DIETARY_OPTIONS.map((d) => {
            const sel = data.dietaryPrefs.includes(d);
            const DIcon = DIET_ICONS[d];
            return (
              <button key={d} type="button" onClick={() => toggleDiet(d)} className={`nf-diet${sel ? " selected" : ""}`}>
                <DIcon size={12} color={sel ? "#38BDF8" : "rgba(255,255,255,0.35)"} />
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

export default function NewTripPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<TripFormData>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const restored = useRef(false);

  const [destinationConfirmed, setDestinationConfirmed] = useState(false);
  const [destinationLabel, setDestinationLabel] = useState("");
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLng, setDestinationLng] = useState<number | undefined>();
  const [hotelConfirmed, setHotelConfirmed] = useState(false);
  const [hotelAutoFilledAddress, setHotelAutoFilledAddress] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("Planning your journey...");
  const [generatingProgress, setGeneratingProgress] = useState(0);

  // On mount: restore saved data only when coming from "Use as template"; otherwise wipe it
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const from = new URLSearchParams(window.location.search).get("from");
      const isTemplate = from === "template" || from === "edit";
      if (isTemplate) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setFormData(parsed);
          if (parsed.destination) { setDestinationConfirmed(true); setDestinationLabel(parsed.destination); }
          if (parsed.hotelName) setHotelConfirmed(true);
        }
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  function patch(update: Partial<TripFormData>) {
    setFormData((prev) => ({ ...prev, ...update }));
    const keys = Object.keys(update);
    setErrors((prev) => { const next = { ...prev }; keys.forEach((k) => delete next[k]); return next; });
  }

  function handleDestinationSelect(place: SelectedPlace) {
    patch({ destination: place.name });
    setDestinationConfirmed(true);
    setDestinationLabel(place.description || place.name);
    setDestinationLat(place.lat || undefined);
    setDestinationLng(place.lng || undefined);
    setErrors((prev) => ({ ...prev, destination: "" }));
  }

  function handleDestinationClear() {
    patch({ destination: "", hotelName: "", hotelAddress: "" });
    setDestinationConfirmed(false);
    setDestinationLabel("");
    setDestinationLat(undefined);
    setDestinationLng(undefined);
    setHotelConfirmed(false);
    setHotelAutoFilledAddress(false);
    toast("Destination cleared — hotel field has been reset too.", { icon: "ℹ️" });
  }

  function handleHotelSelect(hotel: SelectedHotel) {
    patch({ hotelName: hotel.name, hotelAddress: hotel.address });
    setHotelConfirmed(true);
    setHotelAutoFilledAddress(true);
    setErrors((prev) => ({ ...prev, hotelName: "" }));
    setTimeout(() => setHotelAutoFilledAddress(false), 5000);
  }

  function handleHotelClear() {
    patch({ hotelName: "", hotelAddress: "" });
    setHotelConfirmed(false);
    setHotelAutoFilledAddress(false);
  }

  function goNext() {
    const errs = validateTripStep(step, formData, destinationConfirmed);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
  }

  function goBack() {
    setErrors({});
    setStep((s) => s - 1);
  }

  async function handleGenerate() {
    const errs = validateTripStep(3, formData, destinationConfirmed);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setGeneratingStatus("Planning your journey...");
    setGeneratingProgress(0);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/itinerary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to generate itinerary");
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const rawLine of parts) {
          const line = rawLine.trim();
          if (!line.startsWith("data: ")) continue;
          let data: Record<string, unknown>;
          try { data = JSON.parse(line.slice(6)); } catch { continue; }
          if (data.type === "status") {
            if (typeof data.message === "string") setGeneratingStatus(data.message);
            if (typeof data.progress === "number") setGeneratingProgress(data.progress);
          } else if (data.type === "complete") {
            setGeneratingProgress(100);
            try { localStorage.removeItem(STORAGE_KEY); } catch {}
            router.push(`/trips/${data.tripId}`);
            return;
          } else if (data.type === "error") {
            throw new Error(typeof data.message === "string" ? data.message : "Something went wrong");
          }
        }
      }
    } catch (err) {
      setIsGenerating(false);
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.", { duration: 5000 });
    }
  }

  if (isGenerating) return <GeneratingScreen status={generatingStatus} progress={generatingProgress} />;

  const meta = STEP_META[step - 1];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#080D1A", color: "white" }}>

      {/* ══════════════════════════ LEFT PANEL ══════════════════════════ */}
      <div className="nf-left-panel">
        {/* Single premium background image */}
        <Image src={LEFT_PANEL_IMG} alt="" fill className="object-cover" priority sizes="42vw" />
        {/* Overlays */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(10,15,30,0.18) 0%, rgba(10,15,30,0.08) 45%, rgba(10,15,30,0.72) 100%)", zIndex: 1 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 65%, #080D1A 100%)", zIndex: 2 }} />

        {/* Bottom content */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 48px 52px", zIndex: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#38BDF8", letterSpacing: "0.15em", marginBottom: 14 }}>{meta.panelLabel}</p>
          <p style={{ fontSize: 26, fontWeight: 300, color: "white", lineHeight: 1.55, maxWidth: 330, marginBottom: 32 }}>
            &ldquo;{meta.panelQuote}&rdquo;
          </p>
          {/* Progress dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ height: 7, borderRadius: 99, background: step === n ? "#38BDF8" : "rgba(255,255,255,0.28)", width: step === n ? 24 : 7, transition: "all 0.35s ease" }} />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════ RIGHT PANEL ══════════════════════════ */}
      <div style={{ flex: 1, minHeight: "100vh", overflowY: "auto", background: "#080D1A", position: "relative" }}>
        {/* Decorative background */}
        <div aria-hidden="true" style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(56,189,248,0.04)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />
        <div aria-hidden="true" style={{ position: "absolute", bottom: 80, left: -50, width: 250, height: 250, borderRadius: "50%", background: "rgba(245,158,11,0.03)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.024) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", padding: "44px 32px 140px" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 44 }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="7" fill="url(#nf-logo)" />
              <circle cx="7" cy="21" r="2.5" fill="white" />
              <path d="M9 19.5 C12.5 15.5 15.5 11 21 8.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 2.5" opacity="0.75" />
              <path d="M21 5.5 C19.1 5.5 17.5 7.1 17.5 9 C17.5 11.5 21 15.5 21 15.5 C21 15.5 24.5 11.5 24.5 9 C24.5 7.1 22.9 5.5 21 5.5Z" fill="white" />
              <circle cx="21" cy="9" r="1.8" fill="url(#nf-logo)" />
              <defs>
                <linearGradient id="nf-logo" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38BDF8" /><stop offset="1" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontSize: 20, fontWeight: 700, background: "linear-gradient(135deg, #38BDF8, #F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>
              Navoryn
            </span>
          </div>

          {/* Step progress indicator */}
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 40 }}>
            {STEP_META.map((s, idx) => {
              const n = idx + 1;
              const done   = n < step;
              const active = n === step;
              return (
                <div key={n} style={{ display: "flex", alignItems: "flex-start", flex: idx < 2 ? 1 : undefined }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? "linear-gradient(135deg, #38BDF8, #0EA5E9)" : active ? "transparent" : "rgba(255,255,255,0.05)",
                      border: done ? "none" : active ? "2px solid rgba(56,189,248,0.65)" : "2px solid rgba(255,255,255,0.10)",
                      boxShadow: active ? "0 0 20px rgba(56,189,248,0.18)" : "none",
                      transition: "all 0.3s ease",
                    }}>
                      {done ? (
                        <Check size={15} color="white" strokeWidth={2.5} />
                      ) : (
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          ...(active
                            ? { background: "linear-gradient(135deg,#38BDF8,#F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
                            : { color: "rgba(255,255,255,0.22)" }),
                        }}>
                          {n}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: active ? 500 : 400, color: active ? "white" : "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>{s.label}</span>
                  </div>
                  {idx < 2 && (
                    <div style={{ flex: 1, height: 2, marginTop: 19, marginInline: 6, borderRadius: 99, background: done ? "linear-gradient(90deg,#38BDF8,#0EA5E9)" : "rgba(255,255,255,0.07)", transition: "background 0.3s ease" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step header */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#38BDF8", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10 }}>
              STEP {step} OF 3
            </p>
            <h1 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 8 }}>
              {meta.title}
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.42)", lineHeight: 1.5 }}>{meta.sub}</p>
          </div>

          {/* Step content */}
          <div key={step}>
            {step === 1 && (
              <Step1
                data={formData} onChange={patch} errors={errors}
                destinationConfirmed={destinationConfirmed}
                destinationLabel={destinationLabel}
                destinationLat={destinationLat}
                destinationLng={destinationLng}
                onDestinationSelect={handleDestinationSelect}
                onDestinationClear={handleDestinationClear}
              />
            )}
            {step === 2 && (
              <Step2
                data={formData} onChange={patch} errors={errors}
                hotelConfirmed={hotelConfirmed}
                hotelAutoFilledAddress={hotelAutoFilledAddress}
                destinationLat={destinationLat}
                destinationLng={destinationLng}
                onHotelSelect={handleHotelSelect}
                onHotelClear={handleHotelClear}
              />
            )}
            {step === 3 && (
              <Step3 data={formData} onChange={patch} errors={errors} />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="nf-btn-row" style={{ display: "flex", gap: 12, marginTop: 36 }}>
            {step > 1 ? (
              <button type="button" onClick={goBack} className="nf-back">
                <ChevronLeft size={15} /> Back
              </button>
            ) : (
              <div style={{ width: 120, flexShrink: 0 }} />
            )}
            {step < 3 ? (
              <button type="button" onClick={goNext} className="nf-continue">
                Continue
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            ) : (
              <button type="button" onClick={handleGenerate} className="nf-continue">
                <Sparkles size={15} /> Generate My Itinerary
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ══════════════════════════ CSS ══════════════════════════ */}
      <style jsx global>{`
        /* Left panel: hidden on mobile, shown lg+ */
        .nf-left-panel {
          display: none;
          width: 42%;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          flex-shrink: 0;
        }
        @media (min-width: 1024px) { .nf-left-panel { display: block; } }

        /* Label */
        .nf-label {
          display: block; margin-bottom: 8px;
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.48); letter-spacing: 0.07em; text-transform: uppercase;
        }
        /* Input */
        .nf-input {
          width: 100%; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          padding: 15px 20px 15px 48px;
          font-size: 15px; color: white; outline: none;
          transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box; color-scheme: dark; font-family: inherit;
        }
        .nf-input:focus {
          border-color: #38BDF8;
          background: rgba(56,189,248,0.04);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.11);
        }
        .nf-input::placeholder { color: rgba(255,255,255,0.2); }
        .nf-input-error { border-color: rgba(248,113,113,0.65) !important; }
        .nf-input[type="date"]::-webkit-calendar-picker-indicator,
        .nf-input[type="time"]::-webkit-calendar-picker-indicator {
          filter: brightness(0) invert(1); opacity: 0.7; cursor: pointer;
        }
        textarea.nf-input { resize: none; }

        /* Field wrapper + icon */
        .nf-field { position: relative; }
        .nf-field-icon {
          position: absolute; left: 15px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.65); pointer-events: none;
          display: flex; align-items: center;
        }
        .nf-err { margin-top: 5px; font-size: 12px; color: #F87171; }

        /* Purpose cards */
        .nf-purpose-card {
          display: flex; align-items: center; gap: 9px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
          padding: 12px 14px; cursor: pointer; transition: all 0.2s ease;
          position: relative; text-align: left; width: 100%;
        }
        .nf-purpose-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); }
        .nf-purpose-card.selected { background: rgba(56,189,248,0.09); border-color: #38BDF8; box-shadow: 0 0 18px rgba(56,189,248,0.11); }

        /* Budget cards */
        .nf-budget-card {
          display: flex; align-items: center; border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
          padding: 16px 18px; cursor: pointer; transition: all 0.2s ease;
          text-align: left; width: 100%; position: relative; overflow: hidden;
        }
        .nf-budget-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.13); }

        /* Pace cards */
        .nf-pace-card {
          display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
          border-radius: 14px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03); padding: 16px 14px;
          cursor: pointer; transition: all 0.2s ease; text-align: left; width: 100%; position: relative;
        }
        .nf-pace-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.13); }

        /* Interest pills */
        .nf-interest {
          display: inline-flex; align-items: center; gap: 7px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.04);
          padding: 9px 14px; cursor: pointer; transition: all 0.18s ease;
          font-size: 13px; color: rgba(255,255,255,0.52);
        }
        .nf-interest:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.82); }
        .nf-interest.selected {
          background: rgba(56,189,248,0.12);
          border-color: rgba(56,189,248,0.48); color: white;
          box-shadow: 0 0 14px rgba(56,189,248,0.10); transform: scale(1.02);
        }

        /* Dietary pills */
        .nf-diet {
          display: inline-flex; align-items: center; gap: 6px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
          padding: 8px 13px; cursor: pointer; transition: all 0.18s ease;
          font-size: 13px; color: rgba(255,255,255,0.48);
        }
        .nf-diet:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.78); }
        .nf-diet.selected { background: rgba(56,189,248,0.11); border-color: rgba(56,189,248,0.42); color: #38BDF8; }

        /* Stepper */
        .nf-stepper {
          display: inline-flex; align-items: center; overflow: hidden;
          border-radius: 14px; border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
        }
        .nf-step-btn {
          display: flex; align-items: center; justify-content: center;
          width: 50px; height: 50px; background: transparent; border: none;
          cursor: pointer; transition: background 0.15s; color: rgba(255,255,255,0.48); flex-shrink: 0;
        }
        .nf-step-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.88); }
        .nf-step-plus { border-left: 1px solid rgba(255,255,255,0.08); }
        .nf-step-plus:hover { background: rgba(56,189,248,0.08) !important; color: #38BDF8 !important; }
        .nf-step-count {
          min-width: 76px; text-align: center; font-size: 18px; font-weight: 600; color: white;
          height: 50px; line-height: 50px; padding: 0 8px;
          border-left: 1px solid rgba(255,255,255,0.08);
          border-right: 1px solid rgba(255,255,255,0.08);
        }

        /* Buttons */
        .nf-back {
          display: flex; align-items: center; justify-content: center; gap: 5px;
          height: 54px; width: 110px; flex-shrink: 0; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.09); background: transparent;
          color: rgba(255,255,255,0.42); font-size: 14px; font-weight: 500; cursor: pointer;
          transition: all 0.2s ease;
        }
        .nf-back:hover { border-color: rgba(255,255,255,0.24); color: rgba(255,255,255,0.78); }
        .nf-continue {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          height: 54px; flex: 1; border-radius: 14px; border: none;
          font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.22s ease;
          background: linear-gradient(135deg, #38BDF8, #0EA5E9); color: #080D1A;
          box-shadow: 0 8px 32px rgba(56,189,248,0.26);
        }
        .nf-continue:hover { box-shadow: 0 10px 48px rgba(56,189,248,0.44); transform: translateY(-2px); }
        .nf-continue:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        /* Stat card */
        .nf-stat {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.09); backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.14);
          border-radius: 12px; padding: 11px 16px;
        }

        /* Float animations */
        .nf-float-1 { animation: float 4s ease-in-out infinite; }
        .nf-float-2 { animation: float 3.2s ease-in-out infinite 1.1s; }

        /* Step enter */
        @keyframes nf-enter { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
        .nf-step-enter { animation: nf-enter 0.3s ease both; }

        /* Spinner (for autocomplete loading) */
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Mobile: fixed button bar */
        @media (max-width: 1023px) {
          .nf-btn-row {
            position: fixed; bottom: 0; left: 0; right: 0;
            padding: 12px 20px env(safe-area-inset-bottom, 12px);
            background: rgba(8,13,26,0.96); backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255,255,255,0.06); z-index: 50;
          }
        }
      `}</style>
    </div>
  );
}
