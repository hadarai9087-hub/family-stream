const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next") results = results.concat(walk(full));
    } else if (/\.(tsx|ts|js|jsx)$/.test(file)) {
      results.push(full);
    }
  });
  return results;
}

const emojiRegex = /[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}]/u;
const files = walk("./src");
let found = 0;
files.forEach(f => {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      console.log(`${f}:${idx+1}: ${line.trim()}`);
      found++;
    }
  });
});
console.log(`Total emoji lines found: ${found}`);
