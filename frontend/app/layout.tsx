import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FPL Analyser by Haider",
  description: "Advanced Fantasy Premier League analytics, AI-powered insights, and real-time tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${outfit.variable} ${firaCode.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased flex flex-col">
        <Providers>
          <Navigation />
          <main className="pt-16 flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
