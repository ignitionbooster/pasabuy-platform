"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { api, setAccessToken } from "@/lib/api";
import { getSocket, sendDriverLocation } from "@/lib/socket";
import type { LatLng } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const DRIVER_START: LatLng = { lat: 6.1225, lng: 125.1611 }; // Lagao, General Santos City

export default function DriverPage() {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(false);
  const [position, setPosition] = useState<LatLng>(DRIVER_START);
  const [incomingRideId, setIncomingRideId] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const driverProfileId = useRef<string>("demo-driver-profile-id"); // comes from /users/me in production

  useEffect(() => {
    let auth;
    try {
      auth = getFirebaseAuth();
    } catch (err) {
      console.error("Firebase Auth unavailable (check your Firebase env vars):", err);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) { await signInAnonymously(auth); return; }
        const idToken = await user.getIdToken();
        const { accessToken } = await api.loginWithFirebase(idToken);
        setAccessToken(accessToken);
        setReady(true);
      } catch (err) {
        console.error("Firebase/API login failed:", err);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const socket = getSocket();
    socket.on("ride:matched", (data: { rideId?: string }) => {
      if (data?.rideId) setIncomingRideId(data.rideId);
    });
    return () => { socket.off("ride:matched"); };
  }, [ready]);

  const goOnline = async () => {
    await api.setDriverOnline(true);
    setOnline(true);
    // Broadcast real device GPS over the socket every time it changes.
    // Falls back to the fixed DRIVER_START above if geolocation is denied.
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(next);
          sendDriverLocation(driverProfileId.current, incomingRideId ?? undefined, next.lat, next.lng);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  };

  const goOffline = async () => {
    await api.setDriverOnline(false);
    setOnline(false);
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
  };

  const acceptRide = async () => {
    if (!incomingRideId) return;
    await api.acceptRide(incomingRideId);
  };

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <MapView center={position} driverPosition={position} />
      </div>
      <div style={{ padding: 16, background: "var(--color-card)", borderTop: "1px solid #eee" }}>
        {!ready ? (
          <p>Signing in…</p>
        ) : (
          <>
            <button
              onClick={online ? goOffline : goOnline}
              style={{ padding: 10, borderRadius: 10, background: online ? "var(--color-primary)" : "#eee", color: online ? "#fff" : "#000" }}
            >
              {online ? "Go offline" : "Go online"}
            </button>
            {incomingRideId && (
              <div style={{ marginTop: 10 }}>
                <p>New ride request: {incomingRideId}</p>
                <button onClick={acceptRide} style={{ padding: 10, borderRadius: 10, background: "var(--color-accent)" }}>
                  Accept
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
