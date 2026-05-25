import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stridivo.com",
  description: "Generate and deploy Notion workflow systems with AI",
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
