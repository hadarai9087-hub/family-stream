import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Curated accurate intro timestamps for popular TV shows (seconds)
const KNOWN_TV_INTROS: Record<number, { start: number; end: number }> = {
  // Game of Thrones (TMDB 1399)
  1399: { start: 100, end: 195 },
  // Breaking Bad (TMDB 1396)
  1396: { start: 140, end: 165 },
  // Stranger Things (TMDB 66732)
  66732: { start: 90, end: 170 },
  // The Boys (TMDB 76479)
  76479: { start: 65, end: 105 },
  // House of the Dragon (TMDB 94997)
  94997: { start: 110, end: 195 },
  // Better Call Saul (TMDB 60059)
  60059: { start: 120, end: 145 },
  // Attack on Titan (TMDB 1429)
  1429: { start: 90, end: 180 },
  // Rick and Morty (TMDB 60625)
  60625: { start: 70, end: 115 },
  // The Last of Us (TMDB 100088)
  100088: { start: 95, end: 180 },
  // Succession (TMDB 76331)
  76331: { start: 90, end: 185 },
  // Friends (TMDB 1668)
  1668: { start: 50, end: 105 },
  // The Office (TMDB 2316)
  2316: { start: 60, end: 100 },
  // Peaky Blinders (TMDB 60574)
  60574: { start: 80, end: 140 },
  // Dexter (TMDB 1405)
  1405: { start: 60, end: 155 },
  // Dark (TMDB 70523)
  70523: { start: 90, end: 165 },
  // Sherlock (TMDB 19885)
  19885: { start: 90, end: 150 },
  // BoJack Horseman (TMDB 61222)
  61222: { start: 50, end: 110 },
  // Arcane (TMDB 94605)
  94605: { start: 80, end: 170 },
};

async function getImdbId(tmdbId: number): Promise<string | null> {
  const apiKey =
    process.env.TMDB_API_KEY ||
    process.env.NEXT_PUBLIC_TMDB_API_KEY ||
    "8265bd1679663a7ea12ac168da84d2e8";

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${apiKey}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.imdb_id || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tmdbIdParam = searchParams.get("tmdbId");
    const season = Math.max(1, parseInt(searchParams.get("season") || "1", 10));
    const episode = Math.max(1, parseInt(searchParams.get("episode") || "1", 10));

    if (!tmdbIdParam) {
      return NextResponse.json(
        { success: false, error: "Missing tmdbId" },
        { status: 400 }
      );
    }

    const tmdbId = parseInt(tmdbIdParam, 10);

    // 1. Check IntroDB using IMDB ID (Netflix/Jellyfin/Plex community intro database)
    const imdbId = await getImdbId(tmdbId);
    if (imdbId) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        const introRes = await fetch(
          `https://api.introdb.app/segments?imdb_id=${encodeURIComponent(imdbId)}&season=${season}&episode=${episode}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (introRes.ok) {
          const introData = await introRes.json();
          if (introData?.intro?.start_sec != null && introData?.intro?.end_sec != null) {
            return NextResponse.json({
              success: true,
              start: Math.floor(introData.intro.start_sec),
              end: Math.ceil(introData.intro.end_sec),
              source: "introdb",
              confidence: introData.intro.confidence || 1,
            });
          }
        }
      } catch {
        // Fall through to next providers
      }
    }

    // 2. Check AniSkip API for Anime Titles
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const aniskipUrl = `https://api.aniskip.com/v2/skip-times/${tmdbId}/${episode}?types=op`;
      const res = await fetch(aniskipUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data?.found && data?.results?.[0]?.interval) {
          const interval = data.results[0].interval;
          return NextResponse.json({
            success: true,
            start: Math.floor(interval.startTime),
            end: Math.ceil(interval.endTime),
            source: "aniskip",
          });
        }
      }
    } catch {
      // Fall through
    }

    // 3. Known TV Show Database
    if (KNOWN_TV_INTROS[tmdbId]) {
      return NextResponse.json({
        success: true,
        ...KNOWN_TV_INTROS[tmdbId],
        source: "known",
      });
    }

    // 4. Standard HBO/Netflix TV window fallback
    return NextResponse.json({
      success: true,
      start: 15,
      end: 95,
      source: "standard",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
