"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api, setAccessToken } from "@/lib/api";
import { getSocket, joinRideRoom } from "@/lib/socket";
import type { LatLng } from "@/components/MapView";

// Leaflet touches window/document, so it can only run client-side.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const RIDER_HOME: LatLng = { lat: 6.1128, lng: 125.1725 }; // General Santos City

export default function RiderPage() {
  const [ready, setReady] = useState(false);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [rideId, setRideId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [driverPos, setDriverPos] = useState<LatLng | undefined>(undefined);
  const [fare, setFare] = useState<number | null>(null);

  // 1. Firebase Auth -> exchange for our own short-lived API JWT.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        await signInAnonymously(auth); // swap for phone/Google sign-in in production
        return;
      }
      const idToken = await user.getIdToken();
      const { accessToken } = await api.loginWithFirebase(idToken);
      setAccessToken(accessToken);
      setReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Once a ride exists, join its Socket.IO room and listen for driver
  //    location + status pushes from the backend gateway.
  useEffect(() => {
    if (!rideId) return;
    joinRideRoom(rideId);
    const socket = getSocket();
    const onLocation = (data: LatLng) => setDriverPos(data);
    const onStatus = (data: { status: string }) => setStatus(data.status);
    socket.on("driver:location", onLocation);
    socket.on("ride:status", onStatus);
    socket.on("ride:matched", () => setStatus("ACCEPTED"));
    return () => {
      socket.off("driver:location", onLocation);
      socket.off("ride:status", onStatus);
    };
  }, [rideId]);

  const requestRide = useCallback(async () => {
    if (!dropoff) return;
    const result: any = await api.requestRide({
      pickupLabel: "Current Location",
      pickupLat: RIDER_HOME.lat,
      pickupLng: RIDER_HOME.lng,
      dropoffLabel: "Selected destination",
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      vehicleType: "CAR",
      distanceKm: 5, // TODO: fill from a real routing call (OSRM) client-side, as in the prototype
      durationMin: 15,
    });
    setRideId(result.id);
    setFare(result.fareAmount);
    setStatus("MATCHING");
  }, [dropoff]);

  const payNow = useCallback(async () => {
    if (!rideId) return;
    const result: any = await api.initiatePayment(rideId, "GCASH");
    if (result.redirectUrl) window.location.href = result.redirectUrl;
  }, [rideId]);

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <MapView center={RIDER_HOME} pickup={RIDER_HOME} dropoff={dropoff ?? undefined} driverPosition={driverPos} />
      </div>
      <div style={{ padding: 16, background: "var(--color-card)", borderTop: "1px solid #eee" }}>
        {!ready && <p>Signing in…</p>}
        {ready && !rideId && (
          <>
            <button
              onClick={() => setDropoff({ lat: 6.1128, lng: 125.1717 })}
              style={{ padding: 10, borderRadius: 10, background: "var(--color-bg)", marginRight: 8 }}
            >
              Set demo destination (KCC Mall)
            </button>
            <button
              onClick={requestRide}
              disabled={!dropoff}
              style={{ padding: 10, borderRadius: 10, background: "var(--color-primary)", color: "#fff" }}
            >
              Request ride
            </button>
          </>
        )}
        {rideId && (
          <div>
            <p>Ride status: <b>{status}</b> {fare ? `· ₱${fare}` : ""}</p>
            {status === "COMPLETED" && (
              <button onClick={payNow} style={{ padding: 10, borderRadius: 10, background: "var(--color-primary)", color: "#fff" }}>
                Pay with GCash
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
