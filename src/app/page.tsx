"use client";

import React, { useState, useEffect } from "react";
import {
  getTrending,
  getPopularMovies,
  getPopularTv,
  getTopRated,
  searchMedia,
  getMediaDetails,
} from "@/lib/tmdb";
import { storageManager } from "@/lib/supabase";
import { useTvMode, useSpatialNavigation } from "@/lib/tvNavigation";
import { MediaItem, UserProfile, WatchProgress } from "@/types";

import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";
import { MediaRow } from "@/components/MediaRow";
import { ProfileSelector } from "@/components/ProfileSelector";
import { EpisodesModal } from "@/components/EpisodesModal";
import { PlayerModal } from "@/components/PlayerModal";
import { TvPairModal } from "@/components/TvPairModal";
import { TvFirstLoginScreen } from "@/components/TvFirstLoginScreen";
import { TvSidebar } from "@/components/TvSidebar";
import { authManager, Account } from "@/lib/auth";

export default function HomePage() {
  const { isTvMode, toggleTvMode } = useTvMode();
  useSpatialNavigation(isTvMode);

  // Auth State
  const [account, setAccount] = useState<Account | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Profile State
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

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
    episodeName?: string;
    progressSeconds: number;
  } | null>(null);
  const [isTvPairOpen, setIsTvPairOpen] = useState(false);

  // 1. Check Auth and Load Profiles on mount
  useEffect(() => {
    const acc = authManager.getAccount();
    setAccount(acc);
    setIsCheckingAuth(false);

    storageManager.getProfiles().then((list) => {
      setProfiles(list);
      // Auto-restore previous active profile if saved
      const savedProfileId = localStorage.getItem("active_profile_id");
      if (savedProfileId) {
        const found = list.find((p) => p.id === savedProfileId);
        if (found) setCurrentProfile(found);
      }
      setIsLoadingProfiles(false);
    });
  }, []);

  // 2. Load Catalog & Recommendations
  useEffect(() => {
    getTrending().then((items) => {
      setTrending(items);
      if (items.length > 0) setHeroItem(items[0]);
    });
    getPopularMovies().then((items) => setPopularMovies(items));
    getPopularTv().then((items) => setPopularTv(items));
    getTopRated().then((items) => setTopRated(items));
  }, []);

  // 3. Load User-specific Continue Watching and My List when profile changes
  useEffect(() => {
    if (!currentProfile) return;

    localStorage.setItem("active_profile_id", currentProfile.id);

    // Continue Watching
    storageManager.getWatchProgress(currentProfile.id).then((progressList) => {
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

    // My List
    storageManager.getMyList(currentProfile.id).then((list) => {
      setMyList(list);
    });
  }, [currentProfile]);

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

  // Profile Management Handlers
  const handleSelectProfile = (profile: UserProfile) => {
    setCurrentProfile(profile);
  };

  const handleAddProfile = async (newProfile: UserProfile) => {
    await storageManager.saveProfile(newProfile);
    setProfiles((prev) => [...prev, newProfile]);
    setCurrentProfile(newProfile);
  };

  // Play Actions
  const handlePlay = (item: MediaItem, progress?: WatchProgress) => {
    setInfoItem(null);
    setPlayingItem({
      item,
      seasonNumber: progress?.season_number || 1,
      episodeNumber: progress?.episode_number || 1,
      episodeName: progress?.episode_name,
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

  // My List Toggle
  const handleToggleMyList = async (item: MediaItem) => {
    if (!currentProfile) return;
    await storageManager.toggleMyList(currentProfile.id, item);
    const updated = await storageManager.getMyList(currentProfile.id);
    setMyList(updated);
  };

  // Remove from Continue Watching
  const handleRemoveProgress = async (mediaId: number) => {
    if (!currentProfile) return;
    await storageManager.removeFromWatchProgress(currentProfile.id, mediaId);
    setContinueWatchingItems((prev) => prev.filter((i) => i.id !== mediaId));
    setProgressMap((prev) => {
      const copy = { ...prev };
      delete copy[mediaId];
      return copy;
    });
  };

  // 1. If not logged in, immediately render the TV-First QR screen!
  if (!account) {
    return (
      <TvFirstLoginScreen
        onLoginSuccess={(acc) => {
          setAccount(acc);
        }}
      />
    );
  }

  // 2. If logged in but no profile selected, render Netflix Profile Selector
  if (!currentProfile && !isLoadingProfiles) {
    return (
      <ProfileSelector
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        onAddProfile={handleAddProfile}
      />
    );
  }

  const myListIds = myList.map((m) => m.id);

  return (
    <div className={`min-h-screen bg-[#141414] text-white select-none ${isTvMode ? "tv-mode text-lg" : ""}`}>
      {/* Netflix TV Collapsible Sidebar Navigation */}
      {isTvMode && (
        <TvSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setSearchQuery("");
            setIsSearching(false);
          }}
          currentProfile={currentProfile}
          onSwitchProfile={() => setCurrentProfile(null)}
          onLogout={() => {
            authManager.logout();
            setAccount(null);
            setCurrentProfile(null);
          }}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        currentProfile={currentProfile}
        onSelectProfile={() => setCurrentProfile(null)}
        onLogout={() => {
          authManager.logout();
          setAccount(null);
          setCurrentProfile(null);
        }}
        isTvMode={isTvMode}
        onToggleTvMode={toggleTvMode}
        onOpenTvPair={() => setIsTvPairOpen(true)}
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
                  <div key={item.id} className="cursor-pointer">
                    <MediaRow
                      title=""
                      items={[item]}
                      onPlay={handlePlay}
                      onMoreInfo={(i) => setInfoItem(i)}
                      myListIds={myListIds}
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
      {playingItem && currentProfile && (
        <PlayerModal
          item={playingItem.item}
          seasonNumber={playingItem.seasonNumber}
          episodeNumber={playingItem.episodeNumber}
          episodeName={playingItem.episodeName}
          initialProgressSeconds={playingItem.progressSeconds}
          profileId={currentProfile.id}
          onClose={() => {
            setPlayingItem(null);
            // Refresh Continue Watching row on return
            storageManager.getWatchProgress(currentProfile.id).then((progressList) => {
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
          onPairApproved={(acc, profileId) => {
            setAccount(acc);
            if (profileId) {
              const p = profiles.find((item) => item.id === profileId);
              if (p) setCurrentProfile(p);
            }
          }}
        />
      )}
    </div>
  );
}
