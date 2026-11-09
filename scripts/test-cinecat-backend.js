const fs = require('fs');

async function testCinecatBackend() {
  const tmdbId = 246; // Avatar
  const testUrls = [
    'https://backend.cinecat.eu/scrape',
    'https://backend.cinecat.eu/sources',
    'https://backend.cinecat.eu/providers',
    'https://backend.cinecat.eu/movie/246',
    'https://backend.cinecat.eu/tv/246/1/1',
    'https://backend.cinecat.eu/api/sources',
    'https://backend.cinecat.eu/api/providers',
  ];

  for (const u of testUrls) {
    try {
      const res = await fetch(u);
      console.log(u, '->', res.status);
      if (res.ok) {
        const text = await res.text();
        console.log('Response:', text.slice(0, 300));
      }
    } catch(e) {
      console.log(u, '-> error:', e.message);
    }
  }
}

testCinecatBackend();
