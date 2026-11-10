#!/usr/bin/env node

/**
 * Challenger 1 Adversarial Test Harness: Theme Accent Color Dynamic Propagation (Milestone 1 / R1)
 *
 * Verifies:
 * 1. Preset Dynamic Theme Updates: All 6 preset themes in THEME_COLORS update
 *    --accent-theme, --accent-hover, and --accent-rgb accurately.
 * 2. Fallback Behavior: Given invalid, empty, unknown, or edge-case accent colors,
 *    verifies whether the system falls back cleanly to red (#e50914) without errors.
 * 3. layout.tsx Hydration Script: Evaluates inline hydration script under corrupt JSON,
 *    primitive values, missing properties, invalid types, and DOMException scenarios.
 * 4. Static Regex Scan: Scans the 16 modified files for any un-migrated instances of
 *    hardcoded Netflix red hex codes (#e50914, #b80710, #c11119, rgba(229, 9, 20)).
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT_DIR = path.resolve(__dirname, "..");

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

const results = [];

function recordResult(section, testName, status, details = "") {
  results.push({ section, testName, status, details });
  const tag = status === "PASS"
    ? `${GREEN}[PASS]${RESET}`
    : status === "WARN"
    ? `${YELLOW}[WARN]${RESET}`
    : `${RED}[FAIL]${RESET}`;
  console.log(`  ${tag} ${section} > ${testName}`);
  if (details) {
    console.log(`         ${DIM}${details}${RESET}`);
  }
}

// Mock DOM DocumentElement Style
class MockStyle {
  constructor() {
    this.properties = new Map();
  }
  setProperty(name, value) {
    this.properties.set(name, String(value));
  }
  getPropertyValue(name) {
    return this.properties.get(name) || "";
  }
  removeProperty(name) {
    this.properties.delete(name);
  }
  clear() {
    this.properties.clear();
  }
}

class MockElement {
  constructor() {
    this.style = new MockStyle();
  }
}

class MockDocument {
  constructor() {
    this.documentElement = new MockElement();
  }
}

// Transpile and load SettingsModal exports
function loadSettingsModal() {
  const filePath = path.join(ROOT_DIR, "src/components/SettingsModal.tsx");
  const rawCode = fs.readFileSync(filePath, "utf8");

  const transpiled = ts.transpileModule(rawCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;

  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id === "react") {
      return {
        useState: (init) => [typeof init === "function" ? init() : init, () => {}],
        useRef: () => ({ current: null }),
        useEffect: (fn) => fn(),
      };
    }
    if (id === "next/image") return () => null;
    if (id === "lucide-react") return new Proxy({}, { get: () => () => null });
    if (id === "@/lib/auth" || id.includes("auth")) {
      return {
        UserAccount: {},
        authManager: {},
        AVATAR_POOL: ["/avatars/1.png"],
      };
    }
    try {
      return require(id);
    } catch {
      return {};
    }
  };

  const fn = new Function("require", "exports", "module", "__filename", "__dirname", transpiled);
  fn(customRequire, mod.exports, mod, filePath, path.dirname(filePath));
  return mod.exports;
}

// Extract layout.tsx inline script
function extractLayoutInlineScript() {
  const layoutPath = path.join(ROOT_DIR, "src/app/layout.tsx");
  const content = fs.readFileSync(layoutPath, "utf8");
  const match = content.match(/__html:\s*`([^`]+)`/);
  if (!match) {
    throw new Error("Could not find inline script in src/app/layout.tsx");
  }
  return match[1];
}

async function runChallengerSuite() {
  console.log("====================================================================");
  console.log("  Empirical Challenger 1: Milestone 1 Theme Propagation Stress Test ");
  console.log("  Target: family-stream | Framework: Next.js App Router & Tailwind v4");
  console.log("====================================================================\n");

  const mockDoc = new MockDocument();
  global.document = mockDoc;
  global.window = {};

  const settingsMod = loadSettingsModal();
  const { THEME_COLORS, applyThemeAccent } = settingsMod;

  // =========================================================================
  // SUITE 1: Verify All 6 Preset Themes in THEME_COLORS
  // =========================================================================
  console.log(`${BOLD}--- Suite 1: Preset Dynamic Theme Updates (6 Presets) ---${RESET}`);

  assert(Array.isArray(THEME_COLORS), "THEME_COLORS must be an exported array");
  assert.strictEqual(THEME_COLORS.length, 6, "THEME_COLORS must define exactly 6 presets");

  const EXPECTED_PRESETS = [
    { id: "red", hex: "#e50914", hover: "#b80710", rgb: "229, 9, 20" },
    { id: "blue", hex: "#0070f3", hover: "#0058c6", rgb: "0, 112, 243" },
    { id: "purple", hex: "#8b5cf6", hover: "#7c3aed", rgb: "139, 92, 246" },
    { id: "emerald", hex: "#10b981", hover: "#059669", rgb: "16, 185, 129" },
    { id: "gold", hex: "#f59e0b", hover: "#d97706", rgb: "245, 158, 11" },
    { id: "pink", hex: "#ec4899", hover: "#db2777", rgb: "236, 72, 153" },
  ];

  for (const exp of EXPECTED_PRESETS) {
    const found = THEME_COLORS.find((p) => p.id === exp.id);
    if (!found) {
      recordResult("Preset Definitions", `Preset '${exp.id}' exists`, "FAIL", `Missing preset ${exp.id}`);
      continue;
    }

    const matchesExpected =
      found.hex.toLowerCase() === exp.hex.toLowerCase() &&
      found.hover.toLowerCase() === exp.hover.toLowerCase() &&
      found.rgb === exp.rgb;

    if (matchesExpected) {
      recordResult("Preset Definitions", `Preset '${exp.id}' token values`, "PASS", `${found.hex} | hover: ${found.hover} | rgb: ${found.rgb}`);
    } else {
      recordResult("Preset Definitions", `Preset '${exp.id}' token values`, "FAIL", `Mismatch: expected ${JSON.stringify(exp)}, got ${JSON.stringify(found)}`);
    }

    // Test applyThemeAccent with exact hex
    mockDoc.documentElement.style.clear();
    applyThemeAccent(exp.hex);

    const themeVal = mockDoc.documentElement.style.getPropertyValue("--accent-theme");
    const hoverVal = mockDoc.documentElement.style.getPropertyValue("--accent-hover");
    const rgbVal = mockDoc.documentElement.style.getPropertyValue("--accent-rgb");

    if (themeVal === exp.hex && hoverVal === exp.hover && rgbVal === exp.rgb) {
      recordResult("Theme Propagation", `applyThemeAccent('${exp.hex}') updates all 3 CSS variables`, "PASS", `--accent-theme: ${themeVal}, --accent-hover: ${hoverVal}, --accent-rgb: ${rgbVal}`);
    } else {
      recordResult("Theme Propagation", `applyThemeAccent('${exp.hex}') updates all 3 CSS variables`, "FAIL", `Received: theme=${themeVal}, hover=${hoverVal}, rgb=${rgbVal}`);
    }

    // Test applyThemeAccent with UPPERCASE hex
    mockDoc.documentElement.style.clear();
    applyThemeAccent(exp.hex.toUpperCase());

    const upperThemeVal = mockDoc.documentElement.style.getPropertyValue("--accent-theme");
    const upperHoverVal = mockDoc.documentElement.style.getPropertyValue("--accent-hover");
    const upperRgbVal = mockDoc.documentElement.style.getPropertyValue("--accent-rgb");

    if (upperThemeVal === exp.hex && upperHoverVal === exp.hover && upperRgbVal === exp.rgb) {
      recordResult("Case Insensitivity", `applyThemeAccent('${exp.hex.toUpperCase()}') case-insensitive match`, "PASS", "Correctly resolved uppercase hex");
    } else {
      recordResult("Case Insensitivity", `applyThemeAccent('${exp.hex.toUpperCase()}') case-insensitive match`, "FAIL", `Failed to resolve uppercase hex: ${upperThemeVal}`);
    }
  }

  // =========================================================================
  // SUITE 2: Fallback Behavior for Invalid, Empty, or Unknown Accent Colors
  // =========================================================================
  console.log(`\n${BOLD}--- Suite 2: Fallback Behavior (Invalid, Empty, Unknown Colors) ---${RESET}`);

  const RED_FALLBACK = THEME_COLORS[0];

  function verifyRedFallback(inputDescription, runFn) {
    mockDoc.documentElement.style.clear();
    // Pre-populate with non-red to verify it actually overwrites
    mockDoc.documentElement.style.setProperty("--accent-theme", "#000000");
    mockDoc.documentElement.style.setProperty("--accent-hover", "#000000");
    mockDoc.documentElement.style.setProperty("--accent-rgb", "0, 0, 0");

    try {
      runFn();
      const themeVal = mockDoc.documentElement.style.getPropertyValue("--accent-theme");
      const hoverVal = mockDoc.documentElement.style.getPropertyValue("--accent-hover");
      const rgbVal = mockDoc.documentElement.style.getPropertyValue("--accent-rgb");

      if (themeVal === RED_FALLBACK.hex && hoverVal === RED_FALLBACK.hover && rgbVal === RED_FALLBACK.rgb) {
        recordResult("Fallback", `Input: ${inputDescription} falls back to Red`, "PASS", `Clean fallback to ${themeVal}`);
      } else {
        recordResult("Fallback", `Input: ${inputDescription} falls back to Red`, "FAIL", `Did not set red tokens. theme=${themeVal}, hover=${hoverVal}, rgb=${rgbVal}`);
      }
    } catch (err) {
      recordResult("Fallback", `Input: ${inputDescription} falls back to Red`, "FAIL", `Threw exception: ${err.message}`);
    }
  }

  // Test empty string
  verifyRedFallback('Empty string ""', () => applyThemeAccent(""));

  // Test whitespace string
  verifyRedFallback('Whitespace string "   "', () => applyThemeAccent("   "));

  // Test unknown valid hex color
  verifyRedFallback('Unknown hex "#999999"', () => applyThemeAccent("#999999"));
  verifyRedFallback('Unknown hex "#ffffff"', () => applyThemeAccent("#ffffff"));
  verifyRedFallback('Unknown hex "#000000"', () => applyThemeAccent("#000000"));

  // Test arbitrary invalid strings
  verifyRedFallback('Invalid string "invalid_color"', () => applyThemeAccent("invalid_color"));
  verifyRedFallback('CSS named color "blue"', () => applyThemeAccent("blue"));
  verifyRedFallback('CSS rgb format "rgb(255, 0, 0)"', () => applyThemeAccent("rgb(255, 0, 0)"));

  // Adversarial stress test: Non-string / null / undefined / objects
  console.log(`\n${DIM}  [Adversarial Probe] Testing untyped/non-string runtime inputs on applyThemeAccent...${RESET}`);

  const untypedInputs = [
    { name: "null", value: null },
    { name: "undefined", value: undefined },
    { name: "number 12345", value: 12345 },
    { name: "boolean true", value: true },
    { name: "object {}", value: {} },
    { name: "array []", value: [] },
  ];

  for (const input of untypedInputs) {
    mockDoc.documentElement.style.clear();
    mockDoc.documentElement.style.setProperty("--accent-theme", "#000000");

    try {
      applyThemeAccent(input.value);
      const themeVal = mockDoc.documentElement.style.getPropertyValue("--accent-theme");
      if (themeVal === RED_FALLBACK.hex) {
        recordResult("Adversarial Non-String", `applyThemeAccent(${input.name}) safe fallback`, "PASS", `Fell back cleanly to red: ${themeVal}`);
      } else {
        recordResult("Adversarial Non-String", `applyThemeAccent(${input.name}) safe fallback`, "WARN", `Did not throw, but set: ${themeVal}`);
      }
    } catch (err) {
      // Record this finding: applyThemeAccent does not guard against non-strings
      recordResult("Adversarial Non-String", `applyThemeAccent(${input.name}) safe fallback`, "WARN", `Uncaught ${err.name}: ${err.message} (lacks typeof === 'string' guard)`);
    }
  }

  // =========================================================================
  // SUITE 3: layout.tsx Inline Script Hydration & Corrupted JSON Resilience
  // =========================================================================
  console.log(`\n${BOLD}--- Suite 3: layout.tsx Inline Script Hydration & Corrupted JSON Resilience ---${RESET}`);

  const scriptCode = extractLayoutInlineScript();

  function runLayoutScriptWithStorage(storageValue, throwOnGet = false) {
    const mockStorage = {
      getItem: (key) => {
        if (throwOnGet) {
          const err = new Error("Access to storage is denied");
          err.name = "SecurityError";
          throw err;
        }
        if (key === "hm_app_settings") return storageValue;
        return null;
      },
    };

    const docMock = new MockDocument();
    // Pre-populate with non-red to detect changes
    docMock.documentElement.style.setProperty("--accent-theme", "#initial");
    docMock.documentElement.style.setProperty("--accent-hover", "#initial");
    docMock.documentElement.style.setProperty("--accent-rgb", "initial");

    const runner = new Function("localStorage", "document", scriptCode);
    runner(mockStorage, docMock);

    return {
      theme: docMock.documentElement.style.getPropertyValue("--accent-theme"),
      hover: docMock.documentElement.style.getPropertyValue("--accent-hover"),
      rgb: docMock.documentElement.style.getPropertyValue("--accent-rgb"),
    };
  }

  // 1. Normal valid presets
  for (const preset of EXPECTED_PRESETS) {
    const json = JSON.stringify({ accentColor: preset.hex });
    const res = runLayoutScriptWithStorage(json);
    if (res.theme === preset.hex && res.hover === preset.hover && res.rgb === preset.rgb) {
      recordResult("Layout Script Hydration", `Valid preset ${preset.id} (${preset.hex})`, "PASS", `Sets theme=${res.theme}, hover=${res.hover}, rgb=${res.rgb}`);
    } else {
      recordResult("Layout Script Hydration", `Valid preset ${preset.id} (${preset.hex})`, "FAIL", `Expected ${preset.hex}, got ${res.theme}`);
    }
  }

  // 2. Case-insensitivity in layout script
  const upperJson = JSON.stringify({ accentColor: "#0070F3" });
  const upperRes = runLayoutScriptWithStorage(upperJson);
  if (upperRes.theme === "#0070f3") {
    recordResult("Layout Script Hydration", "Uppercase preset hex (#0070F3)", "PASS", "Correctly normalized and matched");
  } else {
    recordResult("Layout Script Hydration", "Uppercase preset hex (#0070F3)", "FAIL", `Failed: got ${upperRes.theme}`);
  }

  // 3. Unknown color in layout script (must fallback to red c[0])
  const unknownJson = JSON.stringify({ accentColor: "#abcdef" });
  const unknownRes = runLayoutScriptWithStorage(unknownJson);
  if (unknownRes.theme === RED_FALLBACK.hex) {
    recordResult("Layout Script Fallback", "Unknown hex in localStorage (#abcdef) -> Red fallback", "PASS", `Clean fallback to ${unknownRes.theme}`);
  } else {
    recordResult("Layout Script Fallback", "Unknown hex in localStorage (#abcdef) -> Red fallback", "FAIL", `Expected ${RED_FALLBACK.hex}, got ${unknownRes.theme}`);
  }

  // 4. Corrupted JSON strings
  const corruptedPayloads = [
    { label: "Truncated JSON", raw: '{"accentColor": "#0070' },
    { label: "Unclosed braces", raw: '{"accentColor": "#0070f3"' },
    { label: "Arbitrary broken string", raw: "INVALID_JSON_DATA{{{" },
    { label: "Empty string in storage", raw: "" },
    { label: "Literal 'null' in storage", raw: "null" },
    { label: "Literal 'undefined' in storage", raw: "undefined" },
    { label: "Numeric string '12345'", raw: "12345" },
    { label: "Empty JSON object '{}'", raw: "{}" },
    { label: "Object with null accentColor", raw: '{"accentColor": null}' },
    { label: "Object with empty accentColor ''", raw: '{"accentColor": ""}' },
    { label: "Object with numeric accentColor 123", raw: '{"accentColor": 123}' },
  ];

  for (const item of corruptedPayloads) {
    try {
      const res = runLayoutScriptWithStorage(item.raw);
      // Since it caught cleanly without throwing, it passes resilience check
      recordResult("Layout Script Resilience", `Corrupt input: ${item.label}`, "PASS", `Handled safely without uncaught exception (theme="${res.theme}")`);
    } catch (err) {
      recordResult("Layout Script Resilience", `Corrupt input: ${item.label}`, "FAIL", `Threw uncaught exception: ${err.message}`);
    }
  }

  // 5. Storage getItem SecurityError
  try {
    const res = runLayoutScriptWithStorage(null, true);
    recordResult("Layout Script Resilience", "Storage SecurityError / Access Denied", "PASS", "Caught cleanly in try/catch block");
  } catch (err) {
    recordResult("Layout Script Resilience", "Storage SecurityError / Access Denied", "FAIL", `Crashed with: ${err.message}`);
  }

  // =========================================================================
  // SUITE 4: Static Regex Scan Across the 16 Modified Files
  // =========================================================================
  console.log(`\n${BOLD}--- Suite 4: Static Regex Scan Across 16 Modified Files ---${RESET}`);

  const MODIFIED_FILES = [
    "src/app/globals.css",
    "src/app/layout.tsx",
    "src/components/SettingsModal.tsx",
    "src/components/Navbar.tsx",
    "src/components/HeroBanner.tsx",
    "src/components/MediaCard.tsx",
    "src/components/RecommendationSection.tsx",
    "src/components/EpisodesModal.tsx",
    "src/components/SubtitleControls.tsx",
    "src/components/UserCornerMenu.tsx",
    "src/components/LoginScreen.tsx",
    "src/components/TvFirstLoginScreen.tsx",
    "src/components/TvSidebar.tsx",
    "src/components/TvPairModal.tsx",
    "src/app/pair/page.tsx",
    "src/app/download/page.tsx",
  ];

  // Regex patterns to check
  const RED_HEX_PATTERN = /#e50914/gi;
  const RED_HOVER_PATTERN = /#b80710/gi;
  const RED_DARK_PATTERN = /#c11119/gi;
  const RED_RGB_PATTERN = /rgba\(\s*229\s*,\s*9\s*,\s*20/gi;

  let totalScanViolations = 0;

  for (const relPath of MODIFIED_FILES) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
      recordResult("Static Scan", `File exists: ${relPath}`, "FAIL", "File not found");
      totalScanViolations++;
      continue;
    }

    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
    const violationsInFile = [];

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Allow legitimate token definitions in globals.css, layout.tsx, and SettingsModal.tsx
      if (relPath === "src/app/globals.css") {
        // Line defining --accent-theme, --accent-hover, --accent-rgb is legitimate
        if (line.includes("--accent-theme:") || line.includes("--accent-hover:") || line.includes("--accent-rgb:")) {
          return;
        }
      }
      if (relPath === "src/app/layout.tsx") {
        // Preset definition array inside inline script is legitimate
        if (line.includes('{hex:"#e50914",hover:"#b80710",rgb:"229, 9, 20"}')) {
          return;
        }
      }
      if (relPath === "src/components/SettingsModal.tsx") {
        // THEME_COLORS definition and default state initial value are legitimate
        if (line.includes('{ id: "red", name: "אדום קולנוע", hex: "#e50914"') || line.includes('accentColor: "#e50914"')) {
          return;
        }
      }

      // Check for forbidden hardcoded patterns
      if (RED_HEX_PATTERN.test(line)) {
        violationsInFile.push(`Line ${lineNum}: found hardcoded #e50914 -> ${line.trim()}`);
      }
      if (RED_HOVER_PATTERN.test(line)) {
        violationsInFile.push(`Line ${lineNum}: found hardcoded #b80710 -> ${line.trim()}`);
      }
      if (RED_DARK_PATTERN.test(line)) {
        violationsInFile.push(`Line ${lineNum}: found hardcoded #c11119 -> ${line.trim()}`);
      }
      if (RED_RGB_PATTERN.test(line)) {
        violationsInFile.push(`Line ${lineNum}: found hardcoded rgba(229, 9, 20) -> ${line.trim()}`);
      }
    });

    if (violationsInFile.length === 0) {
      recordResult("Static Regex Scan", relPath, "PASS", "0 un-migrated hardcoded red instances");
    } else {
      totalScanViolations += violationsInFile.length;
      recordResult("Static Regex Scan", relPath, "FAIL", `${violationsInFile.length} un-migrated instance(s):\n         ${violationsInFile.join("\n         ")}`);
    }
  }

  // =========================================================================
  // SUMMARY & VERDICT
  // =========================================================================
  console.log("\n====================================================================");
  console.log("  Empirical Challenger 1 Execution Summary");
  console.log("====================================================================");

  const passCount = results.filter((r) => r.status === "PASS").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;

  console.log(`  Total Checks: ${results.length}`);
  console.log(`  Passed:       ${passCount}`);
  console.log(`  Warnings:     ${warnCount}`);
  console.log(`  Failed:       ${failCount}\n`);

  if (failCount > 0) {
    console.log(`${RED}${BOLD}CRITICAL FAILURES DETECTED:${RESET}`);
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`  - [${r.section}] ${r.testName}: ${r.details}`);
      });
    console.log(`\n${RED}${BOLD}CHALLENGER VERDICT: REJECT${RESET}`);
    process.exit(1);
  } else {
    if (warnCount > 0) {
      console.log(`${YELLOW}${BOLD}NON-BLOCKING WARNINGS / RECOMMENDATIONS:${RESET}`);
      results
        .filter((r) => r.status === "WARN")
        .forEach((r) => {
          console.log(`  - [${r.section}] ${r.testName}: ${r.details}`);
        });
    }
    console.log(`\n${GREEN}${BOLD}CHALLENGER VERDICT: CONFIRM${RESET}`);
    process.exit(0);
  }
}

runChallengerSuite().catch((err) => {
  console.error("Fatal error in Challenger runner:", err);
  process.exit(1);
});
