import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay Manager",
  description: "Centralized relay node management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
