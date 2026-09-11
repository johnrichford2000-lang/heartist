import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const outfit = Outfit({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-outfit",
});

import HamburgerMenu from "@/components/HamburgerMenu";
import GlobalBottomNav from "@/components/GlobalBottomNav";
import AdminBottomNav from "@/components/AdminBottomNav";
import NotificationListener from "@/components/NotificationListener";
import SystemSettingsListener from "@/components/SystemSettingsListener";
import BlockEnforcer from "@/components/BlockEnforcer";

export const metadata: Metadata = {
  title: "Heartist Ministry Portal",
  description: "Main portal for Heartist Ministry, Fusion Camp, and Joint Fellowships.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable}`}>
      <body>
        {/* Listeners & Enforcers */}
        <NotificationListener />
        <SystemSettingsListener />
        <BlockEnforcer />
        <HamburgerMenu />
        {children}
        <GlobalBottomNav />
        <AdminBottomNav />
      </body>
    </html>
  );
}
