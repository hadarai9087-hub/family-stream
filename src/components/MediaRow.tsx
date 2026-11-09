"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { MediaItem, WatchProgress } from "@/types";
import { MediaCard } from "./MediaCard";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  progressMap?: Record<number, WatchProgress>;
  onPlay: (item: MediaItem, progress?: WatchProgress) => void;
  onMoreInfo: (item: MediaItem) => void;
  myListIds?: number[];
  onToggleMyList?: (item: MediaItem) => void;
  onRemoveProgress?: (mediaId: number) => void;
  isWide?: boolean;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  items,
  progressMap,
  onPlay,
  onMoreInfo,
  myListIds = [],
  onToggleMyList,
  onRemoveProgress,
  isWide = false,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollBackward, setCanScrollBackward] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(items.length > 4);

  const checkScrollPosition = useCallback(() => {
    if (!rowRef.current) return;
    const el = rowRef.current;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (maxScroll <= 8) {
      setCanScrollBackward(false);
      setCanScrollForward(false);
      return;
    }

    const absLeft = Math.abs(el.scrollLeft);

    // In RTL:
    // absLeft near 0 is the beginning (rightmost side)
    // absLeft near maxScroll is the end (leftmost side)
    const isAtStart = absLeft < 15;
    const isAtEnd = absLeft >= maxScroll - 15;

    setCanScrollBackward(!isAtStart);
    setCanScrollForward(!isAtEnd);
  }, []);

  useEffect(() => {
    checkScrollPosition();
    const handleResize = () => checkScrollPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [items, checkScrollPosition]);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: "forward" | "backward") => {
    if (!rowRef.current) return;
    const el = rowRef.current;
    const clientWidth = el.clientWidth;
    // Scroll roughly 75% of visible width for optimal carousel pacing
    const scrollAmount = clientWidth * 0.75;
    
    // In RTL:
    // forward = scroll visually left (negative delta)
    // backward = scroll visually right back towards start (positive delta)
    const delta = direction === "forward" ? -scrollAmount : scrollAmount;

    el.scrollBy({
      left: delta,
      behavior: "smooth",
    });

    // Re-check after animation completes
    setTimeout(checkScrollPosition, 400);
  };

  return (
    <div
      data-tv-row="true"
      className="relative group/row my-6 md:my-9 px-4 md:px-12 select-none"
    >
      {/* Row Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{title}</span>
        </h2>
        {items.length > 5 && (
          <span className="text-xs text-neutral-400 font-medium hidden md:inline-block">
            {items.length} כותרים
          </span>
        )}
      </div>

      {/* Slider Container */}
      <div className="relative">
        {/* Backward Arrow & Soft Edge Gradient (Right Side in RTL) */}
        {canScrollBackward && (
          <div className="absolute right-0 top-0 bottom-0 z-30 flex items-center pr-1 md:pr-2 pointer-events-none">
            {/* Subtle frosted edge gradient */}
            <div className="absolute inset-y-0 right-0 w-16 md:w-24 bg-gradient-to-l from-[#141414] via-[#141414]/80 to-transparent pointer-events-none transition-opacity duration-300" />
            
            <button
              onClick={() => handleScroll("backward")}
              className="relative pointer-events-auto w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/75 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center transition-all duration-300 transform opacity-0 group-hover/row:opacity-100 hover:scale-110 active:scale-95 cursor-pointer focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white tv-focusable"
              aria-label="גלול אחורה"
            >
              <ChevronRight size={26} className="stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Horizontal Card Row */}
        <div
          ref={rowRef}
          onScroll={checkScrollPosition}
          className="flex items-center gap-3.5 md:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1 md:px-2"
        >
          {items.map((item) => {
            const progress = progressMap ? progressMap[item.id] : undefined;
            const isInMyList = myListIds.includes(item.id);

            return (
              <MediaCard
                key={`${item.id}-${progress?.episode_number || "main"}`}
                item={item}
                progress={progress}
                onPlay={onPlay}
                onMoreInfo={onMoreInfo}
                isInMyList={isInMyList}
                onToggleMyList={onToggleMyList}
                onRemoveProgress={onRemoveProgress}
                isWide={isWide}
              />
            );
          })}
        </div>

        {/* Forward Arrow & Soft Edge Gradient (Left Side in RTL) */}
        {canScrollForward && (
          <div className="absolute left-0 top-0 bottom-0 z-30 flex items-center pl-1 md:pl-2 pointer-events-none">
            {/* Subtle frosted edge gradient */}
            <div className="absolute inset-y-0 left-0 w-16 md:w-24 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-transparent pointer-events-none transition-opacity duration-300" />

            <button
              onClick={() => handleScroll("forward")}
              className="relative pointer-events-auto w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/75 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center transition-all duration-300 transform opacity-0 group-hover/row:opacity-100 hover:scale-110 active:scale-95 cursor-pointer focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white tv-focusable"
              aria-label="גלול קדימה"
            >
              <ChevronLeft size={26} className="stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
