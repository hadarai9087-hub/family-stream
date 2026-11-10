/**
 * E2E Test Harness & Shared Context for family-stream
 * Implements deterministic mocks, contracts, and test utilities.
 * Zero Emojis Compliance.
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// ANSI Terminal Colors (Zero Emojis Policy)
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

// CLI Arguments
const args = process.argv.slice(2);
let targetTier = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--tier" && args[i + 1]) {
    targetTier = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "-v" || args[i] === "--verbose") {
    verbose = true;
  }
}

// Test Results Accumulator
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  byTier: {
    1: { passed: 0, failed: 0 },
    2: { passed: 0, failed: 0 },
    3: { passed: 0, failed: 0 },
    4: { passed: 0, failed: 0 },
  },
  errors: [],
};

async function runTest(tier, id, description, testFn) {
  if (targetTier !== null && targetTier !== tier) {
    return;
  }
  results.total++;
  const label = `[Tier ${tier}] ${id}: ${description}`;
  try {
    await testFn();
    results.passed++;
    results.byTier[tier].passed++;
    if (verbose) {
      console.log(`  ${GREEN}[PASS]${RESET} ${label}`);
    }
  } catch (err) {
    results.failed++;
    results.byTier[tier].failed++;
    results.errors.push({ tier, id, description, error: err });
    console.log(`  ${RED}[FAIL]${RESET} ${label}`);
    console.log(`         ${RED}Error: ${err.message}${RESET}`);
    if (err.stack) {
      console.log(`         ${DIM}${err.stack.split("\n").slice(1, 4).join("\n         ")}${RESET}`);
    }
  }
}

// Dynamic TypeScript Transpiler & Module Loader
let ts = null;
try {
  ts = require("typescript");
} catch {
  try {
    ts = require(path.join(__dirname, "../../../node_modules/typescript"));
  } catch {
    // Will throw if TS compilation is needed
  }
}

function loadTsModule(relativeFilePath) {
  const fullPath = path.resolve(__dirname, "../../..", relativeFilePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const rawCode = fs.readFileSync(fullPath, "utf8");
  if (!ts) {
    return null;
  }

  try {
    const js = ts.transpileModule(rawCode, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;

    const mod = { exports: {} };
    const customRequire = (id) => {
      if (id === "@/types" || id === "../types" || id === "./types") {
        return {};
      }
      if (id === "next/server") {
        return {
          NextResponse: {
            json: (body, init) => ({
              status: init?.status || 200,
              headers: init?.headers,
              json: async () => body,
            }),
          },
        };
      }
      if (id === "@/lib/streamResolvers" || id === "./streamResolvers") {
        return loadTsModule("src/lib/streamResolvers.ts");
      }
      if (id === "@/lib/subtitles" || id === "./subtitles") {
        return loadTsModule("src/lib/subtitles.ts");
      }
      if (id === "@/lib/supabase" || id === "./supabase") {
        return { isSupabaseConfigured: false, supabase: null };
      }
      if (id.startsWith("node:") || id === "fs" || id === "path" || id === "assert" || id === "crypto") {
        return require(id);
      }
      try {
        return require(id);
      } catch {
        return {};
      }
    };

    const fn = new Function("require", "exports", "module", "__filename", "__dirname", js);
    fn(customRequire, mod.exports, mod, fullPath, path.dirname(fullPath));
    return mod.exports;
  } catch {
    return null;
  }
}

// ============================================================================
// SIMULATION HARNESS & CONTRACT REFERENCE IMPLEMENTATIONS (PROJECT.md)
// ============================================================================

/**
 * Mock LocalStorage with quota & event handling
 */
class MockLocalStorage {
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
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

/**
 * Mock BroadcastChannel for zero-latency inter-window sync (F17)
 */
class MockBroadcastChannel {
  static channels = new Map();

  constructor(channelName) {
    this.name = channelName;
    this.closed = false;
    this.listeners = new Set();

    if (!MockBroadcastChannel.channels.has(channelName)) {
      MockBroadcastChannel.channels.set(channelName, new Set());
    }
    MockBroadcastChannel.channels.get(channelName).add(this);
  }

  postMessage(message) {
    if (this.closed) throw new Error("BroadcastChannel closed");
    // Structured clone serialization check (as native BroadcastChannel does)
    const cloned = JSON.parse(JSON.stringify(message));
    const peers = MockBroadcastChannel.channels.get(this.name) || new Set();
    for (const peer of peers) {
      if (peer !== this && !peer.closed) {
        for (const listener of peer.listeners) {
          try {
            listener({ data: JSON.parse(JSON.stringify(cloned)) });
          } catch (e) {
            console.error("Broadcast listener error:", e);
          }
        }
      }
    }
  }

