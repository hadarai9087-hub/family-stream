#!/usr/bin/env node

/**
 * family-stream Master E2E Test Suite Runner
 * Covers Tiers 1-4 across all 40 features in PROJECT.md Feature Inventory (F1 to F40).
 *
 * Requirements Coverage:
 * - Tier 1 — Feature Coverage: Minimum 5 tests per feature for F1 to F40 (200 tests)
 * - Tier 2 — Boundary & Corner Cases: Minimum 5 tests per feature for F1 to F40 (200 tests)
 * - Tier 3 — Cross-Feature Combinations: Pairwise interaction tests (40 tests)
 * - Tier 4 — Real-World Application Scenarios: End-to-end user journeys (20 tests, S1 to S20)
 * Total: 460 Automated Test Cases
 * Zero Emojis Policy Compliance.
 *
 * Usage:
 *   node scripts/verify-e2e-platform.js          # Run all 460 tests across 4 tiers
 *   node scripts/verify-e2e-platform.js --tier 1 # Run Tier 1 only (200 tests)
 *   node scripts/verify-e2e-platform.js --tier 2 # Run Tier 2 only (200 tests)
 *   node scripts/verify-e2e-platform.js --tier 3 # Run Tier 3 only (40 tests)
 *   node scripts/verify-e2e-platform.js --tier 4 # Run Tier 4 only (20 tests)
 *   node scripts/verify-e2e-platform.js -v       # Verbose output
 */

const path = require("node:path");
const {
  RESET,
  BOLD,
  GREEN,
  RED,
  YELLOW,
  CYAN,
  DIM,
  results,
  targetTier,
  verbose,
} = require("./tests/harness/test-context");

const { runTier1Tests } = require("./tests/tier1-features");
const { runTier2Tests } = require("./tests/tier2-boundaries");
const { runTier3Tests } = require("./tests/tier3-combinations");
const { runTier4Tests } = require("./tests/tier4-scenarios");

async function main() {
  const startTime = Date.now();

  console.log(`${BOLD}${CYAN}====================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  family-stream Master E2E Test Suite (Tiers 1-4 | F1 to F40)       ${RESET}`);
  console.log(`${BOLD}${CYAN}  Requirement-Driven Quality Gate | Zero Emojis Compliance          ${RESET}`);
  console.log(`${BOLD}${CYAN}====================================================================${RESET}`);
  console.log(`${DIM}Target Scope: 40 Features | Minimum 460 Automated Tests${RESET}\n`);

  try {
    // Tier 1: Feature Coverage (200 tests)
    if (targetTier === null || targetTier === 1) {
      await runTier1Tests();
    }

    // Tier 2: Boundary & Corner Cases (200 tests)
    if (targetTier === null || targetTier === 2) {
      await runTier2Tests();
    }

    // Tier 3: Cross-Feature Combinations (40 tests)
    if (targetTier === null || targetTier === 3) {
      await runTier3Tests();
    }

    // Tier 4: Real-World Application Scenarios (20 tests)
    if (targetTier === null || targetTier === 4) {
      await runTier4Tests();
    }
  } catch (fatalErr) {
    console.error(`\n${RED}[FATAL ERROR] Test suite aborted unexpectedly: ${fatalErr.message}${RESET}`);
    if (fatalErr.stack) console.error(fatalErr.stack);
    process.exit(1);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(3);

  // Execution Summary Report
  console.log(`\n${BOLD}${CYAN}====================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  E2E Test Suite Execution Summary                                  ${RESET}`);
  console.log(`${BOLD}${CYAN}====================================================================${RESET}`);
  console.log(`  Total Tests Run:    ${BOLD}${results.total}${RESET}`);
  console.log(`  Total Tests Passed: ${GREEN}${results.passed}${RESET}`);
  console.log(`  Total Tests Failed: ${results.failed > 0 ? RED : GREEN}${results.failed}${RESET}`);
  console.log(`  Duration:           ${durationSec}s\n`);

  console.log(`  Breakdown by Tier:`);
  console.log(`    Tier 1 (Feature Coverage):     ${results.byTier[1].passed}/${results.byTier[1].passed + results.byTier[1].failed} passed`);
  console.log(`    Tier 2 (Boundary & Corner):    ${results.byTier[2].passed}/${results.byTier[2].passed + results.byTier[2].failed} passed`);
  console.log(`    Tier 3 (Cross-Feature Combos): ${results.byTier[3].passed}/${results.byTier[3].passed + results.byTier[3].failed} passed`);
  console.log(`    Tier 4 (Real-World Scenarios): ${results.byTier[4].passed}/${results.byTier[4].passed + results.byTier[4].failed} passed`);
  console.log(`${BOLD}${CYAN}====================================================================${RESET}\n`);

  if (results.failed > 0) {
    console.log(`${RED}${BOLD}VERDICT: TEST SUITE FAILED (${results.failed} failures detected)${RESET}\n`);
    for (const fail of results.errors) {
      console.log(`  - [Tier ${fail.tier}] ${fail.id}: ${fail.description}`);
      console.log(`    ${RED}Reason: ${fail.error.message}${RESET}`);
    }
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}VERDICT: ALL ${results.total} TESTS PASSED WITH 100% SUCCESS${RESET}\n`);
    process.exit(0);
  }
}

main();
