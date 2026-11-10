"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, User, X, Tv } from "lucide-react";
import { authManager, UserAccount } from "@/lib/auth";

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
            className="h-8 md:h-10 w-auto object-contain drop-shadow-[0_2px_12px_rgba(var(--accent-rgb),0.5)]"
            priority
          />
        </div>
        <span className="text-white font-black text-xl tracking-wider">
          HM<span className="text-[var(--accent-theme)]">STREAM</span>
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
                className="h-14 w-auto object-contain drop-shadow-[0_2px_12px_rgba(var(--accent-rgb),0.6)]"
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
                  className="group flex items-center gap-2 bg-[#202023] hover:bg-[#28282c] border border-white/10 hover:border-[rgba(var(--accent-rgb),0.5)] rounded-xl px-3 py-1.5 cursor-pointer transition-all active:scale-95"
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
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#202024] hover:bg-[#26262a] focus:bg-[#26262a] border border-white/10 focus:border-[var(--accent-theme)] text-white placeholder-neutral-500 text-sm rounded-xl py-3 pr-10 pl-4 focus:outline-none transition-all text-right"
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
                className="w-full bg-[#202024] hover:bg-[#26262a] focus:bg-[#26262a] border border-white/10 focus:border-[var(--accent-theme)] text-white placeholder-neutral-500 text-sm rounded-xl py-3 pr-10 pl-4 focus:outline-none transition-all text-right"
              />
              <User size={18} className="absolute right-3.5 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[var(--accent-theme)] hover:bg-[var(--accent-hover)] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(var(--accent-rgb),0.4)] text-sm mt-3 disabled:opacity-50 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? "מתחבר..." : "כניסה מיידית למערכת"}
          </button>
        </form>

        {/* Dedicated TV App Link */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <Link
            href="/download"
            className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors py-1 cursor-pointer"
          >
            <Tv size={14} className="text-[var(--accent-theme)]" />
            <span>רוצה לצפות בטלוויזיה? הורד את אפליקציית הטלוויזיה (APK)</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
