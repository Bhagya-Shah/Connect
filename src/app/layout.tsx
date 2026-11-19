import type { Metadata, Viewport } from "next";
import { Sora, Figtree } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["600", "700"], display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: "Connect · Your nutrition practice in one app",
  description: "Nutritionists manage clients, diet plans, reports, meal photos and Google Meet sessions in one fast app.",
  appleWebApp: { capable: true, title: "Connect", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1F5BD8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${figtree.variable} antialiased`}>{children}</body>
    </html>
  );
}
