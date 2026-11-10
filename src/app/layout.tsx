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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("hm_app_settings");if(s){var p=JSON.parse(s);if(p&&p.accentColor){var c=[{hex:"#e50914",hover:"#b80710",rgb:"229, 9, 20"},{hex:"#0070f3",hover:"#0058c6",rgb:"0, 112, 243"},{hex:"#8b5cf6",hover:"#7c3aed",rgb:"139, 92, 246"},{hex:"#10b981",hover:"#059669",rgb:"16, 185, 129"},{hex:"#f59e0b",hover:"#d97706",rgb:"245, 158, 11"},{hex:"#ec4899",hover:"#db2777",rgb:"236, 72, 153"}];var m=c.find(function(x){return x.hex.toLowerCase()===p.accentColor.toLowerCase()})||c[0];document.documentElement.style.setProperty("--accent-theme",m.hex);document.documentElement.style.setProperty("--accent-hover",m.hover);document.documentElement.style.setProperty("--accent-rgb",m.rgb);}}}catch(e){}})();`,
          }}
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HM STREAM" />
      </head>
      <body className="min-h-full flex flex-col bg-[#141414] text-white selection:bg-[var(--accent-theme)] selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
