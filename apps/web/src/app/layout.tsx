import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Niche Factory",
  description: "Generate and deploy Notion niche packs with AI",
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
