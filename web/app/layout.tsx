import type { Metadata } from "next";
import {
  JetBrains_Mono,
  IM_Fell_English_SC,
  Special_Elite,
  Caveat,
} from "next/font/google";
import "./globals.css";
import { TopNavGate } from "@/components/TopNavGate";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-jetbrains",
});

const imFell = IM_Fell_English_SC({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: true,
  variable: "--font-im-fell",
  adjustFontFallback: false,
});

// Typewriter face for the recovered documents — Special Elite is
// Google's open-source typewriter font designed with deliberate
// imperfection (uneven baseline, faint characters).
const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-typewriter",
  adjustFontFallback: false,
});

// Handwritten face for margin annotations and the 2003 letter
// fragment — Caveat reads as casual ink-on-paper.
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-handwritten",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: " ",
  description: " ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${jetbrains.variable} ${imFell.variable} ${specialElite.variable} ${caveat.variable}`}
    >
      <body>
        <TopNavGate />
        {children}
      </body>
    </html>
  );
}
