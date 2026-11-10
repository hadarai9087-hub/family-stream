import { isSupabaseConfigured, supabase } from "./supabase";
import { UserAccount, UserSession } from "@/types";

export type { UserAccount, UserSession };
export type Account = UserAccount;

const STORAGE_KEY = "family_stream_auth_account";
const SAVED_USERS_KEY = "family_stream_saved_users";

export const AVATAR_POOL = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
];

// Default family account for instant 1-click use
export const DEFAULT_FAMILY_ACCOUNT: UserAccount = {
  id: "usr_family_master",
  email: "family@stream.local",
  username: "משפחה",
  familyName: "משפחה",
  avatar: AVATAR_POOL[0],
  preferredGenres: [28, 12, 878], // Action, Adventure, Sci-Fi
  createdAt: 1700000000000,
  token: "token_family_master_session",
};

export const authManager = {
  getCurrentUser: (): UserAccount | null => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.id || parsed.email)) {
          return {
            ...parsed,
            id: parsed.id || `usr_${Date.now()}`,
            username: parsed.username || parsed.familyName || parsed.email?.split("@")[0] || "משפחה",
            familyName: parsed.familyName || parsed.username || "משפחה",
            avatar: parsed.avatar || AVATAR_POOL[0],
            preferredGenres: Array.isArray(parsed.preferredGenres) ? parsed.preferredGenres : [],
            createdAt: parsed.createdAt || Date.now(),
          };
        }
      } catch {
        return null;
      }
    }
    return null;
  },

  getAccount: (): UserAccount | null => {
    return authManager.getCurrentUser();
  },

  getSession: (): UserSession | null => {
    const user = authManager.getCurrentUser();
    if (!user) return null;
    return {
      user,
      token: user.token || "session_token_" + user.id,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
  },

  setSession: (session: UserSession | null): void => {
    authManager.setAccount(session ? session.user : null);
  },

  setAccount: (account: UserAccount | null): void => {
    if (typeof window === "undefined") return;
    if (account) {
      const normalizedAccount: UserAccount = {
        ...account,
        id: account.id || `usr_${Date.now()}`,
        username: account.username || account.familyName || account.email?.split("@")[0] || "משפחה",
        familyName: account.familyName || account.username || "משפחה",
        avatar: account.avatar || AVATAR_POOL[0],
        preferredGenres: Array.isArray(account.preferredGenres) ? account.preferredGenres : [],
        createdAt: account.createdAt || Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedAccount));

      // Also persist to saved users list on this device
      const savedUsers = authManager.getSavedUsers();
      const existingIdx = savedUsers.findIndex(
        (u) => u.id === normalizedAccount.id || u.email.toLowerCase() === normalizedAccount.email.toLowerCase()
      );
      if (existingIdx >= 0) {
        savedUsers[existingIdx] = { ...savedUsers[existingIdx], ...normalizedAccount };
      } else {
        savedUsers.unshift(normalizedAccount);
      }
      localStorage.setItem(SAVED_USERS_KEY, JSON.stringify(savedUsers.slice(0, 10)));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("active_profile_id");
    }
  },

  getSavedUsers: (): UserAccount[] => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(SAVED_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fall through
    }
    return [DEFAULT_FAMILY_ACCOUNT];
  },

  removeSavedUser: (userId: string): void => {
    if (typeof window === "undefined") return;
    try {
      const users = authManager.getSavedUsers().filter((u) => u.id !== userId);
      localStorage.setItem(SAVED_USERS_KEY, JSON.stringify(users));
    } catch {
      // ignore
    }
  },

  loginPasswordless: async (email: string, username?: string): Promise<UserAccount> => {
    const cleanEmail = (email?.trim() || DEFAULT_FAMILY_ACCOUNT.email).toLowerCase();
    const cleanUsername = (username?.trim() || cleanEmail.split("@")[0] || "משפחה").trim();

    // Check if this user exists in saved users
    const saved = authManager.getSavedUsers();
    const existing = saved.find((u) => u.email.toLowerCase() === cleanEmail);

    let avatar = existing?.avatar;
    if (!avatar) {
      let hash = 0;
      for (let i = 0; i < cleanEmail.length; i++) {
        hash = (hash << 5) - hash + cleanEmail.charCodeAt(i);
        hash |= 0;
      }
      avatar = AVATAR_POOL[Math.abs(hash) % AVATAR_POOL.length];
    }

    const account: UserAccount = {
      id: existing?.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      email: cleanEmail,
      username: cleanUsername,
      familyName: cleanUsername,
      avatar,
      preferredGenres: existing?.preferredGenres || [],
      createdAt: existing?.createdAt || Date.now(),
      lastLoginAt: new Date().toISOString(),
      token: "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    };

    // If Supabase is available, sync to users table in background
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("users").upsert(
          {
            id: account.id,
            email: account.email,
            username: account.username,
            avatar: account.avatar,
            preferred_genres: account.preferredGenres,
            last_login_at: account.lastLoginAt,
          },
          { onConflict: "id" }
        );
      } catch (err) {
        console.warn("Supabase user sync error:", err);
      }
    }

    authManager.setAccount(account);
    return account;
  },

  loginAsSavedUser: async (user: UserAccount): Promise<UserAccount> => {
    const updated: UserAccount = {
      ...user,
      lastLoginAt: new Date().toISOString(),
      token: "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    };
    authManager.setAccount(updated);
    return updated;
  },

  login: async (email: string, passwordOrUsername?: string): Promise<UserAccount> => {
    return authManager.loginPasswordless(email, passwordOrUsername);
  },

  updatePreferredGenres: async (genres: number[]): Promise<void> => {
    const current = authManager.getCurrentUser();
    if (!current) return;
    current.preferredGenres = genres;
    authManager.setAccount(current);

    if (typeof window !== "undefined") {
      localStorage.setItem(`liked_genres_${current.id}`, JSON.stringify(genres));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("users").update({ preferred_genres: genres }).eq("id", current.id);
      } catch (err) {
        console.warn("Supabase updatePreferredGenres error:", err);
      }
    }
  },

  logout: async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase signOut error:", err);
      }
    }
    authManager.setAccount(null);
  },
};
