const assert = require("assert");
const zlib = require("zlib");
const path = require("path");
const fs = require("fs");

console.log("===============================================================");
console.log("  family-stream: Master Verification Suite (M1, M2, M3, M4)  ");
console.log("===============================================================");

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  console.log("\n--- Section 1: Stream Resolvers & Tiers (M1) ---");

  const ts = require("typescript");
  function loadTsModule(relPath) {
    const fullPath = path.resolve(__dirname, "..", relPath);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const js = ts.transpileModule(raw, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const mod = { exports: {} };
    const customRequire = (id) => {
      if (id === "@/types") return {};
      if (id === "@/lib/streamResolvers") return loadTsModule("src/lib/streamResolvers.ts");
      if (id === "@/lib/subtitles") return loadTsModule("src/lib/subtitles.ts");
      return require(id);
    };
    const fn = new Function("module", "exports", "require", js);
    fn(mod, mod.exports, customRequire);
    return mod.exports;
  }

  const { resolveStreamSources, PROVIDER_TIERS } = loadTsModule("src/lib/streamResolvers.ts");

  test("1.1 PROVIDER_TIERS defined with 4 tiers", () => {
    assert.strictEqual(Object.keys(PROVIDER_TIERS).length, 4);
    assert.strictEqual(PROVIDER_TIERS[1].badge, "Tier 1");
    assert.strictEqual(PROVIDER_TIERS[4].badge, "Tier 4");
  });

  test("1.2 resolveStreamSources returns 12 verified live providers", () => {
    const sources = resolveStreamSources({
      tmdbId: 634649,
      mediaType: "movie",
    });
    assert.strictEqual(sources.length, 12, `Expected 12 sources, got ${sources.length}`);

    // Verify all 12 provider IDs
    const expectedIds = [
      "vidlink-pro",
      "cinecat-engine",
      "atlantic-server",
      "autoembed-direct",
      "vidsrc-pm",
      "pressplayx",
      "vidsrc-to",
      "autoembed-portal",
      "vidsrc-me",
      "multiembed",
      "2embed-global",
      "smashystream",
    ];
    expectedIds.forEach((id) => {
      assert(sources.some((s) => s.id === id), `Missing provider id: ${id}`);
    });
  });

  test("1.3 Excludes dead/unembeddable providers (primeshows, vixcloud, nepu, embed.su)", () => {
    const sources = resolveStreamSources({
      tmdbId: 634649,
      mediaType: "movie",
    });
    const urls = sources.map((s) => s.url).join(" ");
    assert(!urls.includes("primeshows.org"), "primeshows.org must NOT be present (X-Frame-Options: DENY)");
    assert(!urls.includes("vixcloud.co"), "vixcloud.co must NOT be present");
    assert(!urls.includes("nepu.to"), "nepu.to must NOT be present");
    assert(!urls.includes("embed.su"), "embed.su must NOT be present");
    assert(!urls.includes("rivestream.live"), "rivestream.live must NOT be present");
  });

  test("1.4 All sources are tagged sandboxed: true", () => {
    const sources = resolveStreamSources({
      tmdbId: 634649,
      mediaType: "movie",
    });
    sources.forEach((s) => {
      assert.strictEqual(s.sandboxed, true, `${s.name} must be sandboxed`);
    });
  });

  test("1.5 startAt / resumeSeconds parameter persistence across failovers", () => {
    const movieSources = resolveStreamSources({
      tmdbId: 634649,
      mediaType: "movie",
      startAt: 1420,
    });
    const vidlink = movieSources.find((s) => s.id === "vidlink-pro");
    assert(vidlink, "vidlink-pro must exist");
    assert(vidlink.url.includes("startAt=1420"), "VidLink must include startAt=1420");

    const smashy = movieSources.find((s) => s.id === "smashystream");
    assert(smashy, "smashystream must exist");
    assert(smashy.url.includes("startTime=1420"), "SmashyStream must include startTime=1420");
  });

  test("1.6 TV Series URL structure validation (Season/Episode routing)", () => {
    const tvSources = resolveStreamSources({
      tmdbId: 1399,
      mediaType: "tv",
      season: 3,
      episode: 9,
      startAt: 300,
    });
    const vidlink = tvSources.find((s) => s.id === "vidlink-pro");
    assert(vidlink.url.includes("/tv/1399/3/9"), "Vidlink TV URL format must include /tv/1399/3/9");
    assert(vidlink.url.includes("startAt=300"), "Vidlink TV must include startAt=300");

    const cinecat = tvSources.find((s) => s.id === "cinecat-engine");
    assert(cinecat.url.includes("/media/tmdb-tv-1399/3/9"), "Cinecat TV URL format must match");

    const atlantic = tvSources.find((s) => s.id === "atlantic-server");
    assert(atlantic.url.includes("season=3&episode=9"), "Atlantic TV URL format must match");
  });

  console.log("\n--- Section 2: Subtitle Encoding, Decompression & WebVTT (M2) ---");

  const { decodeHebrewBuffer, convertSrtToVtt } = loadTsModule("src/app/api/subtitles/download/route.ts");
  const { parseWebVttCues, parseVttTimestamp } = loadTsModule("src/lib/subtitles.ts");

  test("2.1 Windows-1255 / CP1255 TextDecoder decodes Hebrew characters accurately", () => {
    // 0xe9 0xf9 0xe5 0xef in Windows-1255 is "ישון"
    const rawBuffer = Buffer.from([0xe9, 0xf9, 0xe5, 0xef]);
    const decoded = decodeHebrewBuffer(rawBuffer, "windows-1255");
    assert.strictEqual(decoded, "ישון", `Expected ישון, got ${decoded}`);
  });

  test("2.2 UTF-8 buffer detection and decoding", () => {
    const utf8Buffer = Buffer.from("שלום עולם! כתוביות בעברית", "utf-8");
    const decoded = decodeHebrewBuffer(utf8Buffer);
    assert.strictEqual(decoded, "שלום עולם! כתוביות בעברית");
  });

  test("2.3 GZIP decompression (for OpenSubtitles .gz files)", () => {
    const originalText = "1\n00:00:01,000 --> 00:00:04,000\nכתוביות בבדיקה";
    const compressedGz = zlib.gzipSync(Buffer.from(originalText, "utf-8"));
    assert.strictEqual(compressedGz[0], 0x1f);
    assert.strictEqual(compressedGz[1], 0x8b);

    const unzipped = zlib.gunzipSync(compressedGz);
    assert.strictEqual(unzipped.toString("utf-8"), originalText);
  });

  test("2.4 SRT to WebVTT conversion with RTL BiDi styles", () => {
    const srt = `1
00:01:23,456 --> 00:01:26,789
שלום עולם!

2
00:01:27,000 --> 00:01:30,000
<font color="#ff0000">בדיקת תרגום</font> (OK)`;

    const vtt = convertSrtToVtt(srt);
    assert(vtt.startsWith("WEBVTT"), "Must start with WEBVTT");
    assert(vtt.includes("00:01:23.456 --> 00:01:26.789"), "Must convert comma to dot");
    assert(vtt.includes("direction: rtl;"), "Must include RTL direction style");
    assert(vtt.includes("unicode-bidi: plaintext;"), "Must include BiDi style");
    assert(!vtt.includes("<font"), "Must strip font tags");
    assert(vtt.includes("בדיקת תרגום"), "Must retain Hebrew text");
  });

  test("2.5 parseVttTimestamp and parseWebVttCues", () => {
    const vtt = `WEBVTT

1
00:01:10.500 --> 00:01:14.200
שורה ראשונה של תרגום

2
00:02:00.000 --> 00:02:05.000
שורה שנייה`;

    const cues = parseWebVttCues(vtt);
    assert.strictEqual(cues.length, 2, `Expected 2 cues, got ${cues.length}`);
    assert.strictEqual(cues[0].startTime, 70.5);
    assert.strictEqual(cues[0].endTime, 74.2);
    assert.strictEqual(cues[0].text, "שורה ראשונה של תרגום");
    assert.strictEqual(cues[1].startTime, 120);
    assert.strictEqual(cues[1].endTime, 125);
  });

  console.log("\n--- Section 3: TV Spatial Navigation & Component Markers (M3) ---");

  test("3.1 MediaCard contains tabIndex={0} and focus ring", () => {
    const mediaCardPath = path.resolve(__dirname, "../src/components/MediaCard.tsx");
    const mediaCardContent = fs.readFileSync(mediaCardPath, "utf-8");
    assert(mediaCardContent.includes("tabIndex={0}"), "MediaCard must have tabIndex={0}");
    assert(mediaCardContent.includes("focus:scale-105"), "MediaCard must have focus:scale-105");
    assert(mediaCardContent.includes("focus:ring-4"), "MediaCard must have focus:ring-4");
    assert(mediaCardContent.includes("focus:ring-red-600"), "MediaCard must have focus:ring-red-600");
  });

  test("3.2 MediaRow contains data-tv-row='true' marker and normalized RTL scrolling", () => {
    const mediaRowPath = path.resolve(__dirname, "../src/components/MediaRow.tsx");
    const mediaRowContent = fs.readFileSync(mediaRowPath, "utf-8");
    assert(mediaRowContent.includes('data-tv-row="true"'), 'MediaRow must contain data-tv-row="true"');
    assert(mediaRowContent.includes("scrollBy"), "MediaRow must use scrollBy for normalized RTL scrolling");
  });

  test("3.3 tvNavigation.ts contains row-constrained horizontal and 2D vertical navigation", () => {
    const tvNavPath = path.resolve(__dirname, "../src/lib/tvNavigation.ts");
    const tvNavContent = fs.readFileSync(tvNavPath, "utf-8");
    assert(tvNavContent.includes('data-tv-row="true"'), "tvNavigation must recognize data-tv-row");
    assert(tvNavContent.includes("10009"), "tvNavigation must handle Tizen 10009 back key");
    assert(tvNavContent.includes("461"), "tvNavigation must handle LG webOS 461 back key");
    assert(tvNavContent.includes("MediaPlayPause"), "tvNavigation must handle media remote keys");
  });

  test("3.4 PlayerModal contains sandbox Ad-Shield and 6.5s watchdog timer", () => {
    const playerModalPath = path.resolve(__dirname, "../src/components/PlayerModal.tsx");
    const playerModalContent = fs.readFileSync(playerModalPath, "utf-8");
    assert(
      playerModalContent.includes('sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"'),
      "PlayerModal must enforce strict sandbox omitting popups and top navigation"
    );
    assert(
      !playerModalContent.includes("allow-popups"),
      "PlayerModal sandbox must NOT include allow-popups"
    );
    assert(
      !playerModalContent.includes("allow-top-navigation"),
      "PlayerModal sandbox must NOT include allow-top-navigation"
    );
    assert(playerModalContent.includes("6500"), "PlayerModal must include 6.5s watchdog timer (6500ms)");
    assert(playerModalContent.includes("SubtitleControls"), "PlayerModal must integrate SubtitleControls");
  });

  console.log("\n--- Section 4: Standalone PM2 Deployment (M4) ---");

  test("4.1 next.config.ts has output: 'standalone'", () => {
    const nextConfigPath = path.resolve(__dirname, "../next.config.ts");
    const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
    assert(nextConfigContent.includes('output: "standalone"'), "next.config.ts must have output: 'standalone'");
  });

  test("4.2 ecosystem.config.cjs exists with 0.0.0.0 binding and 600M limit", () => {
    const pm2ConfigPath = path.resolve(__dirname, "../ecosystem.config.cjs");
    assert(fs.existsSync(pm2ConfigPath), "ecosystem.config.cjs must exist");
    const pm2Config = require(pm2ConfigPath);
    assert(pm2Config.apps && pm2Config.apps.length > 0, "Must define at least one app");
    const app = pm2Config.apps[0];
    assert.strictEqual(app.name, "family-stream");
    assert.strictEqual(app.script, ".next/standalone/server.js");
    assert.strictEqual(app.max_memory_restart, "600M");
    assert.strictEqual(app.env.HOSTNAME, "0.0.0.0");
  });

  test("4.3 scripts/copy-standalone-assets.js exists", () => {
    const scriptPath = path.resolve(__dirname, "copy-standalone-assets.js");
    assert(fs.existsSync(scriptPath), "scripts/copy-standalone-assets.js must exist");
  });

  test("4.4 deploy scripts (.ps1, .bat, .sh) and .env.example exist", () => {
    assert(fs.existsSync(path.resolve(__dirname, "deploy.ps1")), "deploy.ps1 must exist");
    assert(fs.existsSync(path.resolve(__dirname, "deploy.bat")), "deploy.bat must exist");
    assert(fs.existsSync(path.resolve(__dirname, "deploy.sh")), "deploy.sh must exist");
    assert(fs.existsSync(path.resolve(__dirname, "../.env.example")), ".env.example must exist");
  });

  test("4.5 package.json contains all required standalone and PM2 scripts", () => {
    const pkgPath = path.resolve(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    assert(pkg.scripts["build:standalone"], "Must have build:standalone script");
    assert(pkg.scripts["pm2:start"], "Must have pm2:start script");
    assert(pkg.scripts["pm2:stop"], "Must have pm2:stop script");
    assert(pkg.scripts["pm2:restart"], "Must have pm2:restart script");
    assert(pkg.scripts["pm2:status"], "Must have pm2:status script");
  });

  console.log("\n===============================================================");
  console.log(`  ALL ${passed}/${total} VERIFICATION CHECKS PASSED!  `);
  console.log("===============================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
