const fs = require("fs");
const path = require("path");

const avatars = [
  // Rick and Morty
  { name: "rick.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Rick%20And%20Morty/Rick.JPG" },
  { name: "morty.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Rick%20And%20Morty/Morty.JPG" },
  { name: "pickle-rick.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Rick%20And%20Morty/Pickle%20Rick.JPG" },
  
  // Cyberpunk Edgerunners
  { name: "david.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Cyberpunk%20Edgerunners/David.png" },
  { name: "lucy.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Cyberpunk%20Edgerunners/Lucy.png" },
  { name: "rebecca.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Cyberpunk%20Edgerunners/Rebecca.png" },

  // Avatar The Last Airbender
  { name: "aang.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Avatar%3A%20The%20Last%20Airbender/Aang.PNG" },
  { name: "appa.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Avatar%3A%20The%20Last%20Airbender/Appa.PNG" },
  { name: "zuko.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Avatar%3A%20The%20Last%20Airbender/Zuko.PNG" },

  // Death Note & Bojack
  { name: "ryuk.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Death%20Note/Ryuk.PNG" },
  { name: "l.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Death%20Note/L.PNG" },
  { name: "bojack.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Bojack%20Horseman/Bojack%20Horseman.PNG" },

  // Naruto & Anime
  { name: "kakashi.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Naruto/Kakashi.PNG" },
  { name: "itachi.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Naruto/Itachi.PNG" },
  { name: "gaara.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Naruto/Gaara.PNG" },

  // Jujutsu Kaisen / One Piece
  { name: "gojo.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Jujutsu%20Kaisen/Gojo.PNG" },
  { name: "sukuna.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/Jujutsu%20Kaisen/Sukuna.PNG" },
  { name: "luffy.png", url: "https://raw.githubusercontent.com/eueueue292/Fusion-Profile-Avatars/main/One%20Piece/Luffy%202.PNG" },
];

async function downloadAll() {
  const targetDir = path.join(__dirname, "../public/avatars");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const item of avatars) {
    try {
      console.log(`Downloading ${item.name}...`);
      const res = await fetch(item.url);
      if (!res.ok) {
        console.warn(`Failed ${item.name}: ${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(targetDir, item.name), buffer);
      console.log(`Saved ${item.name} (${buffer.length} bytes)`);
    } catch (e) {
      console.error(`Error downloading ${item.name}:`, e.message);
    }
  }
  console.log("All avatars downloaded successfully!");
}

downloadAll();
