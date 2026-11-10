async function checkFolders() {
  const folders = ["Cyberpunk Edgerunners", "Avatar: The Last Airbender", "Bojack Horseman", "Death Note"];
  for (const f of folders) {
    const res = await fetch(`https://api.github.com/repos/eueueue292/Fusion-Profile-Avatars/contents/${encodeURIComponent(f)}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const items = await res.json();
    console.log(f, Array.isArray(items) ? items.map(i => ({ name: i.name, download_url: i.download_url })) : items);
  }
}
checkFolders();
