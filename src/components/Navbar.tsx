"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Tv } from "lucide-react";

interface NavbarProps {
  onSearch: (query: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  activeTab,
  onSelectTab,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 px-4 md:px-12 flex items-center justify-between h-16 md:h-20 ${
        isScrolled ? "bg-[#141414]/95 backdrop-blur-md shadow-2xl" : "bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      }`}
    >
      {/* Right side: ONLY Official HM Logo & Navigation Links */}
      <div className="flex items-center gap-6 md:gap-10">
        <button
          onClick={() => onSelectTab("home")}
          className="flex items-center gap-3 group focus:outline-none tv-focusable cursor-pointer"
        >
          <div className="p-1.5 bg-black/60 rounded-xl border border-white/10 group-hover:border-white/30 transition-all shadow-lg">
            <Image
              src="/logo.png"
              alt="HM Stream"
              width={40}
              height={40}
              className="h-8 md:h-10 w-auto object-contain drop-shadow-[0_2px_10px_rgba(229,9,20,0.6)]"
              priority
            />
          </div>
          <span className="text-white font-black text-xl md:text-2xl tracking-wider hidden sm:inline">
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

      {/* Left side: Search Bar */}
      <div className="flex items-center gap-3">
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
              <button type="submit" className="text-neutral-300 hover:text-white cursor-pointer">
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
      </div>
    </header>
  );
};
