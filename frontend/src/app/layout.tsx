import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import CopilotWrapper from "@/components/Copilot/CopilotWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AeroMind — AI Aviation Intelligence Platform",
  description:
    "AI-Powered Predictive Aviation Operations & Airspace Intelligence Platform. Real-time flight tracking, delay prediction, weather intelligence.",
  keywords: [
    "aviation",
    "AI",
    "flight tracking",
    "delay prediction",
    "weather intelligence",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
        <CopilotWrapper />
      </body>
    </html>
  );
}
