"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play, Plus, Check, ChevronDown, Trash2, CheckCircle2 } from "lucide-react";
import { MediaItem, WatchProgress } from "@/types";
import { getImageUrl } from "@/lib/tmdb";

interface MediaCardProps {
  item: MediaItem;
  progress?: WatchProgress;
  onPlay: (item: MediaItem, progress?: WatchProgress) => void;
  onMoreInfo: (item: MediaItem) => void;
  isInMyList?: boolean;
  onToggleMyList?: (item: MediaItem) => void;
  onRemoveProgress?: (mediaId: number) => void;
  isWide?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  progress,
  onPlay,
  onMoreInfo,
  isInMyList = false,
  onToggleMyList,
  onRemoveProgress,
  isWide = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // If progress exists or isWide, prefer backdrop image; otherwise poster image
  const imagePath = isWide || progress ? item.backdrop_path || item.poster_path : item.poster_path || item.backdrop_path;
  const imageUrl = getImageUrl(imagePath, isWide || progress ? "w780" : "w500");

  const percentage = progress ? Math.min(100, Math.max(5, progress.percentage)) : 0;
  const remainingMinutes = progress
    ? Math.max(1, Math.round((progress.duration_seconds - progress.progress_seconds) / 60))
    : 0;

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`צפה ב-${item.title}`}
      className={`relative flex-shrink-0 transition-all duration-300 rounded-md group select-none tv-focusable focus:scale-105 focus:ring-4 focus:ring-red-600 focus:outline-none cursor-pointer ${
        isWide || progress ? "w-64 md:w-80 aspect-video" : "w-36 sm:w-44 md:w-52 aspect-[2/3]"
      }`}
      onClick={() => onPlay(item, progress)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onPlay(item, progress);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
    >
      {/* Base Card Poster */}
      <div className="w-full h-full rounded-md overflow-hidden bg-neutral-900 relative shadow-md">
        <Image
          src={imageUrl}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 180px, 260px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Continue Watching / Progress Bar Overlay */}
        {progress && (
          <div className="absolute inset-x-0 bottom-0 z-20">
            <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-6">
              {progress.episode_name && (
                <div className="text-[11px] text-neutral-300 truncate font-medium">
                  {`עונה ${progress.season_number} פרק ${progress.episode_number}: ${progress.episode_name}`}
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-0.5">
                <span>{progress.title}</span>
                <span className="text-[#e50914] font-semibold">{remainingMinutes} דק' נותרו</span>
              </div>
            </div>

            {/* Red Progress Line */}
            <div className="w-full h-1 bg-white/30 overflow-hidden">
              <div
                className="h-full bg-[#e50914] transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Hover / Quick Play overlay for mobile/touch or card click */}
        <button
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => onPlay(item, progress)}
          className="absolute inset-0 z-10 w-full h-full opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity flex items-center justify-center cursor-pointer"
          aria-label={`הפעל ${item.title}`}
        >
          <div className="w-12 h-12 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-xl transform transition-transform group-hover:scale-110">
            <Play size={22} className="fill-black translate-x-[-1px]" />
          </div>
        </button>
      </div>

      {/* Floating Action Controls on Hover */}
      <div className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
        {onToggleMyList && (
          <button
            tabIndex={-1}
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMyList(item);
            }}
            className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-transform hover:scale-110 shadow-lg"
            title={isInMyList ? "הסר מהרשימה" : "הוסף לרשימה שלי"}
          >
            {isInMyList ? <Check size={14} className="text-[#46d369]" /> : <Plus size={14} />}
          </button>
        )}

        <button
          tabIndex={-1}
          aria-hidden="true"
          onClick={(e) => {
            e.stopPropagation();
            onMoreInfo(item);
          }}
          className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-transform hover:scale-110 shadow-lg"
          title="פרטים נוספים ועונות"
        >
          <ChevronDown size={14} />
        </button>

        {/* Remove from Continue Watching button */}
        {progress && onRemoveProgress && (
          <button
            tabIndex={-1}
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveProgress(item.id);
            }}
            className="p-1.5 rounded-full bg-black/70 hover:bg-[#e50914] text-white border border-white/20 transition-colors shadow-lg"
            title="הסר מהמשך צפייה"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
