#!/usr/bin/env node

/**
 * Adversarial Recommendation Engine Test Harness (Milestone 1)
 *
 * Empirical Validation Suite targeting:
 * 1. Mathematical Scoring Validation (0.50 GenreAffinity + 0.35 Rating + 0.15 Popularity - Penalty)
 * 2. Genre Affinity Compounding (Likes +3.0, Completed Watch +2.0, Watchlist +2.5)
 * 3. Dynamic Anchor Selection (>= 180s threshold, recency sorting, ignore <180s)
 * 4. Exclusion Filtering (Continue Watching <90%, Watchlist, Duplicates)
 * 5. Cold-Start Resilience & Interactive Hebrew Genre Filtering
 *
 * Policy: Zero Emojis Compliance.
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// ANSI Colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

// Transpile src/lib/recommendations.ts directly to test actual implementation code
const recommendationsTsPath = path.join(__dirname, "../src/lib/recommendations.ts");
const tsCode = fs.readFileSync(recommendationsTsPath, "utf8");
const jsCode = ts.transpileModule(tsCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

// Controlled TMDB Mock Fixtures
let mockDiscoverResults = [];
let mockMovieRecs = [];
let mockTvRecs = [];
let mockTrending = [];
let mockTopRated = [];

const mockTmdb = {
  getTrending: async () => mockTrending,
  getTopRated: async () => mockTopRated,
  getMovieRecommendations: async (id) => mockMovieRecs,
  getTvRecommendations: async (id) => mockTvRecs,
  getSimilarMovies: async (id) => [],
  getSimilarTv: async (id) => [],
  getDiscoverMedia: async (type, params) => mockDiscoverResults,
};

const moduleObj = { exports: {} };
const context = vm.createContext({
  module: moduleObj,
  exports: moduleObj.exports,
  require: (mod) => {
    if (mod === "./tmdb") return mockTmdb;
    if (mod === "@/types") return {};
    return require(mod);
  },
  console,
  Math,
  Date,
  Array,
  Object,
  Set,
  Promise,
});

vm.runInContext(jsCode, context);

const {
  HEBREW_GENRES,
  CURATED_COLD_START_CATALOG,
  computeGenreWeights,
  scoreCandidate,
  getPersonalizedRecommendations,
  getBecauseYouWatched,
  getColdStartRecommendations,
} = moduleObj.exports;

// Test Runner Infrastructure
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

async function test(id, title, fn) {
  stats.total++;
  const start = performance.now();
  try {
    await fn();
    const duration = (performance.now() - start).toFixed(2);
    stats.passed++;
    stats.tests.push({ id, title, status: "PASS", duration });
    console.log(`  [PASS] ${id}: ${title} (${duration}ms)`);
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    stats.failed++;
    stats.tests.push({ id, title, status: "FAIL", duration, error: err.message });
    console.log(`  ${RED}[FAIL]${RESET} ${id}: ${title} (${duration}ms)`);
    console.log(`         Error: ${err.message}`);
  }
}

async function runAdversarialSuite() {
  console.log(`\n${BOLD}====================================================================${RESET}`);
  console.log(`${BOLD}  ADVERSARIAL STRESS SUITE: RECOMMENDATION ENGINE (MILESTONE 1)    ${RESET}`);
  console.log(`${BOLD}====================================================================${RESET}\n`);

  // ==========================================================================
  // PILLAR 1: MATHEMATICAL SCORING VALIDATION
  // ==========================================================================
  console.log(`${CYAN}--- Pillar 1: Mathematical Scoring Validation ---${RESET}`);

  await test("P1.01", "Exact formula verification for perfect candidate (Score = 1.000)", () => {
    const item = {
      id: 101,
      tmdb_id: 101,
      title: "Perfect Match",
      vote_average: 10.0,
      genre_ids: [28],
    };
    const genreWeights = { 28: 10.0 };
    const maxWeight = 10.0;
    const rank = 0;
    const poolSize = 10;

    // GenreAffinity = 10 / 10 = 1.0 (weight 0.50) -> 0.50
    // NormalizedRating = (10.0 - 5.0) / 5.0 = 1.0 (weight 0.35) -> 0.35
    // PopularityFactor = (10 - 0) / 10 = 1.0 (weight 0.15) -> 0.15
    // Penalty = 0
    // Total = 0.50 + 0.35 + 0.15 = 1.000
    const score = scoreCandidate(item, genreWeights, maxWeight, rank, poolSize);
    assert.strictEqual(Math.abs(score - 1.0) < 1e-6, true, `Expected 1.0, got ${score}`);
  });

  await test("P1.02", "Exact formula verification for worst-case candidate with penalty (Score = -0.300)", () => {
    const item = {
      id: 102,
      tmdb_id: 102,
      title: "Poor Match",
      vote_average: 5.0, // < 5.8 penalty 0.3
      genre_ids: [99],
    };
    const genreWeights = { 28: 10.0 }; // genre 99 weight = 0
    const maxWeight = 10.0;
    const rank = 10;
    const poolSize = 10;

    // GenreAffinity = 0 / 10 = 0.0 -> 0.0
    // NormalizedRating = (5.0 - 5.0) / 5.0 = 0.0 -> 0.0
    // PopularityFactor = (10 - 10) / 10 = 0.0 -> 0.0
    // Penalty = 0.3
    // Total = 0.0 + 0.0 + 0.0 - 0.3 = -0.300
    const score = scoreCandidate(item, genreWeights, maxWeight, rank, poolSize);
    assert.strictEqual(Math.abs(score - (-0.3)) < 1e-6, true, `Expected -0.3, got ${score}`);
  });

  await test("P1.03", "Formula weighting ratio: 50% Genre, 35% Rating, 15% Popularity on mid-tier item", () => {
    const item = {
      id: 103,
      tmdb_id: 103,
      title: "Mid-Tier Match",
      vote_average: 7.5, // (7.5 - 5.0)/5.0 = 0.50
      genre_ids: [28],
    };
    const genreWeights = { 28: 4.0 };
    const maxWeight = 8.0; // GenreAffinity = 4.0 / 8.0 = 0.50
    const rank = 5;
    const poolSize = 20; // PopularityFactor = (20 - 5) / 20 = 0.75

    // Expected: 0.50 * 0.50 + 0.35 * 0.50 + 0.15 * 0.75 = 0.25 + 0.175 + 0.1125 = 0.5375
    const score = scoreCandidate(item, genreWeights, maxWeight, rank, poolSize);
    assert.strictEqual(Math.abs(score - 0.5375) < 1e-6, true, `Expected 0.5375, got ${score}`);
  });

  await test("P1.04", "Boundary check: vote_average = 5.8 (no penalty) vs vote_average = 5.79 (penalty applies)", () => {
    const itemNoPenalty = { id: 104, vote_average: 5.8, genre_ids: [] };
    const itemWithPenalty = { id: 105, vote_average: 5.79, genre_ids: [] };
    const genreWeights = {};
    const maxWeight = 1.0;

    const scoreNoPenalty = scoreCandidate(itemNoPenalty, genreWeights, maxWeight, 0, 10);
    const scoreWithPenalty = scoreCandidate(itemWithPenalty, genreWeights, maxWeight, 0, 10);

    // Difference between 5.8 and 5.79 rating component is tiny: (0.01 / 5) * 0.35 = 0.0007
    // But penalty causes a sudden cliff drop of 0.300
    const diff = scoreNoPenalty - scoreWithPenalty;
    assert.strictEqual(diff > 0.29, true, `Expected penalty cliff of ~0.30, observed diff ${diff}`);
  });

  await test("P1.05", "Extreme boundary: vote_average > 10.0 clamps normalized rating to 1.0", () => {
    const item10 = { id: 106, vote_average: 10.0, genre_ids: [] };
    const item12 = { id: 107, vote_average: 12.0, genre_ids: [] };
    const score10 = scoreCandidate(item10, {}, 1.0, 0, 10);
    const score12 = scoreCandidate(item12, {}, 1.0, 0, 10);
    assert.strictEqual(score10, score12, "Out of range vote_average > 10 must clamp to 1.0");
  });

  await test("P1.06", "Extreme boundary: maxWeight = 0 does not trigger divide-by-zero or NaN", () => {
    const item = { id: 108, vote_average: 7.0, genre_ids: [28] };
    const score = scoreCandidate(item, {}, 0, 0, 10);
    assert.strictEqual(Number.isFinite(score), true, "Score must be a finite number");
    assert.strictEqual(Number.isNaN(score), false, "Score must not be NaN");
  });

  await test("P1.07", "Sorting validation: candidate ranking respects computed score descending", async () => {
    const candidates = [
      { id: 1, title: "Low", vote_average: 6.0, genre_ids: [99] },
      { id: 2, title: "High", vote_average: 9.5, genre_ids: [28] },
      { id: 3, title: "Medium", vote_average: 7.5, genre_ids: [28] },
    ];
    mockDiscoverResults = [];
    mockTrending = [];
    mockTopRated = [];

    const recs = await getPersonalizedRecommendations({
      userId: "u1",
      preferredGenres: [28],
      catalogCandidates: candidates,
    });

    assert.strictEqual(recs[0].id, 2, "Item 2 with highest affinity and rating must rank first");
    assert.strictEqual(recs[1].id, 3, "Item 3 with medium affinity must rank second");
    assert.strictEqual(recs[2].id, 1, "Item 1 with lowest affinity must rank last");
  });

  await test("P1.08", "Rating anomaly: unrated / 0-rated candidate must not outscore a 5.5-rated title due to || 7.0 fallback", () => {
    // A movie with vote_average = 0 (unrated or 0 rating) vs a movie with vote_average = 5.5
    const candidate0 = { id: 109, vote_average: 0, genre_ids: [28] };
    const candidate55 = { id: 110, vote_average: 5.5, genre_ids: [28] };
    const score0 = scoreCandidate(candidate0, { 28: 1 }, 1, 0, 10);
    const score55 = scoreCandidate(candidate55, { 28: 1 }, 1, 0, 10);

    // If vote_average === 0 falls back to 7.0, score0 becomes 0.79 while score55 is 0.385!
    assert(
      score0 <= score55,
      `vote_average = 0 (score ${score0}) should not outrank vote_average = 5.5 (score ${score55}) via fallback`
    );
  });

  // ==========================================================================
  // PILLAR 2: GENRE AFFINITY WEIGHTING
  // ==========================================================================
  console.log(`\n${CYAN}--- Pillar 2: Genre Affinity Weighting ---${RESET}`);

  await test("P2.01", "Explicit likes assign exactly +3.0 per genre", () => {
    const weights = computeGenreWeights([28, 878], [], []);
    assert.strictEqual(weights[28], 3.0, "Genre 28 must have weight 3.0");
    assert.strictEqual(weights[878], 3.0, "Genre 878 must have weight 3.0");
  });

  await test("P2.02", "100% completed watch assigns exactly +2.0 to item genres", () => {
    const watchHistory = [
      {
        media_id: 100,
        percentage: 100,
        genre_ids: [28],
      },
    ];
    const weights = computeGenreWeights([], watchHistory, []);
    assert.strictEqual(weights[28], 2.0, "100% watch progress must yield exactly 2.0 weight");
  });

  await test("P2.03", "Watchlist item assigns exactly +2.5 to item genres", () => {
    const watchlist = [
      {
        id: 200,
        title: "Saved",
        genre_ids: [878],
      },
    ];
    const weights = computeGenreWeights([], [], watchlist);
    assert.strictEqual(weights[878], 2.5, "Watchlist item must yield exactly 2.5 weight");
  });

  await test("P2.04", "Compounding validation: Explicit (+3.0) + Completed (+2.0) + Watchlist (+2.5) = +7.5", () => {
    const preferredGenres = [28];
    const watchHistory = [{ media_id: 100, percentage: 100, genre_ids: [28] }];
    const watchlist = [{ id: 200, title: "Action In List", genre_ids: [28] }];

    const weights = computeGenreWeights(preferredGenres, watchHistory, watchlist);
    assert.strictEqual(weights[28], 7.5, `Expected 7.5 compounded weight, got ${weights[28]}`);
  });

  await test("P2.05", "Partial watch percentage scaling: 50% watch yields 1.0 compounding to 4.0", () => {
    const preferredGenres = [28];
    const watchHistory = [{ media_id: 100, percentage: 50, genre_ids: [28] }];
    const weights = computeGenreWeights(preferredGenres, watchHistory, []);
    assert.strictEqual(weights[28], 4.0, `Expected 3.0 + (50/100)*2.0 = 4.0, got ${weights[28]}`);
  });

  await test("P2.06", "Watch history with 0% progress clamps to minimum engagement factor 0.1 (weight 0.2)", () => {
    const watchHistory = [{ media_id: 100, percentage: 0, genre_ids: [35] }];
    const weights = computeGenreWeights([], watchHistory, []);
    // Math.max(0.1, 0) * 2.0 = 0.2
    assert.strictEqual(Math.abs(weights[35] - 0.2) < 1e-6, true, "Clamped factor must equal 0.2");
  });

  await test("P2.07", "Adversarial input resilience: null/undefined/missing genre arrays produce empty weights without crash", () => {
    const weights = computeGenreWeights(
      [null, undefined, 0],
      [{ media_id: 1, percentage: 80, genre_ids: null }],
      [{ id: 2, genre_ids: undefined }]
    );
    assert.strictEqual(Object.keys(weights).length, 0, "Must not introduce invalid genre entries");
  });

  await test("P2.08", "Watchlist item with dual genre_ids and genres schema should not double-count weight (+2.5 vs +5.0)", () => {
    // If an item specifies both genre_ids: [28] AND genres: [{id: 28}]
    const watchlist = [
      {
        id: 300,
        title: "Dual Format Item",
        genre_ids: [28],
        genres: [{ id: 28, name: "פעולה" }],
      },
    ];
    const weights = computeGenreWeights([], [], watchlist);
    assert.strictEqual(
      weights[28],
      2.5,
      `Single watchlist item must add +2.5, but got doubled weight ${weights[28]}`
    );
  });

  // ==========================================================================
  // PILLAR 3: DYNAMIC ANCHOR SELECTION ("כי צפית ב...")
  // ==========================================================================
  console.log(`\n${CYAN}--- Pillar 3: Dynamic Anchor Selection ---${RESET}`);

  await test("P3.01", "Items with watch time < 180s are ignored in favor of most recent >= 180s title", async () => {
    const watchHistory = [
      {
        media_id: 101,
        title: "Short Preview",
        progress_seconds: 45, // < 180s: must be ignored
        updated_at: "2026-11-10T02:00:00Z",
      },
      {
        media_id: 102,
        title: "Full Engaging Movie",
        progress_seconds: 600, // >= 180s: valid anchor
        updated_at: "2026-11-10T01:00:00Z",
      },
    ];

    mockMovieRecs = [
      { id: 201, title: "Recommended 1", vote_average: 8.0 },
      { id: 202, title: "Recommended 2", vote_average: 7.5 },
    ];

    const result = await getBecauseYouWatched({ watchHistory });
    assert(result !== null, "Anchor result must not be null");
    assert.strictEqual(
      result.anchorTitle,
      "Full Engaging Movie",
      `Anchor must be 600s title, not 45s preview. Got: ${result.anchorTitle}`
    );
  });

  await test("P3.02", "Exact boundary test: 179s is ignored, 180s activates anchor", async () => {
    const watchHistory = [
      {
        media_id: 103,
        title: "At 179 Seconds",
        progress_seconds: 179, // strictly < 180s
        updated_at: "2026-11-10T03:00:00Z",
      },
      {
        media_id: 104,
        title: "At Exactly 180 Seconds",
        progress_seconds: 180, // strictly >= 180s
        updated_at: "2026-11-10T02:00:00Z",
      },
    ];

    mockMovieRecs = [{ id: 203, title: "Related Movie", vote_average: 8.1 }];

    const result = await getBecauseYouWatched({ watchHistory });
    assert(result !== null);
    assert.strictEqual(
      result.anchorTitle,
      "At Exactly 180 Seconds",
      "Item at 179s must be ignored in favor of item at 180s"
    );
  });

  await test("P3.03", "Recency selection among multiple >= 180s titles chooses the latest updated", async () => {
    const watchHistory = [
      {
        media_id: 105,
        title: "Watched Yesterday",
        progress_seconds: 1000,
        updated_at: "2026-11-09T10:00:00Z",
      },
      {
        media_id: 106,
        title: "Watched Today",
        progress_seconds: 500,
        updated_at: "2026-11-10T10:00:00Z",
      },
    ];

    mockMovieRecs = [{ id: 204, title: "Related 204", vote_average: 7.9 }];

    const result = await getBecauseYouWatched({ watchHistory });
    assert(result !== null);
    assert.strictEqual(result.anchorTitle, "Watched Today", "Must choose most recently updated title");
  });

  await test("P3.04", "Anchor recommendations exclude the anchored item itself and already-watched items", async () => {
    const watchHistory = [
      {
        media_id: 107,
        title: "Anchor Film",
        progress_seconds: 400,
        updated_at: "2026-11-10T04:00:00Z",
      },
      {
        media_id: 108,
        title: "Already Watched Film",
        progress_seconds: 500,
        updated_at: "2026-11-10T03:00:00Z",
      },
    ];

    mockMovieRecs = [
      { id: 107, title: "Anchor Film" }, // self
      { id: 108, title: "Already Watched Film" }, // already in watchHistory
      { id: 109, title: "Fresh Recommendation" },
    ];

    const result = await getBecauseYouWatched({ watchHistory });
    assert(result !== null);
    const hasSelf = result.items.some((i) => i.id === 107);
    const hasWatched = result.items.some((i) => i.id === 108);
    const hasFresh = result.items.some((i) => i.id === 109);

    assert.strictEqual(hasSelf, false, "Must exclude anchor title itself");
    assert.strictEqual(hasWatched, false, "Must exclude already watched items");
    assert.strictEqual(hasFresh, true, "Must include fresh recommendation");
  });

  await test("P3.05", "Requirement 3: Items with < 180s watch time MUST be ignored; when all items < 180s, anchor must be null", async () => {
    // If user has only watched 30s and 60s clips (< 180s)
    const watchHistory = [
      {
        media_id: 110,
        title: "30s Clip",
        progress_seconds: 30,
        updated_at: "2026-11-10T05:00:00Z",
      },
      {
        media_id: 111,
        title: "60s Clip",
        progress_seconds: 60,
        updated_at: "2026-11-10T04:00:00Z",
      },
    ];

    mockMovieRecs = [{ id: 205, title: "Clip Recommendations" }];
    const result = await getBecauseYouWatched({ watchHistory });

    // Specification: Items with < 180s watch time are ignored. If no title >= 180s exists, anchor must be null.
    assert.strictEqual(
      result,
      null,
      `Items with < 180s must be ignored. Found fallback to sorted[0]: ${result ? result.anchorTitle : "null"}`
    );
  });

  // ==========================================================================
  // PILLAR 4: EXCLUSION FILTER VERIFICATION
  // ==========================================================================
  console.log(`\n${CYAN}--- Pillar 4: Exclusion Filter Verification ---${RESET}`);

  await test("P4.01", "Titles in 'Continue Watching' (< 90% progress) are excluded from 'מומלץ במיוחד עבורך'", async () => {
    const watchHistory = [
      {
        media_id: 501,
        title: "Currently Watching Movie",
        percentage: 45, // < 90%
        progress_seconds: 1200,
      },
    ];

    const candidates = [
      { id: 501, title: "Currently Watching Movie", vote_average: 8.5, genre_ids: [28] },
      { id: 502, title: "Unseen Movie", vote_average: 8.0, genre_ids: [28] },
    ];

    mockDiscoverResults = [];
    mockTrending = [];
    mockTopRated = [];

    const recs = await getPersonalizedRecommendations({
      userId: "u_filter",
      preferredGenres: [28],
      watchHistory,
      catalogCandidates: candidates,
    });

    const hasContinueWatching = recs.some((item) => item.id === 501);
    const hasUnseen = recs.some((item) => item.id === 502);

    assert.strictEqual(hasContinueWatching, false, "Must exclude item in Continue Watching (< 90%)");
    assert.strictEqual(hasUnseen, true, "Must include unseen item");
  });

  await test("P4.02", "Titles in 'My List' (Watchlist) are excluded from 'מומלץ במיוחד עבורך'", async () => {
    const watchlist = [
      {
        id: 601,
        title: "Movie in My List",
        vote_average: 8.2,
        genre_ids: [28],
      },
    ];

    const candidates = [
      { id: 601, title: "Movie in My List", vote_average: 8.2, genre_ids: [28] },
      { id: 602, title: "Not in My List", vote_average: 7.9, genre_ids: [28] },
    ];

    mockDiscoverResults = [];
    mockTrending = [];
    mockTopRated = [];

    const recs = await getPersonalizedRecommendations({
      userId: "u_filter",
      preferredGenres: [28],
      watchlist,
      catalogCandidates: candidates,
    });

    const hasWatchlistItem = recs.some((item) => item.id === 601);
    const hasNonWatchlistItem = recs.some((item) => item.id === 602);

    assert.strictEqual(hasWatchlistItem, false, "Must exclude item currently in My List / Watchlist");
    assert.strictEqual(hasNonWatchlistItem, true, "Must keep non-watchlist candidates");
  });

  await test("P4.03", "Duplicate titles across candidate streams are deduplicated to single entry", async () => {
    const candidates = [
      { id: 701, title: "Duplicated Movie", vote_average: 8.0, genre_ids: [28] },
      { id: 701, title: "Duplicated Movie Duplicate", vote_average: 8.0, genre_ids: [28] },
      { id: 702, title: "Unique Movie", vote_average: 7.5, genre_ids: [28] },
    ];

    const recs = await getPersonalizedRecommendations({
      userId: "u_dedup",
      preferredGenres: [28],
      catalogCandidates: candidates,
    });

    const count701 = recs.filter((i) => i.id === 701).length;
    assert.strictEqual(count701, 1, "Candidate item 701 must appear exactly once");
  });

  await test("P4.04", "Simultaneous Continue Watching + Watchlist exclusion works cleanly", async () => {
    const watchHistory = [{ media_id: 801, percentage: 30 }];
    const watchlist = [{ id: 802, title: "Watchlist Title" }];
    const candidates = [
      { id: 801, title: "CW Title", vote_average: 8.0 },
      { id: 802, title: "WL Title", vote_average: 8.0 },
      { id: 803, title: "Valid Title", vote_average: 8.0 },
    ];

    const recs = await getPersonalizedRecommendations({
      userId: "u_combo",
      preferredGenres: [28],
      watchHistory,
      watchlist,
      catalogCandidates: candidates,
    });

    assert.strictEqual(recs.some((i) => i.id === 801), false);
    assert.strictEqual(recs.some((i) => i.id === 802), false);
    assert.strictEqual(recs.some((i) => i.id === 803), true);
  });

  // ==========================================================================
  // PILLAR 5: COLD-START RESILIENCE & INTERACTIVE GENRE FILTERING
  // ==========================================================================
  console.log(`\n${CYAN}--- Pillar 5: Cold-Start Resilience & Genre Pills ---${RESET}`);

  await test("P5.01", "New user with 0 history gets valid, diverse curated Hebrew catalog", async () => {
    const recs = await getColdStartRecommendations([]);
    assert(Array.isArray(recs), "Recs must be an array");
    assert(recs.length > 0, "Cold start must return non-empty catalog");

    // Verify Hebrew text in titles
    const hasHebrew = recs.some((item) => /[\u0590-\u05FF]/.test(item.title));
    assert.strictEqual(hasHebrew, true, "Cold start catalog must contain Hebrew titles");

    // Verify diverse genre coverage
    const allGenres = new Set();
    recs.forEach((item) => {
      (item.genre_ids || []).forEach((g) => allGenres.add(g));
    });
    assert(allGenres.size >= 4, `Expected at least 4 distinct genres in cold start, got ${allGenres.size}`);
  });

  await test("P5.02", "Interactive genre pill selection filters cold-start suggestions dynamically", async () => {
    // Mock discover media for Action (28)
    mockDiscoverResults = [
      { id: 901, title: "סרט אקשן 1", genre_ids: [28], vote_average: 8.2 },
      { id: 902, title: "סרט אקשן 2", genre_ids: [28], vote_average: 7.9 },
    ];

    const actionRecs = await getColdStartRecommendations([28]);
    assert(actionRecs.length > 0, "Action recs must not be empty");
    assert.strictEqual(actionRecs[0].id, 901, "First action rec must be the mock action title");

    // Now mock discover media for Sci-Fi (878)
    mockDiscoverResults = [
      { id: 903, title: "סרט מד\"ב בחלל", genre_ids: [878], vote_average: 8.5 },
    ];

    const scifiRecs = await getColdStartRecommendations([878]);
    assert(scifiRecs.length > 0, "SciFi recs must not be empty");
    assert.strictEqual(scifiRecs[0].id, 903, "First scifi rec must be the mock scifi title");

    // Switching pills dynamically changes output
    assert.notStrictEqual(actionRecs[0].id, scifiRecs[0].id, "Pill toggling must dynamically change suggestions");
  });

  await test("P5.03", "Offline / TMDB API failure gracefully falls back to curated cold-start catalog", async () => {
    mockDiscoverResults = [];
    const recs = await getColdStartRecommendations([99999]);
    assert(Array.isArray(recs), "Fallback must be an array");
    assert(recs.length > 0, "Fallback must return curated cold-start catalog");
    assert.strictEqual(recs, CURATED_COLD_START_CATALOG, "Must return CURATED_COLD_START_CATALOG on error/empty");
  });

  await test("P5.04", "Hebrew genre pill metadata integrity (8 official Hebrew genre pills defined)", () => {
    assert.strictEqual(HEBREW_GENRES.length, 8, "Expected 8 official Hebrew genre pills");
    const requiredGids = [28, 878, 35, 18, 53, 16, 80, 99];
    for (const gid of requiredGids) {
      const found = HEBREW_GENRES.find((g) => g.id === gid);
      assert(found, `Missing genre metadata for genre ID ${gid}`);
      assert(found.name && /[\u0590-\u05FF]/.test(found.name), `Genre ${gid} must have Hebrew name`);
      assert(found.emoji, `Genre ${gid} must have an emoji icon`);
    }
  });

  // ==========================================================================
  // SUMMARY REPORT
  // ==========================================================================
  console.log(`\n${BOLD}====================================================================${RESET}`);
  console.log(`${BOLD}  ADVERSARIAL STRESS SUITE RESULTS SUMMARY                         ${RESET}`);
  console.log(`${BOLD}====================================================================${RESET}`);
  console.log(`  Total Tests Run:    ${stats.total}`);
  console.log(`  ${GREEN}Passed Tests:       ${stats.passed}${RESET}`);
  console.log(`  ${stats.failed > 0 ? RED : GREEN}Failed Tests:       ${stats.failed}${RESET}`);
  console.log(`${BOLD}====================================================================${RESET}\n`);

  if (stats.failed > 0) {
    console.log(`${RED}VERDICT: ADVERSARIAL SUITE ENCOUNTERED FAILURES${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}VERDICT: ALL ADVERSARIAL TESTS PASSED${RESET}`);
    process.exit(0);
  }
}

runAdversarialSuite().catch((err) => {
  console.error("Adversarial runner uncaught exception:", err);
  process.exit(1);
});
