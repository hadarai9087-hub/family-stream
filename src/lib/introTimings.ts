/**
 * Smart Intro Timings Resolver for TV Series & Anime.
 * Combines IntroDB (Netflix/Plex crowdsourced intro marks), AniSkip,
 * and curated TV databases to deliver precise Netflix-style "Skip Intro" seeking.
 */

export interface IntroTimingResult {
  start: number; // in seconds
  end: number;   // in seconds
  source: "introdb" | "aniskip" | "known" | "standard";
}

// Curated accurate intro timestamps for popular TV shows (seconds)
export const KNOWN_TV_INTROS: Record<number, { start: number; end: number }> = {
  1399: { start: 100, end: 195 }, // Game of Thrones
  1396: { start: 140, end: 165 }, // Breaking Bad
  66732: { start: 90, end: 170 }, // Stranger Things
  76479: { start: 65, end: 105 }, // The Boys
  94997: { start: 110, end: 195 }, // House of the Dragon
  60059: { start: 120, end: 145 }, // Better Call Saul
  1429: { start: 90, end: 180 }, // Attack on Titan
  60625: { start: 70, end: 115 }, // Rick and Morty
  100088: { start: 95, end: 180 }, // The Last of Us
  76331: { start: 90, end: 185 }, // Succession
  1668: { start: 50, end: 105 }, // Friends
  2316: { start: 60, end: 100 }, // The Office
  60574: { start: 80, end: 140 }, // Peaky Blinders
  1405: { start: 60, end: 155 }, // Dexter
  70523: { start: 90, end: 165 }, // Dark
  19885: { start: 90, end: 150 }, // Sherlock
  61222: { start: 50, end: 110 }, // BoJack Horseman
  94605: { start: 80, end: 170 }, // Arcane
};

export async function resolveIntroTiming(
  tmdbId: number,
  season: number = 1,
  episode: number = 1
): Promise<IntroTimingResult> {
  // 1. Try local API route that integrates IntroDB + AniSkip + TMDB
  try {
    const res = await fetch(`/api/intro?tmdbId=${tmdbId}&season=${season}&episode=${episode}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.start != null && data?.end != null) {
        return {
          start: data.start,
          end: data.end,
          source: data.source || "introdb",
        };
      }
    }
  } catch {
    // Continue to client fallback
  }

  // 2. Client fallback: Known TV show database
  if (KNOWN_TV_INTROS[tmdbId]) {
    return {
      ...KNOWN_TV_INTROS[tmdbId],
      source: "known",
    };
  }

  // 3. Fallback: Standard HBO / Netflix window
  return {
    start: 15,
    end: 95,
    source: "standard",
  };
}
