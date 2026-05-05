import type { Metadata } from "next";
import { JetBrains_Mono, IM_Fell_English_SC } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={`${jetbrains.variable} ${imFell.variable}`}>
      <body>{children}</body>
    </html>
  );
}
