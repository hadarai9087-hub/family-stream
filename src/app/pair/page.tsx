"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Tv, CheckCircle2, ArrowRight, ShieldCheck, LogIn } from "lucide-react";
import { authManager, Account, DEFAULT_FAMILY_ACCOUNT } from "@/lib/auth";
import { approveTvPairSession } from "@/lib/tvPairing";

function PairContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback credentials if phone is not logged in yet
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const acc = authManager.getAccount();
    if (acc) {
      setCurrentAccount(acc);
    }
  }, []);

  const handleApproveWithCurrentAccount = async () => {
    if (!code.trim() || !currentAccount) return;

    setIsSubmitting(true);
    const ok = await approveTvPairSession(code.trim().toUpperCase(), currentAccount);
    setIsSubmitting(false);

    if (ok) {
      setIsSuccess(true);
    }
  };

  const handleLoginAndApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    const acc = await authManager.login(email || DEFAULT_FAMILY_ACCOUNT.email, password);
    setCurrentAccount(acc);

    const ok = await approveTvPairSession(code.trim().toUpperCase(), acc);
    setIsSubmitting(false);

    if (ok) {
      setIsSuccess(true);
    }
  };

  const handleQuickFamilyApprove = async () => {
    if (!code.trim()) return;

    setIsSubmitting(true);
    const acc = await authManager.login(DEFAULT_FAMILY_ACCOUNT.email, "123456");
    setCurrentAccount(acc);

    const ok = await approveTvPairSession(code.trim().toUpperCase(), acc);
    setIsSubmitting(false);

    if (ok) {
      setIsSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-8 shadow-2xl">
        {/* Logo */}
        <div className="mb-6 text-[#e50914] font-black text-3xl tracking-tighter uppercase">
          STREAM
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center animate-in zoom-in-95 duration-200">
            <CheckCircle2 size={64} className="text-[#46d369] mb-4" />
            <h1 className="text-2xl font-black mb-2">הטלוויזיה חוברה בהצלחה!</h1>
            <p className="text-sm text-neutral-400 mb-6">
              הטלוויזיה נכנסה לחשבון שלך. תוכל לסגור עמוד זה ולצפות בסלון!
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              <span>חזור לדף הבית בטלפון</span>
              <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-[#e50914]/20 border border-[#e50914]/30 text-[#e50914] flex items-center justify-center mb-4">
              <Tv size={28} />
            </div>

            <h1 className="text-xl md:text-2xl font-black mb-1">
              אישור כניסה לטלוויזיה
            </h1>

            {/* Code Badge */}
            <div className="my-4">
              <span className="text-[11px] text-neutral-400 block mb-1">קוד טלוויזיה שזוהה:</span>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center font-mono font-black text-2xl tracking-widest text-[#e50914] bg-black/60 px-5 py-2 rounded-xl border border-white/20 focus:border-[#e50914] focus:outline-none uppercase"
                placeholder="A8X2K9"
              />
            </div>

            {/* If Phone is already logged in (The ideal 1-tap experience) */}
            {currentAccount ? (
              <div className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl mb-6 text-right">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400">חשבון מחובר בטלפון:</span>
                  <span className="text-xs text-[#46d369] font-bold flex items-center gap-1">
                    <ShieldCheck size={14} />
                    מחובר
                  </span>
                </div>
                <div className="text-sm font-bold text-white truncate">{currentAccount.email}</div>
                <div className="text-xs text-neutral-400 mt-0.5">משפחה: {currentAccount.familyName}</div>

                <button
                  type="button"
                  onClick={handleApproveWithCurrentAccount}
                  disabled={isSubmitting || !code.trim()}
                  className="w-full mt-5 bg-[#e50914] hover:bg-[#b80710] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                >
                  <Tv size={18} />
                  <span>{isSubmitting ? "מחבר את הטלוויזיה..." : "חבר את הטלוויזיה לחשבון שלי"}</span>
                </button>
              </div>
            ) : (
              /* If phone is not logged in yet, offer instant 1-click or quick form */
              <div className="w-full">
                <p className="text-xs text-neutral-400 mb-5">
                  הטלפון אינו מחובר עדיין לחשבון. התחבר עכשיו והטלוויזיה תחובר יחד איתו:
                </p>

                {/* 1-click family login shortcut */}
                <button
                  type="button"
                  onClick={handleQuickFamilyApprove}
                  disabled={isSubmitting || !code.trim()}
                  className="w-full bg-[#e50914] hover:bg-[#b80710] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 mb-4"
                >
                  <ShieldCheck size={18} />
                  <span>כניסה מהירה וחיבור הטלוויזיה בלחיצה אחת</span>
                </button>

                <div className="my-4 flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">או התחבר עם אימייל</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleLoginAndApprove} className="space-y-3">
                  <input
                    type="email"
                    placeholder="אימייל"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 text-white text-xs rounded-xl py-2.5 px-3 text-right focus:outline-none focus:border-[#e50914]"
                    required
                  />
                  <input
                    type="password"
                    placeholder="סיסמה"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 text-white text-xs rounded-xl py-2.5 px-3 text-right focus:outline-none focus:border-[#e50914]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !code.trim()}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl transition-all text-xs"
                  >
                    התחבר ואשר טלוויזיה
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PairPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">טוען...</div>}>
      <PairContent />
    </Suspense>
  );
}
