async function allFolders() {
  const res = await fetch("https://api.github.com/repos/eueueue292/Fusion-Profile-Avatars/contents", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const data = await res.json();
  console.log("Folders:", data.map(d => d.name));
}
allFolders();
