"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Mail, User, Tv, CheckCircle2, ShieldCheck, X, ArrowLeft } from "lucide-react";
import { authManager, UserAccount, DEFAULT_FAMILY_ACCOUNT } from "@/lib/auth";
import { generateTvPairSession, listenToTvPairSession, TvPairSession, approveTvPairSession } from "@/lib/tvPairing";

interface LoginScreenProps {
  isTvMode: boolean;
  onLoginSuccess: (account: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ isTvMode, onLoginSuccess }) => {
  const [viewMode, setViewMode] = useState<"credentials" | "tv_qr">(isTvMode ? "tv_qr" : "credentials");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Saved accounts on this device
  const [savedUsers, setSavedUsers] = useState<UserAccount[]>(() => authManager.getSavedUsers());

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
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!cleanEmail) {
      setErrorMsg("נא להזין כתובת אימייל תקינה");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg("כתובת האימייל אינה תקינה");
      return;
    }

    setIsLoading(true);
    try {
      const account = await authManager.loginPasswordless(cleanEmail, cleanUsername);
      setIsLoading(false);
      onLoginSuccess(account);
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : "אירעה שגיאה בכניסה למערכת";
      setErrorMsg(message);
    }
  };

  const handleSavedUserClick = async (user: UserAccount) => {
    setIsLoading(true);
    const account = await authManager.loginAsSavedUser(user);
    setIsLoading(false);
    onLoginSuccess(account);
  };

  const handleRemoveSavedUser = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    authManager.removeSavedUser(userId);
    setSavedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleQuickFamilyLogin = async () => {
    setIsLoading(true);
    const account = await authManager.loginPasswordless(DEFAULT_FAMILY_ACCOUNT.email, DEFAULT_FAMILY_ACCOUNT.username);
    setIsLoading(false);
    onLoginSuccess(account);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d0e] flex flex-col items-center justify-center p-4 md:p-6 select-none animate-in fade-in duration-300" dir="rtl">
      {/* Background Poster Vignette */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/40 via-neutral-950 to-[#0d0d0e] pointer-events-none" />

      {/* Top Header Logo */}
      <div className="absolute top-6 right-6 md:right-12 z-20 flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="HM Logo"
          width={48}
          height={48}
          className="h-10 w-auto object-contain drop-shadow-[0_2px_12px_rgba(229,9,20,0.5)]"
          priority
        />
        <span className="text-white font-black text-xl tracking-wider">
          FAMILY<span className="text-[#e50914]">STREAM</span>
        </span>
      </div>

      <div className="relative z-20 w-full max-w-md bg-[#161618]/95 border border-white/10 rounded-3xl p-7 md:p-9 shadow-2xl backdrop-blur-xl">
        {/* Official HM Monogram Logo Header */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative mb-3 group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 opacity-30 blur-lg group-hover:opacity-60 transition duration-500" />
            <div className="relative p-2.5 bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="HM Stream"
                width={72}
                height={72}
                className="h-14 w-auto object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white text-center tracking-tight">
            {viewMode === "tv_qr" ? "התחברות לטלוויזיה" : "כניסה אישית"}
          </h1>
          <p className="text-xs text-neutral-400 mt-1 text-center">
            {viewMode === "tv_qr"
              ? "סריקה מהירה מהנייד ללא הקלדת סיסמה בשלט"
              : "התחברות ישירה באמצעות אימייל וללא צורך בסיסמה"}
          </p>
        </div>

        {viewMode === "tv_qr" ? (
          /* ================= TV QR CODE VIEW ================= */
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {isPairSuccess ? (
              <div className="py-8 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <CheckCircle2 size={56} className="text-[#46d369] mb-3" />
                <h3 className="text-xl font-bold text-white">הטלוויזיה חוברה בהצלחה!</h3>
                <p className="text-xs text-neutral-400 mt-1">טוען את הקטלוג האישי...</p>
              </div>
            ) : tvSession ? (
              <div className="flex flex-col items-center w-full">
                {/* Large QR Code */}
                <div className="bg-white p-3.5 rounded-2xl shadow-2xl mb-4">
                  <Image
                    src={tvSession.qrDataUrl}
                    alt="QR Code"
                    width={220}
                    height={220}
                    className="rounded-lg"
                  />
                </div>

                {/* Numeric PIN display */}
                <div className="mb-4">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1">
                    או גלוש בטלפון ל-`/pair` והזן קוד:
                  </span>
                  <div className="text-3xl font-mono font-black tracking-widest text-[#e50914] bg-black/60 px-6 py-2 rounded-xl border border-white/10 select-all">
                    {tvSession.code}
                  </div>
                </div>

                {/* Demo instant approve shortcut */}
                <button
                  type="button"
                  onClick={() => approveTvPairSession(tvSession.code, DEFAULT_FAMILY_ACCOUNT)}
                  className="text-xs text-neutral-400 hover:text-white underline transition-colors mb-3 cursor-pointer"
                >
                  בדיקת אישור מיידי (סימולציית טלפון)
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("credentials")}
                  className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>מעבר להתחברות ישירה עם אימייל</span>
                </button>
              </div>
            ) : (
              <div className="py-10 text-neutral-400 text-sm">מייצר קוד התחברות...</div>
            )}
          </div>
        ) : (
          /* ================= PASSWORDLESS CREDENTIALS FORM ================= */
          <div className="flex flex-col">
            {/* Remembered / Saved User Chips on this device */}
            {savedUsers.length > 0 && (
              <div className="mb-5">
                <span className="text-xs font-semibold text-neutral-400 block mb-2 text-right">
                  חשבונות שמורים במכשיר זה:
                </span>
                <div className="flex flex-wrap gap-2">
                  {savedUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSavedUserClick(u)}
                      className="group flex items-center gap-2 bg-[#202023] hover:bg-[#28282c] border border-white/10 hover:border-[#e50914]/50 rounded-xl px-3 py-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Image
                        src={u.avatar}
                        alt={u.username}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs font-medium text-white">{u.username}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSavedUser(e, u.id)}
                        className="text-neutral-500 hover:text-red-400 p-0.5 rounded-full"
                        title="הסר חשבון שמור"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs text-right animate-in fade-in">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-right">
                  כתובת אימייל
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#202024] hover:bg-[#26262a] focus:bg-[#26262a] border border-white/10 focus:border-[#e50914] text-white placeholder-neutral-500 text-sm rounded-xl py-3 pr-10 pl-4 focus:outline-none transition-all text-right"
                  />
                  <Mail size={18} className="absolute right-3.5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-right">
                  שם משתמש (לתצוגה)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="לדוגמה: דן כהן"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#202024] hover:bg-[#26262a] focus:bg-[#26262a] border border-white/10 focus:border-[#e50914] text-white placeholder-neutral-500 text-sm rounded-xl py-3 pr-10 pl-4 focus:outline-none transition-all text-right"
                  />
                  <User size={18} className="absolute right-3.5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#e50914] hover:bg-[#c11119] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(229,9,20,0.4)] text-sm mt-3 disabled:opacity-50 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? "מתחבר..." : "כניסה מהירה לחשבון"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-neutral-500 uppercase font-semibold">או</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* 1-Click Master Family Account */}
            <button
              type="button"
              onClick={handleQuickFamilyLogin}
              disabled={isLoading}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl border border-white/10 text-xs flex items-center justify-center gap-2 transition-all mb-3 cursor-pointer"
            >
              <ShieldCheck size={16} className="text-[#e50914]" />
              <span>כניסה מהירה לחשבון המשפחה הראשי</span>
            </button>

            {/* Switch to TV QR */}
            <button
              type="button"
              onClick={() => setViewMode("tv_qr")}
              className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors py-1 cursor-pointer"
            >
              <Tv size={15} />
              <span>התחברות באמצעות קוד QR לטלוויזיה</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
