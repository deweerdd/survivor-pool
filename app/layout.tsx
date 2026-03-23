import type { Metadata } from "next";
import { Teko, Barlow } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import Footer from "@/components/Footer";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
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
        <ThemeProvider>
          <div className="flex-1">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
