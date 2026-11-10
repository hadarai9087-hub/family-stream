"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { MediaItem, WatchProgress } from "@/types";
import { MediaRow } from "./MediaRow";
import {
  HEBREW_GENRES,
  getPersonalizedRecommendations,
  getBecauseYouWatched,
  getColdStartRecommendations,
} from "@/lib/recommendations";
import { authManager } from "@/lib/auth";
import { storageManager } from "@/lib/supabase";

interface RecommendationSectionProps {
  userId: string;
  preferredGenres?: number[];
  onPreferredGenresChange?: (genres: number[]) => void;
  watchHistory: WatchProgress[];
  watchlist: MediaItem[];
  catalogTrending?: MediaItem[];
  catalogTopRated?: MediaItem[];
  onPlay: (item: MediaItem, progress?: WatchProgress) => void;
  onMoreInfo: (item: MediaItem) => void;
  myListIds?: number[];
  onToggleMyList?: (item: MediaItem) => void;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  userId,
  preferredGenres = [],
  onPreferredGenresChange,
  watchHistory = [],
  watchlist = [],
  catalogTrending = [],
  catalogTopRated = [],
  onPlay,
  onMoreInfo,
  myListIds = [],
  onToggleMyList,
}) => {
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>(preferredGenres);
  const [personalizedItems, setPersonalizedItems] = useState<MediaItem[]>([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState<{
    anchorTitle: string;
    items: MediaItem[];
  } | null>(null);

  const isColdStart = watchHistory.length === 0 && watchlist.length === 0;

  // Asynchronous recommendation fetching
  useEffect(() => {
    let isSubscribed = true;

    const fetchRecs = async () => {
      try {
        if (isColdStart) {
          const items = await getColdStartRecommendations(selectedGenreIds);
          if (isSubscribed) {
            setPersonalizedItems(items);
            setBecauseYouWatched(null);
          }
        } else {
          const [personalized, anchorRow] = await Promise.all([
            getPersonalizedRecommendations({
              userId,
              preferredGenres: selectedGenreIds,
              watchHistory,
              watchlist,
              catalogCandidates: [...catalogTrending, ...catalogTopRated],
            }),
            getBecauseYouWatched({ watchHistory }),
          ]);
          if (isSubscribed) {
            setPersonalizedItems(personalized);
            setBecauseYouWatched(anchorRow);
          }
        }
      } catch (err) {
        console.warn("Error calculating recommendations:", err);
      }
    };

    fetchRecs();

    return () => {
      isSubscribed = false;
    };
  }, [userId, isColdStart, selectedGenreIds, watchHistory, watchlist, catalogTrending, catalogTopRated]);

  // Handle genre pill toggle
  const handleToggleGenre = async (genreId: number) => {
    const next = selectedGenreIds.includes(genreId)
      ? selectedGenreIds.filter((id) => id !== genreId)
      : [...selectedGenreIds, genreId];

    setSelectedGenreIds(next);
    if (onPreferredGenresChange) {
      onPreferredGenresChange(next);
    }

    // Persist immediately to authManager and storageManager
    if (userId) {
      await Promise.all([
        authManager.updatePreferredGenres(next),
        storageManager.saveLikedGenres(userId, next),
      ]);
    }
  };

  return (
    <div className="space-y-4 my-2">
      {/* Cold Start / Personalization Genre Filter Pills */}
      <div className="px-4 md:px-12">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent-theme)]" />
            <h3 className="text-sm font-semibold text-neutral-300">
              {isColdStart ? "התאם את העדפות הצפייה שלך" : "התאמה אישית לפי ז'אנרים"}
            </h3>
          </div>
          {isColdStart && (
            <span className="text-xs text-neutral-500 hidden sm:inline">
              בחר סגנונות מועדפים כדי לרענן את ההמלצות
            </span>
          )}
        </div>

        {/* Scrollable Genre Pills Container */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {HEBREW_GENRES.map((g) => {
            const isSelected = selectedGenreIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleToggleGenre(g.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? "bg-[var(--accent-theme)] text-white shadow-[0_2px_12px_rgba(var(--accent-rgb),0.4)] border border-[var(--accent-theme)]"
                    : "bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-white/10 hover:border-white/20"
                }`}
              >
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 1: "מומלץ במיוחד עבורך" */}
      {personalizedItems.length > 0 && (
        <MediaRow
          title="מומלץ במיוחד עבורך"
          items={personalizedItems}
          onPlay={onPlay}
          onMoreInfo={onMoreInfo}
          myListIds={myListIds}
          onToggleMyList={onToggleMyList}
        />
      )}

      {/* Row 2: "כי צפית ב..." (Because you watched [Title]) */}
      {becauseYouWatched && becauseYouWatched.items.length > 0 && (
        <MediaRow
          title={`כי צפית ב${becauseYouWatched.anchorTitle}`}
          items={becauseYouWatched.items}
          onPlay={onPlay}
          onMoreInfo={onMoreInfo}
          myListIds={myListIds}
          onToggleMyList={onToggleMyList}
        />
      )}
    </div>
  );
};
