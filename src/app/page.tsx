import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { ArrowRight, MapPin, Compass, Navigation } from "lucide-react";

export const metadata: Metadata = {
  title: "Navoryn — The world, perfectly planned.",
  description:
    "Navoryn turns your travel vision into a precise, beautiful day-by-day itinerary. Interactive maps, weather intelligence, and real-time collaboration.",
};

const BG = "#060914";
const FONT_DISPLAY = "var(--font-playfair, Georgia, serif)";

const DESTINATIONS = [
  {
    name: "Santorini",    country: "Greece",
    tag:  "Mediterranean",
    img:  "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=90",
    span: "col-span-5 row-span-1",
  },
  {
    name: "Tokyo",        country: "Japan",
    tag:  "Urban Culture",
    img:  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=90",
    span: "col-span-4 row-span-2",
  },
  {
    name: "Bali",         country: "Indonesia",
    tag:  "Tropical Escape",
    img:  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=90",
    span: "col-span-3 row-span-1",
  },
  {
    name: "Patagonia",    country: "Argentina",
    tag:  "Wild Adventure",
    img:  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=90",
    span: "col-span-3 row-span-1",
    objectPosition: "center 35%",
  },
  {
    name: "Amalfi Coast", country: "Italy",
    tag:  "Dolce Vita",
    img:  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=900&q=90",
    span: "col-span-5 row-span-1",
    objectPosition: "center 55%",
  },
  {
    name: "Maldives",     country: "Indian Ocean",
    tag:  "Pure Luxury",
    img:  "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=900&q=90",
    span: "col-span-4 row-span-1",
    objectPosition: "center 40%",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Choose your destination",
    desc:  "Enter where you're headed, your dates, stay, and style of travel.",
    img:   "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=90",
    accentRgb: "56,189,248",
    accent:    "#38BDF8",
    Icon: MapPin,
  },
  {
    num: "02",
    title: "Get your perfect plan",
    desc:  "An AI-generated, constraint-validated itinerary — structured by day, verified for real-world timing, and enriched with weather context.",
    img:   "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=90",
    accentRgb: "240,180,41",
    accent:    "#F0B429",
    Icon: Navigation,
  },
  {
    num: "03",
    title: "Travel with confidence",
    desc:  "Real-world route-based maps, PDF export, budget tracker, and a trip-aware AI assistant.",
    img:   "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&q=90",
    accentRgb: "16,185,129",
    accent:    "#10B981",
    Icon: Compass,
  },
];

const STATS = [
  { num: "190+",  label: "Countries" },
  { num: "2 min", label: "To plan any trip" },
  { num: "Offline", label: "Offline access to saved itineraries" },
];

function NavorynLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#060914"/>
      <path d="M14 4C10.1 4 7 7.3 7 11.3C7 16.1 14 24 14 24C14 24 21 16.1 21 11.3C21 7.3 17.9 4 14 4Z" fill="#38BDF8"/>
      <circle cx="14" cy="11" r="3.2" fill="#060914"/>
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
      <div style={{ width: 48, height: 1, background: "rgba(255,255,255,0.08)" }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
        {children}
      </span>
      <div style={{ width: 48, height: 1, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ctaHref  = user ? "/trips/new" : "/auth/signup";
  const ctaLabel = user ? "Plan a Trip" : "Start planning";

  return (
    <div className="grain-overlay" style={{ background: BG, color: "white", minHeight: "100vh", fontFamily: "var(--font-inter, system-ui, sans-serif)", position: "relative" }}>
      <Navbar user={user ? { email: user.email } : null} />

      {/* ══════════════ HERO ══════════════════════════════════════════════════ */}
      <section style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>

        {/* Grid lines */}
        <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          preserveAspectRatio="none">
          <defs>
            <pattern id="hero-grid" width="72" height="72" patternUnits="userSpaceOnUse">
              <path d="M 72 0 L 0 0 0 72" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)"
            style={{ maskImage: "radial-gradient(ellipse 70% 90% at 30% 50%, black, transparent)" }} />
        </svg>

        {/* Subtle blue ambient — static */}
        <div aria-hidden="true" style={{ position: "absolute", top: "-10%", left: "-15%", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />

        {/* Right-side cinematic image — masked */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: "58%",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 15%, black 50%)",
          maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 15%, black 50%)",
        }}>
          <Image
            src="https://images.unsplash.com/photo-1527824404775-dce343118ebc?w=1600&q=90"
            alt="Breathtaking mountain journey"
            fill priority className="object-cover"
            sizes="58vw"
            style={{ objectPosition: "center 45%" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,9,20,0.3) 0%, rgba(6,9,20,0.5) 100%)" }} />
        </div>

        {/* ── Hero content ── */}
        <div style={{ position: "relative", zIndex: 10, padding: "0 max(48px, 6vw)", paddingTop: 96, maxWidth: 680 }}>

          <h1 style={{ margin: "0 0 28px", lineHeight: 1.0 }}>
            <span style={{
              display: "block",
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(52px, 7.5vw, 100px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
            }}>
              The world,
            </span>
            <span style={{
              display: "block",
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(52px, 7.5vw, 100px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
              background: "linear-gradient(115deg, #38BDF8 0%, #7DD3FC 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              perfectly planned.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 1.8vw, 19px)", color: "rgba(255,255,255,0.48)", lineHeight: 1.65, marginBottom: 44, maxWidth: 460 }}>
            Tell us where you&apos;re going. Get a precise, beautiful itinerary in minutes — with maps, weather, and everything in between.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href={ctaHref} className="white-btn" style={{ padding: "17px 36px", fontSize: 15, fontWeight: 700, gap: 10, letterSpacing: "-0.01em" }}>
              {ctaLabel}
              <ArrowRight size={16} />
            </Link>
            <a href="#destinations" className="ghost-btn" style={{ padding: "17px 28px", fontSize: 15 }}>
              See destinations
            </a>
          </div>
        </div>

        {/* Floating itinerary preview card */}
        <div
          className="hidden xl:block"
          style={{
            position: "absolute", right: "4.5%", top: "22%", zIndex: 20,
            width: 292,
            background: "rgba(8,10,22,0.82)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 22, padding: 22,
            backdropFilter: "blur(40px) saturate(1.5)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 100px rgba(0,0,0,0.7), 0 0 100px rgba(56,189,248,0.04)",
          }}
        >
          {/* Shimmer */}
          <div className="shimmer-line" />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Your Itinerary</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Amalfi Coast · 5 Days</p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
          </div>

          {/* Day tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["Day 1", "Day 2", "Day 3"].map((d, i) => (
              <span key={d} style={{ borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 600, background: i === 0 ? "#38BDF8" : "rgba(255,255,255,0.06)", color: i === 0 ? "#060914" : "rgba(255,255,255,0.4)" }}>{d}</span>
            ))}
          </div>

          {[
            { time: "8:00 AM",  name: "Positano Viewpoint", dur: "1h",     color: "#38BDF8" },
            { time: "10:30 AM", name: "Path of the Gods",   dur: "2.5h",   color: "#F0B429" },
            { time: "4:00 PM",  name: "Ravello Gardens",    dur: "1.5h",   color: "#10B981" },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: p.color, background: `${p.color}15`, borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap", letterSpacing: "0.03em", flexShrink: 0 }}>{p.time}</span>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "white", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{p.dur}</span>
            </div>
          ))}

          <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>4 more stops</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#F0B429" }}>€ 280 / day</span>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="hidden md:flex" style={{ position: "absolute", bottom: 44, left: "50%", transform: "translateX(-50%)", zIndex: 10, flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Scroll</span>
          <svg width="22" height="34" viewBox="0 0 22 34">
            <rect x="1" y="1" width="20" height="32" rx="10" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none"/>
            <rect x="10" y="7" width="2" height="7" rx="1" fill="rgba(255,255,255,0.3)" style={{ animation: "scrollDot 2s ease infinite" }}/>
          </svg>
        </div>
      </section>

      {/* ══════════════ STATS STRIP ══════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "64px max(48px,6vw)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", padding: "0 40px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div className="stat-strip-num">{s.num}</div>
              <div className="stat-strip-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ DESTINATIONS BENTO ══════════════════════════════════ */}
      <section id="destinations" style={{ padding: "140px max(48px,6vw)" }}>
        <AnimatedSection className="text-center" style={{ marginBottom: 80 }}>
          <SectionLabel>Destinations</SectionLabel>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(36px, 5vw, 68px)", fontWeight: 900, letterSpacing: "-0.035em", color: "white", lineHeight: 1.05, margin: 0 }}>
            Explore without<br/>limits.
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={120}>
          <style>{`
            @media (min-width: 1024px) {
              .dest-bento { display: grid; grid-template-columns: repeat(12, 1fr); grid-template-rows: 300px 300px 360px; gap: 12px; grid-auto-flow: dense; }
              .db-0 { grid-column: span 5; }
              .db-1 { grid-column: span 4; grid-row: span 2; }
              .db-2 { grid-column: span 3; }
              .db-3 { grid-column: span 5; }
              .db-4 { grid-column: span 12; }
              .db-5 { grid-column: span 3; }
            }
            .dest-card:hover .dest-img { transform: scale(1.08); }
            .dest-card:hover .dest-cta { opacity: 1; transform: translateY(0); }
            .dest-cta { opacity: 0; transform: translateY(12px); transition: all 0.35s ease; }
            .dest-card { transition: box-shadow 0.4s ease; }
            .dest-card:hover { box-shadow: 0 0 0 1.5px rgba(56,189,248,0.35) inset, 0 40px 80px rgba(0,0,0,0.6); }
          `}</style>

          <div className="dest-bento grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DESTINATIONS.map((d, i) => (
              <Link
                key={d.name}
                href="/trips/new"
                className={`dest-card dest-card-3d group relative overflow-hidden db-${i}`}
                style={{ borderRadius: 22, minHeight: 220, display: "block", textDecoration: "none" }}
              >
                <div className="dest-img" style={{ position: "absolute", inset: 0, transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)" }}>
                  <Image src={d.img} alt={d.name} fill className="object-cover" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 30vw" style={{ objectPosition: (d as { objectPosition?: string }).objectPosition ?? "center" }} />
                </div>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,9,20,0.92) 0%, rgba(6,9,20,0.3) 60%, transparent 100%)" }} />

                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 26 }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>{d.country} · {d.tag}</p>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, color: "white", letterSpacing: "-0.025em", margin: "0 0 14px" }}>{d.name}</h3>
                  <div className="dest-cta">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "white", color: "#060914", borderRadius: 10, padding: "9px 18px", fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em" }}>
                      Plan this trip <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ══════════════ HOW IT WORKS ═════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: "140px max(48px,6vw)", background: `linear-gradient(180deg, ${BG} 0%, #07081A 50%, ${BG} 100%)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Desktop layout */}
          <div className="hidden lg:grid" style={{ gridTemplateColumns: "42% 58%", gap: 96, alignItems: "flex-start" }}>

            <div style={{ position: "sticky", top: 128 }}>
              <SectionLabel>The Journey</SectionLabel>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(38px, 4vw, 64px)", fontWeight: 900, letterSpacing: "-0.035em", color: "white", lineHeight: 1.05, margin: "0 0 24px" }}>
                Three steps
                <span style={{ display: "block", background: "linear-gradient(135deg, #38BDF8 0%, #7DD3FC 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  to anywhere.
                </span>
              </h2>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,0.38)", lineHeight: 1.7, maxWidth: 380 }}>
                From idea to full itinerary, faster than you can search for flights.
              </p>
              <Link href={ctaHref} className="white-btn" style={{ marginTop: 44, padding: "15px 32px", fontSize: 14, gap: 9 }}>
                Plan your trip <ArrowRight size={14} />
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {STEPS.map((s) => (
                <div key={s.num} className="step-card">
                  <div aria-hidden="true" style={{ position: "absolute", top: -10, right: 20, fontFamily: FONT_DISPLAY, fontSize: 130, fontWeight: 900, color: "rgba(255,255,255,0.018)", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>{s.num}</div>

                  {/* Step image strip */}
                  <div style={{ position: "relative", height: 120, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
                    <Image src={s.img} alt={s.title} fill className="object-cover" sizes="400px" />
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, rgba(${s.accentRgb},0.3) 0%, rgba(6,9,20,0.7) 100%)` }} />
                    <div style={{ position: "absolute", top: 16, left: 16, width: 40, height: 40, borderRadius: 12, background: `rgba(${s.accentRgb},0.18)`, border: `1px solid rgba(${s.accentRgb},0.35)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <s.Icon size={18} color={s.accent} />
                    </div>
                    <span style={{ position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 700, color: s.accent, background: `rgba(${s.accentRgb},0.15)`, borderRadius: 8, padding: "4px 10px" }}>{s.num}</span>
                  </div>

                  <h3 style={{ fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.02em", margin: "0 0 10px" }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile */}
          <div className="lg:hidden">
            <AnimatedSection className="text-center" style={{ marginBottom: 48 }}>
              <SectionLabel>The Journey</SectionLabel>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(32px, 8vw, 52px)", fontWeight: 900, letterSpacing: "-0.03em", color: "white" }}>
                Three steps to anywhere.
              </h2>
            </AnimatedSection>
            {STEPS.map((s) => (
              <AnimatedSection key={s.num} style={{ marginBottom: 14 }}>
                <div className="step-card">
                  <div style={{ position: "relative", height: 100, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
                    <Image src={s.img} alt={s.title} fill className="object-cover" sizes="100vw" />
                    <div style={{ position: "absolute", inset: 0, background: `rgba(${s.accentRgb},0.2)` }} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SHOWCASE ═════════════════════════════════════════════ */}
      <section id="features" style={{ padding: "0 max(48px,6vw) 160px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <AnimatedSection className="text-center" style={{ marginBottom: 64 }}>
            <SectionLabel>Features</SectionLabel>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(32px, 4.5vw, 64px)", fontWeight: 900, letterSpacing: "-0.035em", color: "white", lineHeight: 1.05, margin: 0 }}>
              Everything you need,<br/>nothing you don&apos;t.
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card A — Maps */}
            <AnimatedSection>
              <div className="showcase-card" style={{ height: 440 }}>
                <Image
                  src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=90"
                  alt="Interactive maps"
                  fill className="sc-img object-cover"
                  sizes="(max-width:1024px) 100vw, 50vw"
                  style={{ objectPosition: "center 60%" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,9,20,0.96) 0%, rgba(6,9,20,0.5) 50%, transparent 100%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 36 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 10, padding: "6px 14px", marginBottom: 16 }}>
                    <MapPin size={12} color="#38BDF8" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#38BDF8", letterSpacing: "0.06em", textTransform: "uppercase" }}>Interactive Maps</span>
                  </div>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, color: "white", letterSpacing: "-0.025em", lineHeight: 1.15, margin: "0 0 12px" }}>
                    See your whole trip at a glance.
                  </h3>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                    Every stop connected by real-road routing via OSRM, rendered on an interactive map.
                  </p>
                </div>
              </div>
            </AnimatedSection>

            {/* Right column — 2 stacked */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Card B — Weather */}
              <AnimatedSection delay={100}>
                <div className="showcase-card" style={{ height: 210 }}>
                  <Image
                    src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=90"
                    alt="Weather-aware planning"
                    fill className="sc-img object-cover"
                    sizes="(max-width:1024px) 100vw, 30vw"
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(6,9,20,0.95) 0%, rgba(6,9,20,0.5) 60%, transparent 100%)" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: 32 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round">
                        <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
                        <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" }}>
                      Weather forecasts, built in.
                    </h3>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.6, margin: 0 }}>
                      Per-day weather forecasts surfaced alongside your itinerary so you can plan around conditions in advance.
                    </p>
                  </div>
                </div>
              </AnimatedSection>

              {/* Card C — Budget */}
              <AnimatedSection delay={200}>
                <div className="showcase-card" style={{ height: 210 }}>
                  <Image
                    src="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=900&q=90"
                    alt="Budget tracking"
                    fill className="sc-img object-cover"
                    sizes="(max-width:1024px) 100vw, 30vw"
                    style={{ objectPosition: "center 70%" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(6,9,20,0.95) 0%, rgba(6,9,20,0.5) 60%, transparent 100%)" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: 32 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" }}>
                      Budget, tracked live.
                    </h3>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.6, margin: 0 }}>
                      See your spend by category, per day. No surprises.
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FINAL CTA ════════════════════════════════════════════ */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <Image
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=90"
            alt="Aerial view of travel"
            fill className="object-cover"
            sizes="100vw"
            style={{ objectPosition: "center 35%" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,9,20,0.97) 0%, rgba(6,9,20,0.55) 50%, rgba(6,9,20,0.97) 100%)" }} />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(56,189,248,0.08), transparent)" }} />
        </div>

        <AnimatedSection className="text-center" style={{ position: "relative", zIndex: 1, padding: "180px max(48px,6vw)" }}>
          <SectionLabel>Begin</SectionLabel>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(44px, 7vw, 96px)", fontWeight: 900, letterSpacing: "-0.04em", color: "white", lineHeight: 1.0, margin: "0 0 32px" }}>
            Your journey<br/>
            <span style={{ background: "linear-gradient(115deg, #38BDF8 0%, #7DD3FC 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              starts now.
            </span>
          </h2>
          <Link href={ctaHref} className="white-btn" style={{ padding: "19px 44px", fontSize: 16, fontWeight: 700, gap: 11, letterSpacing: "-0.01em" }}>
            {ctaLabel} <ArrowRight size={16} />
          </Link>
        </AnimatedSection>
      </section>

      {/* ══════════════ FOOTER ═══════════════════════════════════════════════ */}
      <footer style={{ background: BG, borderTop: "1px solid rgba(255,255,255,0.05)", padding: "72px max(48px,6vw) 48px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <NavorynLogo />
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Navoryn</span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1.75, maxWidth: 300 }}>
              Precision travel planning for curious minds and bold explorers.
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              &copy; {new Date().getFullYear()} Navoryn Inc. All rights reserved.
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              Crafted with precision &nbsp;·&nbsp; Built in India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
