"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useParticipants } from "./hooks/useParticipants";
import { Participant } from "./hooks/useParticipants";
import { createContext } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const initialParticipants: Participant[] = [
  { id: 1, name: 'Mafe', talent: 'Manitas pa que te tengo', score: 0, hasPerformed: false },
  { id: 2, name: 'Mary Buzón', talent: 'TED Talk: Exportando emociones: Lo que Europa olvidó incluir en el tratado Schengen', score: 0, hasPerformed: false },
];

const metadata: Metadata = {
  title: "Venus AI",
  description: "IA de Venus, nuestra presentadora del show de talentos para el cumpleaños de Angie!",
};

function Providers({ children }: { children: React.ReactNode }) {
  const participantsState = useParticipants(initialParticipants);
  
  return (
    <ParticipantsContext.Provider value={participantsState}>
      {children}
    </ParticipantsContext.Provider>
  );
}

type ParticipantsContextType = ReturnType<typeof useParticipants>;
export const ParticipantsContext = createContext<ParticipantsContextType | undefined>(undefined);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans bg-black text-white`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
