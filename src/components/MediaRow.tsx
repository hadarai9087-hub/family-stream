"use client";

import React, { useRef, useState } from "react";
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
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const clientWidth = rowRef.current.clientWidth;
    const scrollAmount = clientWidth * 0.75;
    // In RTL, scrollBy operates smoothly across Blink, WebKit, and Gecko
    const delta = direction === "left" ? -scrollAmount : scrollAmount;

    rowRef.current.scrollBy({
      left: delta,
      behavior: "smooth",
    });
  };

  const checkScrollPosition = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    const absLeft = Math.abs(scrollLeft);
    const maxScroll = scrollWidth - clientWidth;

    setShowLeftArrow(absLeft < maxScroll - 15);
    setShowRightArrow(absLeft > 15);
  };

  return (
    <div
      data-tv-row="true"
      className="relative group/row my-6 md:my-8 px-4 md:px-12 select-none"
    >
      {/* Row Header */}
      <h2 className="text-lg md:text-2xl font-bold text-white mb-3 tracking-tight flex items-center gap-2">
        <span>{title}</span>
      </h2>

      {/* Slider Container */}
      <div className="relative">
        {/* Right Arrow (Scroll right - backward in RTL) */}
        <button
          onClick={() => handleScroll("right")}
          className="absolute -right-4 md:-right-8 top-0 bottom-0 z-30 w-10 md:w-12 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-200 rounded-l cursor-pointer tv-focusable"
          aria-label="גלול אחורה"
        >
          <ChevronRight size={28} />
        </button>

        {/* Horizontal Row */}
        <div
          ref={rowRef}
          onScroll={checkScrollPosition}
          className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1"
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

        {/* Left Arrow (Scroll left - forward in RTL) */}
        <button
          onClick={() => handleScroll("left")}
          className="absolute -left-4 md:-left-8 top-0 bottom-0 z-30 w-10 md:w-12 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-200 rounded-r cursor-pointer tv-focusable"
          aria-label="גלול קדימה"
        >
          <ChevronLeft size={28} />
        </button>
      </div>
    </div>
  );
};
