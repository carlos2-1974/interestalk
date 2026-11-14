import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ======================================================
// INTERESTALK - ROOT LAYOUT V2.0
// Identidad global de la academia digital
// ======================================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Interestalk | Learn what you love",
    template: "%s | Interestalk",
  },
  description:
    "Interestalk es una academia digital de ingles con inteligencia artificial y aprendizaje personalizado.",
  applicationName: "Interestalk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={
        geistSans.variable +
        " " +
        geistMono.variable +
        " h-full antialiased"
      }
    >
      <body className="flex min-h-[100dvh] flex-col overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}