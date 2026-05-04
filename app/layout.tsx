import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kullanıcı CRM",
  description: "Kişisel CRM ve Asistan Sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kullanıcı CRM",
    statusBarStyle: "black-translucent",
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
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}