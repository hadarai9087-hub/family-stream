"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Lock, Mail, Tv, Smartphone, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { authManager, Account, DEFAULT_FAMILY_ACCOUNT } from "@/lib/auth";
import { generateTvPairSession, listenToTvPairSession, TvPairSession, approveTvPairSession } from "@/lib/tvPairing";

interface LoginScreenProps {
  isTvMode: boolean;
  onLoginSuccess: (account: Account) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ isTvMode, onLoginSuccess }) => {
  // If in TV mode, default to QR code view; on mobile/PC default to password view
  const [viewMode, setViewMode] = useState<"credentials" | "tv_qr">(isTvMode ? "tv_qr" : "credentials");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // TV QR Pairing State
  const [tvSession, setTvSession] = useState<TvPairSession | null>(null);
  const [isPairSuccess, setIsPairSuccess] = useState(false);

  useEffect(() => {
    if (viewMode === "tv_qr") {
      let unsubscribe: (() => void) | null = null;
      generateTvPairSession().then((session) => {
        setTvSession(session);
        unsubscribe = listenToTvPairSession(session.code, (data) => {
          setIsPairSuccess(true);
          setTimeout(() => {
            onLoginSuccess(data.account);
          }, 1200);
        });
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [viewMode, onLoginSuccess]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const account = await authManager.login(email || DEFAULT_FAMILY_ACCOUNT.email, password);
    setIsLoading(false);
    onLoginSuccess(account);
  };

  const handleQuickFamilyLogin = async () => {
    setIsLoading(true);
    const account = await authManager.login(DEFAULT_FAMILY_ACCOUNT.email, "123456");
    setIsLoading(false);
    onLoginSuccess(account);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414] flex flex-col items-center justify-center p-4 md:p-6 select-none animate-in fade-in duration-300">
      {/* Background Poster Vignette */}
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-950 to-[#141414] pointer-events-none" />

      {/* Top Header Logo */}
      <div className="absolute top-6 right-6 md:right-12 z-20">
        <span className="text-[#e50914] font-black text-3xl md:text-4xl tracking-tighter uppercase drop-shadow-[0_2px_10px_rgba(229,9,20,0.5)]">
          STREAM
        </span>
      </div>

      <div className="relative z-20 w-full max-w-md bg-[#181818]/95 border border-white/15 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl">
        {viewMode === "tv_qr" ? (
          /* ================= TV QR CODE VIEW ================= */
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-[#e50914]/20 border border-[#e50914]/30 text-[#e50914] flex items-center justify-center mb-4">
              <Tv size={28} />
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
              התחברות לטלוויזיה
            </h1>
            <p className="text-xs text-neutral-400 mb-6 max-w-xs">
              סרוק את הברקוד עם מצלמת הטלפון כדי להתחבר אוטומטית לחשבון שלך ללא הקלדת סיסמה בשלט.
            </p>

            {isPairSuccess ? (
              <div className="py-10 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <CheckCircle2 size={64} className="text-[#46d369] mb-3" />
                <h3 className="text-xl font-bold text-white">הטלוויזיה חוברה בהצלחה!</h3>
                <p className="text-xs text-neutral-400 mt-1">טוען את המערכת...</p>
              </div>
            ) : tvSession ? (
              <div className="flex flex-col items-center w-full">
                {/* Large QR Code */}
                <div className="bg-white p-4 rounded-2xl shadow-2xl mb-5">
                  <Image
                    src={tvSession.qrDataUrl}
                    alt="QR Code"
                    width={240}
                    height={240}
                    className="rounded-lg"
                  />
                </div>

                {/* 6-character Code Display */}
                <div className="mb-4">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1">
                    או גלוש בטלפון ל-`localhost:3000/pair` והזן קוד:
                  </span>
                  <div className="text-3xl font-mono font-black tracking-widest text-[#e50914] bg-black/60 px-6 py-2 rounded-xl border border-white/10 select-all">
                    {tvSession.code}
                  </div>
                </div>

                {/* Demo instant approve shortcut */}
                <button
                  type="button"
                  onClick={() => approveTvPairSession(tvSession.code, DEFAULT_FAMILY_ACCOUNT, "p1")}
                  className="text-xs text-neutral-400 hover:text-white underline transition-colors mb-4"
                >
                  בדיקת אישור מיידי (סימולציית טלפון)
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("credentials")}
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  מעבר להתחברות רגילה עם אימייל וסיסמה &larr;
                </button>
              </div>
            ) : (
              <div className="py-12 text-neutral-400 text-sm">מייצר קוד התחברות...</div>
            )}
          </div>
        ) : (
          /* ================= CREDENTIALS FORM VIEW (PHONE / PC) ================= */
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 text-right tracking-tight">
              כניסה לחשבון
            </h1>
            <p className="text-sm text-neutral-400 mb-8 text-right leading-relaxed">
              התחבר פעם אחת, והמכשיר יישאר מחובר תמיד.
            </p>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2 text-right">
                  כתובת אימייל
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#262626] hover:bg-[#2e2e2e] focus:bg-[#2e2e2e] border border-white/10 focus:border-[#e50914] text-white placeholder-neutral-500 text-sm rounded-xl py-3.5 pr-11 pl-4 focus:outline-none transition-all text-right"
                  />
                  <Mail size={18} className="absolute right-3.5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2 text-right">
                  סיסמה
                </label>
                <div className="relative flex items-center">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#262626] hover:bg-[#2e2e2e] focus:bg-[#2e2e2e] border border-white/10 focus:border-[#e50914] text-white placeholder-neutral-500 text-sm rounded-xl py-3.5 pr-11 pl-4 focus:outline-none transition-all text-right"
                  />
                  <Lock size={18} className="absolute right-3.5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#e50914] hover:bg-[#c11119] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(229,9,20,0.4)] text-base mt-2 disabled:opacity-50 active:scale-98 cursor-pointer"
              >
                {isLoading ? "מתחבר..." : "התחבר"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-neutral-500 uppercase font-semibold">או</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* 1-Click Family Login */}
            <button
              onClick={handleQuickFamilyLogin}
              disabled={isLoading}
              className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 rounded-xl border border-white/10 text-sm flex items-center justify-center gap-2.5 transition-all mb-4 cursor-pointer"
            >
              <ShieldCheck size={18} className="text-[#e50914]" />
              <span>כניסה מהירה בלחיצה אחת לחשבון המשפחה</span>
            </button>

            {/* Switch to TV QR */}
            <button
              onClick={() => setViewMode("tv_qr")}
              className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-2 transition-colors py-1 cursor-pointer"
            >
              <Tv size={16} />
              <span>צופה בטלוויזיה? התחבר באמצעות קוד ו-QR</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
