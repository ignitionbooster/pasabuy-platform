import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sakay",
  description: "Grab-style ride-hailing platform",
  manifest: "/manifest.json",
  themeColor: "#0B3D2E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