  addEventListener(event, listener) {
    if (event === "message") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(event, listener) {
    if (event === "message") {
      this.listeners.delete(listener);
    }
  }

  close() {
    this.closed = true;
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.delete(this);
    }
  }

  static reset() {
    MockBroadcastChannel.channels.clear();
  }
}

/**
 * Passwordless Auth Manager Contract (F1, F2, F3)
 */
class AuthManagerContract {
  constructor(storage = new MockLocalStorage()) {
    this.storage = storage;
    this.STORAGE_KEY = "family_stream_auth_account";
  }

  getCurrentUser() {
    const raw = this.storage.getItem(this.STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async loginPasswordless(email, username) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanUsername = (username || "").trim();

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      throw new Error("כתובת אימייל לא חוקית");
    }
    if (!cleanUsername) {
      throw new Error("שם משתמש נדרש");
    }

    const id = "usr_" + crypto.createHash("sha256").update(cleanEmail).digest("hex").slice(0, 12);
    const user = {
      id,
      email: cleanEmail,
      username: cleanUsername,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop`,
      preferredGenres: [28, 35], // Action, Comedy default starter
      createdAt: Date.now(),
    };

    this.storage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  logout() {
    this.storage.removeItem(this.STORAGE_KEY);
  }

  async updatePreferredGenres(genres) {
    const user = this.getCurrentUser();
    if (!user) throw new Error("No active user session");
    const validGenres = Array.isArray(genres)
      ? Array.from(new Set(genres.filter((g) => typeof g === "number" && g > 0)))
      : [];
    user.preferredGenres = validGenres;
    this.storage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }
}

/**
 * Dual Storage Manager Contract (F4, F5, F6)
 */
class StorageManagerContract {
  constructor(storage = new MockLocalStorage()) {
    this.storage = storage;
  }

  saveWatchProgress(userId, item) {
    if (!userId) throw new Error("userId required");
    if (!item || typeof item.mediaId !== "number") throw new Error("Valid item required");
    const key = `watch_progress_${userId}`;
    const list = this.getWatchProgress(userId);
    const filtered = list.filter((x) => x.mediaId !== item.mediaId);
    filtered.unshift({
      ...item,
      updatedAt: Date.now(),
    });
    this.storage.setItem(key, JSON.stringify(filtered.slice(0, 50)));
  }

  getWatchProgress(userId) {
    if (!userId) return [];
    const key = `watch_progress_${userId}`;
    const raw = this.storage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  clearWatchProgress(userId, mediaId) {
    if (!userId) return;
    const key = `watch_progress_${userId}`;
    const list = this.getWatchProgress(userId);
    const filtered = list.filter((x) => x.mediaId !== mediaId);
    this.storage.setItem(key, JSON.stringify(filtered));
  }

  addToWatchlist(userId, item) {
    if (!userId) throw new Error("userId required");
    if (!item || typeof item.id !== "number") throw new Error("Valid item required");
    const key = `watchlist_${userId}`;
    const list = this.getWatchlist(userId);
    if (!list.some((x) => x.id === item.id)) {
      list.unshift({ ...item, addedAt: Date.now() });
      this.storage.setItem(key, JSON.stringify(list));
    }
  }

  removeFromWatchlist(userId, mediaId) {
    if (!userId) return;
    const key = `watchlist_${userId}`;
    const list = this.getWatchlist(userId);
    const filtered = list.filter((x) => x.id !== mediaId);
    this.storage.setItem(key, JSON.stringify(filtered));
  }

  getWatchlist(userId) {
    if (!userId) return [];
    const key = `watchlist_${userId}`;
    const raw = this.storage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveLikedGenres(userId, genres) {
    if (!userId) return;
    const key = `liked_genres_${userId}`;
    const valid = Array.isArray(genres)
      ? Array.from(new Set(genres.filter((g) => typeof g === "number" && g > 0)))
      : [];
    this.storage.setItem(key, JSON.stringify(valid));
  }

  getLikedGenres(userId) {
    if (!userId) return [];
    const key = `liked_genres_${userId}`;
    const raw = this.storage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}

/**
 * TV Pairing Protocol Contract (F11 to F21)
 */
class TvPairingContract {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.sessions = new Map(); // code -> TvPairSession
  }

  generate6DigitNumericPin() {
    // Exact pure numeric PIN 100000 - 999999
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  createSession(customCode = null) {
    const code = customCode || this.generate6DigitNumericPin();
    if (!/^\d{6}$/.test(code)) {
      throw new Error(`PIN must be 6 numeric digits: ${code}`);
    }
    const qrUrl = `${this.baseUrl}/pair?code=${code}`;
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes (F11, F13)

    const session = {
      code,
      qrUrl,
      status: "pending",
      createdAt: now,
      expiresAt,
      approvedAccount: null,
    };
    this.sessions.set(code, session);
    return session;
  }

  approveSession(code, userAccount) {
    if (!/^\d{6}$/.test(code)) {
      return { success: false, error: "Invalid PIN format" };
    }
    const session = this.sessions.get(code);
    if (!session) {
      return { success: false, error: "Session not found" };
    }
    if (Date.now() > session.expiresAt) {
      session.status = "expired";
      return { success: false, error: "Session expired" };
    }
    if (!userAccount || !userAccount.id) {
      return { success: false, error: "Valid user account required for approval" };
    }

    const cleanUser = {
      ...userAccount,
      email: userAccount.email || `${userAccount.id}@stream.local`,
    };

    session.status = "approved";
    session.approvedAccount = cleanUser;
    return { success: true, session };
  }

  getSession(code) {
    const session = this.sessions.get(code);
    if (!session) return null;
    if (Date.now() > session.expiresAt && session.status === "pending") {
      session.status = "expired";
    }
    return session;
  }

  purgeExpired(now = Date.now()) {
    let count = 0;
    for (const [code, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(code);
        count++;
      }
    }
    return count;
  }

  // Simulate /api/tv/pair REST handler (F18)
  async handleRestApi(method, body = {}, query = {}) {
    if (method === "POST") {
      if (body.action === "create") {
        const session = this.createSession();
        return { status: 200, body: session };
      }
      if (body.action === "approve") {
        const res = this.approveSession(body.code, body.user);
        if (res.success) {
          return { status: 200, body: { success: true } };
        }
        return { status: 400, body: { success: false, error: res.error } };
      }
      return { status: 400, body: { error: "Unknown action" } };
    }
    if (method === "GET") {
      const code = query.code;
      if (!code) return { status: 400, body: { error: "code required" } };
      const session = this.getSession(code);
      if (!session) return { status: 404, body: { error: "Session not found" } };
      return {
        status: 200,
        body: {
          code: session.code,
          status: session.status,
          user: session.approvedAccount,
          expiresAt: session.expiresAt,
        },
      };
    }
    return { status: 405, body: { error: "Method not allowed" } };
  }
}

/**
 * Recommendation Engine Contract (F7, F8, F9, F10)
 */
class RecommendationEngineContract {
  static GENRE_WEIGHT = 0.50;
  static TMDB_RATING_WEIGHT = 0.35;
  static POPULARITY_WEIGHT = 0.15;
  static ANCHOR_MIN_WATCH_SECONDS = 180; // 3 minutes threshold (F9)

  static calculateAffinityScore(item, userPreferredGenres = []) {
    // Genre affinity component (0 to 100)
    const itemGenres = item.genre_ids || item.genres || [];
    const matchedCount = itemGenres.filter((id) => userPreferredGenres.includes(id)).length;
    const genreScore = userPreferredGenres.length > 0
      ? (matchedCount / Math.max(1, userPreferredGenres.length)) * 100
      : 50;

    // TMDB vote average component (vote_average is 0-10, scale to 0-100)
    const ratingScore = Math.min(100, Math.max(0, (item.vote_average || 7.0) * 10));

    // Popularity component (log scale normalized to 0-100)
    const pop = Math.max(1, item.popularity || 20);
    const popularityScore = Math.min(100, Math.log10(pop) * 33.3);

    const totalScore =
      genreScore * RecommendationEngineContract.GENRE_WEIGHT +
      ratingScore * RecommendationEngineContract.TMDB_RATING_WEIGHT +
      popularityScore * RecommendationEngineContract.POPULARITY_WEIGHT;

    return Math.round(totalScore * 100) / 100;
  }

  static getPersonalizedRecommendations(catalog, userPreferredGenres, limit = 10) {
    return catalog
      .map((item) => ({
        item,
        score: RecommendationEngineContract.calculateAffinityScore(item, userPreferredGenres),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.item);
  }

  static getDynamicAnchorRecommendations(catalog, watchProgressItem, limit = 10) {
    if (!watchProgressItem) return null;
    const watchSeconds = watchProgressItem.currentTime || 0;
    if (watchSeconds < RecommendationEngineContract.ANCHOR_MIN_WATCH_SECONDS) {
      // Must not anchor if watched under 3 minutes
      return null;
    }

    const anchorGenres = watchProgressItem.genre_ids || [];
    const recommendations = catalog
      .filter((x) => x.id !== watchProgressItem.mediaId)
      .map((item) => {
        const itemGenres = item.genre_ids || [];
        const commonGenres = itemGenres.filter((g) => anchorGenres.includes(g)).length;
        const affinity = commonGenres * 30 + (item.vote_average || 7) * 5;
        return { item, affinity };
      })
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, limit)
      .map((x) => x.item);

    return {
      anchorTitle: watchProgressItem.title,
      recommendations,
    };
  }

  static getColdStartOnboardingCatalog(selectedGenreIds, catalog, limit = 10) {
    if (!selectedGenreIds || selectedGenreIds.length === 0) {
      // High-rating fallback
      return catalog
        .slice()
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        .slice(0, limit);
    }
    return catalog
      .filter((item) => {
        const itemGenres = item.genre_ids || [];
        return itemGenres.some((g) => selectedGenreIds.includes(g));
      })
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, limit);
  }
}

/**
 * Smart TV Device Detection Contract (F24, F25)
 */
class TvDetectionContract {
  static TV_USER_AGENTS = [
    { name: "Samsung Tizen", pattern: /Tizen/i },
    { name: "LG webOS", pattern: /Web0S|NetCast/i },
    { name: "Android TV", pattern: /Android.*(TV|Large Screen)|BRAVIA|AFT/i },
    { name: "Fire TV", pattern: /AFT[A-Z0-9]+|FireTV/i },
    { name: "Apple TV", pattern: /AppleTV/i },
    { name: "Roku", pattern: /Roku/i },
    { name: "Google TV", pattern: /GoogleTV|CrKey.*TV/i },
    { name: "Generic Smart TV", pattern: /Smart-?TV|HbbTV/i },
  ];

  static detectTvDevice(userAgent) {
    if (!userAgent || typeof userAgent !== "string") return false;
    // Guard against Windows PC false positive having TV keyword
    if (userAgent.includes("Windows NT") && !userAgent.includes("Smart-TV")) {
      return false;
    }
    // Guard against standard Macintosh/iPhone
    if ((userAgent.includes("Macintosh") || userAgent.includes("iPhone")) && !userAgent.includes("AppleTV")) {
      return false;
    }
    return TvDetectionContract.TV_USER_AGENTS.some((tv) => tv.pattern.test(userAgent));
  }

  static isTvModeActive(searchParams = {}, userAgent = "") {
    // Query param ?tv=1 takes precedence (F25)
    if (searchParams.tv === "1" || searchParams.tv === "true") {
      return true;
    }
    if (searchParams.tv === "0" || searchParams.tv === "false") {
      return false;
    }
    return TvDetectionContract.detectTvDevice(userAgent);
  }
}

/**
 * Background Stream Probing & Health Protocol (F32 to F39)
 */
class StreamProberContract {
  static TIER_BASE_WEIGHTS = {
    1: 1000,
    2: 700,
    3: 500,
    4: 300,
  };
  static COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes cooldown (F38)
  static TIMEOUT_MS = 2500; // 2.5s abort timeout (F32, F33)

  constructor() {
    this.blacklist = new Map(); // providerId -> blacklistedUntil (timestamp)
  }

  blacklistProvider(providerId, now = Date.now()) {
    this.blacklist.set(providerId, now + StreamProberContract.COOLDOWN_DURATION_MS);
  }

  isProviderBlacklisted(providerId, now = Date.now()) {
    if (!this.blacklist.has(providerId)) return false;
    const until = this.blacklist.get(providerId);
    if (now >= until) {
      this.blacklist.delete(providerId);
      return false;
    }
    return true;
  }

  calculateDynamicScore(provider) {
    const tierWeight = StreamProberContract.TIER_BASE_WEIGHTS[provider.tier] || 400;
    const latencyPenalty = 0.5 * Math.max(0, provider.latencyMs || 0);
    const resBonus = provider.resolution === "1080p" ? 50 : provider.resolution === "4K" ? 100 : 0;
    return Math.round(tierWeight - latencyPenalty + resBonus);
  }

  async probeSingleProvider(provider, simulatedProbeResult = null) {
    if (simulatedProbeResult) {
      return {
        ...provider,
        status: simulatedProbeResult.status,
        latencyMs: simulatedProbeResult.latencyMs,
        score: simulatedProbeResult.status === "online"
          ? this.calculateDynamicScore({ ...provider, latencyMs: simulatedProbeResult.latencyMs })
          : -1,
      };
    }

    // Default mock probe behavior
    const latency = 120 + Math.floor(Math.random() * 200);
    return {
      ...provider,
      status: "online",
      latencyMs: latency,
      score: this.calculateDynamicScore({ ...provider, latencyMs: latency }),
    };
  }

  async probeAllCandidates(providers, simulatedOverrides = {}, now = Date.now()) {
    const activeProviders = providers.filter((p) => !this.isProviderBlacklisted(p.id, now));

    const probePromises = activeProviders.map((p) => {
      const sim = simulatedOverrides[p.id];
      return this.probeSingleProvider(p, sim);
    });

    const results = await Promise.allSettled(probePromises);
    const onlineSources = [];

    for (const res of results) {
      if (res.status === "fulfilled" && res.value.status === "online") {
        onlineSources.push(res.value);
      }
    }

    onlineSources.sort((a, b) => b.score - a.score);
    return {
      rankedSources: onlineSources,
      fastestSource: onlineSources[0] || null,
    };
  }
}

/**
 * Stream Watchdog and Automatic Failover Manager (F36, F37)
 */
class StreamWatchdogContract {
  constructor(prober = new StreamProberContract()) {
    this.prober = prober;
    this.currentSource = null;
    this.currentTime = 0;
    this.failoverCount = 0;
  }

  mountStream(source, startTime = 0) {
    this.currentSource = source;
    this.currentTime = startTime;
  }

  updateProgress(currentTime) {
    this.currentTime = currentTime;
  }

  async handleFailure(errorType, availableSources, now = Date.now()) {
    if (this.currentSource) {
      // 5-minute cooldown for dropped provider (F38)
      this.prober.blacklistProvider(this.currentSource.id, now);
    }
    this.failoverCount++;

    // Pick next online non-blacklisted source
    const candidates = availableSources.filter(
      (s) => s.id !== this.currentSource?.id && !this.prober.isProviderBlacklisted(s.id, now)
    );

    if (candidates.length === 0) {
      return { success: false, error: "No alternative streams available" };
    }

    // Sort by score
    candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
    const nextSource = candidates[0];

    // Seamless failover preserving exact currentTime (F37)
    const preservedTime = this.currentTime;
    this.mountStream(nextSource, preservedTime);

    return {
      success: true,
      nextSource,
      preservedTime,
      failoverCount: this.failoverCount,
    };
  }
}

/**
 * TV Download Portal Contract (F27 to F31)
 */
class DownloadPortalContract {
  static METADATA = {
    apk: {
      version: "2.4.0",
      releaseDate: "2026-11-09",
      fileSizeMb: 42.8,
      downloadUrl: "https://family-stream.local/releases/family-stream-tv-2.4.0.apk",
      shortCode: "84219", // Prominent 5-digit code (F29)
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // 64 hex chars (F30)
    },
    pwa: {
      samsungTizen: [
        "פתח את דפדפן האינטרנט של סמסונג (Samsung Internet) בטלוויזיה",
        "הזן את כתובת האתר family-stream בשורת הכתובת",
        "לחץ על תפריט האפשרויות ובחר 'הוסף לדף הבית' (Add to Home)",
        "הפעל את האפליקציה במסך מלא מחלון היישומים הראשי",
      ],
      lgWebOs: [
        "פתח את דפדפן האינטרנט של LG (Web Browser)",
        "הזן את כתובת השירות family-stream",
        "הוסף את העמוד לסימניות וסמן 'הצג בסרגל המהיר'",
        "הפעל את האתר כיישום קבוע במסך הבית של הטלוויזיה",
      ],
    },
  };

  static verifyShortCode(code) {
    return code === "84219";
  }

  static verifySha256(checksum) {
    return /^[a-f0-9]{64}$/i.test(checksum);
  }
}

module.exports = {
  // Terminal formatting
  RESET,
  BOLD,
  GREEN,
  RED,
  YELLOW,
  CYAN,
  DIM,
  // CLI flags
  targetTier,
  verbose,
  // Test Harness
  results,
  runTest,
  loadTsModule,
  // Mocks & Contracts
  MockLocalStorage,
  MockBroadcastChannel,
  AuthManagerContract,
  StorageManagerContract,
  TvPairingContract,
  RecommendationEngineContract,
  TvDetectionContract,
  StreamProberContract,
  StreamWatchdogContract,
  DownloadPortalContract,
};
