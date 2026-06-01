import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import PushManager from "@/components/PushManager";
import "./globals.css";
// Material Symbols font (BottomNav ikonları için)
// eslint-disable-next-line @next/next/no-page-custom-font

export const metadata: Metadata = {
  title: "Valkea",
  description: "Kişisel CRM ve Asistan Sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Valkea",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <BottomNav />
        <PushManager />
      </body>
    </html>
  );
}