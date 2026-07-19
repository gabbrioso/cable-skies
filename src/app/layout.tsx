import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Bellefair } from "next/font/google";
import "./globals.css";

/**
 * Amstelvar (Google Fonts / Type Network) — Figma “AmstelvarAlpha” family.
 * Used for headings and CTAs.
 */
const amstelvar = localFont({
  src: "../../public/fonts/AmstelvarAlpha.ttf",
  variable: "--font-amstelvar",
  display: "swap",
  weight: "100 900",
});

/** Bellefair — body text (Figma) */
const bellefair = Bellefair({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bellefair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cable Skies",
  description:
    "An interactive artwork mapping how suspended cables divide the sky — and who still gets to see it.",
};

/** viewport-fit=cover so safe-area insets work on notched iPhones */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${amstelvar.variable} ${bellefair.variable}`}>
      <body className={bellefair.className}>{children}</body>
    </html>
  );
}
