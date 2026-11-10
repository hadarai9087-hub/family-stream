import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HM Stream - שירות הסטרימינג האישי שלך",
  description: "אפליקציית סטרימינג פרימיום עם ממשק קולנועי, מעקב צפייה, כתוביות בעברית וזיווג טלוויזיה חכם.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HM STREAM",
  },
  icons: {
    icon: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#141414",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} font-sans h-full bg-[#141414] text-white antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HM STREAM" />
      </head>
      <body className="min-h-full flex flex-col bg-[#141414] text-white selection:bg-[#e50914] selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
