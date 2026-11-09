import { isSupabaseConfigured, supabase } from "./supabase";

export interface Account {
  id: string;
  email: string;
  familyName: string;
  token?: string;
}

const STORAGE_KEY = "family_stream_auth_account";

// Default family account for instant 1-click use
export const DEFAULT_FAMILY_ACCOUNT: Account = {
  id: "acc_family_master",
  email: "family@stream.local",
  familyName: "משפחה",
  token: "token_family_master_session",
};

export const authManager = {
  getAccount: (): Account | null => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  },

  setAccount: (account: Account | null): void => {
    if (typeof window === "undefined") return;
    if (account) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("active_profile_id");
    }
  },

  login: async (email: string, password?: string): Promise<Account> => {
    // If Supabase Auth is enabled, use Supabase sign in
    if (isSupabaseConfigured && supabase && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.user) {
        const account: Account = {
          id: data.user.id,
          email: data.user.email || email,
          familyName: data.user.user_metadata?.familyName || "משפחה",
          token: data.session?.access_token,
        };
        authManager.setAccount(account);
        return account;
      }
    }

    // Default fast local login
    const account: Account = {
      id: "acc_" + Math.random().toString(36).substring(2, 9),
      email: email || DEFAULT_FAMILY_ACCOUNT.email,
      familyName: email.split("@")[0] || "משפחה",
      token: "session_" + Date.now(),
    };
    authManager.setAccount(account);
    return account;
  },

  logout: async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    authManager.setAccount(null);
  },
};
