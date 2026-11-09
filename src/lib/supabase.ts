import { createClient } from "@supabase/supabase-js";
import { UserProfile, WatchProgress, MediaItem } from "@/types";

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
  getWatchProgress: async (profileId: string): Promise<WatchProgress[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("watch_progress")
          .select("*")
          .eq("profile_id", profileId)
          .order("updated_at", { ascending: false });
        if (!error && data) {
          return data.map((d: any) => ({
            ...d,
            season_number: d.season_number === 0 ? undefined : d.season_number,
            episode_number: d.episode_number === 0 ? undefined : d.episode_number,
          }));
        }
      } catch (err) {
        console.warn("Supabase getWatchProgress failed, falling back to local:", err);
      }
    }

    if (typeof window !== "undefined") {
      const key = `watch_progress_${profileId}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);

      // Default demo mock for continue watching on first run:
      const initialMock: WatchProgress[] = [
        {
          profile_id: profileId,
          media_id: 634649,
          media_type: "movie",
          title: "ספיידרמן: אין דרך הביתה",
          poster_path: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
          backdrop_path: "/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg",
          progress_seconds: 4320,
          duration_seconds: 8880,
          percentage: 48,
          updated_at: new Date().toISOString(),
        },
        {
          profile_id: profileId,
          media_id: 66732,
          media_type: "tv",
          title: "דברים מוזרים",
          poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
          backdrop_path: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
          season_number: 4,
          episode_number: 2,
          episode_name: "קללת וקנה",
          progress_seconds: 1400,
          duration_seconds: 3200,
          percentage: 43,
          updated_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem(key, JSON.stringify(initialMock));
      return initialMock;
    }
    return [];
  },

  /**
   * Saves watch progress.
   * - LocalStorage is updated instantly (zero lag UI).
   * - Supabase cloud writes are throttled to every 12-15s per stream or forced on pause/unload.
   *   This ensures 10+ concurrent family users never exhaust Supabase write/CPU quotas!
   */
  saveWatchProgress: async (item: WatchProgress, options?: { force?: boolean }): Promise<void> => {
    const seasonNumber = item.season_number ?? 0;
    const episodeNumber = item.episode_number ?? 0;
    const uniqueKey = `${item.profile_id}_${item.media_id}`;

    // 1. Instant local storage save (ensures 1 card per media item in Continue Watching row)
    if (typeof window !== "undefined") {
      const key = `watch_progress_${item.profile_id}`;
      const items = await storageManager.getWatchProgress(item.profile_id);
      const filtered = items.filter((p) => p.media_id !== item.media_id);
      filtered.unshift({
        ...item,
        season_number: item.media_type === "tv" ? item.season_number : undefined,
        episode_number: item.media_type === "tv" ? item.episode_number : undefined,
        updated_at: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(filtered));
    }

    // 2. Throttled cloud upsert to Supabase
    if (isSupabaseConfigured && supabase) {
      const now = Date.now();
      const lastSave = lastWatchProgressSaved[uniqueKey] || 0;
      const THROTTLE_MS = 12000; // 12 seconds throttle

      if (options?.force || now - lastSave >= THROTTLE_MS) {
        lastWatchProgressSaved[uniqueKey] = now;
        try {
          await supabase.from("watch_progress").upsert(
            {
              profile_id: item.profile_id,
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
        } catch (err) {
          console.error("Supabase watch_progress save error:", err);
        }
      }
    }
  },

  removeFromWatchProgress: async (profileId: string, mediaId: number): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("watch_progress").delete().eq("profile_id", profileId).eq("media_id", mediaId);
      } catch (err) {
        console.error("Supabase watch_progress remove error:", err);
      }
    }
    if (typeof window !== "undefined") {
      const key = `watch_progress_${profileId}`;
      const items = await storageManager.getWatchProgress(profileId);
      const filtered = items.filter((p) => p.media_id !== mediaId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  },

  // --- My List (Favorites) ---
  getMyList: async (profileId: string): Promise<MediaItem[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("my_list").select("*").eq("profile_id", profileId);
        if (!error && data) return data;
      } catch (err) {
        console.warn("Supabase getMyList failed:", err);
      }
    }
    if (typeof window !== "undefined") {
      const key = `my_list_${profileId}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    }
    return [];
  },

  toggleMyList: async (profileId: string, item: MediaItem): Promise<boolean> => {
    const list = await storageManager.getMyList(profileId);
    const exists = list.some((m) => m.id === item.id);
    let updated: MediaItem[];

    if (exists) {
      updated = list.filter((m) => m.id !== item.id);
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from("my_list").delete().eq("profile_id", profileId).eq("media_id", item.id);
        } catch (err) {
          console.error("Supabase my_list delete error:", err);
        }
      }
    } else {
      updated = [...list, item];
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from("my_list").upsert(
            {
              profile_id: profileId,
              media_id: item.id,
              title: item.title,
              poster_path: item.poster_path,
              media_type: item.media_type,
              vote_average: item.vote_average,
            },
            { onConflict: "profile_id,media_id" }
          );
        } catch (err) {
          console.error("Supabase my_list upsert error:", err);
        }
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(`my_list_${profileId}`, JSON.stringify(updated));
    }

    return !exists;
  },
};
