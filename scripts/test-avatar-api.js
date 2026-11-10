async function test() {
  const seeds = ["Felix", "Aneka", "Midnight"];
  for (const seed of seeds) {
    const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    const res = await fetch(url);
    console.log(seed, "status:", res.status, "content-type:", res.headers.get("content-type"));
  }
}
test();
