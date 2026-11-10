async function test() {
  const res = await fetch("https://api.github.com/repos/eueueue292/Fusion-Profile-Avatars/contents", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  if (Array.isArray(data)) {
    data.slice(0, 10).forEach(item => console.log(item.name, item.download_url));
  }
}
test();
