"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Tv, Smartphone, RefreshCw, CheckCircle2, Mail, User, ArrowRight } from "lucide-react";
import { generateTvPairSession, listenToTvPairSession, approveTvPairSession, TvPairSession } from "@/lib/tvPairing";
import { UserAccount, DEFAULT_FAMILY_ACCOUNT, authManager } from "@/lib/auth";

interface TvFirstLoginScreenProps {
  onLoginSuccess: (account: UserAccount) => void;
}

export const TvFirstLoginScreen: React.FC<TvFirstLoginScreenProps> = ({ onLoginSuccess }) => {
  const [session, setSession] = useState<TvPairSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [approvedAccount, setApprovedAccount] = useState<UserAccount | null>(null);

  // Manual fallback toggle for users who want direct email entry
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refreshPairCode = () => {
    setIsLoading(true);
    generateTvPairSession().then((newSession) => {
      setSession(newSession);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    generateTvPairSession().then((newSession) => {
      setSession(newSession);
      setIsLoading(false);

      unsubscribe = listenToTvPairSession(newSession.code, (data) => {
        setIsApproved(true);
        setApprovedAccount(data.account);
        setTimeout(() => {
          onLoginSuccess(data.account);
        }, 1200);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onLoginSuccess]);



  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("נא להזין כתובת אימייל תקינה");
      return;
    }

    try {
      const acc = await authManager.loginPasswordless(cleanEmail, cleanUsername);
      onLoginSuccess(acc);
    } catch {
      setErrorMsg("שגיאה בהתחברות");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d0e] flex flex-col items-center justify-center p-6 md:p-12 select-none overflow-hidden animate-in fade-in duration-300" dir="rtl">
      {/* Cinematic Dark Background Montage */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/30 via-[#0d0d0e] to-[#0a0a0b] pointer-events-none" />

      {/* Top TV Logo */}
      <div className="absolute top-8 right-8 md:right-16 z-20 flex items-center gap-3">
        <div className="p-2 bg-black/60 rounded-xl border border-white/10 shadow-lg">
          <Image
            src="/logo.png"
            alt="HM Logo"
            width={48}
            height={48}
            className="h-9 md:h-12 w-auto object-contain drop-shadow-[0_2px_12px_rgba(var(--accent-rgb),0.6)]"
          />
        </div>
        <span className="text-white font-black text-2xl md:text-4xl tracking-wider">
          HM<span className="text-[var(--accent-theme)]">STREAM</span>
        </span>
        <span className="bg-[rgba(var(--accent-rgb),0.2)] border border-[rgba(var(--accent-rgb),0.4)] text-[var(--accent-theme)] text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
          TV EDITION
        </span>
      </div>

      {isApproved ? (
        /* Approved Success Animation */
        <div className="relative z-20 flex flex-col items-center animate-in zoom-in-95 duration-300 text-center">
          <div className="w-24 h-24 rounded-full bg-[#46d369]/20 border-2 border-[#46d369] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(70,211,105,0.4)]">
            <CheckCircle2 size={56} className="text-[#46d369]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3">
            הטלוויזיה חוברה בהצלחה!
          </h1>
          <p className="text-lg text-neutral-300">
            ברוך הבא, {approvedAccount?.username || "צופה"}. טוען את הקטלוג האישי שלך...
          </p>
        </div>
      ) : showManualLogin ? (
        /* Optional fallback: Direct Passwordless Email */
        <div className="relative z-20 w-full max-w-md bg-[#181818]/95 border border-white/15 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
          <h2 className="text-2xl font-black text-white mb-2 text-right">התחברות אישית ישירה</h2>
          <p className="text-xs text-neutral-400 mb-6 text-right">כניסה ללא סיסמה באמצעות אימייל</p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-400">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                placeholder="כתובת אימייל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/60 border border-white/20 text-white pr-10 pl-3 py-3 rounded-xl text-right text-sm focus:outline-none focus:border-[var(--accent-theme)]"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-400">
                <User size={16} />
              </div>
              <input
                type="text"
                placeholder="שם משתמש (אופציונלי)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/60 border border-white/20 text-white pr-10 pl-3 py-3 rounded-xl text-right text-sm focus:outline-none focus:border-[var(--accent-theme)]"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[var(--accent-theme)] text-white font-bold py-3.5 rounded-xl text-sm hover:bg-[var(--accent-hover)] transition-colors shadow-lg cursor-pointer"
            >
              התחבר
            </button>

            <button
              type="button"
              onClick={() => setShowManualLogin(false)}
              className="w-full text-xs text-neutral-400 hover:text-white py-2 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowRight size={14} />
              <span>חזור לזיווג באמצעות QR & PIN</span>
            </button>
          </form>
        </div>
      ) : (
        /* The TV-First Main Screen (QR Code & PIN) */
        <div className="relative z-20 w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-10 md:gap-16">
          {/* Left/Right Text Column */}
          <div className="flex-1 text-right flex flex-col items-start order-2 md:order-1">
            <div className="flex items-center gap-2 text-[var(--accent-theme)] font-bold text-sm md:text-base mb-3">
              <Tv size={22} />
              <span>התחברות מהירה ללא הקלדה בשלט</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
              התחברות בטלוויזיה
            </h1>

            <div className="space-y-4 text-neutral-300 text-base md:text-xl font-medium mb-8">
              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-full bg-[var(--accent-theme)] text-white font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-lg">
                  1
                </span>
                <span>פתח את המצלמה בטלפון וסרוק את קוד ה-QR.</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                  2
                </span>
                <span>לחץ בנייד על &quot;אישור התחברות לטלוויזיה&quot;.</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                  3
                </span>
                <span>הטלוויזיה נפתחת מיידית עם הקטלוג וההמלצות שלך!</span>
              </div>
            </div>

            {/* Alternative: Enter 6-digit PIN */}
            {session && (
              <div className="bg-white/5 border border-white/10 p-4 md:p-6 rounded-2xl w-full">
                <span className="text-xs md:text-sm text-neutral-400 block mb-2 font-medium">
                  או גלוש בנייד ל- <strong className="text-white font-mono">/pair</strong> והזן קוד:
                </span>
                <div className="text-3xl md:text-5xl font-mono font-black tracking-widest text-[var(--accent-theme)] bg-black/80 px-6 py-3 rounded-xl border border-white/15 text-center shadow-inner">
                  {session.code}
                </div>
              </div>
            )}

            {/* TV Actions */}
            <div className="flex items-center gap-4 mt-6 flex-wrap">
              <button
                type="button"
                onClick={refreshPairCode}
                className="bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all tv-focusable flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                <span>רענן קוד התחברות</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManualLogin(true)}
                className="text-neutral-400 hover:text-white text-xs md:text-sm transition-colors cursor-pointer py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10"
              >
                התחבר ישירות עם אימייל בשלט &larr;
              </button>
            </div>
          </div>

          {/* Large QR Code Box */}
          <div className="flex flex-col items-center justify-center order-1 md:order-2">
            <div className="relative group p-4 md:p-6 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8),_0_0_50px_rgba(var(--accent-rgb),0.3)] transition-transform duration-300 hover:scale-105">
              {isLoading || !session ? (
                <div className="w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center text-neutral-600">
                  <RefreshCw size={40} className="animate-spin text-[var(--accent-theme)] mb-3" />
                  <span className="text-sm font-semibold">מייצר ברקוד מאובטח...</span>
                </div>
              ) : (
                <div className="relative w-64 h-64 md:w-80 md:h-80">
                  <Image
                    src={session.qrDataUrl}
                    alt="Scan QR with Phone"
                    fill
                    priority
                    className="object-contain rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs md:text-sm text-neutral-400">
              <Smartphone size={16} className="text-[var(--accent-theme)]" />
              <span>סריקה במצלמת הטלפון מחברת את הטלוויזיה מיידית</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
