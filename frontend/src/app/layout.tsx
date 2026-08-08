import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WasGehtWien — Events & Kultur in Wien",
  description: "Dein Guide für heutige Veranstaltungen, Konzerte und Kultur-Highlights in Wien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
