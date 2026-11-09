"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Search, Tv, Smartphone, User, ChevronDown, Check, LogOut, Bell } from "lucide-react";
import { UserProfile } from "@/types";

interface NavbarProps {
  currentProfile: UserProfile | null;
  onSelectProfile: () => void;
  onLogout?: () => void;
  isTvMode: boolean;
  onToggleTvMode: () => void;
  onOpenTvPair: () => void;
  onSearch: (query: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProfile,
  onSelectProfile,
  onLogout,
  isTvMode,
  onToggleTvMode,
  onOpenTvPair,
  onSearch,
  activeTab,
  onSelectTab,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const navItems = [
    { id: "home", label: "ראשי" },
    { id: "tv", label: "סדרות" },
    { id: "movies", label: "סרטים" },
    { id: "up_next", label: "הבא בתור" },
    { id: "my_list", label: "הרשימה שלי" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-12 flex items-center justify-between h-16 md:h-20 ${
        isScrolled ? "bg-[#141414]/95 backdrop-blur-md shadow-2xl" : "bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      }`}
    >
      {/* Right side: Logo & Navigation */}
      <div className="flex items-center gap-6 md:gap-10">
        <button
          onClick={() => onSelectTab("home")}
          className="flex items-center gap-2 group focus:outline-none tv-focusable"
        >
          <div className="w-28 md:w-36 relative h-8 md:h-10">
            <span className="text-[#e50914] font-black text-2xl md:text-3xl tracking-tighter uppercase drop-shadow-[0_2px_10px_rgba(229,9,20,0.5)]">
              STREAM
            </span>
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`transition-colors duration-200 tv-focusable px-1 py-1 ${
                activeTab === item.id
                  ? "text-white font-bold border-b-2 border-[#e50914]"
                  : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Left side: Search, TV Mode toggle, TV Pair, and Profile */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          {isSearchOpen ? (
            <div className="flex items-center bg-black/70 border border-white/20 rounded-full px-3 py-1.5 focus-within:border-white transition-all">
              <input
                type="text"
                placeholder="חיפוש סרט, סדרה, שחקן..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                autoFocus
                className="bg-transparent text-white placeholder-neutral-400 text-sm focus:outline-none w-36 md:w-60 pr-2 text-right"
              />
              <button type="submit" className="text-neutral-300 hover:text-white">
                <Search size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-neutral-300 hover:text-white transition-colors tv-focusable rounded-full"
              title="חיפוש"
            >
              <Search size={20} />
            </button>
          )}
        </form>

        {/* TV Mode Toggle */}
        <button
          onClick={onToggleTvMode}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all tv-focusable ${
            isTvMode
              ? "bg-[#e50914] text-white border-[#e50914] shadow-[0_0_15px_rgba(229,9,20,0.6)]"
              : "bg-white/10 text-neutral-300 border-white/10 hover:bg-white/20 hover:text-white"
          }`}
          title="הפעלת מצב שלט טלוויזיה (D-Pad)"
        >
          <Tv size={15} />
          <span className="hidden sm:inline">{isTvMode ? "מצב טלוויזיה: פעיל" : "מצב טלוויזיה"}</span>
        </button>

        {/* TV Smart Pair Button */}
        <button
          onClick={onOpenTvPair}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/10 text-neutral-300 border border-white/10 hover:bg-white/20 hover:text-white transition-all tv-focusable"
          title="זיווג טלוויזיה עם קוד או QR"
        >
          <Smartphone size={15} />
          <span className="hidden sm:inline">זיווג טלוויזיה</span>
        </button>

        {/* Profile Avatar & Dropdown */}
        {currentProfile && (
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-white/10 transition-colors tv-focusable"
            >
              <div className="w-8 h-8 rounded-md overflow-hidden relative border border-white/20 bg-neutral-900">
                <Image
                  src={currentProfile.avatar}
                  alt={currentProfile.name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <ChevronDown size={14} className="text-neutral-400" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute left-0 mt-3 w-48 bg-[#181818] border border-white/15 rounded-lg shadow-2xl py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
                  <div className="w-6 h-6 rounded overflow-hidden relative bg-neutral-900">
                    <Image src={currentProfile.avatar} alt={currentProfile.name} width={24} height={24} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-bold text-white truncate">{currentProfile.name}</span>
                </div>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onSelectProfile();
                  }}
                  className="w-full text-right px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                >
                  <User size={16} />
                  <span>החלף פרופיל</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenTvPair();
                  }}
                  className="w-full text-right px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors border-b border-white/10"
                >
                  <Smartphone size={16} />
                  <span>קוד זיווג לטלוויזיה</span>
                </button>

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-right px-4 py-2.5 text-sm text-[#e50914] hover:bg-white/10 flex items-center gap-2 transition-colors font-medium"
                  >
                    <LogOut size={16} />
                    <span>התנתק מהחשבון</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
