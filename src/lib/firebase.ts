import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { UserAccount, WatchProgress, MediaItem } from "@/types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyByusYDH9RvHsRyDLtNtxkA0yIxCEzrxLg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hm-streams.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hm-streams",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hm-streams.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "363727878854",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:363727878854:web:7646a875a8b393d866f5c7",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const app = isFirebaseConfigured
  ? !getApps().length
    ? initializeApp(firebaseConfig)
    : getApp()
  : null;

export const db = app ? getFirestore(app) : null;

/**
 * Cloud Firebase Firestore Storage Manager
 * Seamlessly stores users, watch progress, watchlists, and TV pairings
 */
export const firebaseManager = {
  // 1. User Profiles & Preferences
  async saveUser(account: UserAccount): Promise<void> {
    if (!db) return;
    try {
      const userRef = doc(db, "users", account.id);
      await setDoc(
        userRef,
        {
          id: account.id,
          email: account.email.toLowerCase().trim(),
          username: account.username.trim(),
          avatar: account.avatar,
          preferredGenres: account.preferredGenres || [],
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Firebase saveUser error:", err);
    }
  },

  async getUser(userId: string): Promise<UserAccount | null> {
    if (!db) return null;
    try {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          id: data.id,
          email: data.email,
          username: data.username,
          avatar: data.avatar,
          preferredGenres: data.preferredGenres || [],
          createdAt: data.updatedAt?.toMillis() || Date.now(),
        };
      }
    } catch (err) {
      console.warn("Firebase getUser error:", err);
    }
    return null;
  },

  async getUserByEmail(email: string): Promise<UserAccount | null> {
    if (!db) return null;
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", email.toLowerCase().trim())
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        return {
          id: data.id,
          email: data.email,
          username: data.username,
          avatar: data.avatar,
          preferredGenres: data.preferredGenres || [],
          createdAt: data.updatedAt?.toMillis() || Date.now(),
        };
      }
    } catch (err) {
      console.warn("Firebase getUserByEmail error:", err);
    }
    return null;
  },

  // 2. Watch Progress / Continue Watching
  async saveWatchProgress(userId: string, progress: WatchProgress): Promise<void> {
    if (!db) return;
    try {
      const docId = `${userId}_${progress.media_id}`;
      const ref = doc(db, "watch_progress", docId);
      await setDoc(
        ref,
        {
          userId,
          mediaId: progress.media_id,
          mediaType: progress.media_type,
          title: progress.title,
          posterPath: progress.poster_path,
          backdropPath: progress.backdrop_path,
          seasonNumber: progress.season_number || 1,
          episodeNumber: progress.episode_number || 1,
          episodeName: progress.episode_name || null,
          progressSeconds: progress.progress_seconds,
          durationSeconds: progress.duration_seconds,
          percentage: progress.percentage,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Firebase saveWatchProgress error:", err);
    }
  },

  async getWatchProgress(userId: string): Promise<WatchProgress[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, "watch_progress"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const list: WatchProgress[] = [];

      snap.forEach((d) => {
        const item = d.data();
        list.push({
          user_id: item.userId,
          media_id: item.mediaId,
          media_type: item.mediaType,
          title: item.title,
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          season_number: item.seasonNumber,
          episode_number: item.episodeNumber,
          episode_name: item.episodeName,
          progress_seconds: item.progressSeconds,
          duration_seconds: item.durationSeconds,
          percentage: item.percentage,
          updated_at: item.updatedAt?.toMillis()?.toString() || new Date().toISOString(),
        });
      });

      return list.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } catch (err) {
      console.warn("Firebase getWatchProgress error:", err);
      return [];
    }
  },

  async removeFromWatchProgress(userId: string, mediaId: number): Promise<void> {
    if (!db) return;
    try {
      const docId = `${userId}_${mediaId}`;
      await deleteDoc(doc(db, "watch_progress", docId));
    } catch (err) {
      console.warn("Firebase removeFromWatchProgress error:", err);
    }
  },

  // 3. Watchlist
  async toggleWatchlist(userId: string, item: MediaItem): Promise<boolean> {
    if (!db) return false;
    try {
      const docId = `${userId}_${item.id}`;
      const ref = doc(db, "watchlists", docId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        await deleteDoc(ref);
        return false; // Removed
      } else {
        await setDoc(ref, {
          userId,
          mediaId: item.id,
          mediaType: item.media_type,
          title: item.title,
          posterPath: item.poster_path,
          backdropPath: item.backdrop_path,
          voteAverage: item.vote_average || 8.0,
          addedAt: Timestamp.now(),
        });
        return true; // Added
      }
    } catch (err) {
      console.warn("Firebase toggleWatchlist error:", err);
      return false;
    }
  },

  async getWatchlist(userId: string): Promise<MediaItem[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, "watchlists"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const items: MediaItem[] = [];

      snap.forEach((d) => {
        const val = d.data();
        items.push({
          id: val.mediaId,
          tmdb_id: val.mediaId,
          title: val.title,
          overview: "",
          poster_path: val.posterPath,
          backdrop_path: val.backdropPath,
          media_type: val.mediaType,
          vote_average: val.voteAverage,
        });
      });

      return items;
    } catch (err) {
      console.warn("Firebase getWatchlist error:", err);
      return [];
    }
  },

  // 4. Real-Time TV Pairing
  async saveTvPairing(code: string, expiresAt: number): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, "tv_pairings", code.toUpperCase());
      await setDoc(ref, {
        code: code.toUpperCase(),
        status: "pending",
        expiresAt: Timestamp.fromMillis(expiresAt),
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.warn("Firebase saveTvPairing error:", err);
    }
  },

  async approveTvPairing(code: string, account: UserAccount): Promise<boolean> {
    if (!db) return false;
    try {
      const ref = doc(db, "tv_pairings", code.toUpperCase());
      await setDoc(
        ref,
        {
          code: code.toUpperCase(),
          status: "approved",
          accountData: JSON.stringify(account),
          approvedAt: Timestamp.now(),
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.warn("Firebase approveTvPairing error:", err);
      return false;
    }
  },

  listenTvPairing(code: string, onApproved: (account: UserAccount) => void): (() => void) | null {
    if (!db) return null;
    try {
      const ref = doc(db, "tv_pairings", code.toUpperCase());
      const unsubscribe = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === "approved" && data.accountData) {
            try {
              const account = JSON.parse(data.accountData);
              onApproved(account);
            } catch (e) {
              console.error("Firebase parse account error:", e);
            }
          }
        }
      });
      return unsubscribe;
    } catch (err) {
      console.warn("Firebase listenTvPairing error:", err);
      return null;
    }
  },
};
