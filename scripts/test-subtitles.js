async function test() {
  const numeric = "1375666";
  try {
    const res = await fetch(`https://rest.opensubtitles.org/search/imdbid-${numeric}/sublanguageid-heb`, {
      headers: { "User-Agent": "TemporaryUserAgent", "Accept": "application/json" }
    });
    console.log("OpenSubtitles REST status:", res.status);
    const data = await res.json();
    console.log("OpenSubtitles results count:", Array.isArray(data) ? data.length : 0);
  } catch (e) {
    console.error("OpenSubtitles error:", e.message);
  }

  // Also test SubDL
  try {
    const res = await fetch(`https://api.subdl.com/api/v1/subtitles?api_key=public&imdb_id=tt1375666&languages=he`);
    console.log("SubDL status:", res.status);
    const data = await res.json();
    console.log("SubDL results count:", data.subtitles?.length || 0);
  } catch (e) {
    console.error("SubDL error:", e.message);
  }
}
test();
