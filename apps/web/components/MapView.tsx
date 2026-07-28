"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number };

interface MapViewProps {
  center: LatLng;
  pickup?: LatLng;
  dropoff?: LatLng;
  driverPosition?: LatLng;
  routeCoords?: [number, number][];
  className?: string;
}

// Wrapped in a plain component (not react-leaflet's declarative API) so we
// can imperatively move the driver marker every socket tick without
// re-rendering the whole map tree — matters once updates arrive multiple
// times a second during an active trip.
export default function MapView({ center, pickup, dropoff, driverPosition, routeCoords, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const routeRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([center.lat, center.lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickup) return;
    if (markersRef.current.pickup) map.removeLayer(markersRef.current.pickup);
    markersRef.current.pickup = L.circleMarker([pickup.lat, pickup.lng], { radius: 7, color: "#FF6B5B" }).addTo(map);
  }, [pickup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dropoff) return;
    if (markersRef.current.dropoff) map.removeLayer(markersRef.current.dropoff);
    markersRef.current.dropoff = L.circleMarker([dropoff.lat, dropoff.lng], { radius: 7, color: "#0B3D2E" }).addTo(map);
  }, [dropoff]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeCoords || routeCoords.length < 2) return;
    if (routeRef.current) map.removeLayer(routeRef.current);
    routeRef.current = L.polyline(routeCoords, { color: "#0B3D2E", weight: 5 }).addTo(map);
    map.fitBounds(routeRef.current.getBounds(), { padding: [60, 100] });
  }, [routeCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverPosition) return;
    if (!markersRef.current.driver) {
      markersRef.current.driver = L.marker([driverPosition.lat, driverPosition.lng]).addTo(map);
    } else {
      markersRef.current.driver.setLatLng([driverPosition.lat, driverPosition.lng]);
    }
  }, [driverPosition]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
