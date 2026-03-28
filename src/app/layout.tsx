import type { Metadata, Viewport } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "SEVERUS HUD v4.0",
  description: "Advanced AI Command Center - Level 4 Clearance",
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
  themeColor: "#00ff41",
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
    <html lang="en" className="dark">
      <body className={`${spaceMono.variable} font-mono antialiased`}>
        <div className="scanline-overlay" />
        <div className="bracket-tl corner-bracket" />
        <div className="bracket-tr corner-bracket" />
        <div className="bracket-bl corner-bracket" />
        <div className="bracket-br corner-bracket" />
        {children}
      </body>
    </html>
  );
}
