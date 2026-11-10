async function checkMore() {
  const folders = ["Rick And Morty", "The Classics", "One Piece", "Naruto"];
  for (const f of folders) {
    const res = await fetch(`https://api.github.com/repos/eueueue292/Fusion-Profile-Avatars/contents/${encodeURIComponent(f)}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const items = await res.json();
    console.log(f, Array.isArray(items) ? items.slice(0, 5).map(i => i.name) : items);
  }
}
checkMore();
