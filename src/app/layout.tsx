import type { Metadata } from "next";
import { Inter, Jost } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// The display face: geometric, like the numbers on a house. Headlines only.
const jost = Jost({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jost.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
