import type { Metadata, Viewport } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SEVERUS",
  description: "Severus - Autonomous Personal Intelligence",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SEVERUS",
  },
  icons: [
    { rel: "icon", url: "/icon.png" },
    { rel: "apple-touch-icon", url: "/icon.png" },
  ],
};

export const viewport: Viewport = {
  themeColor: "#06080c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark selection:bg-emerald-500/30 selection:text-white">
      <body
        className={`${inter.variable} ${spaceMono.variable} font-sans antialiased bg-[#06080c] text-white min-h-screen overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
