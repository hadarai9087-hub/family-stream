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
  title: "Family Stream - נטפליקס אישי למשפחה",
  description: "אפליקציית סטרימינג משפחתית מודרנית עם ממשק פרימיום, מעקב צפייה וזיווג טלוויזיה חכם.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon/pwa-192x192.png",
    apple: "/icon/pwa-192x192.png",
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
      <body className="min-h-full flex flex-col bg-[#141414] text-white selection:bg-[#e50914] selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
