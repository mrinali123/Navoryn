"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { TripWithDays, PlaceType } from "@/types/trip";

const DAY_COLORS = ["#38BDF8", "#10B981", "#F97316", "#F59E0B", "#EC4899", "#22C55E"];

function typeColor(type: PlaceType): string {
  switch (type) {
    case "restaurant":
    case "cafe":       return "#F97316";
    case "bar":        return "#EC4899";
    case "nature":
    case "viewpoint":  return "#22C55E";
    case "shopping":
    case "market":     return "#94A3B8";
    default:           return "#38BDF8";
  }
}

function fmtDur(m: number): string {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
}

interface TripMapProps {
  trip: TripWithDays;
  activeDayIndex: number;
}

export default function TripMap({ trip, activeDayIndex }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef        = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef     = useRef<any[]>([]);
  const renderIdRef   = useRef(0);
  const hotelCoordsRef      = useRef<[number, number] | null>(null);
  const hotelGeocodedRef    = useRef(false);

  const [showAll, setShowAll] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Geocode the hotel once (client-side); when done, refresh the map
  useEffect(() => {
    if (!mounted || hotelGeocodedRef.current) return;
    hotelGeocodedRef.current = true;

    const q = [trip.hotel_name, trip.hotel_address, trip.destination]
      .filter(Boolean).join(", ");

    fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3&lang=en`,
      { headers: { "User-Agent": "Navoryn/1.0" }, signal: AbortSignal.timeout(6_000) }
    )
      .then((r) => r.json())
      .then((data) => {
        const feat = data?.features?.[0];
        if (!feat) return;
        const [lng, lat] = feat.geometry.coordinates as [number, number];
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
        hotelCoordsRef.current = [lat, lng];
        // Re-render map with hotel marker
        if (mapRef.current) {
          import("leaflet").then((L) => {
            if (mapRef.current) renderMap(L, mapRef.current, showAll);
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Initialise Leaflet once
  useEffect(() => {
    if (!mounted || !containerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        zoomControl: true, fadeAnimation: false, markerZoomAnimation: false,
      }).setView([20, 0], 2);

      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      ).addTo(map);

      mapRef.current = map;
      // Trigger a size recalculation after the step-enter CSS animation (300 ms)
      // so Leaflet knows the correct container dimensions and loads the right tiles.
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(true); }, 350);
      renderMap(L, map, false);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Re-render when day index or showAll changes
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      renderMap(L, mapRef.current, showAll);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDayIndex, showAll, trip]);

  // Custom event: fly to a pin
  useEffect(() => {
    function handleFlyTo(e: Event) {
      const { lat, lng } = (e as CustomEvent<{ lat: number; lng: number }>).detail;
      mapRef.current?.setView([lat, lng], 15);
    }
    window.addEventListener("navoryn:flyto", handleFlyTo);
    return () => window.removeEventListener("navoryn:flyto", handleFlyTo);
  }, []);

  // ── Marker HTML builders ──────────────────────────────────────────────────

  function pinHtml(label: string, color: string): string {
    const fs = label.length > 2 ? 8 : 11;
    return `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2.5px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${fs}px;box-shadow:0 2px 8px rgba(0,0,0,0.45);font-family:system-ui,sans-serif;line-height:1;cursor:pointer;">${label}</div>`;
  }

  function hotelHtml(color: string): string {
    return `<div style="width:32px;height:32px;border-radius:8px;background:${color};border:2.5px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;cursor:pointer;">H</div>`;
  }

  function placePopup(name: string, time: string, dur: number, desc: string): string {
    return `<div style="font-family:system-ui,sans-serif;min-width:170px;padding:4px 0;">
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;">${name}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:4px;">⏰ ${time} &nbsp;·&nbsp; ⏱ ${fmtDur(dur)}</div>
      ${desc ? `<div style="font-size:11px;color:#374151;line-height:1.5;">${desc.slice(0, 110)}${desc.length > 110 ? "…" : ""}</div>` : ""}
    </div>`;
  }

  function hotelPopup(name: string, address: string): string {
    return `<div style="font-family:system-ui,sans-serif;min-width:170px;padding:4px 0;">
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;">🏨 ${name}</div>
      ${address ? `<div style="font-size:11px;color:#64748b;">${address}</div>` : ""}
      <div style="font-size:11px;color:#64748b;margin-top:2px;">Departure point</div>
    </div>`;
  }

  // ── Core render function ──────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderMap(L: any, map: any, showAllDays: boolean) {
    const renderId = ++renderIdRef.current;

    // Clear previous layers
    layersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* noop */ } });
    layersRef.current = [];

    const days = showAllDays
      ? trip.itinerary_days
      : [trip.itinerary_days[activeDayIndex]].filter(Boolean);

    const allLatLngs: [number, number][] = [];

    days.forEach((day, dayIdx) => {
      const sorted      = [...day.places].sort((a, b) => a.order - b.order);
      const validPlaces = sorted.filter((p) => p.lat && p.lng);
      const dayColor    = DAY_COLORS[dayIdx % DAY_COLORS.length];

      // Hotel marker — single day only
      const hotel = !showAllDays ? hotelCoordsRef.current : null;
      if (hotel) {
        allLatLngs.push(hotel);
        const icon = L.divIcon({
          className: "", html: hotelHtml(dayColor),
          iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
        });
        const m = L.marker(hotel, { icon })
          .bindPopup(hotelPopup(trip.hotel_name, trip.hotel_address ?? ""))
          .bindTooltip(trip.hotel_name, { direction: "top", offset: [0, -20] });
        m.addTo(map);
        layersRef.current.push(m);
      }

      // Stop markers: numbered 1, 2, 3... (or 2, 3... if hotel shown as 1)
      const startNum = hotel ? 2 : 1;

      validPlaces.forEach((place, idx) => {
        const coords: [number, number] = [place.lat, place.lng];
        allLatLngs.push(coords);

        const label = showAllDays ? `${dayIdx + 1}` : `${startNum + idx}`;
        const color = showAllDays ? dayColor : typeColor(place.type);

        const icon = L.divIcon({
          className: "", html: pinHtml(label, color),
          iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -18],
        });

        const m = L.marker(coords, { icon })
          .bindPopup(placePopup(place.name, place.best_time, place.duration_minutes, place.description ?? ""))
          .bindTooltip(place.name, { direction: "top", offset: [0, -18] });
        m.addTo(map);
        layersRef.current.push(m);
      });

      // Route: current day only — connect hotel (if known) + stops via real roads
      if (!showAllDays && validPlaces.length >= 1) {
        const waypoints: [number, number][] = [
          ...(hotel ? [hotel] : []),
          ...validPlaces.map((p) => [p.lat, p.lng] as [number, number]),
        ];
        if (waypoints.length >= 2) {
          fetchOsrmRoute(L, map, waypoints, dayColor, renderId);
        }
      }
      // All days: NO route lines — clean marker-only view
    });

    // Fit bounds
    if (allLatLngs.length === 1) {
      map.setView(allLatLngs[0], 14);
    } else if (allLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [50, 50], maxZoom: 14, animate: false });
    }
  }

  // ── OSRM route fetch (async, cancellable) ─────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function fetchOsrmRoute(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map: any,
    waypoints: [number, number][],
    color: string,
    renderId: number
  ): Promise<void> {
    // OSRM expects lng,lat pairs
    const coordStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });

      if (renderIdRef.current !== renderId) return; // superseded render
      if (!res.ok) return;

      const data = await res.json();
      if (renderIdRef.current !== renderId) return;

      const routeCoords: number[][] = data.routes?.[0]?.geometry?.coordinates;
      if (!routeCoords?.length) return;

      // OSRM returns [lng, lat] — flip to [lat, lng] for Leaflet
      const latLngs: [number, number][] = routeCoords.map(([lng, lat]) => [lat as number, lng as number]);

      const poly = L.polyline(latLngs, { color, weight: 3.5, opacity: 0.85 }).addTo(map);
      layersRef.current.push(poly);
    } catch {
      // Route unavailable — no fallback line (cleaner than wrong straight lines)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!mounted) {
    return <div style={{ width: "100%", height: "420px", borderRadius: 16, background: "rgba(255,255,255,0.03)" }} />;
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-navy-800 px-4 py-2.5 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAll(false)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
              !showAll
                ? "border-sky bg-sky/10 text-sky"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            Current day
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
              showAll
                ? "border-sky bg-sky/10 text-sky"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            All days
          </button>
        </div>
        {!showAll && (
          <span className="text-xs text-slate-500">Road routing via OpenStreetMap</span>
        )}
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ width: "100%", height: "420px" }} />

      {/* Legend */}
      <div className="bg-navy-800 px-4 py-2 flex flex-wrap gap-3 text-xs text-slate-400 border-t border-slate-700/60">
        {[
          { color: "#38BDF8", label: "Landmark / Museum" },
          { color: "#F97316", label: "Food & Drink"      },
          { color: "#22C55E", label: "Nature / Viewpoint"},
          { color: "#EC4899", label: "Nightlife"         },
          { color: "#94A3B8", label: "Shopping"          },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border border-white/30" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
