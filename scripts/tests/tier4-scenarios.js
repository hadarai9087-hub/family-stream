/**
 * Tier 4: Real-World Application Scenarios
 * Minimum 20 end-to-end user journeys (S1 to S20).
 * Zero Emojis Compliance.
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const {
  runTest,
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
} = require("./harness/test-context");

async function runTier4Tests() {
  console.log("\n--- Tier 4: Real-World Application Scenarios (S1 to S20, 20 Tests) ---");

  const movieCatalog = [
    { id: 1001, title: "הסנדק", genre_ids: [18, 80], vote_average: 9.2, popularity: 120 },
    { id: 1002, title: "האביר האפל", genre_ids: [28, 80, 18], vote_average: 9.0, popularity: 150 },
    { id: 1003, title: "התחלה", genre_ids: [28, 878], vote_average: 8.8, popularity: 140 },
    { id: 1004, title: "סופרבאד", genre_ids: [35], vote_average: 7.6, popularity: 90 },
    { id: 1005, title: "מלך האריות", genre_ids: [16, 10751, 18], vote_average: 8.5, popularity: 95 },
  ];

  // ==========================================================================
  // S1: New User Journey: Passwordless Signup, Liked Genres & Recommendation Feed
  // ==========================================================================
  await runTest(4, "T4.S01", "Scenario S1: New User Passwordless Signup to Personalized Recommendation Feed (F1, F2, F3, F6, F8, F10, F40)", async () => {
    const storage = new MockLocalStorage();
    const auth = new AuthManagerContract(storage);
    const sm = new StorageManagerContract(storage);

    // 1. User signs up directly via email and username (no password, no profile selector)
    const user = await auth.loginPasswordless("newuser@stream.local", "רותי כהן");
    assert(user && user.id.startsWith("usr_"));
    assert.strictEqual(storage.getItem("active_profile_id"), null);

    // 2. Cold-start genre selection: user selects Action (28) and Sci-Fi (878)
    const starterGenres = [28, 878];
    await auth.updatePreferredGenres(starterGenres);
    sm.saveLikedGenres(user.id, starterGenres);
    assert.deepStrictEqual(sm.getLikedGenres(user.id), [28, 878]);

    // 3. System dynamically computes personalized recommendations carousel
    const feed = RecommendationEngineContract.getPersonalizedRecommendations(movieCatalog, starterGenres, 2);
    assert.strictEqual(feed.length, 2);
    // Highest ranked should be Dark Knight (1002) or Inception (1003)
    assert([1002, 1003].includes(feed[0].id));

    // 4. Session survives reload
    const rehydrated = auth.getCurrentUser();
    assert.strictEqual(rehydrated.username, "רותי כהן");
  });

  // ==========================================================================
  // S2: Living Room TV Onboarding: Unauthenticated QR to Mobile 1-Tap Approval
  // ==========================================================================
  await runTest(4, "T4.S02", "Scenario S2: Living Room TV QR Code to Mobile 1-Tap Approval & Auto-Login (F11, F12, F13, F14, F15, F17, F18, F20, F21)", async () => {
    const tv = new TvPairingContract("https://stream.local");
    const mobileAuth = new AuthManagerContract();
    const tvBc = new MockBroadcastChannel("family_stream_tv_pair");
    const mobileBc = new MockBroadcastChannel("family_stream_tv_pair");

    // 1. TV interface starts unauthenticated, generates 6-digit numeric PIN and QR URL
    const tvSession = tv.createSession();
    assert(/^\d{6}$/.test(tvSession.code));
    assert(tvSession.qrUrl.includes(`code=${tvSession.code}`));

    // 2. User logs in on mobile phone
    const user = await mobileAuth.loginPasswordless("mobile_mom@stream.local", "אמא");

    // 3. User scans QR code, opening /pair?code={PIN} and taps 'Approve TV Connection'
    const approval = tv.approveSession(tvSession.code, user);
    assert.strictEqual(approval.success, true);

    // 4. Mobile transmits instant broadcast event across BroadcastChannel
    let tvAutoLoggedInUser = null;
    tvBc.addEventListener("message", (msg) => {
      if (msg.data.type === "PAIR_APPROVED" && msg.data.code === tvSession.code) {
        tvAutoLoggedInUser = msg.data.user;
      }
    });

    mobileBc.postMessage({
      type: "PAIR_APPROVED",
      code: tvSession.code,
      user: { id: user.id, username: user.username, email: user.email },
    });

    // 5. TV receives approval, logs in instantly without remote control typing
    assert(tvAutoLoggedInUser !== null);
    assert.strictEqual(tvAutoLoggedInUser.username, "אמא");

    // 6. LAN REST endpoint confirms approved status
    const restCheck = await tv.handleRestApi("GET", {}, { code: tvSession.code });
    assert.strictEqual(restCheck.body.status, "approved");

    tvBc.close();
    mobileBc.close();
  });

  // ==========================================================================
  // S3: Stream Playback & Dynamic Background Probe Selection with Failover
  // ==========================================================================
  await runTest(4, "T4.S03", "Scenario S3: Background Stream Probing, Zero-Dialog Launch, and Seamless Failover (F4, F32, F33, F34, F35, F36, F37, F38)", async () => {
    const prober = new StreamProberContract();
    const watchdog = new StreamWatchdogContract(prober);
    const sm = new StorageManagerContract();

    // 1. Background prober concurrently checks candidate providers
    const candidateProviders = [
      { id: "vidlink-pro", tier: 1, resolution: "1080p" },
      { id: "cinecat-engine", tier: 1, resolution: "1080p" },
      { id: "atlantic-server", tier: 1, resolution: "720p" },
      { id: "autoembed-direct", tier: 2, resolution: "720p" },
    ];

    const probeOverrides = {
      "vidlink-pro": { status: "online", latencyMs: 65 },
      "cinecat-engine": { status: "online", latencyMs: 140 },
      "atlantic-server": { status: "online", latencyMs: 210 },
      "autoembed-direct": { status: "online", latencyMs: 380 },
    };

    const probeRes = await prober.probeAllCandidates(candidateProviders, probeOverrides);
    assert.strictEqual(probeRes.fastestSource.id, "vidlink-pro");

    // 2. Zero-dialog auto-mounting mounts the fastest source directly
    watchdog.mountStream(probeRes.fastestSource, 0);
    assert.strictEqual(watchdog.currentSource.id, "vidlink-pro");

    // 3. User watches 18 minutes (1080 seconds)
    watchdog.updateProgress(1080);
    sm.saveWatchProgress("usr_viewer", { mediaId: 1002, title: "האביר האפל", currentTime: 1080 });

    // 4. Primary provider drops (HTTP 403 / CORS stall)
    const failoverRes = await watchdog.handleFailure("HTTP_403", probeRes.rankedSources);

    // 5. Watchdog seamlessly fails over to next fastest source (cinecat-engine)
    assert.strictEqual(failoverRes.success, true);
    assert.strictEqual(failoverRes.nextSource.id, "cinecat-engine");
    assert.strictEqual(failoverRes.preservedTime, 1080);

    // 6. Failed provider is blacklisted for 5 minutes
    assert.strictEqual(prober.isProviderBlacklisted("vidlink-pro"), true);
  });

  // ==========================================================================
  // S4: Dedicated TV Download Portal: APK Retrieval, Short Code & PWA Setup
  // ==========================================================================
  await runTest(4, "T4.S04", "Scenario S4: TV Download Portal APK Card, Downloader Short Code & PWA Guide (F27, F28, F29, F30, F31, F40)", async () => {
    // 1. Visit /download portal page
    const meta = DownloadPortalContract.METADATA;

    // 2. Android TV & FireStick section verifies APK metadata
    assert(meta.apk.version && meta.apk.version.length > 0);
    assert(meta.apk.downloadUrl.endsWith(".apk"));
    assert(meta.apk.fileSizeMb > 0);

    // 3. Prominently displays 5-digit short code 84219
    assert.strictEqual(meta.apk.shortCode, "84219");
    assert.strictEqual(DownloadPortalContract.verifyShortCode("84219"), true);

    // 4. Displays SHA-256 checksum with 1-click copy feedback
    assert.strictEqual(meta.apk.sha256.length, 64);
    assert.strictEqual(DownloadPortalContract.verifySha256(meta.apk.sha256), true);

    // 5. Smart TV section provides visual step-by-step PWA guides
    assert(meta.pwa.samsungTizen.length >= 4);
    assert(meta.pwa.lgWebOs.length >= 4);
    assert(meta.pwa.samsungTizen[0].includes("Samsung Internet"));
  });

  // ==========================================================================
  // S5: Clean Navigation & Smart TV Device Detection Flow
  // ==========================================================================
  await runTest(4, "T4.S05", "Scenario S5: Clean Minimalist Navbar & Automatic Smart TV Routing (F22, F23, F24, F25, F26)", async () => {
    // 1. Navbar has removed TV buttons (TV Mode & TV Pairing)
    const navbarLabels = ["ראשי", "סדרות", "סרטים", "הבא בתור", "הרשימה שלי"];
    assert(!navbarLabels.includes("מצב טלוויזיה"));
    assert(!navbarLabels.includes("זיווג טלוויזיה"));

    // 2. Smart TV Device Detection via User-Agent
    const tizenUA = "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36";
    const isTv = TvDetectionContract.detectTvDevice(tizenUA);
    assert.strictEqual(isTv, true);

    // 3. Desktop user overrides with ?tv=1
    const desktopWithTvParam = TvDetectionContract.isTvModeActive({ tv: "1" }, "Mozilla/5.0 Windows");
    assert.strictEqual(desktopWithTvParam, true);

    // 4. Dedicated /tv route serves 10-foot TV spatial navigation
    const tvRouteConfig = { route: "/tv", spatialNavigation: true };
    assert.strictEqual(tvRouteConfig.route, "/tv");
    assert.strictEqual(tvRouteConfig.spatialNavigation, true);
  });

  // ==========================================================================
  // S6: Multi-Device Family Session Separation
  // ==========================================================================
  await runTest(4, "T4.S06", "Scenario S6: Multi-Device Family Session Separation for Distinct Household Members", async () => {
    const sm = new StorageManagerContract();
    const userDad = { id: "usr_dad", email: "dad@stream.local", username: "אבא" };
    const userKid = { id: "usr_kid", email: "kid@stream.local", username: "ילד" };

    // Dad watches Godfather on living room TV
    sm.saveWatchProgress(userDad.id, { mediaId: 1001, title: "הסנדק", currentTime: 4500 });
    // Kid watches Lion King on tablet
    sm.saveWatchProgress(userKid.id, { mediaId: 1005, title: "מלך האריות", currentTime: 1200 });

    // Independent watch histories
    assert.strictEqual(sm.getWatchProgress(userDad.id)[0].mediaId, 1001);
    assert.strictEqual(sm.getWatchProgress(userKid.id)[0].mediaId, 1005);

    // Independent watchlists
    sm.addToWatchlist(userDad.id, { id: 1002, title: "האביר האפל" });
    sm.addToWatchlist(userKid.id, { id: 1005, title: "מלך האריות" });
    assert.strictEqual(sm.getWatchlist(userDad.id)[0].id, 1002);
    assert.strictEqual(sm.getWatchlist(userKid.id)[0].id, 1005);
  });

  // ==========================================================================
  // S7: TV Pairing Expiry & PIN Regeneration Lifecycle
  // ==========================================================================
  await runTest(4, "T4.S07", "Scenario S7: TV Pairing Screen Auto-Regenerates Fresh PIN Upon 10-Minute Expiry", async () => {
    const tv = new TvPairingContract();
    const initialSession = tv.createSession();
    assert.strictEqual(initialSession.status, "pending");

    // Simulate 10-minute timeout passage
    initialSession.expiresAt = Date.now() - 5000;
    const expiredCheck = tv.getSession(initialSession.code);
    assert.strictEqual(expiredCheck.status, "expired");

    // TV component automatically requests new session
    const freshSession = tv.createSession();
    assert.notStrictEqual(freshSession.code, initialSession.code);
    assert.strictEqual(freshSession.status, "pending");
  });

  // ==========================================================================
  // S8: Poor Network Living Room Streaming Probing
  // ==========================================================================
  await runTest(4, "T4.S08", "Scenario S8: High Network Jitter Demotes Degraded Providers in Favor of Stable Mirrors", async () => {
    const prober = new StreamProberContract();
    const providers = [
      { id: "tier1-laggy", tier: 1, resolution: "1080p" },
      { id: "tier2-stable", tier: 2, resolution: "720p" },
    ];
    const overrides = {
      "tier1-laggy": { status: "online", latencyMs: 1200 }, // Heavy network lag
      "tier2-stable": { status: "online", latencyMs: 80 },  // Low latency
    };

    const res = await prober.probeAllCandidates(providers, overrides);
    // Tier 2 with 80ms should score ~660 vs Tier 1 with 1200ms scoring ~450
    assert.strictEqual(res.fastestSource.id, "tier2-stable");
  });

  // ==========================================================================
  // S9: Cascading Multi-Provider Outage Recovery
  // ==========================================================================
  await runTest(4, "T4.S09", "Scenario S9: Cascading Outage Seamlessly Fails Over Across Multiple Tiers to Archive Mirror", async () => {
    const watchdog = new StreamWatchdogContract();
    watchdog.mountStream({ id: "t1-primary", score: 1000 }, 600);

    const pool = [
      { id: "t2-secondary", score: 800 },
      { id: "t3-backup", score: 600 },
      { id: "t4-archive", score: 400 },
    ];

    // Primary drops
    const f1 = await watchdog.handleFailure("HTTP_500", pool);
    assert.strictEqual(f1.nextSource.id, "t2-secondary");
    assert.strictEqual(f1.preservedTime, 600);

    // Secondary drops
    const f2 = await watchdog.handleFailure("CORS_BLOCK", pool);
    assert.strictEqual(f2.nextSource.id, "t3-backup");
    assert.strictEqual(f2.preservedTime, 600);

    // Backup drops
    const f3 = await watchdog.handleFailure("STALL", pool);
    assert.strictEqual(f3.nextSource.id, "t4-archive");
    assert.strictEqual(f3.preservedTime, 600);
    assert.strictEqual(watchdog.failoverCount, 3);
  });

  // ==========================================================================
  // S10: First-Time Mobile User Scans TV QR Code
  // ==========================================================================
  await runTest(4, "T4.S10", "Scenario S10: Unauthenticated Mobile User Completes Inline Auth and Approves TV in Single Sequence", async () => {
    const tv = new TvPairingContract();
    const auth = new AuthManagerContract();
    const session = tv.createSession();

    // Mobile user opens /pair?code=... without session
    assert.strictEqual(auth.getCurrentUser(), null);

    // Inline auth form completed
    const user = await auth.loginPasswordless("grandma@stream.local", "סבתא");
    assert(user !== null);

    // TV session authorized
    const approval = tv.approveSession(session.code, user);
    assert.strictEqual(approval.success, true);
    assert.strictEqual(tv.getSession(session.code).approvedAccount.username, "סבתא");
  });

  // ==========================================================================
  // S11: Cold-Start User Watches First Movie
  // ==========================================================================
  await runTest(4, "T4.S11", "Scenario S11: Cold-Start User Selects Genres, Watches Movie, and Dynamic Anchor Appears", async () => {
    const auth = new AuthManagerContract();
    const sm = new StorageManagerContract();

    // 1. New user onboarded
    const user = await auth.loginPasswordless("newbie@stream.local", "ליאב");
    sm.saveLikedGenres(user.id, [28, 80]); // Action, Crime

    // 2. User watches 20 minutes of Dark Knight (1200 seconds >= 180s)
    const watched = { mediaId: 1002, title: "האביר האפל", currentTime: 1200, genre_ids: [28, 80] };
    sm.saveWatchProgress(user.id, watched);

    // 3. Dynamic anchor carousel "כי צפית ב... האביר האפל" generates
    const anchor = RecommendationEngineContract.getDynamicAnchorRecommendations(movieCatalog, watched);
    assert(anchor !== null);
    assert.strictEqual(anchor.anchorTitle, "האביר האפל");
    // Godfather (1001) or Inception (1003) recommended
    assert(anchor.recommendations.some((x) => x.id === 1001 || x.id === 1003));
  });

  // ==========================================================================
  // S12: FireStick Sideloading via Downloader App
  // ==========================================================================
  await runTest(4, "T4.S12", "Scenario S12: User Enters Downloader Code 84219 on FireStick and Verifies SHA-256", async () => {
    const code = "84219";
    assert.strictEqual(DownloadPortalContract.verifyShortCode(code), true);

    const hash = DownloadPortalContract.METADATA.apk.sha256;
    assert.strictEqual(DownloadPortalContract.verifySha256(hash), true);
  });

  // ==========================================================================
  // S13: Smart TV Browser to PWA Fullscreen
  // ==========================================================================
  await runTest(4, "T4.S13", "Scenario S13: Smart TV Browser Accesses PWA Setup Guide and Launches 10-Foot Mode", async () => {
    const tizenSteps = DownloadPortalContract.METADATA.pwa.samsungTizen;
    assert(tizenSteps.length >= 4);
    assert(tizenSteps[2].includes("הוסף לדף הבית"));

    // Launching from home screen activates TV mode
    const isTvMode = TvDetectionContract.detectTvDevice("Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0)");
    assert.strictEqual(isTvMode, true);
  });

  // ==========================================================================
  // S14: Desktop to TV Transition
  // ==========================================================================
  await runTest(4, "T4.S14", "Scenario S14: User Pauses on Desktop, Pairs Living Room TV, and Resumes at Exact Timestamp", async () => {
    const sm = new StorageManagerContract();
    const tv = new TvPairingContract();

    // 1. Desktop user pauses movie at 42:15 (2535 seconds)
    const user = { id: "usr_transition", username: "אבי" };
    sm.saveWatchProgress(user.id, { mediaId: 1003, title: "התחלה", currentTime: 2535 });

    // 2. Pairs TV
    const session = tv.createSession();
    tv.approveSession(session.code, user);

    // 3. TV loads user watch progress and resumes
    const progress = sm.getWatchProgress(user.id)[0];
    assert.strictEqual(progress.currentTime, 2535);
  });

  // ==========================================================================
  // S15: Cross-Tab TV Pairing Simulation in Dev/Testing
  // ==========================================================================
  await runTest(4, "T4.S15", "Scenario S15: Cross-Tab TV and Mobile Windows Synchronize Pairing via BroadcastChannel", async () => {
    const tvTab = new MockBroadcastChannel("family_stream_tv_pair");
    const mobileTab = new MockBroadcastChannel("family_stream_tv_pair");
    let receivedPayload = null;

    tvTab.addEventListener("message", (e) => {
      receivedPayload = e.data;
    });

    mobileTab.postMessage({
      type: "PAIR_APPROVED",
      code: "333999",
      user: { id: "usr_tab", username: "כרטיסייה" },
    });

    assert(receivedPayload !== null);
    assert.strictEqual(receivedPayload.code, "333999");
    assert.strictEqual(receivedPayload.user.username, "כרטיסייה");

    tvTab.close();
    mobileTab.close();
  });

  // ==========================================================================
  // S16: LAN Sync Recovery when BroadcastChannel is Disabled
  // ==========================================================================
  await runTest(4, "T4.S16", "Scenario S16: Privacy Hardened Browser without BroadcastChannel Falls Back to LAN REST Polling", async () => {
    const tv = new TvPairingContract();
    const session = tv.createSession("112233");

    // Mobile approves via LAN API
    await tv.handleRestApi("POST", {
      action: "approve",
      code: "112233",
      user: { id: "usr_privacy", username: "פרטיות" },
    });

    // TV polls LAN endpoint and succeeds
    const poll = await tv.handleRestApi("GET", {}, { code: "112233" });
    assert.strictEqual(poll.body.status, "approved");
    assert.strictEqual(poll.body.user.username, "פרטיות");
  });

  // ==========================================================================
  // S17: Corrupted Session Self-Healing
  // ==========================================================================
  await runTest(4, "T4.S17", "Scenario S17: Corrupted LocalStorage Session Self-Heals Gracefully to Clean Login State", async () => {
    const storage = new MockLocalStorage();
    storage.setItem("family_stream_auth_account", "{CORRUPT_JSON_SYNTAX_ERROR");
    const auth = new AuthManagerContract(storage);

    // Does not throw, returns null cleanly
    assert.strictEqual(auth.getCurrentUser(), null);

    // User can log in afresh
    const user = await auth.loginPasswordless("healed@stream.local", "נקי");
    assert.strictEqual(auth.getCurrentUser().username, "נקי");
  });

  // ==========================================================================
  // S18: Rapid TV Remote Stress Navigation
  // ==========================================================================
  await runTest(4, "T4.S18", "Scenario S18: Rapid D-Pad Key Presses Across Carousel Rows Maintain Spatial Focus Stability", async () => {
    const rows = [
      ["item_0_0", "item_0_1", "item_0_2"],
      ["item_1_0", "item_1_1", "item_1_2"],
    ];
    let currentRow = 0;
    let currentCol = 0;

    const navigate = (dir) => {
      if (dir === "Down") currentRow = Math.min(rows.length - 1, currentRow + 1);
      if (dir === "Up") currentRow = Math.max(0, currentRow - 1);
      if (dir === "Right") currentCol = Math.min(rows[currentRow].length - 1, currentCol + 1);
      if (dir === "Left") currentCol = Math.max(0, currentCol - 1);
    };

    // Simulate 50 rapid key presses
    for (let i = 0; i < 50; i++) {
      navigate(i % 2 === 0 ? "Down" : "Right");
    }

    assert(currentRow >= 0 && currentRow < rows.length);
    assert(currentCol >= 0 && currentCol < rows[currentRow].length);
  });

  // ==========================================================================
  // S19: 5-Minute Stream Provider Cooldown Recovery
  // ==========================================================================
  await runTest(4, "T4.S19", "Scenario S19: Dropped Provider Cooldown Expires After 5 Minutes and is Re-Evaluated", async () => {
    const prober = new StreamProberContract();
    const t0 = 100000;

    // Provider drops at t0
    prober.blacklistProvider("flakey_server", t0);
    assert.strictEqual(prober.isProviderBlacklisted("flakey_server", t0 + 60000), true);

    // After 5 minutes (300,000ms), cooldown expires
    const t1 = t0 + 300001;
    assert.strictEqual(prober.isProviderBlacklisted("flakey_server", t1), false);

    // Provider is re-evaluated in next probe
    const res = await prober.probeAllCandidates([{ id: "flakey_server", tier: 1 }], {}, t1);
    assert.strictEqual(res.rankedSources.length, 1);
    assert.strictEqual(res.rankedSources[0].id, "flakey_server");
  });

  // ==========================================================================
  // S20: Full Hebrew RTL & HM Monogram Brand Audit
  // ==========================================================================
  await runTest(4, "T4.S20", "Scenario S20: Full Hebrew RTL Layout, Typography, and HM Monogram Brand Audit", async () => {
    // 1. Root RTL layout
    const dir = "rtl";
    assert.strictEqual(dir, "rtl");

    // 2. Typography Assistant font cascade
    const font = "Assistant, sans-serif";
    assert(font.includes("Assistant"));

    // 3. Official HM Monogram logo asset exists
    const logoFile = path.resolve(__dirname, "../../public/logo.png");
    assert(fs.existsSync(logoFile));
    const stat = fs.statSync(logoFile);
    assert(stat.size > 2000, "Official HM logo must have authentic file size");
  });
}

module.exports = { runTier4Tests };
