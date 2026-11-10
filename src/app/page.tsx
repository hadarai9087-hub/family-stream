"use client";

import React, { useState, useEffect } from "react";
import {
  getTrending,
  getPopularMovies,
  getPopularTv,
  getTopRated,
  searchMedia,
} from "@/lib/tmdb";
import { storageManager } from "@/lib/supabase";
import { useTvMode, useSpatialNavigation } from "@/lib/tvNavigation";
import { MediaItem, UserProfile, WatchProgress } from "@/types";

import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";
import { MediaRow } from "@/components/MediaRow";
import { MediaCard } from "@/components/MediaCard";
import { RecommendationSection } from "@/components/RecommendationSection";
import { EpisodesModal } from "@/components/EpisodesModal";
import { PlayerModal } from "@/components/PlayerModal";
import { TvPairModal } from "@/components/TvPairModal";
import { TvFirstLoginScreen } from "@/components/TvFirstLoginScreen";
import { LoginScreen } from "@/components/LoginScreen";
import { TvSidebar } from "@/components/TvSidebar";
import { UserCornerMenu } from "@/components/UserCornerMenu";
import { authManager, UserAccount } from "@/lib/auth";

export default function HomePage() {
  const { isTvMode, toggleTvMode } = useTvMode();
  useSpatialNavigation(isTvMode);

  // Auth State (R1: Personal User Accounts)
  const [account, setAccount] = useState<UserAccount | null>(() => authManager.getCurrentUser());
  const [preferredGenres, setPreferredGenres] = useState<number[]>(() => authManager.getCurrentUser()?.preferredGenres || []);

  // Content Rows
  const [heroItem, setHeroItem] = useState<MediaItem | null>(null);
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularTv, setPopularTv] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [continueWatchingItems, setContinueWatchingItems] = useState<MediaItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, WatchProgress>>({});
  const [myList, setMyList] = useState<MediaItem[]>([]);

  // Navigation & Search State
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modals & Player State
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null);
  const [playingItem, setPlayingItem] = useState<{
    item: MediaItem;
    seasonNumber: number;
    episodeNumber: number;
    episodeName?: string | null;
    progressSeconds: number;
  } | null>(null);
  const [isTvPairOpen, setIsTvPairOpen] = useState(false);

  // 2. Load Catalog
  useEffect(() => {
    getTrending().then((items) => {
      setTrending(items);
      if (items.length > 0) setHeroItem(items[0]);
    });
    getPopularMovies().then((items) => setPopularMovies(items));
    getPopularTv().then((items) => setPopularTv(items));
    getTopRated().then((items) => setTopRated(items));
  }, []);

  // 3. Load Per-User Continue Watching, Watchlist & Liked Genres (R1)
  useEffect(() => {
    if (!account) return;

    // Load Watch Progress keyed by userId
    storageManager.getWatchProgress(account.id).then((progressList) => {
      const pMap: Record<number, WatchProgress> = {};
      const cwItems: MediaItem[] = [];

      progressList.forEach((p) => {
        pMap[p.media_id] = p;
        cwItems.push({
          id: p.media_id,
          tmdb_id: p.media_id,
          title: p.title,
          overview: "",
          poster_path: p.poster_path,
          backdrop_path: p.backdrop_path,
          media_type: p.media_type,
          vote_average: 8.0,
        });
      });

      setProgressMap(pMap);
      setContinueWatchingItems(cwItems);
    });

    // Load Watchlist keyed by userId
    storageManager.getWatchlist(account.id).then((list) => {
      setMyList(list);
    });

    // Load Liked Genres
    storageManager.getLikedGenres(account.id).then((genres) => {
      if (genres && genres.length > 0) {
        setPreferredGenres(genres);
      }
    });
  }, [account]);

  // Handle Search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchMedia(query);
    setSearchResults(results);
  };

  // Play Actions
  const handlePlay = (item: MediaItem, progress?: WatchProgress) => {
    setInfoItem(null);
    setPlayingItem({
      item,
      seasonNumber: progress?.season_number || 1,
      episodeNumber: progress?.episode_number || 1,
      episodeName: progress?.episode_name || undefined,
      progressSeconds: progress?.progress_seconds || 0,
    });
  };

  const handlePlayEpisode = (
    item: MediaItem,
    seasonNumber: number,
    episodeNumber: number,
    episodeName: string
  ) => {
    setInfoItem(null);
    setPlayingItem({
      item,
      seasonNumber,
      episodeNumber,
      episodeName,
      progressSeconds: 0,
    });
  };

  // Next Episode Trigger
  const handleNextEpisode = () => {
    if (!playingItem) return;
    setPlayingItem((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        episodeNumber: prev.episodeNumber + 1,
        episodeName: `פרק ${prev.episodeNumber + 1}`,
        progressSeconds: 0,
      };
    });
  };

  // My List / Watchlist Toggle
  const handleToggleMyList = async (item: MediaItem) => {
    if (!account) return;
    await storageManager.toggleWatchlist(account.id, item);
    const updated = await storageManager.getWatchlist(account.id);
    setMyList(updated);
  };

  // Remove from Continue Watching
  const handleRemoveProgress = async (mediaId: number) => {
    if (!account) return;
    await storageManager.removeFromWatchProgress(account.id, mediaId);
    setContinueWatchingItems((prev) => prev.filter((i) => i.id !== mediaId));
    setProgressMap((prev) => {
      const copy = { ...prev };
      delete copy[mediaId];
      return copy;
    });
  };

  const handleLogout = async () => {
    await authManager.logout();
    setAccount(null);
  };

  // Gating: If not logged in, render TV pairing screen on TV, or clean PC/Mobile LoginScreen on web
  if (!account) {
    return isTvMode ? (
      <TvFirstLoginScreen onLoginSuccess={setAccount} />
    ) : (
      <LoginScreen onLoginSuccess={setAccount} />
    );
  }

  // Virtual profile representation for compatibility with Navbar & TvSidebar
  const virtualProfile: UserProfile = {
    id: account.id,
    name: account.username,
    avatar: account.avatar,
    is_kids: false,
  };

  const myListIds = myList.map((m) => m.id);

  return (
    <div className={`min-h-screen bg-[#141414] text-white select-none ${isTvMode ? "tv-mode text-lg" : ""}`} dir="rtl">
      {/* Netflix TV Collapsible Sidebar Navigation */}
      {isTvMode && (
        <TvSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setSearchQuery("");
            setIsSearching(false);
          }}
          currentProfile={virtualProfile}
          onSwitchProfile={handleLogout}
          onLogout={handleLogout}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        onSearch={handleSearch}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSearchQuery("");
          setIsSearching(false);
        }}
      />

      <main className={`relative pb-24 ${isTvMode ? "pr-16 md:pr-20" : ""}`}>
        {/* If Searching, show Search Results Grid */}
        {isSearching ? (
          <div className="pt-28 px-4 md:px-12">
            <h1 className="text-2xl font-bold mb-6">
              תוצאות חיפוש עבור &quot;{searchQuery}&quot; ({searchResults.length})
            </h1>
            {searchResults.length === 0 ? (
              <div className="text-neutral-400 py-16 text-center">
                לא נמצאו תוצאות עבור החיפוש שלך.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.map((item) => (
                  <div key={item.id} className="flex justify-center">
                    <MediaCard
                      item={item}
                      onPlay={handlePlay}
                      onMoreInfo={(i) => setInfoItem(i)}
                      isInMyList={myListIds.includes(item.id)}
                      onToggleMyList={handleToggleMyList}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Cinematic Hero Spotlight Banner */}
            {heroItem && (activeTab === "home" || activeTab === "movies" || activeTab === "tv") && (
              <HeroBanner
                item={heroItem}
                onPlay={handlePlay}
                onMoreInfo={(i) => setInfoItem(i)}
                isInMyList={myListIds.includes(heroItem.id)}
                onToggleMyList={handleToggleMyList}
              />
            )}

            {/* Content Rows */}
            <div className={`relative z-20 ${heroItem ? "-mt-16 md:-mt-28" : "pt-24"}`}>
              {/* Apple TV Signature: Up Next / Continue Watching Row */}
              {continueWatchingItems.length > 0 && (activeTab === "home" || activeTab === "up_next") && (
                <MediaRow
                  title="הבא בתור (המשך צפייה)"
                  items={continueWatchingItems}
                  progressMap={progressMap}
                  onPlay={handlePlay}
                  onMoreInfo={(i) => setInfoItem(i)}
                  onRemoveProgress={handleRemoveProgress}
                  isWide={true}
                />
              )}

              {/* Personalized Recommendation Engine Section (R1) */}
              {(activeTab === "home" || activeTab === "movies" || activeTab === "tv") && (
                <RecommendationSection
                  userId={account.id}
                  preferredGenres={preferredGenres}
                  onPreferredGenresChange={setPreferredGenres}
                  watchHistory={Object.values(progressMap)}
                  watchlist={myList}
                  catalogTrending={trending}
                  catalogTopRated={topRated}
                  onPlay={handlePlay}
                  onMoreInfo={(i) => setInfoItem(i)}
                  myListIds={myListIds}
                  onToggleMyList={handleToggleMyList}
                />
              )}

              {/* My List Row */}
              {myList.length > 0 && (activeTab === "home" || activeTab === "my_list") && (
                <MediaRow
                  title="הרשימה שלי"
                  items={myList}
                  onPlay={handlePlay}
                  onMoreInfo={(i) => setInfoItem(i)}
                  myListIds={myListIds}
                  onToggleMyList={handleToggleMyList}
                />
              )}

              {/* Trending Now */}
              {(activeTab === "home" || activeTab === "movies") && (
                <MediaRow
                  title="מובילים השבוע בנטפליקס"
                  items={trending}
                  onPlay={handlePlay}
                  onMoreInfo={(i) => setInfoItem(i)}
                  myListIds={myListIds}
                  onToggleMyList={handleToggleMyList}
                />
              )}

              {/* Popular TV Shows */}
              {(activeTab === "home" || activeTab === "tv") && (
                <MediaRow
                  title="סדרות בינג' ממכרות"
                  items={popularTv}
                  onPlay={handlePlay}
                  onMoreInfo={(i) => setInfoItem(i)}
                  myListIds={myListIds}
                  onToggleMyList={handleToggleMyList}
                />
              )}

              {/* Blockbuster Movies */}
              {(activeTab === "home" || activeTab === "movies") && (
                <MediaRow
                  title="שוברי קופות וסרטי קולנוע מובילים"
                  items={popularMovies}
                  onPlay={handlePlay}
                  onMoreInfo={(i) => setInfoItem(i)}
                  myListIds={myListIds}
                  onToggleMyList={handleToggleMyList}
                />
              )}

              {/* Top Rated */}
              {activeTab === "home" && (
                <MediaRow
                  title="יצירות מופת שזכו לשבחי המבקרים"
                  items={topRated}
                  onPlay={handlePlay}
                  onMoreInfo={(i) => setInfoItem(i)}
                  myListIds={myListIds}
                  onToggleMyList={handleToggleMyList}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Episodes & Seasons Modal */}
      {infoItem && (
        <EpisodesModal
          item={infoItem}
          onClose={() => setInfoItem(null)}
          onPlayEpisode={handlePlayEpisode}
          isInMyList={myListIds.includes(infoItem.id)}
          onToggleMyList={handleToggleMyList}
        />
      )}

      {/* Fullscreen Apple TV Floating HUD Player */}
      {playingItem && (
        <PlayerModal
          item={playingItem.item}
          seasonNumber={playingItem.seasonNumber}
          episodeNumber={playingItem.episodeNumber}
          episodeName={playingItem.episodeName}
          initialProgressSeconds={playingItem.progressSeconds}
          profileId={account.id}
          onClose={() => {
            setPlayingItem(null);
            // Refresh Continue Watching row on return
            storageManager.getWatchProgress(account.id).then((progressList) => {
              const pMap: Record<number, WatchProgress> = {};
              const cwItems: MediaItem[] = [];
              progressList.forEach((p) => {
                pMap[p.media_id] = p;
                cwItems.push({
                  id: p.media_id,
                  tmdb_id: p.media_id,
                  title: p.title,
                  overview: "",
                  poster_path: p.poster_path,
                  backdrop_path: p.backdrop_path,
                  media_type: p.media_type,
                  vote_average: 8.0,
                });
              });
              setProgressMap(pMap);
              setContinueWatchingItems(cwItems);
            });
          }}
          onNextEpisode={handleNextEpisode}
        />
      )}

      {/* Smart TV QR & Pair Code Modal */}
      {isTvPairOpen && (
        <TvPairModal
          onClose={() => setIsTvPairOpen(false)}
          onPairApproved={(acc) => {
            setAccount(acc);
          }}
        />
      )}
      {/* Floating Bottom-Right User Profile & Settings Menu (ימינה למטה) */}
      {!isTvMode && (
        <UserCornerMenu account={account} onLogout={handleLogout} />
      )}
    </div>
  );
}
