const fs = require("fs");
const path = require("path");

const more = [
  { name: "denji.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Chainsaw%20Man/Denji.PNG" },
  { name: "chainsaw-man.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Chainsaw%20Man/Chainsaw%20Man.PNG" },
  { name: "sung-jinwoo.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Solo%20Leveling%20S1/Sung%20Jinwoo%202.PNG" },
];

async function downloadMore() {
  const targetDir = path.join(__dirname, "../public/avatars");
  for (const item of more) {
    const res = await fetch(item.url);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(targetDir, item.name), buffer);
      console.log(`Saved ${item.name} (${buffer.length} bytes)`);
    }
  }
}
downloadMore();
