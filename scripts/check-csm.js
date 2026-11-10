async function check() {
  const folders = ["Chainsaw Man", "Solo Leveling S1"];
  for (const f of folders) {
    const res = await fetch(`https://api.github.com/repos/eueueue292/Fusion-Profile-Avatars/contents/${encodeURIComponent(f)}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const items = await res.json();
    console.log(f, Array.isArray(items) ? items.slice(0, 5).map(i => i.name) : items);
  }
}
check();
