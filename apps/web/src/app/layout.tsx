import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stridivo — Start it. AI finishes it.",
  description: "AI-powered done-for-you workspaces built for specific niches. Start it. AI finishes it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
