import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnAnything AI",
  description: "AI-guided knowledge mastery with 90-day plans, weekly milestones, and multi-model learning chains."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
