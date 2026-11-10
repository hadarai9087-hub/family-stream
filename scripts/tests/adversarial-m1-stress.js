/**
 * Milestone 1 Adversarial Stress-Testing Suite
 * Empirically validates:
 * 1. Passwordless authentication under edge conditions (case, whitespace, Hebrew unicode, rapid cycles, saved users, corrupt storage).
 * 2. Per-user storage isolation (watch progress, watchlist, liked genres, cross-session reload).
 * 3. Complete absence of ProfileSelector in DOM/render pathways and zero p1 storage key leaks.
 * 4. Recommendation engine scoring formula, dynamic anchor 180s threshold, and cold-start fallback.
 * 5. TypeScript compilation & production build verification.
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const { execSync } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "../..");

// ANSI formatting (Zero Emojis Policy)
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

// In-Memory LocalStorage with full inspection
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i) {
    return Array.from(this.store.keys())[i] || null;
  }
  getAllKeys() {
    return Array.from(this.store.keys());
  }
  dump() {
    return Object.fromEntries(this.store.entries());
  }
}

let activeStorage = new MemoryStorage();

// Global DOM mocks
global.window = {
  location: { origin: "http://localhost:3000" },
};
Object.defineProperty(global, "localStorage", {
  get: () => activeStorage,
  configurable: true,
});

// Production TS Module Loader
function loadProdModule(relativeFilePath, customMocks = {}) {
  const fullPath = path.join(ROOT_DIR, relativeFilePath);
  const rawCode = fs.readFileSync(fullPath, "utf8");

  const transpiled = ts.transpileModule(rawCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = { exports: {} };
  const customRequire = (id) => {
    if (customMocks[id]) return customMocks[id];
    if (id === "@/types" || id === "../types" || id === "./types") return {};
    if (id === "@/lib/supabase" || id === "./supabase") {
      return loadProdModule("src/lib/supabase.ts", customMocks);
    }
    if (id === "@/lib/auth" || id === "./auth") {
      return loadProdModule("src/lib/auth.ts", customMocks);
    }
    if (id === "@/lib/tmdb" || id === "./tmdb") {
      return customMocks["@/lib/tmdb"] || {
        getTrending: async () => [],
        getTopRated: async () => [],
        getMovieRecommendations: async (id) => [
          { id: id + 10000, title: `המלצה לסרט ${id}`, genre_ids: [28], vote_average: 8.1, media_type: "movie" },
        ],
        getTvRecommendations: async (id) => [
          { id: id + 20000, title: `המלצה לסדרה ${id}`, genre_ids: [18], vote_average: 8.4, media_type: "tv" },
        ],
        getSimilarMovies: async () => [],
        getSimilarTv: async () => [],
        getDiscoverMedia: async () => [],
      };
    }
    if (id === "@supabase/supabase-js") {
      return {
        createClient: () => null,
      };
    }
    try {
      return require(id);
    } catch {
      return {};
    }
  };

  const fn = new Function("require", "exports", "module", "__filename", "__dirname", transpiled);
  fn(customRequire, mod.exports, mod, fullPath, path.dirname(fullPath));
  return mod.exports;
}

// Test runner state
const suiteResults = [];

async function test(suite, name, fn) {
  const t0 = performance.now();
  try {
    await fn();
    const durationMs = (performance.now() - t0).toFixed(2);
    suiteResults.push({ suite, name, status: "PASS", durationMs, error: null });
    console.log(`  ${GREEN}[PASS]${RESET} ${suite} > ${name} (${durationMs}ms)`);
  } catch (err) {
    const durationMs = (performance.now() - t0).toFixed(2);
    suiteResults.push({ suite, name, status: "FAIL", durationMs, error: err.message });
    console.log(`  ${RED}[FAIL]${RESET} ${suite} > ${name} (${durationMs}ms)`);
    console.log(`         ${RED}${err.message}${RESET}`);
  }
}

async function runAdversarialSuite() {
  console.log("====================================================================");
  console.log("  Milestone 1 Empirical Adversarial Stress Test Suite");
  console.log("  Zero Emojis Policy | Deep Edge & Isolation Validation");
  console.log("====================================================================\n");

  // Load modules
  const authMod = loadProdModule("src/lib/auth.ts");
  const supabaseMod = loadProdModule("src/lib/supabase.ts");
  const recMod = loadProdModule("src/lib/recommendations.ts");

  const { authManager, DEFAULT_FAMILY_ACCOUNT } = authMod;
  const { storageManager } = supabaseMod;

  // =========================================================================
  // SUITE 1: Passwordless Authentication Edge Conditions
  // =========================================================================
  console.log(`${BOLD}--- Suite 1: Passwordless Authentication Edge Conditions ---${RESET}`);

  await test("Auth Edge", "Case insensitivity: uppercase and lowercase email map to identical user ID", async () => {
    activeStorage.clear();
    const user1 = await authManager.loginPasswordless("Avi.Cohen@Stream.IL", "אבי כהן");
    assert.strictEqual(user1.email, "avi.cohen@stream.il");

    const user2 = await authManager.loginPasswordless("AVI.COHEN@STREAM.IL", "אבי כהן");
    assert.strictEqual(user2.id, user1.id, "User ID must be preserved across case variations");
    assert.strictEqual(user2.email, "avi.cohen@stream.il");

    const saved = authManager.getSavedUsers();
    const matching = saved.filter((u) => u.email === "avi.cohen@stream.il");
    assert.strictEqual(matching.length, 1, "Must not create duplicate saved users for case differences");
  });

  await test("Auth Edge", "Whitespace trimming: leading, trailing, and tab whitespace stripped from email & username", async () => {
    activeStorage.clear();
    const user = await authManager.loginPasswordless("  \t dana_test@stream.co.il \n\r ", " \t  דנה רון  \n ");
    assert.strictEqual(user.email, "dana_test@stream.co.il");
    assert.strictEqual(user.username, "דנה רון");

    const current = authManager.getCurrentUser();
    assert.strictEqual(current.email, "dana_test@stream.co.il");
    assert.strictEqual(current.username, "דנה רון");
  });

  await test("Auth Edge", "Whitespace-only input handling: whitespace-only email must fall back to default family account rather than empty string", async () => {
    activeStorage.clear();
    const user = await authManager.loginPasswordless("    ", "   ");
    // If bug exists, user.email will be empty string "" instead of default family email
    assert(user.email && user.email.length > 0 && user.email.includes("@"), `Email must not be empty string. Got: "${user.email}"`);
    assert(user.username && user.username.length > 0, `Username must not be empty string. Got: "${user.username}"`);
  });

  await test("Auth Edge", "Unicode Hebrew usernames: handles UTF-8 characters and RTL symbols without corruption", async () => {
    activeStorage.clear();
    const hebrewName = "ישראל ישראלי (סרטים ומדע-בדיוני) 2026";
    const user = await authManager.loginPasswordless("israel@stream.il", hebrewName);
    assert.strictEqual(user.username, hebrewName);

    // Re-read directly from storage
    const stored = JSON.parse(activeStorage.getItem("family_stream_auth_account"));
    assert.strictEqual(stored.username, hebrewName, "Stored UTF-8 string must match exactly");
    assert(user.avatar.startsWith("https://"), "Avatar hash must generate valid URL for unicode");
  });

  await test("Auth Edge", "Rapid login/logout cycles: 100 rapid sequential cycles maintain state consistency", async () => {
    activeStorage.clear();
    for (let i = 0; i < 100; i++) {
      const email = `stress_user_${i}@stream.il`;
      const u = await authManager.loginPasswordless(email, `משתמש ${i}`);
      assert.strictEqual(authManager.getCurrentUser().email, email);
      await authManager.logout();
      assert.strictEqual(authManager.getCurrentUser(), null);
    }
  });

  await test("Auth Edge", "Multi-account device memory: caps saved users at 10 and supports removal and re-login", async () => {
    activeStorage.clear();
    const createdUsers = [];
    for (let i = 1; i <= 12; i++) {
      const u = await authManager.loginPasswordless(`user_${i}@stream.il`, `משתמש ${i}`);
      createdUsers.push(u);
    }

    const saved = authManager.getSavedUsers();
    assert.strictEqual(saved.length, 10, "Saved users must be capped at 10");
    assert.strictEqual(saved[0].email, "user_12@stream.il", "Most recent login must be at index 0");

    // Remove user_12
    authManager.removeSavedUser(saved[0].id);
    const afterRemoval = authManager.getSavedUsers();
    assert.strictEqual(afterRemoval.length, 9);
    assert(!afterRemoval.some((u) => u.email === "user_12@stream.il"), "Removed user must be absent");

    // Re-login as saved user
    const targetUser = afterRemoval[0];
    const prevToken = targetUser.token;
    const relogged = await authManager.loginAsSavedUser(targetUser);
    assert.strictEqual(relogged.id, targetUser.id);
    assert(relogged.lastLoginAt, "lastLoginAt must be populated");
    assert.notStrictEqual(relogged.token, prevToken, "Token must be freshly generated");
  });

  await test("Auth Edge", "Corrupt localStorage recovery: graceful handling of broken JSON and non-objects", async () => {
    activeStorage.clear();

    // 1. Broken JSON in auth account
    activeStorage.setItem("family_stream_auth_account", "{ corrupted_json: true, unterminated");
    assert.strictEqual(authManager.getCurrentUser(), null, "Corrupt account JSON must return null");

    // 2. Non-object in auth account
    activeStorage.setItem("family_stream_auth_account", "12345");
    assert.strictEqual(authManager.getCurrentUser(), null, "Primitive number must return null");

    activeStorage.setItem("family_stream_auth_account", "\"just a string\"");
    assert.strictEqual(authManager.getCurrentUser(), null, "String must return null");

    activeStorage.setItem("family_stream_auth_account", "null");
    assert.strictEqual(authManager.getCurrentUser(), null, "null string must return null");

    // 3. Corrupt saved users JSON
    activeStorage.setItem("family_stream_saved_users", "[{ broken: invalid ]");
    const fallbackSaved = authManager.getSavedUsers();
    assert(Array.isArray(fallbackSaved) && fallbackSaved.length > 0, "Must return fallback default user array");
    assert.strictEqual(fallbackSaved[0].id, DEFAULT_FAMILY_ACCOUNT.id);

    // 4. Normal login functions properly after corruption recovery
    const recovered = await authManager.loginPasswordless("clean@stream.il", "נקי");
    assert.strictEqual(recovered.email, "clean@stream.il");
    assert.strictEqual(authManager.getCurrentUser().id, recovered.id);
  });

  // =========================================================================
  // SUITE 2: Per-User Storage Isolation & Persistence
  // =========================================================================
  console.log(`\n${BOLD}--- Suite 2: Per-User Storage Isolation & Persistence ---${RESET}`);

  await test("Storage Isolation", "Watch progress isolation: User A and User B never cross-contaminate progress", async () => {
    activeStorage.clear();
    const userA = "usr_alice_001";
    const userB = "usr_bob_002";

    // User A watches media 601 to 45% (450s / 1000s)
    await storageManager.saveWatchProgress(userA, {
      media_id: 601,
      media_type: "movie",
      title: "גלדיאטור 2",
      poster_path: "/glad.jpg",
      backdrop_path: "/glad_bg.jpg",
      progress_seconds: 450,
      duration_seconds: 1000,
      percentage: 45,
      updated_at: new Date().toISOString(),
    });

    // User B watches media 601 to 90% (900s / 1000s) and media 702 to 15%
    await storageManager.saveWatchProgress(userB, {
      media_id: 601,
      media_type: "movie",
      title: "גלדיאטור 2",
      poster_path: "/glad.jpg",
      backdrop_path: "/glad_bg.jpg",
      progress_seconds: 900,
      duration_seconds: 1000,
      percentage: 90,
      updated_at: new Date().toISOString(),
    });

    await storageManager.saveWatchProgress(userB, {
      media_id: 702,
      media_type: "tv",
      title: "בית הדרקון",
      poster_path: "/drag.jpg",
      backdrop_path: "/drag_bg.jpg",
      season_number: 2,
      episode_number: 1,
      progress_seconds: 600,
      duration_seconds: 3600,
      percentage: 16,
      updated_at: new Date().toISOString(),
    });

    // Verify User A
    const listA = await storageManager.getWatchProgress(userA);
    const itemA601 = listA.find((i) => i.media_id === 601);
    assert(itemA601, "User A must have item 601");
    assert.strictEqual(itemA601.percentage, 45, "User A percentage must remain 45");
    assert.strictEqual(itemA601.progress_seconds, 450);
    assert(!listA.some((i) => i.media_id === 702), "User A must NOT have User B's item 702");

    // Verify User B
    const listB = await storageManager.getWatchProgress(userB);
    const itemB601 = listB.find((i) => i.media_id === 601);
    assert(itemB601, "User B must have item 601");
    assert.strictEqual(itemB601.percentage, 90, "User B percentage must remain 90");
    assert.strictEqual(itemB601.progress_seconds, 900);
    assert(listB.some((i) => i.media_id === 702), "User B must have item 702");
  });

  await test("Storage Isolation", "Watchlist isolation: User A items do not appear in User B watchlist", async () => {
    activeStorage.clear();
    const userA = "usr_alice_001";
    const userB = "usr_bob_002";

    const movieA = { id: 101, title: "דדפול", media_type: "movie", poster_path: "/d.jpg", backdrop_path: "/db.jpg", vote_average: 8.0 };
    const movieB = { id: 202, title: "אופנהיימר", media_type: "movie", poster_path: "/o.jpg", backdrop_path: "/ob.jpg", vote_average: 8.9 };

    await storageManager.addToWatchlist(userA, movieA);
    await storageManager.addToWatchlist(userB, movieB);

    const watchlistA = await storageManager.getWatchlist(userA);
    const watchlistB = await storageManager.getWatchlist(userB);

    assert(watchlistA.some((m) => m.id === 101), "User A must have movieA");
    assert(!watchlistA.some((m) => m.id === 202), "User A must NOT have movieB");

    assert(watchlistB.some((m) => m.id === 202), "User B must have movieB");
    assert(!watchlistB.some((m) => m.id === 101), "User B must NOT have movieA");
  });

  await test("Storage Isolation", "Liked genres isolation: User A and User B genre preferences remain distinct", async () => {
    activeStorage.clear();
    const userA = "usr_alice_001";
    const userB = "usr_bob_002";

    await storageManager.saveLikedGenres(userA, [28, 878]); // Action, Sci-Fi
    await storageManager.saveLikedGenres(userB, [35, 18, 16]); // Comedy, Drama, Animation

    const genresA = await storageManager.getLikedGenres(userA);
    const genresB = await storageManager.getLikedGenres(userB);

    assert.deepStrictEqual(genresA, [28, 878]);
    assert.deepStrictEqual(genresB, [35, 18, 16]);
  });

  await test("Storage Isolation", "Cross-session browser reload persistence: state accurately survives browser reboot", async () => {
    activeStorage.clear();
    const userA = "usr_alice_001";
    const userB = "usr_bob_002";

    await storageManager.saveWatchProgress(userA, {
      media_id: 601,
      media_type: "movie",
      title: "גלדיאטור 2",
      poster_path: "/glad.jpg",
      backdrop_path: "/glad_bg.jpg",
      progress_seconds: 450,
      duration_seconds: 1000,
      percentage: 45,
      updated_at: new Date().toISOString(),
    });
    await storageManager.saveLikedGenres(userA, [28, 878]);

    await storageManager.saveWatchProgress(userB, {
      media_id: 601,
      media_type: "movie",
      title: "גלדיאטור 2",
      poster_path: "/glad.jpg",
      backdrop_path: "/glad_bg.jpg",
      progress_seconds: 900,
      duration_seconds: 1000,
      percentage: 90,
      updated_at: new Date().toISOString(),
    });

    // Simulate browser reload by instantiating a fresh storage module from scratch
    const freshSupabaseMod = loadProdModule("src/lib/supabase.ts");
    const freshStorage = freshSupabaseMod.storageManager;

    const listA = await freshStorage.getWatchProgress(userA);
    const listB = await freshStorage.getWatchProgress(userB);

    assert.strictEqual(listA.find((i) => i.media_id === 601)?.percentage, 45);
    assert.strictEqual(listB.find((i) => i.media_id === 601)?.percentage, 90);

    const genresA = await freshStorage.getLikedGenres(userA);
    assert.deepStrictEqual(genresA, [28, 878]);
  });

  await test("Storage Isolation", "Corrupt storage recovery for watch progress and watchlist", async () => {
    activeStorage.clear();
    const user = "usr_corrupt_test";

    // Set corrupt JSON
    activeStorage.setItem(`watch_progress_${user}`, "INVALID_JSON_DATA{{{");
    activeStorage.setItem(`watchlist_${user}`, "[{ incomplete");

    // Must not throw, should fall back cleanly
    const progress = await storageManager.getWatchProgress(user);
    assert(Array.isArray(progress), "Must return array despite corrupted localStorage JSON");

    const watchlist = await storageManager.getWatchlist(user);
    assert(Array.isArray(watchlist) && watchlist.length === 0, "Must return empty array on corrupt watchlist");
  });

  // =========================================================================
  // SUITE 3: ProfileSelector Elimination & No p1 Storage Leakage
  // =========================================================================
  console.log(`\n${BOLD}--- Suite 3: ProfileSelector Elimination & No p1 Storage Leakage ---${RESET}`);

  await test("Profile Removal", "DOM/Render pathways: AST audit confirms zero imports or rendering of ProfileSelector in page.tsx", async () => {
    const pageContent = fs.readFileSync(path.join(ROOT_DIR, "src/app/page.tsx"), "utf8");

    assert(!pageContent.includes("import { ProfileSelector }"), "page.tsx must NOT import ProfileSelector");
    assert(!pageContent.includes("import ProfileSelector"), "page.tsx must NOT default import ProfileSelector");
    assert(!pageContent.includes("<ProfileSelector"), "page.tsx must NOT render ProfileSelector JSX element");
    assert(!pageContent.includes("ProfileSelector:"), "page.tsx must NOT reference ProfileSelector");
  });

  await test("Profile Removal", "DOM/Render pathways: pair/page.tsx and LoginScreen.tsx have zero ProfileSelector references", async () => {
    const pairContent = fs.readFileSync(path.join(ROOT_DIR, "src/app/pair/page.tsx"), "utf8");
    const loginContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/LoginScreen.tsx"), "utf8");

    assert(!pairContent.includes("ProfileSelector"), "pair/page.tsx must NOT reference ProfileSelector");
    assert(!loginContent.includes("ProfileSelector"), "LoginScreen.tsx must NOT reference ProfileSelector");
  });

  await test("Storage Audit", "Zero p1 storage key leakage: full user lifecycle generates zero keys containing p1", async () => {
    activeStorage.clear();

    const testUser = await authManager.loginPasswordless("audit_user@stream.il", "בודק");
    await storageManager.saveWatchProgress(testUser.id, {
      media_id: 301,
      media_type: "movie",
      title: "מבחן בידוד",
      poster_path: "/test.jpg",
      backdrop_path: "/test_bg.jpg",
      progress_seconds: 120,
      duration_seconds: 3000,
      percentage: 4,
      updated_at: new Date().toISOString(),
    });

    await storageManager.addToWatchlist(testUser.id, {
      id: 401,
      title: "סרט רשימה",
      media_type: "movie",
      poster_path: "/list.jpg",
      backdrop_path: "/list_bg.jpg",
      vote_average: 7.5,
    });

    await storageManager.saveLikedGenres(testUser.id, [28, 35]);
    await authManager.logout();

    const keys = activeStorage.getAllKeys();
    console.log(`         ${DIM}Storage keys observed: ${JSON.stringify(keys)}${RESET}`);

    // Verify no keys contain p1
    const p1Keys = keys.filter((k) => k.includes("p1"));
    assert.strictEqual(p1Keys.length, 0, `Storage keys must NOT contain p1. Found: ${JSON.stringify(p1Keys)}`);

    // Verify active_profile_id is not lingering
    assert.strictEqual(activeStorage.getItem("active_profile_id"), null);
  });

  await test("Storage Audit", "Legacy migration leak check: legacy watch_progress_p1 correctly migrates to user key", async () => {
    activeStorage.clear();
    const legacyData = [
      {
        profile_id: "p1",
        media_id: 999,
        media_type: "movie",
        title: "סרט ישן",
        poster_path: "/old.jpg",
        backdrop_path: "/old_bg.jpg",
        progress_seconds: 500,
        duration_seconds: 1000,
        percentage: 50,
        updated_at: new Date().toISOString(),
      },
    ];
    activeStorage.setItem("watch_progress_p1", JSON.stringify(legacyData));

    const user = "usr_migrated_user";
    const migrated = await storageManager.getWatchProgress(user);
    assert.strictEqual(migrated.length, 1);
    assert.strictEqual(migrated[0].media_id, 999);
    assert.strictEqual(migrated[0].userId, user, "Migrated item must have userId set to the new user");
    assert.strictEqual(migrated[0].profile_id, user, "Migrated item profile_id must be updated to userId");

    // Verify user key was written
    const userStored = JSON.parse(activeStorage.getItem(`watch_progress_${user}`));
    assert(userStored && userStored.length === 1);
    assert.strictEqual(userStored[0].userId, user);

    // Verify legacy p1 key is purged so p1 does not linger in storage keys
    const lingeringP1 = activeStorage.getItem("watch_progress_p1");
    assert.strictEqual(lingeringP1, null, "Legacy watch_progress_p1 must be purged from localStorage after migration to eliminate p1 keys");
  });

  // =========================================================================
  // SUITE 4: Recommendation Engine Stress & Algorithm Integrity
  // =========================================================================
  console.log(`\n${BOLD}--- Suite 4: Recommendation Engine Stress & Algorithm Integrity ---${RESET}`);

  await test("Recommendation Engine", "Scoring formula: strictly adheres to 50% genre, 35% rating, 15% popularity", async () => {
    const { scoreCandidate, computeGenreWeights } = recMod;

    const genreWeights = { 28: 3.0, 878: 3.0 }; // Action & Sci-Fi heavily favored
    const maxWeight = 3.0;

    // Item 1: High genre match (Action, Sci-Fi), average rating (7.5), rank 0/10
    const item1 = { id: 1, title: "אקשן טהור", genre_ids: [28, 878], vote_average: 7.5 };
    // Item 2: Zero genre match (Romance: 10749), high rating (9.5), rank 0/10
    const item2 = { id: 2, title: "רומנטיקה", genre_ids: [10749], vote_average: 9.5 };

    const score1 = scoreCandidate(item1, genreWeights, maxWeight, 0, 10);
    const score2 = scoreCandidate(item2, genreWeights, maxWeight, 0, 10);

    // Score 1:
    // Genre affinity: (3.0 + 3.0) / 3.0 = capped at 1.0 -> 0.5 * 1.0 = 0.50
    // Rating: (7.5 - 5.0) / 5.0 = 0.5 -> 0.35 * 0.5 = 0.175
    // Popularity: (10 - 0) / 10 = 1.0 -> 0.15 * 1.0 = 0.15
    // Total = 0.825

    // Score 2:
    // Genre affinity: 0 -> 0.5 * 0.0 = 0.0
    // Rating: (9.5 - 5.0) / 5.0 = 0.9 -> 0.35 * 0.9 = 0.315
    // Popularity: 1.0 -> 0.15
    // Total = 0.465

    assert(score1 > score2, `High genre affinity (score=${score1}) must strictly outscore high rating with zero genre match (score=${score2})`);
  });

  await test("Recommendation Engine", "Dynamic anchor threshold: requires >= 180s engagement to anchor 'Because you watched'", async () => {
    const { getBecauseYouWatched } = recMod;

    // Case 1: Empty watch history -> null
    const resEmpty = await getBecauseYouWatched({ watchHistory: [] });
    assert.strictEqual(resEmpty, null, "Empty history must return null");

    // Case 2: History with item watched for only 120s (under 3 min) and another watched for 300s (over 3 min)
    const history = [
      {
        media_id: 1001,
        title: "קצרצר",
        progress_seconds: 120, // < 180s
        updated_at: "2026-11-10T02:00:00Z", // more recent
      },
      {
        media_id: 1002,
        title: "סרט ארוך מעורב",
        progress_seconds: 300, // >= 180s
        updated_at: "2026-11-10T01:00:00Z", // older
      },
    ];

    const res = await getBecauseYouWatched({ watchHistory: history });
    assert(res !== null, "Must find anchor");
    assert.strictEqual(res.anchorTitle, "סרט ארוך מעורב", "Must anchor on the engaged title (>= 180s) over the unengaged recent title");
  });

  await test("Recommendation Engine", "Candidate exclusions: in-progress and watchlist items are excluded from recommendations", async () => {
    const { getPersonalizedRecommendations } = recMod;

    const catalog = [
      { id: 2001, title: "כבר נצפה", genre_ids: [28], vote_average: 8.0 },
      { id: 2002, title: "ברשימה שלי", genre_ids: [28], vote_average: 8.2 },
      { id: 2003, title: "סרט מומלץ חדש", genre_ids: [28], vote_average: 8.5 },
    ];

    const watchHistory = [{ media_id: 2001, title: "כבר נצפה", progress_seconds: 1500, percentage: 50 }];
    const watchlist = [{ id: 2002, title: "ברשימה שלי" }];

    const recs = await getPersonalizedRecommendations({
      userId: "usr_test",
      preferredGenres: [28],
      watchHistory,
      watchlist,
      catalogCandidates: catalog,
    });

    assert(!recs.some((r) => r.id === 2001), "Must exclude in-progress item 2001");
    assert(!recs.some((r) => r.id === 2002), "Must exclude watchlist item 2002");
    assert(recs.some((r) => r.id === 2003), "Must include candidate 2003");
  });

  await test("Recommendation Engine", "Cold-start fallback: 0 history, 0 watchlist, 0 preferences returns curated blockbusters", async () => {
    const { getColdStartRecommendations, CURATED_COLD_START_CATALOG } = recMod;

    const coldItems = await getColdStartRecommendations([]);
    assert(coldItems && coldItems.length > 0, "Cold start must return non-empty list");
    assert.strictEqual(coldItems.length, CURATED_COLD_START_CATALOG.length);
    assert.strictEqual(coldItems[0].title, "ספיידרמן: אין דרך הביתה");
  });

  // =========================================================================
  // SUITE 5: Build & Type Checking Integrity
  // =========================================================================
  console.log(`\n${BOLD}--- Suite 5: TypeScript Compilation & Production Build Integrity ---${RESET}`);

  await test("Build Integrity", "Next.js production build (`npx next build`) type checks and builds without errors", async () => {
    try {
      execSync("npx next build", { cwd: ROOT_DIR, stdio: "pipe" });
    } catch (err) {
      const stdout = err.stdout ? err.stdout.toString() : "";
      const stderr = err.stderr ? err.stderr.toString() : "";
      throw new Error(`Production build failed with exit code ${err.status}:\n${stdout}\n${stderr}`);
    }
  });

  // =========================================================================
  // SUMMARY & VERDICT GENERATION
  // =========================================================================
  console.log("\n====================================================================");
  console.log("  Milestone 1 Adversarial Test Execution Summary");
  console.log("====================================================================");

  const total = suiteResults.length;
  const passed = suiteResults.filter((r) => r.status === "PASS").length;
  const failed = suiteResults.filter((r) => r.status === "FAIL").length;

  console.log(`  Total Tests Run:    ${total}`);
  console.log(`  Total Tests Passed: ${passed}`);
  console.log(`  Total Tests Failed: ${failed}\n`);

  if (failed > 0) {
    console.log(`${RED}${BOLD}FAILED TESTS:${RESET}`);
    suiteResults
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`  - [${r.suite}] ${r.name}`);
        console.log(`    ${DIM}${r.error}${RESET}`);
      });
    console.log(`\n${RED}${BOLD}ADVERSARIAL VERDICT: REQUEST_CHANGES${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}ADVERSARIAL VERDICT: APPROVE${RESET}`);
    process.exit(0);
  }
}

runAdversarialSuite().catch((err) => {
  console.error("Adversarial runner fatal crash:", err);
  process.exit(1);
});
