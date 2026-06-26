import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { TripWithDays, Place } from "@/types/trip";

// ── colours ──────────────────────────────────────────────────────────────────
const NAVY = "#0F172A";
const NAVY800 = "#1E293B";
const SKY = "#38BDF8";
const SLATE = "#64748B";
const AMBER = "#F59E0B";
const ORANGE = "#F97316";
const WHITE = "#FFFFFF";
const LIGHT = "#F8FAFC";

// ── styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 10,
    color: NAVY,
  },

  // ── cover page ──
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: NAVY,
    padding: 0,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  coverTop: {
    padding: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coverLogo: { fontSize: 14, color: SKY, fontFamily: "Helvetica-Bold" },
  coverCenter: {
    flex: 1,
    padding: 40,
    justifyContent: "center",
  },
  coverTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginBottom: 12,
    lineHeight: 1.2,
  },
  coverMeta: { fontSize: 12, color: "#94A3B8", marginBottom: 6 },
  coverBudget: { fontSize: 11, color: SKY, marginTop: 8 },
  coverDivider: { height: 1, backgroundColor: "#334155", marginVertical: 24 },
  coverTagline: { fontSize: 13, color: "#CBD5E1", fontFamily: "Helvetica-Bold" },
  coverBottom: { padding: 40 },

  // ── page header / footer ──
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: SKY,
  },
  pageHeaderDay: { fontSize: 8, color: SKY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.5 },
  pageHeaderTheme: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  pageHeaderDate: { fontSize: 9, color: SLATE },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: SLATE,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 6,
  },

  // ── place cards ──
  placeCard: {
    backgroundColor: LIGHT,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    flexDirection: "column",
    gap: 4,
  },
  mealCard: {
    backgroundColor: "#FFF7ED",
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  placeLeft: { flex: 1 },
  placeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SKY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  placeBadgeText: { fontSize: 10, color: WHITE, fontFamily: "Helvetica-Bold" },
  placeName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  placeType: { fontSize: 8, color: SLATE, marginTop: 1 },
  placeTime: { fontSize: 9, color: SLATE },
  placeDesc: { fontSize: 9, color: "#334155", lineHeight: 1.5, marginTop: 3 },
  placeTip: { fontSize: 8, color: "#92400E", fontStyle: "italic", marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: AMBER },
  placeCost: { fontSize: 9, color: "#065F46", fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },

  // ── daily notes ──
  dailyNotes: {
    backgroundColor: "#EFF6FF",
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  dailyNotesText: { fontSize: 9, color: "#1E3A8A" },

  // ── tips page ──
  tipsTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 16 },
  tipRow: { flexDirection: "row", marginBottom: 10, gap: 8 },
  tipNum: { fontSize: 10, fontFamily: "Helvetica-Bold", color: SKY, width: 16 },
  tipText: { fontSize: 10, color: NAVY800, flex: 1, lineHeight: 1.5 },
  generatedBy: { fontSize: 8, color: SLATE, marginTop: 24, textAlign: "center" },
});

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return d;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isFood(place: Place) {
  return place.type === "restaurant" || place.type === "cafe" || place.type === "bar";
}

// ── place card component ──────────────────────────────────────────────────────
function PlaceRow({ place }: { place: Place }) {
  const cardStyle = isFood(place) ? s.mealCard : s.placeCard;

  return (
    <View style={cardStyle} wrap={false}>
      <View style={s.placeRow}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View style={s.placeBadge}>
            <Text style={s.placeBadgeText}>{place.order}</Text>
          </View>
          <View style={s.placeLeft}>
            <Text style={s.placeName}>{place.name}</Text>
            <Text style={s.placeType}>{place.type.toUpperCase()}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.placeTime}>{place.best_time}</Text>
          <Text style={s.placeTime}>{fmtDuration(place.duration_minutes)}</Text>
        </View>
      </View>
      <Text style={s.placeDesc}>{place.description}</Text>
      {place.tips ? <Text style={s.placeTip}>{place.tips}</Text> : null}
      {place.estimated_cost ? <Text style={s.placeCost}>{place.estimated_cost}</Text> : null}
    </View>
  );
}

// ── main document ─────────────────────────────────────────────────────────────
export function ItineraryPDF({ trip }: { trip: TripWithDays }) {
  const destination = trip.destination;
  const dateRange = `${fmtDate(trip.arrival_date)} – ${fmtDate(trip.departure_date)}`;

  return (
    <Document title={trip.trip_title} author="Navoryn">
      {/* ── cover page ── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverTop}>
          <Text style={s.coverLogo}>✈ Navoryn</Text>
        </View>

        <View style={s.coverCenter}>
          <Text style={[s.coverMeta, { marginBottom: 8 }]}>
            {destination.toUpperCase()}
          </Text>
          <Text style={s.coverTitle}>{trip.trip_title}</Text>
          <Text style={s.coverMeta}>{dateRange}</Text>
          <Text style={s.coverMeta}>
            {trip.num_travelers} traveler{trip.num_travelers !== 1 ? "s" : ""} ·{" "}
            {trip.budget_level} · {trip.pace} pace
          </Text>
          {trip.estimated_budget ? (
            <Text style={s.coverBudget}>{trip.estimated_budget}</Text>
          ) : null}
          <View style={s.coverDivider} />
          <Text style={s.coverTagline}>Your personalized itinerary</Text>
        </View>

        <View style={s.coverBottom}>
          <Text style={{ fontSize: 8, color: "#475569" }}>
            Generated by Navoryn · {new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>

      {/* ── one page per day ── */}
      {trip.itinerary_days.map((day) => {
        const sorted = [...day.places].sort((a, b) => a.order - b.order);
        return (
          <Page key={day.id} size="A4" style={s.page}>
            <View style={s.pageHeader}>
              <View>
                <Text style={s.pageHeaderDay}>Day {day.day_number}</Text>
                <Text style={s.pageHeaderTheme}>{day.theme}</Text>
              </View>
              <Text style={s.pageHeaderDate}>{fmtDate(day.date)}</Text>
            </View>

            {sorted.map((place) => (
              <PlaceRow key={`${place.name}-${place.order}`} place={place} />
            ))}

            {day.daily_notes ? (
              <View style={s.dailyNotes}>
                <Text style={s.dailyNotesText}>📌 {day.daily_notes}</Text>
              </View>
            ) : null}

            <View style={s.footer} fixed>
              <Text>Navoryn · {destination} · {dateRange}</Text>
              <Text render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              } />
            </View>
          </Page>
        );
      })}

      {/* ── tips page ── */}
      {trip.general_tips && trip.general_tips.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.pageHeader}>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY }}>
              General Travel Tips
            </Text>
          </View>

          {trip.general_tips.map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <Text style={s.tipNum}>{i + 1}.</Text>
              <Text style={s.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={s.generatedBy}>
            Generated by Navoryn · {new Date().toLocaleDateString()} · navoryn.app
          </Text>

          <View style={s.footer} fixed>
            <Text>Navoryn · {destination} · {dateRange}</Text>
            <Text render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            } />
          </View>
        </Page>
      )}
    </Document>
  );
}
