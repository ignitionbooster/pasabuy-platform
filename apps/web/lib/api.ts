const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    token ? localStorage.setItem("sakay_token", token) : localStorage.removeItem("sakay_token");
  }
}
export function getAccessToken() {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") return localStorage.getItem("sakay_token");
  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  loginWithFirebase: (idToken: string) =>
    request<{ accessToken: string; user: any }>("/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),
  requestRide: (payload: object) =>
    request("/rides", { method: "POST", body: JSON.stringify(payload) }),
  acceptRide: (rideId: string) => request(`/rides/${rideId}/accept`, { method: "POST" }),
  rateRide: (rideId: string, payload: object) =>
    request(`/rides/${rideId}/rate`, { method: "POST", body: JSON.stringify(payload) }),
  getRide: (rideId: string) => request(`/rides/${rideId}`),
  nearbyDrivers: (lat: number, lng: number) => request(`/rides/nearby-drivers/${lat}/${lng}`),
  setDriverOnline: (isOnline: boolean) =>
    request("/drivers/online", { method: "POST", body: JSON.stringify({ isOnline }) }),
  driverEarnings: () => request("/drivers/earnings"),
  initiatePayment: (rideId: string, provider: "CASH" | "GCASH" | "PAYMONGO" | "STRIPE") =>
    request("/payments/initiate", { method: "POST", body: JSON.stringify({ rideId, provider }) }),
};
