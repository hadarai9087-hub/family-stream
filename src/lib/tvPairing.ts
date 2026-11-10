import QRCode from "qrcode";
import { supabase, isSupabaseConfigured } from "./supabase";
import { firebaseManager, isFirebaseConfigured } from "./firebase";
import { Account, authManager } from "./auth";

export interface TvPairSession {
  code: string;
  qrDataUrl: string;
  expiresAt: number;
}

export interface TvPairApprovalData {
  account: Account;
  profileId?: string;
}

/**
 * Generates a 6-character alphanumeric pairing code and its QR code
 */
export async function generateTvPairSession(): Promise<TvPairSession> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Generate pair URL pointing to current app /pair route with ?code=...
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const pairUrl = `${baseUrl}/pair?code=${code}`;

  const qrDataUrl = await QRCode.toDataURL(pairUrl, {
    width: 320,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

  // 1. Notify Serverless API endpoint
  if (typeof window !== "undefined") {
    fetch("/api/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", code }),
    }).catch(() => {});
  }

  // 2. Notify Firebase if configured
  if (isFirebaseConfigured) {
    firebaseManager.saveTvPairing(code, expiresAt).catch(() => {});
  }

  // 3. Notify Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("tv_pairings").delete().lt("expires_at", new Date().toISOString());
      await supabase.from("tv_pairings").insert({
        code,
        status: "pending",
        expires_at: new Date(expiresAt).toISOString(),
      });
    } catch (e) {
      console.warn("Supabase tv_pairings insert error:", e);
    }
  }

  return { code, qrDataUrl, expiresAt };
}

/**
 * Approves a TV pairing session from phone/web
 * Passes the logged in account so TV receives the session
 */
export async function approveTvPairSession(code: string, account: Account, profileId?: string): Promise<boolean> {
  const cleanCode = code.trim().toUpperCase();
  const data: TvPairApprovalData = { account, profileId };

  let apiSuccess = false;

  // 1. Send approval to Serverless API endpoint
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, account }),
      });
      apiSuccess = res.ok;
    } catch (err) {
      console.warn("Error calling /api/pair:", err);
    }
  }

  // 2. Update Firebase if configured
  if (isFirebaseConfigured) {
    const fbOk = await firebaseManager.approveTvPairing(cleanCode, account);
    if (fbOk) apiSuccess = true;
  }

  // 3. Update Supabase if configured
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("tv_pairings")
      .update({
        status: "approved",
        account_data: JSON.stringify(account),
        profile_id: profileId,
      })
      .eq("code", cleanCode);
    if (!error) apiSuccess = true;
  }

  // 3. Local storage broadcast for same browser / demo
  if (typeof window !== "undefined") {
    localStorage.setItem(`tv_pair_approved_${cleanCode}`, JSON.stringify(data));
    apiSuccess = true;
  }

  return apiSuccess;
}

/**
 * Listens to pairing status on the TV.
 * When approved from a phone or web session, sets the account on the TV and calls onApproved.
 */
export function listenToTvPairSession(code: string, onApproved: (data: TvPairApprovalData) => void): () => void {
  const cleanCode = code.trim().toUpperCase();
  let isApprovedHandled = false;

  const handleApproval = (data: TvPairApprovalData) => {
    if (isApprovedHandled) return;
    isApprovedHandled = true;
    authManager.setAccount(data.account);
    onApproved(data);
  };

  // 1. Firebase Firestore Realtime listener if configured
  let firebaseUnsubscribe: (() => void) | null = null;
  if (isFirebaseConfigured) {
    firebaseUnsubscribe = firebaseManager.listenTvPairing(cleanCode, (account) => {
      handleApproval({ account });
    });
  }

  // 2. Supabase Realtime channel if configured
  let supabaseChannel: any = null;
  if (isSupabaseConfigured && supabase) {
    supabaseChannel = supabase
      .channel(`tv_pair_${cleanCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tv_pairings", filter: `code=eq.${cleanCode}` },
        (payload: any) => {
          if (payload.new.status === "approved") {
            try {
              const account: Account = JSON.parse(payload.new.account_data || "{}");
              handleApproval({ account, profileId: payload.new.profile_id });
            } catch (e) {
              console.error("Error handling approved pairing:", e);
            }
          }
        }
      )
      .subscribe();
  }

  // 2. High-Frequency Real-Time Polling against /api/pair and localStorage
  const interval = setInterval(async () => {
    if (isApprovedHandled) {
      clearInterval(interval);
      return;
    }

    // A. Check localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`tv_pair_approved_${cleanCode}`);
      if (stored) {
        clearInterval(interval);
        localStorage.removeItem(`tv_pair_approved_${cleanCode}`);
        try {
          const parsed: TvPairApprovalData = JSON.parse(stored);
          handleApproval(parsed);
          return;
        } catch (e) {
          console.error("Failed to parse TV pairing payload:", e);
        }
      }
    }

    // B. Check Serverless API endpoint
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/pair?code=${encodeURIComponent(cleanCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === "approved" && data.account) {
            clearInterval(interval);
            handleApproval({ account: data.account });
            return;
          }
        }
      } catch {
        // Silently retry on next poll tick
      }
    }
  }, 1200);

  return () => {
    clearInterval(interval);
    if (firebaseUnsubscribe) {
      firebaseUnsubscribe();
    }
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}
