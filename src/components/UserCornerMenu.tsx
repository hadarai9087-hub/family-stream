"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Settings, LogOut, Tv, Download, ChevronUp, Sliders } from "lucide-react";
import { UserAccount } from "@/lib/auth";
import { SettingsModal } from "./SettingsModal";

interface UserCornerMenuProps {
  account: UserAccount | null;
  onLogout: () => void;
  onAccountUpdated?: (updated: UserAccount) => void;
}

export const UserCornerMenu: React.FC<UserCornerMenuProps> = ({
  account,
  onLogout,
  onAccountUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!account) return null;

  return (
    <>
      <div ref={menuRef} className="fixed bottom-6 right-6 z-40 select-none" dir="rtl">
        {/* Upward Expanding Settings & Profile Menu */}
        {isOpen && (
          <div className="absolute bottom-14 right-0 w-64 bg-[#161618]/95 border border-white/15 rounded-3xl p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-right animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* User Info Header */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl mb-2.5 flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-neutral-900 shrink-0">
                <Image
                  src={account.avatar}
                  alt={account.username}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="truncate">
                <span className="text-sm font-bold text-white block truncate">{account.username}</span>
                <span className="text-[11px] text-neutral-400 block truncate">{account.email}</span>
              </div>
            </div>

            {/* Links & Actions */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/10 transition-colors w-full text-right cursor-pointer"
              >
                <Sliders size={15} className="text-[#e50914]" />
                <span>הגדרות, כתוביות וצבע</span>
              </button>

              <Link
                href="/download"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Download size={15} className="text-neutral-400" />
                <span>הורדת אפליקציה לטלוויזיה (APK)</span>
              </Link>

              <Link
                href="/pair"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Tv size={15} className="text-neutral-400" />
                <span>זיווג מסך טלוויזיה</span>
              </Link>

              <div className="h-px bg-white/10 my-1" />

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-[#e50914] hover:bg-white/10 transition-colors font-semibold cursor-pointer text-right"
              >
                <LogOut size={15} />
                <span>התנתק מהחשבון</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Capsule Button: User Avatar + Settings Icon (ימינה למטה) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-neutral-900/85 hover:bg-black text-white border border-white/20 hover:border-white/50 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer tv-focusable"
          title="פרופיל והגדרות"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/30 bg-neutral-900 shrink-0">
            <Image
              src={account.avatar}
              alt={account.username}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#46d369] rounded-full border border-black" />
          </div>

          <span className="text-xs font-bold text-white hidden sm:inline max-w-[100px] truncate">
            {account.username}
          </span>

          <Settings size={15} className="text-neutral-400 group-hover:text-white transition-colors" />
          <ChevronUp
            size={13}
            className={`text-neutral-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        account={account}
        onAccountUpdated={(updated) => {
          if (onAccountUpdated) onAccountUpdated(updated);
        }}
      />
    </>
  );
};
