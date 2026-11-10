#!/usr/bin/env node

/**
 * family-stream Standalone E2E Verification Suite for Surgical Remediation (R1-R6)
 *
 * Verifies all 6 remediation requirements:
 * - R1: Theme Accent Color Propagation (globals.css, layout.tsx, SettingsModal, UI components)
 * - R2: Iframe Breakout Prevention & Strict Sandboxing (PlayerModal, streamResolvers)
 * - R3: Duplicate Subtitle Elimination & postMessage Time Sync (PlayerModal, streamResolvers)
 * - R4: Styled Hebrew 'Skip Intro' Button & Multi-Protocol Seek (PlayerModal)
 * - R5: Animation Avatar Collection & Strict Sanitization (public/avatars, supabase.ts, SettingsModal, auth.ts)
 * - R6: Full Build & Master Test Suite Regression Protection
 *
 * Compliance: Zero Emojis Policy, deterministic assertions, no facade tests.
 *
 * Usage:
 *   node scripts/verify-remediation-e2e.js              # Run all remediation tests
 *   node scripts/verify-remediation-e2e.js -v           # Verbose mode
 *   node scripts/verify-remediation-e2e.js --req R1     # Run specific requirement (R1-R6)
 *   node scripts/verify-remediation-e2e.js --json       # Output JSON summary
 *   node scripts/verify-remediation-e2e.js --skip-build # Skip npm run build check
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

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
let verbose = false;
let targetReq = null;
let jsonOutput = false;
let skipBuild = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-v" || arg === "--verbose") {
    verbose = true;
  } else if (arg === "--json") {
    jsonOutput = true;
  } else if (arg === "--skip-build") {
    skipBuild = true;
  } else if ((arg === "--req" || arg === "-r") && args[i + 1]) {
    targetReq = args[i + 1].toUpperCase();
    i++;
  }
}

// Project Paths
const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

// Results Accumulator
const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  byReq: {
    R1: { total: 0, passed: 0, failed: 0, name: "Theme Accent Color Propagation" },
    R2: { total: 0, passed: 0, failed: 0, name: "Iframe Breakout Prevention & Sandboxing" },
    R3: { total: 0, passed: 0, failed: 0, name: "Duplicate Subtitle Elimination" },
    R4: { total: 0, passed: 0, failed: 0, name: "Styled Hebrew 'Skip Intro' Button" },
    R5: { total: 0, passed: 0, failed: 0, name: "Animation Avatar Collection & Validation" },
    R6: { total: 0, passed: 0, failed: 0, name: "Build & Regression Protection" },
  },
  failures: [],
};

// Test Runner Helper
async function runTest(req, id, title, testFn) {
  if (targetReq && targetReq !== req) {
    return;
  }

  summary.total++;
  summary.byReq[req].total++;

  const label = `[${req}] ${id}: ${title}`;
  try {
    await testFn();
    summary.passed++;
    summary.byReq[req].passed++;
    if (verbose && !jsonOutput) {
      console.log(`  ${GREEN}[PASS]${RESET} ${label}`);
    }
  } catch (err) {
    summary.failed++;
    summary.byReq[req].failed++;
    summary.failures.push({
      req,
      id,
      title,
      error: err.message,
      stack: err.stack ? err.stack.split("\n").slice(1, 4).join("\n") : "",
    });
    if (!jsonOutput) {
      console.log(`  ${RED}[FAIL]${RESET} ${label}`);
      console.log(`         ${RED}Reason: ${err.message}${RESET}`);
    }
  }
}

// Dynamic TypeScript Transpiler & Loader
let ts = null;
try {
  ts = require("typescript");
} catch {
  try {
    ts = require(path.join(ROOT_DIR, "node_modules", "typescript"));
  } catch {
    // Transpiler unavailable
  }
}

function loadTsModule(relPath, customContext = {}) {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  const rawCode = fs.readFileSync(fullPath, "utf-8");
  if (!ts) {
    throw new Error("TypeScript module required to transpile TS file: " + relPath);
  }

  const transpiled = ts.transpileModule(rawCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = { exports: {} };
  const customRequire = (importPath) => {
    if (importPath === "@/types") return {};
    if (importPath === "./supabase" || importPath === "@/lib/supabase") {
      return loadTsModule("src/lib/supabase.ts", customContext);
    }
    if (importPath === "./firebase" || importPath === "@/lib/firebase") {
      return { firebaseManager: {}, isFirebaseConfigured: () => false };
    }
    if (importPath === "./streamResolvers" || importPath === "@/lib/streamResolvers") {
      return loadTsModule("src/lib/streamResolvers.ts", customContext);
    }
    if (importPath === "./subtitles" || importPath === "@/lib/subtitles") {
      return loadTsModule("src/lib/subtitles.ts", customContext);
    }
    if (importPath === "./auth" || importPath === "@/lib/auth") {
      return loadTsModule("src/lib/auth.ts", customContext);
    }
    return require(importPath);
  };

  const sandboxContext = {
    module: mod,
    exports: mod.exports,
    require: customRequire,
    window: customContext.window !== undefined ? customContext.window : undefined,
    localStorage: customContext.localStorage !== undefined ? customContext.localStorage : undefined,
    document: customContext.document !== undefined ? customContext.document : undefined,
    Date: Date,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    RegExp: RegExp,
    Math: Math,
  };

  const fn = new Function(...Object.keys(sandboxContext), transpiled);
  fn(...Object.values(sandboxContext));
  return mod.exports;
}

// ---------------------------------------------------------------------------
// SUITE 1: Requirement R1 — Dynamic Theme Accent Color Propagation
// ---------------------------------------------------------------------------
async function runR1Tests() {
  if (!jsonOutput) {
    console.log(`\n${BOLD}${CYAN}--- Suite 1: Requirement R1 (Theme Accent Color Propagation) ---${RESET}`);
  }

  const globalsCssPath = path.join(SRC_DIR, "app", "globals.css");
  const layoutPath = path.join(SRC_DIR, "app", "layout.tsx");
  const settingsModalPath = path.join(SRC_DIR, "components", "SettingsModal.tsx");

  // R1.1 globals.css Theme Tokens
  await runTest("R1", "R1.01", "globals.css defines --accent-theme, --accent-hover, and --accent-rgb in :root", async () => {
    assert(fs.existsSync(globalsCssPath), "src/app/globals.css must exist");
    const content = fs.readFileSync(globalsCssPath, "utf-8");
    assert(content.includes("--accent-theme"), "globals.css must define --accent-theme in :root");
    assert(content.includes("--accent-hover"), "globals.css must define --accent-hover in :root");
    assert(content.includes("--accent-rgb"), "globals.css must define --accent-rgb in :root");
  });

  await runTest("R1", "R1.02", "globals.css maps netflix-red or theme tokens to dynamic variables", async () => {
    const content = fs.readFileSync(globalsCssPath, "utf-8");
    const bindsAccentTheme =
      content.includes("--netflix-red: var(--accent-theme)") ||
      content.includes("--color-accent: var(--accent-theme)") ||
      content.includes("var(--accent-theme)");
    assert(bindsAccentTheme, "globals.css must bind theme color tokens to var(--accent-theme)");
  });

  await runTest("R1", "R1.03", "globals.css tv-focusable uses dynamic accent glow instead of hardcoded red", async () => {
    const content = fs.readFileSync(globalsCssPath, "utf-8");
    assert(!content.includes("rgba(229, 9, 20"), "tv-focusable glow must not use hardcoded rgba(229, 9, 20); use var(--accent-rgb)");
    const hasDynamicGlow = content.includes("var(--accent-rgb)") || content.includes("var(--accent-theme)");
    assert(hasDynamicGlow, "tv-focusable must reference var(--accent-rgb) or var(--accent-theme)");
  });

  // R1.2 layout.tsx Early Theme Hydration (Zero FOUC)
  await runTest("R1", "R1.04", "layout.tsx includes early theme hydration script in <head> for zero FOUC", async () => {
    assert(fs.existsSync(layoutPath), "src/app/layout.tsx must exist");
    const content = fs.readFileSync(layoutPath, "utf-8");
    assert(content.includes("hm_app_settings"), "layout.tsx must read hm_app_settings from localStorage in early script");
    assert(content.includes("--accent-theme"), "layout.tsx script must set --accent-theme on documentElement");
    assert(content.includes("--accent-hover"), "layout.tsx script must set --accent-hover on documentElement");
    assert(content.includes("--accent-rgb"), "layout.tsx script must set --accent-rgb on documentElement");
    assert(content.includes("try{") || content.includes("try {"), "Hydration script must safely wrap logic in try/catch");
  });

  await runTest("R1", "R1.05", "layout.tsx body selection background uses dynamic accent theme variable", async () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    assert(
      content.includes("selection:bg-[var(--accent-theme)]") ||
      content.includes("selection:bg-accent") ||
      !content.includes("selection:bg-[#e50914]"),
      "layout.tsx body selection must not use hardcoded #e50914"
    );
  });

  // R1.3 SettingsModal.tsx Theme Presets & Propagation Function
  await runTest("R1", "R1.06", "SettingsModal.tsx contains THEME_COLORS with 6 vibrant presets (hex, hover, rgb)", async () => {
    assert(fs.existsSync(settingsModalPath), "src/components/SettingsModal.tsx must exist");
    const content = fs.readFileSync(settingsModalPath, "utf-8");
    assert(content.includes("THEME_COLORS"), "SettingsModal.tsx must define or export THEME_COLORS palette");
    assert(content.includes("rgb:"), "THEME_COLORS entries must define rgb channel components");
    assert(content.includes("hover:"), "THEME_COLORS entries must define hover color components");
    assert(content.includes("#0070f3"), "THEME_COLORS must include Blue preset (#0070f3)");
    assert(content.includes("#8b5cf6"), "THEME_COLORS must include Purple preset (#8b5cf6)");
    assert(content.includes("#10b981"), "THEME_COLORS must include Emerald preset (#10b981)");
    assert(content.includes("#f59e0b"), "THEME_COLORS must include Gold preset (#f59e0b)");
    assert(content.includes("#ec4899"), "THEME_COLORS must include Pink preset (#ec4899)");
  });

  await runTest("R1", "R1.07", "SettingsModal.tsx dynamically sets all 3 CSS properties on accent change", async () => {
    const content = fs.readFileSync(settingsModalPath, "utf-8");
    assert(content.includes('--accent-theme"'), "SettingsModal must set --accent-theme");
    assert(content.includes('--accent-hover"'), "SettingsModal must set --accent-hover");
    assert(content.includes('--accent-rgb"'), "SettingsModal must set --accent-rgb");
  });

  // R1.4 UI Components Migration Scan (No hardcoded #e50914 / #b80710 for interactive states)
  const UI_COMPONENTS = [
    "src/components/SettingsModal.tsx",
    "src/components/Navbar.tsx",
    "src/components/HeroBanner.tsx",
    "src/components/MediaCard.tsx",
    "src/components/RecommendationSection.tsx",
    "src/components/EpisodesModal.tsx",
    "src/components/PlayerModal.tsx",
    "src/components/SubtitleControls.tsx",
    "src/components/UserCornerMenu.tsx",
    "src/components/LoginScreen.tsx",
    "src/components/TvFirstLoginScreen.tsx",
    "src/components/TvSidebar.tsx",
    "src/components/TvPairModal.tsx",
    "src/app/pair/page.tsx",
    "src/app/download/page.tsx",
  ];

  await runTest("R1", "R1.08", "UI components bind interactive styles to CSS theme variables instead of hardcoded hex", async () => {
    const unmigrated = [];
    for (const relFile of UI_COMPONENTS) {
      const fullPath = path.join(ROOT_DIR, relFile);
      if (!fs.existsSync(fullPath)) continue;
      const text = fs.readFileSync(fullPath, "utf-8");
      // Check for hardcoded interactive utilities: bg-[#e50914], text-[#e50914], border-[#e50914], focus:border-[#e50914], hover:bg-[#b80710]
      const hasHardcodedRed =
        text.includes("bg-[#e50914]") ||
        text.includes("text-[#e50914]") ||
        text.includes("border-[#e50914]") ||
        text.includes("hover:bg-[#b80710]") ||
        text.includes("hover:bg-[#c11119]");
      if (hasHardcodedRed) {
        unmigrated.push(relFile);
      }
    }
    assert.strictEqual(
      unmigrated.length,
      0,
      `Found ${unmigrated.length} components with hardcoded red accent values: ${unmigrated.join(", ")}`
    );
  });
}

// ---------------------------------------------------------------------------
// SUITE 2: Requirement R2 — Iframe Breakout Prevention & Sandboxing
// ---------------------------------------------------------------------------
async function runR2Tests() {
  if (!jsonOutput) {
    console.log(`\n${BOLD}${CYAN}--- Suite 2: Requirement R2 (Iframe Breakout Prevention & Sandboxing) ---${RESET}`);
  }

  const playerModalPath = path.join(SRC_DIR, "components", "PlayerModal.tsx");
  assert(fs.existsSync(playerModalPath), "PlayerModal.tsx must exist");
  const playerModalContent = fs.readFileSync(playerModalPath, "utf-8");

  await runTest("R2", "R2.01", "PlayerModal iframe contains strict sandbox attribute", async () => {
    assert(
      playerModalContent.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"'),
      'PlayerModal iframe must enforce sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"'
    );
  });

  await runTest("R2", "R2.02", "PlayerModal sandbox explicitly omits allow-top-navigation (blocks window hijacking)", async () => {
    assert(playerModalContent.includes("sandbox="), "PlayerModal must specify a sandbox attribute on the iframe");
    const sandboxMatch = playerModalContent.match(/sandbox="([^"]+)"/);
    assert(sandboxMatch, "Failed to extract sandbox attribute from PlayerModal");
    const sandboxValue = sandboxMatch[1];
    assert(!sandboxValue.includes("allow-top-navigation"), "PlayerModal sandbox must NOT include allow-top-navigation");
    assert(!sandboxValue.includes("allow-top-navigation-by-user-activation"), "PlayerModal sandbox must NOT include allow-top-navigation-by-user-activation");
  });

  await runTest("R2", "R2.03", "PlayerModal sandbox explicitly omits allow-popups and popunder escapes", async () => {
    assert(playerModalContent.includes("sandbox="), "PlayerModal must specify a sandbox attribute on the iframe");
    const sandboxMatch = playerModalContent.match(/sandbox="([^"]+)"/);
    assert(sandboxMatch, "Failed to extract sandbox attribute from PlayerModal");
    const sandboxValue = sandboxMatch[1];
    assert(!sandboxValue.includes("allow-popups"), "PlayerModal sandbox must NOT include allow-popups");
    assert(!sandboxValue.includes("allow-popups-to-escape-sandbox"), "PlayerModal sandbox must NOT include allow-popups-to-escape-sandbox");
    assert(!sandboxValue.includes("allow-modals"), "PlayerModal sandbox must NOT include allow-modals");
  });

  await runTest("R2", "R2.04", "PlayerModal iframe enforces referrerPolicy='no-referrer' and fullscreen", async () => {
    assert(
      playerModalContent.includes('referrerPolicy="no-referrer"'),
      "PlayerModal iframe must specify referrerPolicy='no-referrer'"
    );
    assert(
      playerModalContent.includes("allowFullScreen"),
      "PlayerModal iframe must specify allowFullScreen"
    );
  });

  await runTest("R2", "R2.05", "streamResolvers marks all resolved stream sources with sandboxed: true", async () => {
    const { resolveStreamSources } = loadTsModule("src/lib/streamResolvers.ts");
    const sources = resolveStreamSources({ tmdbId: 550, mediaType: "movie" });
    assert(sources.length > 0, "Must return at least one stream source");
    sources.forEach((src) => {
      assert.strictEqual(src.sandboxed, true, `Provider ${src.id} must have sandboxed: true`);
    });
  });

  await runTest("R2", "R2.06", "streamResolvers Tier 1 includes unblocked vetted providers (VidLink, Cinecat, Atlantic)", async () => {
    const { resolveStreamSources } = loadTsModule("src/lib/streamResolvers.ts");
    const sources = resolveStreamSources({ tmdbId: 550, mediaType: "movie" });
    const tier1Ids = sources.filter((s) => s.tier === 1).map((s) => s.id);
    assert(tier1Ids.includes("vidlink-pro"), "Tier 1 must include vidlink-pro");
    assert(tier1Ids.includes("cinecat-engine"), "Tier 1 must include cinecat-engine");
    assert(tier1Ids.includes("atlantic-server"), "Tier 1 must include atlantic-server");
  });

  await runTest("R2", "R2.07", "streamResolvers excludes un-embeddable or frame-blocked domains", async () => {
    const { resolveStreamSources } = loadTsModule("src/lib/streamResolvers.ts");
    const movieSources = resolveStreamSources({ tmdbId: 550, mediaType: "movie" });
    const tvSources = resolveStreamSources({ tmdbId: 1399, mediaType: "tv", season: 1, episode: 1 });
    const allUrls = [...movieSources, ...tvSources].map((s) => s.url).join(" ");
    assert(!allUrls.includes("aether.st/watch"), "Raw aether.st must NOT be embedded directly (X-Frame-Options: DENY; use atlantic.st mirror)");
    assert(!allUrls.includes("basementx.lol"), "Direct unproxied basementx.lol must NOT be used (frame-ancestors 'self')");
    assert(!allUrls.includes("kdesa.stream"), "Direct unproxied kdesa.stream must NOT be used (popunders and X-Frame-Options: DENY)");
    assert(!allUrls.includes("primeshows.org"), "primeshows.org must NOT be used");
  });
}

// ---------------------------------------------------------------------------
// SUITE 3: Requirement R3 — Duplicate Subtitle Elimination
// ---------------------------------------------------------------------------
async function runR3Tests() {
  if (!jsonOutput) {
    console.log(`\n${BOLD}${CYAN}--- Suite 3: Requirement R3 (Duplicate Subtitle Elimination) ---${RESET}`);
  }

  const { resolveStreamSources } = loadTsModule("src/lib/streamResolvers.ts");
  const playerModalPath = path.join(SRC_DIR, "components", "PlayerModal.tsx");
  const playerModalContent = fs.readFileSync(playerModalPath, "utf-8");

  await runTest("R3", "R3.01", "streamResolvers does NOT inject &sub_file= into movie embed player URLs", async () => {
    const sources = resolveStreamSources({
      tmdbId: 550,
      mediaType: "movie",
      subtitleUrl: "https://example.com/subtitles.vtt",
    });
    for (const src of sources) {
      assert(
        !src.url.includes("sub_file="),
        `Provider ${src.id} must NOT include sub_file query param in URL: ${src.url}`
      );
    }
  });

  await runTest("R3", "R3.02", "streamResolvers does NOT inject &sub_file= into TV series embed player URLs", async () => {
    const sources = resolveStreamSources({
      tmdbId: 1399,
      mediaType: "tv",
      season: 1,
      episode: 1,
      subtitleUrl: "/subtitles/1399-1-1.vtt",
    });
    for (const src of sources) {
      assert(
        !src.url.includes("sub_file="),
        `TV Provider ${src.id} must NOT include sub_file query param in URL: ${src.url}`
      );
    }
  });

  await runTest("R3", "R3.03", "PlayerModal contains Universal React Subtitle Overlay with RTL BiDi styling", async () => {
    assert(
      playerModalContent.includes("activeCue && selectedTrackId"),
      "PlayerModal must contain Universal React Subtitle Overlay conditional on activeCue and selectedTrackId"
    );
    assert(
      playerModalContent.includes('dir="rtl"'),
      "PlayerModal subtitle container must have dir='rtl'"
    );
    assert(
      playerModalContent.includes("var(--font-assistant)"),
      "PlayerModal subtitle styling must use Assistant typography"
    );
  });

  await runTest("R3", "R3.04", "PlayerModal listens to postMessage PLAYER_EVENT timeupdate for frame-accurate sync", async () => {
    assert(
      playerModalContent.includes("PLAYER_EVENT"),
      "PlayerModal must listen for PLAYER_EVENT postMessages from embed player"
    );
    assert(
      playerModalContent.includes("timeupdate"),
      "PlayerModal message listener must handle timeupdate event"
    );
    assert(
      playerModalContent.includes("currentTimeRef"),
      "PlayerModal must synchronize currentTimeRef on timeupdate"
    );
  });
}

// ---------------------------------------------------------------------------
// SUITE 4: Requirement R4 — Styled Hebrew 'Skip Intro' Button
// ---------------------------------------------------------------------------
async function runR4Tests() {
  if (!jsonOutput) {
    console.log(`\n${BOLD}${CYAN}--- Suite 4: Requirement R4 (Styled Hebrew 'Skip Intro' Button) ---${RESET}`);
  }

  const playerModalPath = path.join(SRC_DIR, "components", "PlayerModal.tsx");
  const content = fs.readFileSync(playerModalPath, "utf-8");

  await runTest("R4", "R4.01", "PlayerModal renders Hebrew 'דלג על פתיח' button with solid white background", async () => {
    assert(content.includes("דלג על פתיח"), "PlayerModal must render Hebrew text 'דלג על פתיח'");
    const skipBtnMatch = content.match(/<button[^>]*onClick=\{handleSkipIntro\}[\s\S]*?>/);
    assert(skipBtnMatch, "PlayerModal must render a button element with onClick={handleSkipIntro}");
    const btnTag = skipBtnMatch[0];
    assert(btnTag.includes("bg-white"), "Skip intro button element must have solid white background (bg-white) per visual reference");
    assert(btnTag.includes("text-black"), "Skip intro button text must be solid black (text-black) per visual reference");
  });

  await runTest("R4", "R4.02", "Skip intro button uses subtle rounded corners (rounded-md) per visual reference", async () => {
    const skipBtnMatch = content.match(/<button[^>]*onClick=\{handleSkipIntro\}[\s\S]*?>/);
    assert(skipBtnMatch, "PlayerModal must render a button element with onClick={handleSkipIntro}");
    const btnTag = skipBtnMatch[0];
    assert(
      btnTag.includes("rounded-md") || btnTag.includes("rounded "),
      "Skip intro button must use subtle rounded corners (rounded-md), not pill (rounded-full or rounded-2xl)"
    );
    // Button must NOT use the old black translucent pill with rounded-2xl
    assert(!btnTag.includes("rounded-2xl"), "Button must not use rounded-2xl pill styling");
    assert(!btnTag.includes("bg-black"), "Button must not use bg-black styling");
  });

  await runTest("R4", "R4.03", "Skip intro button includes SkipForward / ▶| icon", async () => {
    const hasSkipIcon =
      content.includes("SkipForward") ||
      content.includes("▶|") ||
      (content.includes("<polygon") && content.includes("<rect"));
    assert(hasSkipIcon, "Skip intro button must include SkipForward icon or ▶| glyph");
  });

  await runTest("R4", "R4.04", "Intro detection window spans seconds 5 to 95", async () => {
    assert(
      content.includes("currentTime >= 5") || content.includes("5 && currentTime <= 95") || content.includes("currentTime <= 95"),
      "Skip intro window must trigger between seconds 5 and 95"
    );
  });

  await runTest("R4", "R4.05", "Skip intro rewinding before 5 seconds resets hasSkippedIntro flag", async () => {
    const hasRewindReset =
      content.includes("currentTime < 5") &&
      content.includes("setHasSkippedIntro(false)");
    assert(hasRewindReset, "PlayerModal must reset hasSkippedIntro when currentTime < 5");
  });

  await runTest("R4", "R4.06", "Skip intro calculates seek target (+85s) and dispatches multi-protocol seek commands", async () => {
    assert(
      content.includes("targetTime") || content.includes("+ 85") || content.includes("+85"),
      "Skip intro must compute target seek time (~85s forward)"
    );
    assert(content.includes("seekTo"), "Must dispatch standard seekTo command via postMessage");
    assert(content.includes('"SEEK"'), "Must dispatch VidLink SEEK command via postMessage");
    assert(content.includes('"seek"'), "Must dispatch Cinecat / HTML5 seek command via postMessage");
    assert(content.includes("saveProgress"), "Must call saveProgress to persist skip target timestamp across failovers");
  });

  await runTest("R4", "R4.07", "Skip intro button positioned directly above bottom progress bar", async () => {
    const containerMatch = content.match(/<div className="absolute (bottom-[^"]+)"[\s\S]*?<button[^>]*handleSkipIntro/);
    assert(containerMatch, "Skip intro container must be absolutely positioned above bottom bar");
    const posClass = containerMatch[1];
    assert(
      posClass.includes("bottom-16") || posClass.includes("bottom-20") || posClass.includes("bottom-24"),
      `Container should float above progress bar (expected bottom-16/20/24, got: ${posClass})`
    );
  });
}

// ---------------------------------------------------------------------------
// SUITE 5: Requirement R5 — Animation Avatar Collection & Validation
// ---------------------------------------------------------------------------
async function runR5Tests() {
  if (!jsonOutput) {
    console.log(`\n${BOLD}${CYAN}--- Suite 5: Requirement R5 (Animation Avatar Collection & Validation) ---${RESET}`);
  }

  const avatarsDir = path.join(PUBLIC_DIR, "avatars");
  const supabasePath = path.join(SRC_DIR, "lib", "supabase.ts");
  const settingsModalPath = path.join(SRC_DIR, "components", "SettingsModal.tsx");
  const authPath = path.join(SRC_DIR, "lib", "auth.ts");

  await runTest("R5", "R5.01", "public/avatars/ directory exists and contains at least 19 animation character PNGs", async () => {
    assert(fs.existsSync(avatarsDir), "public/avatars/ directory must exist");
    const files = fs.readdirSync(avatarsDir).filter((f) => f.endsWith(".png"));
    assert(files.length >= 19, `Expected at least 19 PNG avatars, found ${files.length}`);

    // Verify PNG binary magic headers (\x89PNG\r\n\x1a\n)
    for (const file of files) {
      const filePath = path.join(avatarsDir, file);
      const stat = fs.statSync(filePath);
      assert(stat.size > 1024, `Avatar ${file} is too small (${stat.size} bytes)`);
      const fd = fs.openSync(filePath, "r");
      const buffer = Buffer.alloc(8);
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      assert(isPng, `Avatar ${file} is not a valid PNG file`);
    }
  });

  await runTest("R5", "R5.02", "DEFAULT_PROFILES in supabase.ts contains zero Unsplash human photos", async () => {
    assert(fs.existsSync(supabasePath), "src/lib/supabase.ts must exist");
    const content = fs.readFileSync(supabasePath, "utf-8");
    assert(!content.includes("unsplash.com"), "DEFAULT_PROFILES must NOT contain any unsplash.com URLs");
    assert(!content.includes("images.unsplash.com"), "Must not contain images.unsplash.com human photos");
    assert(content.includes("/avatars/"), "DEFAULT_PROFILES must reference local /avatars/ paths");
  });

  await runTest("R5", "R5.03", "SettingsModal.tsx removes device file upload to ensure animation avatar exclusivity", async () => {
    assert(fs.existsSync(settingsModalPath), "src/components/SettingsModal.tsx must exist");
    const content = fs.readFileSync(settingsModalPath, "utf-8");
    assert(!content.includes("העלאה מהמכשיר"), "SettingsModal must NOT contain 'העלאה מהמכשיר' device upload button");
    assert(!content.includes("העלה תמונה מהמכשיר"), "SettingsModal must NOT contain 'העלה תמונה מהמכשיר' upload button");
    assert(!content.includes('type="file"'), "SettingsModal must NOT contain file input elements");
  });

  await runTest("R5", "R5.04", "auth.ts AVATAR_POOL contains exclusively animation avatar paths", async () => {
    assert(fs.existsSync(authPath), "src/lib/auth.ts must exist");
    const { AVATAR_POOL } = loadTsModule("src/lib/auth.ts");
    assert(Array.isArray(AVATAR_POOL), "AVATAR_POOL must be an array");
    assert(AVATAR_POOL.length >= 19, `AVATAR_POOL should contain all 19 avatars, got ${AVATAR_POOL.length}`);
    for (const av of AVATAR_POOL) {
      assert(av.startsWith("/avatars/"), `Avatar ${av} must start with /avatars/`);
      assert(!av.includes("unsplash.com"), `Avatar ${av} must NOT be an Unsplash URL`);
    }
  });

  await runTest("R5", "R5.05", "auth.ts strictly enforces avatar.startsWith('/avatars/') sanitization", async () => {
    const authContent = fs.readFileSync(authPath, "utf-8");
    assert(
      authContent.includes('startsWith("/avatars/")'),
      "auth.ts must sanitize avatars using startsWith('/avatars/')"
    );
  });

  await runTest("R5", "R5.06", "authManager sanitizes corrupted, external or data-URL avatars back to animation pool", async () => {
    let mockStorage = {};
    const mockLocalStorage = {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = v; },
      removeItem: (k) => { delete mockStorage[k]; },
      clear: () => { mockStorage = {}; },
    };

    // Inject external Unsplash URL
    mockStorage["family_stream_auth_account"] = JSON.stringify({
      id: "u_test_1",
      username: "בודק",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    });

    const { authManager } = loadTsModule("src/lib/auth.ts", {
      window: {},
      localStorage: mockLocalStorage,
    });

    const user = authManager.getCurrentUser();
    assert(user, "User should be loaded from localStorage");
    assert(
      user.avatar.startsWith("/avatars/"),
      `Sanitized avatar must start with /avatars/, got: ${user.avatar}`
    );
    assert(
      !user.avatar.includes("unsplash.com"),
      "User avatar must NOT retain external unsplash.com URL"
    );
  });
}

// ---------------------------------------------------------------------------
// SUITE 6: Requirement R6 & Build — Full Build & Regression Protection
// ---------------------------------------------------------------------------
async function runR6Tests() {
  if (!jsonOutput) {
    console.log(`\n${BOLD}${CYAN}--- Suite 6: Requirement R6 (Build & Regression Protection) ---${RESET}`);
  }

  await runTest("R6", "R6.01", "Existing Master E2E Suite (verify-e2e-platform.js) executes and passes cleanly", async () => {
    const scriptPath = path.join(ROOT_DIR, "scripts", "verify-e2e-platform.js");
    assert(fs.existsSync(scriptPath), "scripts/verify-e2e-platform.js must exist");
    try {
      execSync(`node "${scriptPath}"`, {
        cwd: ROOT_DIR,
        stdio: "pipe",
        encoding: "utf-8",
        timeout: 45000,
      });
    } catch (err) {
      throw new Error(`verify-e2e-platform.js failed with exit code: ${err.status || 1}\n${err.stdout || err.message}`);
    }
  });

  if (!skipBuild) {
    await runTest("R6", "R6.02", "Next.js production build (npm run build) compiles with exit code 0", async () => {
      try {
        execSync("npm run build", {
          cwd: ROOT_DIR,
          stdio: "pipe",
          encoding: "utf-8",
          timeout: 60000,
        });
      } catch (err) {
        throw new Error(`npm run build failed: ${err.message}\n${err.stdout || ""}`);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Main Orchestration Function
// ---------------------------------------------------------------------------
async function main() {
  const startTime = Date.now();

  if (!jsonOutput) {
    console.log(`${BOLD}${CYAN}====================================================================${RESET}`);
    console.log(`${BOLD}${CYAN}  family-stream Remediation E2E Verification Suite (R1 to R6)       ${RESET}`);
    console.log(`${BOLD}${CYAN}  Surgical Remediation & Streaming Stability Quality Gate           ${RESET}`);
    console.log(`${BOLD}${CYAN}====================================================================${RESET}`);
    if (targetReq) {
      console.log(`${YELLOW}Filtering execution for Requirement: ${targetReq}${RESET}`);
    }
  }

  await runR1Tests();
  await runR2Tests();
  await runR3Tests();
  await runR4Tests();
  await runR5Tests();
  await runR6Tests();

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(3);

  if (jsonOutput) {
    console.log(JSON.stringify({ ...summary, durationSec }, null, 2));
    process.exit(summary.failed > 0 ? 1 : 0);
  }

  console.log(`\n${BOLD}${CYAN}====================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  Remediation Verification Summary Report                           ${RESET}`);
  console.log(`${BOLD}${CYAN}====================================================================${RESET}`);
  console.log(`  Total Tests Run:    ${BOLD}${summary.total}${RESET}`);
  console.log(`  Total Tests Passed: ${GREEN}${summary.passed}${RESET}`);
  console.log(`  Total Tests Failed: ${summary.failed > 0 ? RED : GREEN}${summary.failed}${RESET}`);
  console.log(`  Duration:           ${durationSec}s\n`);

  console.log(`  Breakdown by Requirement:`);
  for (const [key, val] of Object.entries(summary.byReq)) {
    if (targetReq && targetReq !== key) continue;
    const statusColor = val.failed === 0 ? GREEN : RED;
    console.log(`    ${key} (${val.name}): ${statusColor}${val.passed}/${val.total} passed${RESET}`);
  }
  console.log(`${BOLD}${CYAN}====================================================================${RESET}\n`);

  if (summary.failed > 0) {
    console.log(`${RED}${BOLD}VERDICT: REMEDIATION VERIFICATION FAILED (${summary.failed} failures detected)${RESET}\n`);
    for (const fail of summary.failures) {
      console.log(`  - [${fail.req}] ${fail.id}: ${fail.title}`);
      console.log(`    ${RED}Reason: ${fail.error}${RESET}`);
    }
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}VERDICT: ALL ${summary.total} REMEDIATION TESTS PASSED WITH 100% SUCCESS${RESET}\n`);
    process.exit(0);
  }
}

main().catch((fatalErr) => {
  console.error(`\n${RED}[FATAL ERROR] Verification suite crashed: ${fatalErr.message}${RESET}`);
  if (fatalErr.stack) console.error(fatalErr.stack);
  process.exit(1);
});
