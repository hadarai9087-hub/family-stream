"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Play, Plus, Check, Star, Clock, Calendar } from "lucide-react";
import { MediaItem, Episode, WatchProgress } from "@/types";
import { getImageUrl, getSeasonEpisodes } from "@/lib/tmdb";

interface EpisodesModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlayEpisode: (item: MediaItem, seasonNumber: number, episodeNumber: number, episodeName: string) => void;
  isInMyList?: boolean;
  onToggleMyList?: (item: MediaItem) => void;
}

export const EpisodesModal: React.FC<EpisodesModalProps> = ({
  item,
  onClose,
  onPlayEpisode,
  isInMyList = false,
  onToggleMyList,
}) => {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (!item) return;

    if (item.media_type === "tv") {
      setIsLoadingEpisodes(true);
      getSeasonEpisodes(item.id, selectedSeason)
        .then((data) => setEpisodes(data))
        .finally(() => setIsLoadingEpisodes(false));
    }
  }, [item, selectedSeason]);

  // Handle TV remote Back button
  useEffect(() => {
    const handleTvBack = () => onClose();
    window.addEventListener("tv-back-pressed", handleTvBack);
    return () => window.removeEventListener("tv-back-pressed", handleTvBack);
  }, [onClose]);

  if (!item) return null;

  const totalSeasons = item.number_of_seasons || 1;
  const backdropUrl = getImageUrl(item.backdrop_path, "w1280");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 overflow-y-auto animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl bg-[#181818] rounded-none md:rounded-2xl overflow-hidden shadow-2xl border border-white/10 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 p-2.5 rounded-full bg-[#181818]/80 hover:bg-white text-white hover:text-black transition-colors tv-focusable"
          aria-label="סגור חלון"
        >
          <X size={20} />
        </button>

        {/* Modal Backdrop Banner */}
        <div className="relative w-full h-72 md:h-96">
          <Image
            src={backdropUrl}
            alt={item.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />

          {/* Banner Details */}
          <div className="absolute bottom-6 right-6 left-6 z-20">
            <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-3 drop-shadow-md">
              {item.title}
            </h1>

            <div className="flex items-center gap-4 text-xs md:text-sm text-neutral-300 mb-4">
              <span className="flex items-center gap-1 text-[#46d369] font-bold">
                <Star size={14} className="fill-[#46d369]" />
                {item.vote_average}
              </span>
              <span>{item.release_date?.slice(0, 4)}</span>
              {item.media_type === "tv" && <span>{totalSeasons} עונות</span>}
              <span className="border border-neutral-600 px-1 rounded text-[10px]">HD</span>
            </div>

            {/* Quick Play & Add to List */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onPlayEpisode(item, 1, 1, episodes[0]?.name || "פרק 1")}
                className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-transform hover:scale-105 active:scale-95 tv-focusable"
              >
                <Play size={18} className="fill-black" />
                <span>נגן עכשיו</span>
              </button>

              {onToggleMyList && (
                <button
                  onClick={() => onToggleMyList(item)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all tv-focusable"
                >
                  {isInMyList ? <Check size={18} className="text-[#46d369]" /> : <Plus size={18} />}
                  <span>{isInMyList ? "ברשימה שלי" : "הוסף לרשימה"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Overview */}
          <p className="text-neutral-300 text-sm md:text-base leading-relaxed mb-8 max-w-3xl">
            {item.overview}
          </p>

          {/* Episodes Section for TV Shows */}
          {item.media_type === "tv" && (
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <h2 className="text-xl font-bold text-white">פרקים</h2>

                {/* Season Selector */}
                {totalSeasons > 1 && (
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    className="bg-[#242424] text-white border border-white/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent-theme)] tv-focusable"
                  >
                    {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((seasonNum) => (
                      <option key={seasonNum} value={seasonNum}>
                        עונה {seasonNum}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Episodes List */}
              {isLoadingEpisodes ? (
                <div className="flex justify-center py-12 text-neutral-400 text-sm">
                  טוען רשימת פרקים...
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {episodes.map((ep) => {
                    const stillUrl = getImageUrl(ep.still_path || item.backdrop_path, "w500");

                    return (
                      <div
                        key={ep.id}
                        onClick={() => onPlayEpisode(item, selectedSeason, ep.episode_number, ep.name)}
                        className="group flex flex-col md:flex-row items-start md:items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10 tv-focusable"
                      >
                        {/* Episode Number */}
                        <span className="text-lg font-bold text-neutral-500 w-6 text-center hidden md:inline">
                          {ep.episode_number}
                        </span>

                        {/* Thumbnail */}
                        <div className="relative w-full md:w-44 aspect-video rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0">
                          <Image
                            src={stillUrl}
                            alt={ep.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/60 group-hover:bg-white group-hover:text-black text-white flex items-center justify-center transition-all shadow-lg">
                              <Play size={18} className="translate-x-[-1px]" />
                            </div>
                          </div>
                        </div>

                        {/* Episode Meta & Overview */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-bold text-white group-hover:text-[var(--accent-theme)] transition-colors">
                              {ep.episode_number}. {ep.name}
                            </h3>
                            {ep.runtime && (
                              <span className="text-xs text-neutral-400 flex items-center gap-1">
                                <Clock size={12} />
                                {ep.runtime} דק'
                              </span>
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-neutral-400 line-clamp-2 leading-relaxed">
                            {ep.overview}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Movie Details Section */}
          {item.media_type === "movie" && (
            <div className="border-t border-white/10 pt-6 mt-6">
              <h2 className="text-xl font-bold text-white mb-4">מידע על הסרט</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs md:text-sm">
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <span className="text-neutral-400 block mb-1 text-xs">שם מקורי:</span>
                  <span className="font-bold text-white">{item.original_title || item.title}</span>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <span className="text-neutral-400 block mb-1 text-xs">שנת יציאה:</span>
                  <span className="font-bold text-white">{item.release_date?.slice(0, 4) || "2024"}</span>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <span className="text-neutral-400 block mb-1 text-xs">דירוג עולמי:</span>
                  <span className="font-bold text-[#46d369] flex items-center gap-1">
                    <Star size={13} className="fill-current text-[#46d369]" />
                    <span>{item.vote_average} / 10</span>
                  </span>
                </div>
                {item.genres && item.genres.length > 0 && (
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 col-span-2 sm:col-span-3">
                    <span className="text-neutral-400 block mb-2 text-xs">ז&apos;אנרים:</span>
                    <div className="flex flex-wrap gap-2">
                      {item.genres.map((g) => (
                        <span key={g.id} className="bg-white/10 px-3 py-1 rounded-lg text-xs font-semibold text-white">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
