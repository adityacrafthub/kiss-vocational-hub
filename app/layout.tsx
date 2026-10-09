import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KISS | Vocational Hub",
  description: "From learning a skill to creating a livelihood. Manage the complete vocational journey.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><link rel="preconnect" href="https://www.youtube.com"/><link rel="preconnect" href="https://i.ytimg.com"/><link rel="dns-prefetch" href="https://www.googlevideo.com"/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
