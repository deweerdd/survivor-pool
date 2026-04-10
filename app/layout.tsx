import type { Metadata } from "next";
import { Teko, Barlow } from "next/font/google";
import Footer from "@/components/Footer";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const teko = Teko({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Survivor Pool", template: "%s | Survivor Pool" },
  description:
    "Pick your castaways, earn points when they survive. A Survivor TV show office pool app.",
  metadataBase: new URL(getSiteUrl()),
  openGraph: {
    title: "Survivor Pool",
    description: "Pick your castaways, earn points when they survive.",
    siteName: "Survivor Pool",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Survivor Pool",
    description: "Pick your castaways, earn points when they survive.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${teko.variable} ${barlow.variable}`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
