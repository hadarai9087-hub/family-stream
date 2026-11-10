"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Tv, User, ChevronDown, LogOut, Download } from "lucide-react";
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
  onLogout,
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
      {/* Right side: Official HM Logo & Navigation Links */}
      <div className="flex items-center gap-6 md:gap-10">
        <button
          onClick={() => onSelectTab("home")}
          className="flex items-center gap-2.5 group focus:outline-none tv-focusable cursor-pointer"
        >
          <div className="p-1.5 bg-black/60 rounded-xl border border-white/10 group-hover:border-white/30 transition-all">
            <Image
              src="/logo.png"
              alt="HM Stream"
              width={38}
              height={38}
              className="h-8 md:h-9 w-auto object-contain drop-shadow-[0_2px_10px_rgba(229,9,20,0.6)]"
              priority
            />
          </div>
          <span className="text-white font-black text-xl tracking-wider hidden sm:inline">
            HM<span className="text-[#e50914]">STREAM</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`transition-colors duration-200 tv-focusable px-1 py-1 cursor-pointer ${
                activeTab === item.id
                  ? "text-white font-bold border-b-2 border-[#e50914]"
                  : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          <Link
            href="/download"
            className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <Tv size={14} className="text-[#e50914]" />
            <span>אפליקציה לטלוויזיה</span>
          </Link>
        </nav>
      </div>

      {/* Left side: Search & User Profile Menu */}
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
              className="p-2 text-neutral-300 hover:text-white transition-colors tv-focusable rounded-full cursor-pointer"
              title="חיפוש"
            >
              <Search size={20} />
            </button>
          )}
        </form>

        {/* User Account Avatar & Dropdown */}
        {currentProfile && (
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-white/10 transition-colors tv-focusable cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden relative border border-white/20 bg-neutral-900 shadow">
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
              <div className="absolute left-0 mt-3 w-52 bg-[#181818] border border-white/15 rounded-2xl shadow-2xl py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden relative bg-neutral-900 shrink-0">
                    <Image src={currentProfile.avatar} alt={currentProfile.name} width={28} height={28} className="w-full h-full object-cover" />
                  </div>
                  <div className="truncate">
                    <span className="text-sm font-bold text-white block truncate">{currentProfile.name}</span>
                    <span className="text-[11px] text-[#46d369] font-medium block">מחובר</span>
                  </div>
                </div>

                <Link
                  href="/download"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="w-full text-right px-4 py-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                >
                  <Download size={15} className="text-[#e50914]" />
                  <span>הורדת אפליקציה לטלוויזיה</span>
                </Link>

                <Link
                  href="/pair"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="w-full text-right px-4 py-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors border-b border-white/10"
                >
                  <Tv size={15} className="text-neutral-400" />
                  <span>זיווג מסך טלוויזיה חדש</span>
                </Link>

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-right px-4 py-2.5 text-xs text-[#e50914] hover:bg-white/10 flex items-center gap-2 transition-colors font-semibold cursor-pointer"
                  >
                    <LogOut size={15} />
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
