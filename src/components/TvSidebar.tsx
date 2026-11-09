"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Search,
  Home,
  Tv,
  Film,
  Bookmark,
  Users,
  LogOut,
  ChevronRight,
  Settings,
} from "lucide-react";
import { UserProfile } from "@/types";

interface TvSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentProfile: UserProfile | null;
  onSwitchProfile: () => void;
  onLogout: () => void;
}

export const TvSidebar: React.FC<TvSidebarProps> = ({
  activeTab,
  onSelectTab,
  currentProfile,
  onSwitchProfile,
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
        // If focus leaves the sidebar completely, collapse it
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsExpanded(false);
        }
      }}
      className={`fixed top-0 right-0 bottom-0 z-40 bg-gradient-to-l from-black/95 via-black/90 to-transparent transition-all duration-300 flex flex-col justify-between py-8 px-3 select-none backdrop-blur-md border-l border-white/5 ${
        isExpanded ? "w-60 md:w-64 bg-black/95 shadow-[10px_0_40px_rgba(0,0,0,0.9)]" : "w-16 md:w-20"
      }`}
    >
      {/* Top: Logo / Avatar */}
      <div className="flex flex-col items-center">
        {currentProfile ? (
          <button
            onClick={onSwitchProfile}
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden relative border-2 border-transparent hover:border-white focus:border-[#e50914] transition-all tv-focusable shadow-lg flex-shrink-0 mb-8"
            title="החלף פרופיל"
          >
            <Image
              src={currentProfile.avatar}
              alt={currentProfile.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="text-[#e50914] font-black text-xl mb-8">N</div>
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col gap-3 w-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all w-full text-right tv-focusable ${
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

      {/* Bottom: Switch Profile & Logout */}
      <div className="flex flex-col gap-2 w-full pt-4 border-t border-white/10">
        <button
          onClick={onSwitchProfile}
          className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors w-full text-right tv-focusable"
          title="החלף פרופיל"
        >
          <Users size={20} className="flex-shrink-0" />
          {isExpanded && (
            <span className="text-xs font-semibold whitespace-nowrap">החלף פרופיל</span>
          )}
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-neutral-500 hover:text-[#e50914] hover:bg-white/10 transition-colors w-full text-right tv-focusable"
          title="התנתק מהטלוויזיה"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {isExpanded && (
            <span className="text-xs font-semibold whitespace-nowrap">התנתק מהטלוויזיה</span>
          )}
        </button>
      </div>
    </aside>
  );
};
