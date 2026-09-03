import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import PushManager from "@/components/PushManager";
import AuthGate from "@/components/AuthGate";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valkea Asistant",
  description: "Kişisel asistanın — gelir-gider, tahsilat, müşteri ve hatırlatmalar tek yerde.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Valkea Asistant",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f5fa",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={manrope.variable}>
      <body>
        <AuthGate>{children}</AuthGate>
        <BottomNav />
        <PushManager />
      </body>
    </html>
  );
}
