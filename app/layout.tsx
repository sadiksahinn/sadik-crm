import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import PushManager from "@/components/PushManager";
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
  appleWebApp: {
    capable: true,
    title: "Valkea Asistant",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#3fa7c9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={manrope.variable}>
      <body>
        {children}
        <BottomNav />
        <PushManager />
      </body>
    </html>
  );
}