const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const standaloneStaticDir = path.join(standaloneNextDir, "static");
const rootStaticDir = path.join(rootDir, ".next", "static");
const standalonePublicDir = path.join(standaloneDir, "public");
const rootPublicDir = path.join(rootDir, "public");

console.log("=== Hydrating Next.js Standalone Assets ===");

if (!fs.existsSync(standaloneDir)) {
  console.error("✗ Error: .next/standalone folder not found. Run 'next build' first.");
  process.exit(1);
}

// 1. Copy .next/static -> .next/standalone/.next/static
if (fs.existsSync(rootStaticDir)) {
  fs.mkdirSync(standaloneStaticDir, { recursive: true });
  fs.cpSync(rootStaticDir, standaloneStaticDir, { recursive: true });
  console.log("✓ Successfully copied .next/static to .next/standalone/.next/static");
} else {
  console.warn("✗ Warning: .next/static directory not found!");
}

// 2. Copy public -> .next/standalone/public
if (fs.existsSync(rootPublicDir)) {
  fs.mkdirSync(standalonePublicDir, { recursive: true });
  fs.cpSync(rootPublicDir, standalonePublicDir, { recursive: true });
  console.log("✓ Successfully copied public to .next/standalone/public");
} else {
  console.warn("✗ Warning: public directory not found!");
}

console.log("✓ Standalone static asset hydration completed successfully.");
