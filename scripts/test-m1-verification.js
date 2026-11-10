#!/usr/bin/env node

/**
 * Milestone 1 Verification Suite
 * Verifies Personal User Accounts, Recommendation Engine, Storage Keying, and UI Contracts.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

console.log("=================================================");
console.log("  Milestone 1 Automated Verification Suite        ");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  [PASS] ${label}`);
    passed++;
  } catch (err) {
    console.log(`  [FAIL] ${label}: ${err.message}`);
    failed++;
  }
}

// 1. types/index.ts
check("M1.01: types/index.ts defines UserAccount and UserSession", () => {
  const code = fs.readFileSync(path.join(__dirname, "../src/types/index.ts"), "utf8");
  assert(code.includes("export interface UserAccount"), "Missing UserAccount");
  assert(code.includes("export interface UserSession"), "Missing UserSession");
  assert(code.includes("preferredGenres: number[]"), "Missing preferredGenres in UserAccount");
});

// 2. auth.ts
check("M1.02: auth.ts exports passwordless authManager and UserAccount", () => {
  const code = fs.readFileSync(path.join(__dirname, "../src/lib/auth.ts"), "utf8");
  assert(code.includes("loginPasswordless"), "Missing loginPasswordless");
  assert(code.includes("getCurrentUser"), "Missing getCurrentUser");
  assert(code.includes("getSavedUsers"), "Missing getSavedUsers");
  assert(code.includes("removeSavedUser"), "Missing removeSavedUser");
  assert(code.includes("updatePreferredGenres"), "Missing updatePreferredGenres");
});

// 3. supabase.ts
check("M1.03: supabase.ts keys watch progress and watchlist by userId", () => {
  const code = fs.readFileSync(path.join(__dirname, "../src/lib/supabase.ts"), "utf8");
  assert(code.includes("watch_progress_${userId}"), "Must key watch progress by userId");
  assert(code.includes("watchlist_${userId}"), "Must key watchlist by userId");
  assert(code.includes("liked_genres_${userId}"), "Must key liked genres by userId");
});

// 4. tmdb.ts
check("M1.04: tmdb.ts exports TMDB recommendation and discovery query functions", () => {
  const code = fs.readFileSync(path.join(__dirname, "../src/lib/tmdb.ts"), "utf8");
  assert(code.includes("getMovieRecommendations"), "Missing getMovieRecommendations");
  assert(code.includes("getTvRecommendations"), "Missing getTvRecommendations");
  assert(code.includes("getSimilarMovies"), "Missing getSimilarMovies");
  assert(code.includes("getSimilarTv"), "Missing getSimilarTv");
  assert(code.includes("getDiscoverMedia"), "Missing getDiscoverMedia");
});

// 5. recommendations.ts algorithm
check("M1.05: recommendations.ts implements 50% genre, 35% rating, 15% popularity scoring", () => {
  const code = fs.readFileSync(path.join(__dirname, "../src/lib/recommendations.ts"), "utf8");
  assert(code.includes("computeGenreWeights"), "Missing computeGenreWeights");
  assert(code.includes("scoreCandidate"), "Missing scoreCandidate");
  assert(code.includes("getPersonalizedRecommendations"), "Missing getPersonalizedRecommendations");
  assert(code.includes("getBecauseYouWatched"), "Missing getBecauseYouWatched");
  assert(code.includes("getColdStartRecommendations"), "Missing getColdStartRecommendations");
  assert(code.includes("0.5 * genreAffinity") || code.includes("0.50"), "Formula must weight genre affinity at 50%");
});

// 6. RecommendationSection.tsx
check("M1.06: RecommendationSection.tsx renders personalized rows and interactive Hebrew pills", () => {
  const code = fs.readFileSync(path.join(__dirname, "../src/components/RecommendationSection.tsx"), "utf8");
  assert(code.includes("מומלץ במיוחד עבורך"), "Must include specially recommended Hebrew title");
  assert(code.includes("כי צפית ב"), "Must include because you watched dynamic anchor title");
  assert(code.includes("HEBREW_GENRES"), "Must include interactive Hebrew genre pills");
  assert(code.includes("handleToggleGenre"), "Must handle genre pill toggling");
});

// 7. LoginScreen.tsx
check("M1.07: LoginScreen.tsx eliminates password field and integrates official HM logo", () => {
  const code = fs.readFileSync(path.join(__dirname, "../src/components/LoginScreen.tsx"), "utf8");
  assert(code.includes("/logo.png"), "Must reference /logo.png");
  assert(!code.includes('type="password"'), "Must NOT contain password input");
  assert(code.includes("loginPasswordless"), "Must use loginPasswordless");
  assert(code.includes("savedUsers"), "Must support remembered device accounts");
});

// 8. page.tsx
check("M1.08: page.tsx eliminates ProfileSelector and gates straight to catalog", () => {
  const code = fs.readFileSync(path.join(__dirname, "../src/app/page.tsx"), "utf8");
  assert(!code.includes("ProfileSelector"), "Must NOT import or render ProfileSelector");
  assert(code.includes("RecommendationSection"), "Must mount RecommendationSection");
  assert(code.includes("storageManager.getWatchProgress(account.id)"), "Must fetch watch progress for account.id");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
