"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, User, ShieldCheck, X, Tv, ArrowLeft, CheckCircle2 } from "lucide-react";
import { authManager, UserAccount, DEFAULT_FAMILY_ACCOUNT } from "@/lib/auth";

interface LoginScreenProps {
  isTvMode?: boolean;
  onLoginSuccess: (account: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Saved accounts on this device
  const [savedUsers, setSavedUsers] = useState<UserAccount[]>(() => authManager.getSavedUsers());

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
      setErrorMsg("כתובת האימייל שהוזנה אינה תקינה");
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

  const handleGoogleQuickLogin = async () => {
    // Quick Gmail sign-in: If user typed email, use it; otherwise use prompt or direct Gmail account
    const promptEmail = email.trim() || prompt("הזן את כתובת ה-Gmail שלך:", "hadarai9087@gmail.com");
    if (!promptEmail) return;

    const cleanEmail = promptEmail.trim().toLowerCase();
    const derivedName = cleanEmail.split("@")[0].replace(/[._-]/g, " ");

    setIsLoading(true);
    try {
      const account = await authManager.loginPasswordless(cleanEmail, derivedName);
      setIsLoading(false);
      onLoginSuccess(account);
    } catch {
      setIsLoading(false);
      setErrorMsg("אירעה שגיאה בהתחברות עם חשבון Google");
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
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/40 via-neutral-950 to-[#0d0d0e] pointer-events-none" />

      {/* Top Header Logo */}
      <div className="absolute top-6 right-6 md:right-12 z-20 flex items-center gap-3">
        <div className="p-1.5 bg-black/60 rounded-xl border border-white/10 shadow-lg">
          <Image
            src="/logo.png"
            alt="HM Logo"
            width={40}
            height={40}
            className="h-8 md:h-10 w-auto object-contain drop-shadow-[0_2px_12px_rgba(229,9,20,0.5)]"
            priority
          />
        </div>
        <span className="text-white font-black text-xl tracking-wider">
          HM<span className="text-[#e50914]">STREAM</span>
        </span>
      </div>

      <div className="relative z-20 w-full max-w-md bg-[#161618]/95 border border-white/10 rounded-3xl p-7 md:p-9 shadow-2xl backdrop-blur-xl">
        {/* Official HM Monogram Logo Header */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative mb-3 group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 opacity-30 blur-lg group-hover:opacity-60 transition duration-500" />
            <div className="relative p-2.5 bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center shadow-xl">
              <Image
                src="/logo.png"
                alt="HM Stream"
                width={72}
                height={72}
                className="h-14 w-auto object-contain drop-shadow-[0_2px_12px_rgba(229,9,20,0.6)]"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white text-center tracking-tight">
            כניסה אישית
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 text-center leading-relaxed">
            התחברות ישירה באמצעות אימייל למחשב ולטלפון ללא צורך בסיסמה
          </p>
        </div>

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

        {/* Direct Google Quick Login Button */}
        <button
          type="button"
          onClick={handleGoogleQuickLogin}
          disabled={isLoading}
          className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold py-3 px-4 rounded-xl transition-all shadow-md text-sm mb-4 flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>כניסה מהירה עם Google / Gmail</span>
        </button>

        <div className="my-3 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-neutral-500 uppercase font-semibold">או באמצעות אימייל</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-right">
              כתובת אימייל
            </label>
            <div className="relative flex items-center">
              <input
                type="email"
                placeholder="name@gmail.com"
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
                placeholder="לדוגמה: הדר מזרחי"
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
            className="w-full bg-[#e50914] hover:bg-[#c11119] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(229,9,20,0.4)] text-sm mt-2 disabled:opacity-50 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? "מתחבר..." : "כניסה מיידית למערכת"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-neutral-500 uppercase font-semibold">או</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* 1-Click Master Family Account */}
        <button
          type="button"
          onClick={handleQuickFamilyLogin}
          disabled={isLoading}
          className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-xl border border-white/10 text-xs flex items-center justify-center gap-2 transition-all mb-3 cursor-pointer"
        >
          <ShieldCheck size={15} className="text-[#e50914]" />
          <span>כניסה ישירה לחשבון משפחה ראשי</span>
        </button>

        {/* Dedicated TV App Link */}
        <div className="pt-2 border-t border-white/10 text-center">
          <Link
            href="/download"
            className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors py-1 cursor-pointer"
          >
            <Tv size={14} className="text-[#e50914]" />
            <span>רוצה לצפות בטלוויזיה? הורד את אפליקציית הטלוויזיה (APK)</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
