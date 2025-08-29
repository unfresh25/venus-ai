import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TalentShowProvider } from "@/contexts/TalentShowContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Venus AI",
  description: "IA de Venus, nuestra presentadora del show de talentos para el cumpleaños de Angie!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans bg-black text-white`}>
        <TalentShowProvider>
          {children}
        </TalentShowProvider>
      </body>
    </html>
  );
}
