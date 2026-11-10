"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Search,
  Home,
  Tv,
  Film,
  Bookmark,
  LogOut,
  Settings,
} from "lucide-react";
import { UserProfile } from "@/types";

interface TvSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentProfile: UserProfile | null;
  onSwitchProfile?: () => void;
  onLogout: () => void;
}

export const TvSidebar: React.FC<TvSidebarProps> = ({
  activeTab,
  onSelectTab,
  currentProfile,
  onLogout,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { id: "search", label: "חיפוש", icon: Search },
    { id: "home", label: "בית", icon: Home },
    { id: "tv", label: "סדרות", icon: Tv },
    { id: "movies", label: "סרטים", icon: Film },
    { id: "my_list", label: "הרשימה שלי", icon: Bookmark },
  ];

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onFocus={() => setIsExpanded(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsExpanded(false);
        }
      }}
      className={`fixed top-0 right-0 bottom-0 z-40 bg-gradient-to-l from-black/95 via-black/90 to-transparent transition-all duration-300 flex flex-col justify-between py-6 px-3 select-none backdrop-blur-md border-l border-white/10 ${
        isExpanded ? "w-60 md:w-64 bg-black/95 shadow-[10px_0_40px_rgba(0,0,0,0.9)]" : "w-16 md:w-20"
      }`}
    >
      {/* Top: ONLY Official HM Logo (No avatar here) */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => onSelectTab("home")}
          className="p-1.5 bg-black/60 rounded-xl border border-white/15 hover:border-white/40 transition-all mb-8 tv-focusable cursor-pointer"
          title="ראשי"
        >
          <Image
            src="/logo.png"
            alt="HM Stream"
            width={40}
            height={40}
            className="h-8 md:h-10 w-auto object-contain drop-shadow-[0_2px_10px_rgba(229,9,20,0.6)]"
            priority
          />
        </button>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2.5 w-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all w-full text-right tv-focusable cursor-pointer ${
                  isActive
                    ? "bg-[#e50914] text-white font-bold shadow-[0_0_20px_rgba(229,9,20,0.6)]"
                    : "text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
                title={item.label}
              >
                <Icon size={22} className="flex-shrink-0" />
                {isExpanded && (
                  <span className="text-sm tracking-wide font-semibold whitespace-nowrap animate-in fade-in duration-150">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom-Right: User Profile & Settings (ימינה למטה) */}
      <div className="flex flex-col gap-2.5 w-full pt-4 border-t border-white/10">
        {currentProfile && (
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="w-9 h-9 rounded-full overflow-hidden relative border border-white/20 bg-neutral-900 shrink-0 shadow">
              <Image
                src={currentProfile.avatar}
                alt={currentProfile.name}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
            {isExpanded && (
              <div className="truncate text-right">
                <span className="text-sm font-bold text-white block truncate">{currentProfile.name}</span>
                <span className="text-[11px] text-[#46d369] font-medium block">מחובר</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onLogout}
          className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-neutral-400 hover:text-[#e50914] hover:bg-white/10 transition-colors w-full text-right tv-focusable cursor-pointer"
          title="התנתק מהחשבון"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {isExpanded && (
            <span className="text-xs font-semibold whitespace-nowrap">התנתק מהחשבון</span>
          )}
        </button>
      </div>
    </aside>
  );
};
