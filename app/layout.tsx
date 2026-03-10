import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Survivor Pool",
  description: "Survivor TV show office pool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
