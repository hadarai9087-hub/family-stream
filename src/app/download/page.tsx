"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Tv,
  Download,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Flame,
  HelpCircle,
} from "lucide-react";

export default function DownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownloadApk = () => {
    setDownloadStarted(true);
    // Trigger download
    const link = document.createElement("a");
    link.href = "/downloads/hm-stream-tv.apk";
    link.download = "HM-Stream-AndroidTV.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white selection:bg-[#e50914] selection:text-white" dir="rtl">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-800 via-neutral-950 to-black" />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-black/60 rounded-xl border border-white/10 group-hover:border-white/30 transition-all">
            <Image
              src="/logo.png"
              alt="HM Logo"
              width={40}
              height={40}
              className="h-8 w-auto object-contain drop-shadow-[0_2px_10px_rgba(229,9,20,0.5)]"
            />
          </div>
          <span className="text-white font-black text-xl tracking-wider">
            HM<span className="text-[#e50914]">STREAM</span>
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-2 text-xs md:text-sm font-semibold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl transition-all border border-white/10"
        >
          <span>חזרה לאפליקציה</span>
          <ArrowRight size={16} />
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-24">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-800/40 text-red-300 text-xs font-semibold mb-4 animate-in fade-in">
            <Flame size={14} className="text-[#e50914]" />
            <span>גרסת טלוויזיה ייעודית (Android TV & FireStick)</span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-5">
            הקולנוע האישי שלך, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-amber-500">
              במסך הגדול של הסלון.
            </span>
          </h1>

          <p className="text-sm md:text-lg text-neutral-300 leading-relaxed max-w-2xl mx-auto">
            הורד את האפליקציה ישירות לטלוויזיה החכמה, שליטה חלקה ב-100% באמצעות השלט (D-Pad), כתוביות בעברית, והתחברות סלולרית מהירה בסריקת קוד QR.
          </p>
        </div>

        {/* Primary Download Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Card 1: Android TV & Fire TV APK */}
          <div className="bg-[#161618]/90 border border-white/15 rounded-3xl p-7 md:p-9 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/10 blur-3xl pointer-events-none" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#e50914]/20 border border-[#e50914]/30 text-[#e50914] flex items-center justify-center mb-6">
                <Tv size={28} />
              </div>

              <h2 className="text-2xl font-black text-white mb-2">Android TV / FireStick</h2>
              <p className="text-xs md:text-sm text-neutral-300 mb-6 leading-relaxed">
                מתאים לכל סטרימר או טלוויזיה עם מערכת Android TV, Google TV, Xiaomi Mi Box, Nvidia Shield או Amazon FireStick.
              </p>

              <div className="space-y-2.5 mb-8 text-xs md:text-sm text-neutral-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#46d369] shrink-0" />
                  <span>שליטה מלאה בחצי השלט (D-Pad Navigation)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#46d369] shrink-0" />
                  <span>זיווג מהיר מהסמארטפון ללא הקלדת סיסמאות</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#46d369] shrink-0" />
                  <span>איכות FHD / 4K עם כתוביות מסונכרנות בעברית</span>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={handleDownloadApk}
                className="w-full bg-[#e50914] hover:bg-[#b80710] text-white font-black py-4 px-6 rounded-2xl transition-all shadow-xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 text-base cursor-pointer"
              >
                <Download size={22} />
                <span>הורד קובץ התקנה לטלוויזיה (APK)</span>
              </button>

              {downloadStarted && (
                <div className="mt-3 text-center text-xs text-[#46d369] font-medium animate-in fade-in">
                  ההורדה החלה! העבר את הקובץ לטלוויזיה או התקן דרך אפליקציית ניהול קבצים.
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Samsung & LG Smart TV (PWA / Browser) */}
          <div className="bg-[#161618]/90 border border-white/15 rounded-3xl p-7 md:p-9 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/10 blur-3xl pointer-events-none" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-6">
                <Smartphone size={28} />
              </div>

              <h2 className="text-2xl font-black text-white mb-2">Samsung & LG Smart TV</h2>
              <p className="text-xs md:text-sm text-neutral-300 mb-6 leading-relaxed">
                למכשירי Samsung (Tizen) ו-LG (webOS): פתח את דפדפן הטלוויזיה המובנה, הוסף את האתר למסך הבית (PWA), וקבל חוויית אפליקציה מלאה.
              </p>

              <div className="space-y-2.5 mb-8 text-xs md:text-sm text-neutral-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#46d369] shrink-0" />
                  <span>פועל מיידית ללא צורך בהתקנת קבצים חיצוניים</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#46d369] shrink-0" />
                  <span>שמירה במסך הבית של הטלוויזיה בלחיצה אחת</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#46d369] shrink-0" />
                  <span>סנכרון מלא עם רשימת המעקב וההיסטוריה האישית</span>
                </div>
              </div>
            </div>

            <Link
              href="/?tv=1"
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-white/20 hover:border-white/40 flex items-center justify-center gap-3 text-base text-center"
            >
              <ExternalLink size={20} />
              <span>פתח מצב טלוויזיה בדפדפן עכשיו</span>
            </Link>
          </div>
        </div>

        {/* Installation Instructions (How to Install on FireStick / Android TV) */}
        <div className="bg-[#121214] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="text-[#e50914]" size={24} />
            <h3 className="text-xl md:text-2xl font-black text-white">מדריך התקנה פשוט ב-3 שלבים:</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
              <div className="w-8 h-8 rounded-full bg-[#e50914] text-white font-black text-sm flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">התקן אפליקציית Downloader</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                בטלוויזיה או ב-FireStick פתח את חנות האפליקציות וחפש את <strong>Downloader</strong> (חינמית ב-Google Play וב-Amazon Store).
              </p>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
              <div className="w-8 h-8 rounded-full bg-[#e50914] text-white font-black text-sm flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">הזן את קישור ההורדה</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                באפליקציית Downloader הקלד את הכתובת של אתר זה: <br />
                <code className="text-[#e50914] bg-black/80 px-2 py-0.5 rounded text-[11px] font-mono mt-1 inline-block">
                  /download
                </code>
              </p>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
              <div className="w-8 h-8 rounded-full bg-[#e50914] text-white font-black text-sm flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">התחבר ב-QR מהטלפון</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                פתח את האפליקציה בטלוויזיה, סרוק את קוד ה-QR מהסמארטפון, ואתה מחובר ישירות לקטלוג שלך!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
