"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Tv, CheckCircle2, ArrowRight, ShieldCheck, Mail, User, Sparkles } from "lucide-react";
import { authManager, UserAccount } from "@/lib/auth";
import { approveTvPairSession } from "@/lib/tvPairing";

function PairContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields if phone is not logged in yet
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const acc = authManager.getCurrentUser();
    if (acc) {
      setCurrentAccount(acc);
    }
  }, []);

  const handleApproveWithCurrentAccount = async () => {
    if (!code.trim() || !currentAccount) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const ok = await approveTvPairSession(code.trim().toUpperCase(), currentAccount);
      setIsSubmitting(false);
      if (ok) {
        setIsSuccess(true);
      } else {
        setErrorMsg("לא הצלחנו לאמת את קוד הטלוויזיה. אנא ודא שהקוד תואם למוצג במסך.");
      }
    } catch {
      setIsSubmitting(false);
      setErrorMsg("אירעה שגיאה בחיבור לטלוויזיה");
    }
  };

  const handleLoginAndApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg("נא להזין קוד טלוויזיה בן 6 ספרות");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("נא להזין כתובת אימייל תקינה");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const account = await authManager.loginPasswordless(cleanEmail, cleanUsername);
      setCurrentAccount(account);

      const ok = await approveTvPairSession(code.trim().toUpperCase(), account);
      setIsSubmitting(false);

      if (ok) {
        setIsSuccess(true);
      } else {
        setErrorMsg("החשבון נוצר אך לא הצלחנו לחבר לטלוויזיה. בדוק את הקוד.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || "אירעה שגיאה בהתחברות");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0e] text-white flex flex-col items-center justify-center p-4 md:p-6 text-center select-none" dir="rtl">
      {/* Background Glow */}
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/40 via-neutral-950 to-[#0d0d0e] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-[#161618]/95 border border-white/10 rounded-3xl p-7 md:p-9 shadow-2xl backdrop-blur-xl">
        {/* HM Monogram Logo Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative p-2.5 bg-black/60 rounded-2xl border border-white/10 shadow-lg mb-3">
            <Image
              src="/logo.png"
              alt="HM Stream"
              width={64}
              height={64}
              className="h-12 w-auto object-contain drop-shadow-[0_2px_12px_rgba(var(--accent-rgb),0.5)]"
              priority
            />
          </div>
          <span className="text-white font-black text-xl tracking-wider">
            HM<span className="text-[var(--accent-theme)]">STREAM</span>
          </span>
          <p className="text-xs text-neutral-400 mt-1">חיבור מהיר של הטלוויזיה מהטלפון</p>
        </div>

        {isSuccess ? (
          <div className="py-6 flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[#46d369] flex items-center justify-center mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="text-2xl font-black mb-2 text-white">הטלוויזיה חוברה בהצלחה!</h1>
            <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
              הטלוויזיה בסלון התחברה לחשבונך ונכנסת ישירות לדף הבית האישי שלך.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-[var(--accent-theme)] hover:bg-[var(--accent-hover)] text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-xl hover:scale-105 active:scale-95"
            >
              <span>מעבר לצפייה בטלפון</span>
              <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(var(--accent-rgb),0.2)] border border-[rgba(var(--accent-rgb),0.3)] text-[var(--accent-theme)] flex items-center justify-center mb-3">
              <Tv size={24} />
            </div>

            <h1 className="text-xl md:text-2xl font-black mb-1">אישור כניסה לטלוויזיה</h1>
            <p className="text-xs text-neutral-400 mb-5">
              הזן את הקוד בן 6 התווים המוצג על גבי מסך הטלוויזיה בסלון
            </p>

            {/* Code Input */}
            <div className="w-full mb-5">
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-center font-mono font-black text-3xl tracking-widest text-[var(--accent-theme)] bg-black/70 px-4 py-3 rounded-2xl border border-white/20 focus:border-[var(--accent-theme)] focus:outline-none uppercase shadow-inner"
                placeholder="A8X2K9"
              />
            </div>

            {errorMsg && (
              <div className="w-full mb-4 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-xs">
                {errorMsg}
              </div>
            )}

            {/* If Phone is already logged in (Instant 1-Tap Handshake) */}
            {currentAccount ? (
              <div className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl mb-4 text-right">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400">חשבון מחובר בטלפון:</span>
                  <span className="text-xs text-[#46d369] font-bold flex items-center gap-1">
                    <ShieldCheck size={14} />
                    מאומת
                  </span>
                </div>
                <div className="text-base font-bold text-white truncate">{currentAccount.username}</div>
                <div className="text-xs text-neutral-400 mt-0.5 truncate">{currentAccount.email}</div>

                <button
                  type="button"
                  onClick={handleApproveWithCurrentAccount}
                  disabled={isSubmitting || !code.trim()}
                  className="w-full mt-4 bg-[var(--accent-theme)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition-all shadow-xl text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Sparkles size={18} />
                  <span>{isSubmitting ? "מחבר את הטלוויזיה..." : `חבר את הטלוויזיה לחשבון (${currentAccount.username})`}</span>
                </button>
              </div>
            ) : (
              /* If Phone is not logged in yet, prompt for email + username */
              <form onSubmit={handleLoginAndApprove} className="w-full space-y-3 text-right">
                <div className="text-xs text-neutral-300 font-medium mb-1">
                  הטלפון אינו מחובר. הזן אימייל ושם כדי להתחבר ולחבר את הטלוויזיה:
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="כתובת אימייל"
                    className="w-full bg-black/60 border border-white/15 focus:border-[var(--accent-theme)] rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none transition-all placeholder:text-neutral-500"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="שם משתמש (אופציונלי)"
                    className="w-full bg-black/60 border border-white/15 focus:border-[var(--accent-theme)] rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none transition-all placeholder:text-neutral-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !code.trim()}
                  className="w-full bg-[var(--accent-theme)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all shadow-xl text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer mt-2"
                >
                  <Tv size={16} />
                  <span>{isSubmitting ? "מתחבר ומחבר..." : "התחבר ואשר חיבור לטלוויזיה"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PairPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0d0e] flex items-center justify-center text-white">
          טוען נתוני חיבור...
        </div>
      }
    >
      <PairContent />
    </Suspense>
  );
}
