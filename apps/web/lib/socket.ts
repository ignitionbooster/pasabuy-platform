import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const url = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace("/api/v1", "");
  socket = io(`${url}/realtime`, {
    auth: { token: getAccessToken() },
    transports: ["websocket"],
  });
  return socket;
}

export function joinRideRoom(rideId: string) {
  getSocket().emit("ride:join", { rideId });
}

export function sendDriverLocation(driverProfileId: string, rideId: string | undefined, lat: number, lng: number) {
  getSocket().emit("driver:location", { driverProfileId, rideId, lat, lng });
}

export function sendRideStatus(rideId: string, status: string) {
  getSocket().emit("ride:status", { rideId, status });
}
