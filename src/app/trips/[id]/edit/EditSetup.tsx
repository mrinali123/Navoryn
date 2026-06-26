"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Trip, TripFormData } from "@/types/trip";

const STORAGE_KEY = "navoryn-trip-form";

function tripToFormData(trip: Trip): TripFormData {
  return {
    destination:   trip.destination,
    arrivalDate:   trip.arrival_date,
    arrivalTime:   "",
    departureDate: trip.departure_date,
    departureTime: "",
    numTravelers:  trip.num_travelers,
    tripPurpose:   trip.trip_purpose,
    hotelName:     trip.hotel_name,
    hotelAddress:  trip.hotel_address,
    checkInTime:   "15:00",
    checkOutTime:  "11:00",
    budgetLevel:   trip.budget_level,
    interests:     trip.interests ?? [],
    pace:          trip.pace,
    mustVisit:     trip.must_visit ?? "",
    dietaryPrefs:  trip.dietary_prefs ?? [],
  };
}

export default function EditSetup({ trip }: { trip: Trip }) {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tripToFormData(trip)));
    } catch {}
    router.replace("/trips/new?from=edit");
  }, [trip, router]);

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 48, height: 48, border: "3px solid rgba(56,189,248,0.3)",
            borderTopColor: "#38BDF8", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }}
        />
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
          Preparing trip for editing...
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
