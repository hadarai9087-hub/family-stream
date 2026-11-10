import { createClient } from "@supabase/supabase-js";
import { UserProfile, WatchProgress, MediaItem } from "@/types";
import { firebaseManager, isFirebaseConfigured } from "./firebase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Default initial profiles
export const DEFAULT_PROFILES: UserProfile[] = [
  { id: "p1", name: "אבא", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80", is_kids: false },
  { id: "p2", name: "אמא", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80", is_kids: false },
  { id: "p3", name: "ילדים", avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80", is_kids: true },
  { id: "p4", name: "אורח", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80", is_kids: false },
];

interface DbWatchProgressRow {
  user_id?: string;
  profile_id?: string;
  media_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  season_number?: number;
  episode_number?: number;
  episode_name?: string | null;
  progress_seconds: number;
  duration_seconds: number;
  percentage: number;
  genre_ids?: number[];
  updated_at: string;
}

interface DbWatchlistRow {
  user_id?: string;
  profile_id?: string;
  media_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average?: number;
}

// Track last save timestamp per media to throttle Supabase writes (protect free tier quotas for 10+ concurrent users)
const lastWatchProgressSaved: Record<string, number> = {};

/**
 * Storage manager that uses Supabase if configured, or LocalStorage fallback.
 * Strictly optimized for Supabase Free Tier (low latency, throttled cloud writes, 0 payload waste).
 */
export const storageManager = {
  // --- Profiles ---
  getProfiles: async (): Promise<UserProfile[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("profiles").select("*");
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn("Supabase getProfiles failed, falling back to local:", err);
      }
    }
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("family_profiles");
      if (cached) return JSON.parse(cached);
      localStorage.setItem("family_profiles", JSON.stringify(DEFAULT_PROFILES));
    }
    return DEFAULT_PROFILES;
  },

  saveProfile: async (profile: UserProfile): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("profiles").upsert(profile, { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase saveProfile failed:", err);
      }
    }
    if (typeof window !== "undefined") {
      const current = await storageManager.getProfiles();
      const existsIndex = current.findIndex((p) => p.id === profile.id);
      if (existsIndex >= 0) {
        current[existsIndex] = profile;
      } else {
        current.push(profile);
      }
      localStorage.setItem("family_profiles", JSON.stringify(current));
    }
  },

  // --- Watch Progress ("Continue Watching" / "הבא בתור") ---
  getWatchProgress: async (userId: string): Promise<WatchProgress[]> => {
    if (isFirebaseConfigured) {
      try {
        const fbItems = await firebaseManager.getWatchProgress(userId);
        if (fbItems && fbItems.length > 0) return fbItems;
      } catch (err) {
        console.warn("Firebase getWatchProgress error:", err);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Try user_watch_progress first, then fallback to watch_progress
        const { data, error } = await supabase
          .from("user_watch_progress")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });
        if (!error && data && data.length > 0) {
          return (data as DbWatchProgressRow[]).map((d) => ({
            ...d,
            profile_id: d.user_id,
            userId: d.user_id,
            media_id: d.media_id,
            media_type: d.media_type,
            progress_seconds: d.progress_seconds,
            duration_seconds: d.duration_seconds,
            season_number: d.season_number === 0 ? undefined : d.season_number,
            episode_number: d.episode_number === 0 ? undefined : d.episode_number,
            episode_name: d.episode_name || undefined,
            genre_ids: d.genre_ids,
          }));
        }

        // Fallback to legacy watch_progress table
        const { data: legacyData, error: legacyError } = await supabase
          .from("watch_progress")
          .select("*")
          .or(`profile_id.eq.${userId},profile_id.eq.p1`)
          .order("updated_at", { ascending: false });
        if (!legacyError && legacyData && legacyData.length > 0) {
          return (legacyData as DbWatchProgressRow[]).map((d) => ({
            ...d,
            profile_id: userId,
            userId,
            season_number: d.season_number === 0 ? undefined : d.season_number,
            episode_number: d.episode_number === 0 ? undefined : d.episode_number,
            episode_name: d.episode_name || undefined,
            genre_ids: d.genre_ids,
          }));
        }
      } catch (err) {
        console.warn("Supabase getWatchProgress failed, falling back to local:", err);
      }
    }

    if (typeof window !== "undefined") {
      const userKey = `watch_progress_${userId}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore corrupted JSON
        }
      }

      // Check legacy profile key for migration
      const legacySaved = localStorage.getItem("watch_progress_p1");
      if (legacySaved) {
        try {
          const migrated: WatchProgress[] = (JSON.parse(legacySaved) as WatchProgress[]).map((item) => ({
            ...item,
            profile_id: userId,
            userId,
          }));
          localStorage.setItem(userKey, JSON.stringify(migrated));
          localStorage.removeItem("watch_progress_p1");
          return migrated;
        } catch {
          // ignore
          localStorage.removeItem("watch_progress_p1");
        }
      }

      return [];
    }
    return [];
  },

  /**
   * Saves watch progress. Supports both:
   * 1. saveWatchProgress(userId, item, options)
   * 2. saveWatchProgress(item, options)
   *
   * Synchronous 0ms LocalStorage write + 12s throttled background Supabase upsert.
   */
  saveWatchProgress: async (
    arg1: string | WatchProgress,
    arg2?: WatchProgress | { force?: boolean },
    arg3?: { force?: boolean }
  ): Promise<void> => {
    let userId: string;
    let item: WatchProgress;
    let options: { force?: boolean } | undefined;

    if (typeof arg1 === "string") {
      userId = arg1;
      item = arg2 as WatchProgress;
      options = arg3;
    } else {
      item = arg1;
      options = arg2 as { force?: boolean } | undefined;
      userId = item.userId || item.profile_id || "usr_family_master";
    }

    if (!item) return;

    const seasonNumber = item.season_number ?? 0;
    const episodeNumber = item.episode_number ?? 0;
    const uniqueKey = `${userId}_${item.media_id}`;

    // 1. Instant synchronous local storage save
    if (typeof window !== "undefined") {
      const key = `watch_progress_${userId}`;
      const items = await storageManager.getWatchProgress(userId);
      const filtered = items.filter((p) => p.media_id !== item.media_id);
      filtered.unshift({
        ...item,
        profile_id: userId,
        userId,
        season_number: item.media_type === "tv" ? item.season_number : undefined,
        episode_number: item.media_type === "tv" ? item.episode_number : undefined,
        genre_ids: item.genre_ids,
        updated_at: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(filtered));
    }

    // 2. Throttled cloud upsert to Supabase & Firebase
    if (isFirebaseConfigured) {
      firebaseManager.saveWatchProgress(userId, item).catch(() => {});
    }

    if (isSupabaseConfigured && supabase) {
      const now = Date.now();
      const lastSave = lastWatchProgressSaved[uniqueKey] || 0;
      const THROTTLE_MS = 12000;

      if (options?.force || now - lastSave >= THROTTLE_MS) {
        lastWatchProgressSaved[uniqueKey] = now;
        try {
          // Attempt upsert to user_watch_progress
          const { error } = await supabase.from("user_watch_progress").upsert(
            {
              user_id: userId,
              media_id: item.media_id,
              media_type: item.media_type,
              title: item.title,
              poster_path: item.poster_path,
              backdrop_path: item.backdrop_path,
              season_number: seasonNumber,
              episode_number: episodeNumber,
              episode_name: item.episode_name || null,
              progress_seconds: Math.round(item.progress_seconds),
              duration_seconds: Math.round(item.duration_seconds),
              percentage: item.percentage,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,media_id" }
          );

          if (error) {
            // Fallback to legacy watch_progress table
            await supabase.from("watch_progress").upsert(
              {
                profile_id: userId,
                media_id: item.media_id,
                media_type: item.media_type,
                title: item.title,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                season_number: seasonNumber,
                episode_number: episodeNumber,
                episode_name: item.episode_name || null,
                progress_seconds: Math.round(item.progress_seconds),
                duration_seconds: Math.round(item.duration_seconds),
                percentage: item.percentage,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "profile_id,media_id" }
            );
          }
        } catch (err) {
          console.error("Supabase watch_progress save error:", err);
        }
      }
    }
  },

  removeFromWatchProgress: async (userId: string, mediaId: number): Promise<void> => {
    if (isFirebaseConfigured) {
      firebaseManager.removeFromWatchProgress(userId, mediaId).catch(() => {});
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await Promise.all([
          supabase.from("user_watch_progress").delete().eq("user_id", userId).eq("media_id", mediaId),
          supabase.from("watch_progress").delete().eq("profile_id", userId).eq("media_id", mediaId),
        ]);
      } catch (err) {
        console.error("Supabase watch_progress remove error:", err);
      }
    }
    if (typeof window !== "undefined") {
      const key = `watch_progress_${userId}`;
      const items = await storageManager.getWatchProgress(userId);
      const filtered = items.filter((p) => p.media_id !== mediaId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  },

  clearWatchProgress: async (userId: string, mediaId: number): Promise<void> => {
    return storageManager.removeFromWatchProgress(userId, mediaId);
  },

  // --- Watchlist ("My List" / "הרשימה שלי") ---
  getWatchlist: async (userId: string): Promise<MediaItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const fbList = await firebaseManager.getWatchlist(userId);
        if (fbList && fbList.length > 0) return fbList;
      } catch (err) {
        console.warn("Firebase getWatchlist failed:", err);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("user_watchlist").select("*").eq("user_id", userId);
        if (!error && data && data.length > 0) {
          return (data as DbWatchlistRow[]).map((d) => ({
            id: Number(d.media_id),
            tmdb_id: Number(d.media_id),
            title: d.title,
            overview: "",
            poster_path: d.poster_path,
            backdrop_path: d.backdrop_path,
            media_type: d.media_type,
            vote_average: Number(d.vote_average || 8.0),
          }));
        }

        const { data: legacyData, error: legacyError } = await supabase
          .from("my_list")
          .select("*")
          .or(`profile_id.eq.${userId},profile_id.eq.p1`);
        if (!legacyError && legacyData && legacyData.length > 0) {
          return legacyData;
        }
      } catch (err) {
        console.warn("Supabase getWatchlist failed:", err);
      }
    }

    if (typeof window !== "undefined") {
      const primaryKey = `watchlist_${userId}`;
      const secondaryKey = `my_list_${userId}`;
      const saved = localStorage.getItem(primaryKey) || localStorage.getItem(secondaryKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }

      // Check legacy p1 migration
      const legacySaved = localStorage.getItem("my_list_p1");
      if (legacySaved) {
        try {
          const list = JSON.parse(legacySaved);
          localStorage.setItem(primaryKey, JSON.stringify(list));
          localStorage.removeItem("my_list_p1");
          localStorage.removeItem("watchlist_p1");
          return list;
        } catch {
          // ignore
          localStorage.removeItem("my_list_p1");
          localStorage.removeItem("watchlist_p1");
        }
      }
    }
    return [];
  },

  getMyList: async (userId: string): Promise<MediaItem[]> => {
    return storageManager.getWatchlist(userId);
  },

  addToWatchlist: async (userId: string, item: MediaItem): Promise<void> => {
    const list = await storageManager.getWatchlist(userId);
    if (!list.some((m) => m.id === item.id)) {
      const updated = [...list, item];
      if (typeof window !== "undefined") {
        localStorage.setItem(`watchlist_${userId}`, JSON.stringify(updated));
        localStorage.setItem(`my_list_${userId}`, JSON.stringify(updated));
      }
      if (isFirebaseConfigured) {
        firebaseManager.toggleWatchlist(userId, item).catch(() => {});
      }
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from("user_watchlist").upsert(
            {
              user_id: userId,
              media_id: item.id,
              media_type: item.media_type,
              title: item.title,
              poster_path: item.poster_path,
              backdrop_path: item.backdrop_path,
              vote_average: item.vote_average,
            },
            { onConflict: "user_id,media_id" }
          );
        } catch (err) {
          console.warn("Supabase addToWatchlist error:", err);
        }
      }
    }
  },

  removeFromWatchlist: async (userId: string, mediaId: number): Promise<void> => {
    const list = await storageManager.getWatchlist(userId);
    const updated = list.filter((m) => m.id !== mediaId);
    if (typeof window !== "undefined") {
      localStorage.setItem(`watchlist_${userId}`, JSON.stringify(updated));
      localStorage.setItem(`my_list_${userId}`, JSON.stringify(updated));
    }
    if (isFirebaseConfigured) {
      firebaseManager.toggleWatchlist(userId, { id: mediaId } as any).catch(() => {});
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await Promise.all([
          supabase.from("user_watchlist").delete().eq("user_id", userId).eq("media_id", mediaId),
          supabase.from("my_list").delete().eq("profile_id", userId).eq("media_id", mediaId),
        ]);
      } catch (err) {
        console.warn("Supabase removeFromWatchlist error:", err);
      }
    }
  },

  toggleWatchlist: async (userId: string, item: MediaItem): Promise<boolean> => {
    const list = await storageManager.getWatchlist(userId);
    const exists = list.some((m) => m.id === item.id);
    if (exists) {
      await storageManager.removeFromWatchlist(userId, item.id);
      return false;
    } else {
      await storageManager.addToWatchlist(userId, item);
      return true;
    }
  },

  toggleMyList: async (userId: string, item: MediaItem): Promise<boolean> => {
    return storageManager.toggleWatchlist(userId, item);
  },

  // --- Liked / Preferred Genres ---
  getLikedGenres: async (userId: string): Promise<number[]> => {
    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem(`liked_genres_${userId}`) || localStorage.getItem(`preferred_genres_${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return [];
  },

  saveLikedGenres: async (userId: string, genres: number[]): Promise<void> => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`liked_genres_${userId}`, JSON.stringify(genres));
      localStorage.setItem(`preferred_genres_${userId}`, JSON.stringify(genres));
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("users").update({ preferred_genres: genres }).eq("id", userId);
      } catch (err) {
        console.warn("Supabase saveLikedGenres error:", err);
      }
    }
  },
};
