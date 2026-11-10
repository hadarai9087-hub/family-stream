"use client";

import React from "react";
import Image from "next/image";
import { Play, Info, Plus, Check } from "lucide-react";
import { MediaItem } from "@/types";
import { getImageUrl } from "@/lib/tmdb";

interface HeroBannerProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onMoreInfo: (item: MediaItem) => void;
  isInMyList?: boolean;
  onToggleMyList?: (item: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  item,
  onPlay,
  onMoreInfo,
  isInMyList = false,
  onToggleMyList,
}) => {
  const backdropUrl = getImageUrl(item.backdrop_path, "original");

  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] lg:h-[90vh] select-none">
      {/* Background Image / Backdrop */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src={backdropUrl}
          alt={item.title}
          fill
          priority
          className="object-cover object-center"
        />

        {/* RTL Side Gradient for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#141414] via-[#141414]/70 to-transparent w-full md:w-3/4 z-10" />

        {/* Bottom Vignette fading into rows */}
        <div className="absolute inset-x-0 bottom-0 h-48 md:h-64 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent z-10" />
        
        {/* Top subtle shadow for navbar */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#141414]/80 to-transparent z-10" />
      </div>

      {/* Hero Content */}
      <div className="relative z-20 h-full flex flex-col justify-end pb-20 md:pb-28 px-4 md:px-12 max-w-2xl lg:max-w-3xl">
        {/* Badges: Top 10 / Netflix Original / Rating */}
        <div className="flex items-center gap-3 mb-3 text-xs md:text-sm font-semibold text-neutral-300">
          <span className="bg-[#e50914] text-white px-2 py-0.5 rounded font-black tracking-wider uppercase text-xs">
            TOP 10
          </span>
          <span className="text-[#46d369] font-bold">98% התאמה</span>
          <span>{item.release_date?.slice(0, 4) || "2024"}</span>
          <span className="border border-neutral-600 px-1.5 py-0.5 rounded text-[11px] text-neutral-400">
            16+
          </span>
          <span className="border border-neutral-600 px-1.5 py-0.5 rounded text-[11px] text-neutral-400">
            4K Ultra HD
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] leading-tight">
          {item.title}
        </h1>

        {/* Overview in Hebrew */}
        <p className="text-sm md:text-base lg:text-lg text-neutral-300 line-clamp-3 mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-xl font-normal leading-relaxed">
          {item.overview}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
          <button
            onClick={() => onPlay(item)}
            className="flex items-center gap-2 bg-white text-black hover:bg-white/90 font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-lg text-sm md:text-base transition-all duration-200 tv-focusable shadow-lg hover:scale-105 active:scale-95"
          >
            <Play size={20} className="fill-black" />
            <span>הפעל</span>
          </button>

          <button
            onClick={() => onMoreInfo(item)}
            className="flex items-center gap-2 bg-neutral-600/70 hover:bg-neutral-600/90 text-white font-semibold px-5 md:px-7 py-2.5 md:py-3 rounded-lg text-sm md:text-base backdrop-blur-md transition-all duration-200 tv-focusable hover:scale-105 active:scale-95"
          >
            <Info size={20} />
            <span>מידע נוסף</span>
          </button>

          {onToggleMyList && (
            <button
              onClick={() => onToggleMyList(item)}
              className="p-2.5 md:p-3 rounded-full border border-white/30 bg-black/40 hover:bg-black/60 text-white transition-all duration-200 tv-focusable hover:scale-110"
              title={isInMyList ? "הסר מהרשימה שלי" : "הוסף לרשימה שלי"}
            >
              {isInMyList ? <Check size={20} className="text-[#46d369]" /> : <Plus size={20} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
