import { StreamSource, MediaType } from "@/types";

export interface StreamResolutionOptions {
  tmdbId: number;
  mediaType: MediaType;
  season?: number;
  episode?: number;
  startAt?: number;
  resumeSeconds?: number;
  subtitleUrl?: string;
  subtitleLabel?: string;
}

export interface ProviderTierInfo {
  tier: number;
  name: string;
  badge: string;
}

export const PROVIDER_TIERS: Record<number, ProviderTierInfo> = {
  1: { tier: 1, name: "שרתי עילית (FHD / 4K ישירים)", badge: "Tier 1" },
  2: { tier: 2, name: "שרתי הזרמה ייעודיים ונקיים", badge: "Tier 2" },
  3: { tier: 3, name: "שרתי CDN ורשתות הפצה עולמיות", badge: "Tier 3" },
  4: { tier: 4, name: "שרתי גיבוי ורב-מקורות", badge: "Tier 4" },
};

/**
 * Returns verified, live dedicated streaming servers without anti-sandbox blockers.
 * Excludes dead providers and anti-sandbox blockers (vidlink.pro, streamingunity, embed.su, vixcloud.co).
 */
export function resolveStreamSources(options: StreamResolutionOptions): StreamSource[] {
  const {
    tmdbId,
    mediaType,
    season = 1,
    episode = 1,
    startAt,
    resumeSeconds,
    subtitleUrl,
    subtitleLabel = "עברית",
  } = options;

  const isMovie = mediaType === "movie";
  const resumePos = Math.floor(startAt ?? resumeSeconds ?? 0);
  const startParam = resumePos > 0 ? `&startAt=${resumePos}` : "";
  const startQuery = resumePos > 0 ? `?startAt=${resumePos}` : "";

  let fullSubtitleUrl = subtitleUrl;
  if (fullSubtitleUrl && fullSubtitleUrl.startsWith("/") && typeof window !== "undefined") {
    fullSubtitleUrl = `${window.location.origin}${fullSubtitleUrl}`;
  }

  const subParam = fullSubtitleUrl
    ? `&sub_file=${encodeURIComponent(fullSubtitleUrl)}&sub_label=${encodeURIComponent(subtitleLabel)}`
    : "";

  const sources: StreamSource[] = [
    // -------------------------------------------------------------
    // Tier 1: Dedicated Clean Servers (Direct, fast, sandboxed)
    // -------------------------------------------------------------
    {
      id: "pressplayx",
      name: "PressPlay (שרת ראשי ייעודי)",
      type: "embed",
      tier: 1,
      sandboxed: true,
      quality: "1080p FHD",
      url: isMovie
        ? `https://moviesapi.to/movie/${tmdbId}?theme=e50914${startParam}${subParam}`
        : `https://moviesapi.to/tv/${tmdbId}-${season}-${episode}?theme=e50914${startParam}${subParam}`,
    },
    {
      id: "autoembed-direct",
      name: "AutoEmbed Direct (נגן ישיר תומך כתוביות)",
      type: "embed",
      tier: 1,
      sandboxed: true,
      quality: "1080p HD",
      url: isMovie
        ? `https://player.autoembed.co/embed/movie/${tmdbId}${startQuery ? `${startQuery}${subParam}` : subParam ? `?${subParam.slice(1)}` : ""}`
        : `https://player.autoembed.co/embed/tv/${tmdbId}/${season}-${episode}/${startQuery ? `${startQuery}${subParam}` : subParam ? `?${subParam.slice(1)}` : ""}`,
    },
    {
      id: "vidsrc-pm",
      name: "VidSrc Pro (Vidflix)",
      type: "embed",
      tier: 1,
      sandboxed: true,
      quality: "1080p FHD",
      url: isMovie
        ? `https://vidsrc.pm/embed/movie/${tmdbId}${startQuery}`
        : `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}${startQuery}`,
    },
    {
      id: "flixtrz",
      name: "Flixtrz (שרת ייעודי מהיר)",
      type: "embed",
      tier: 1,
      sandboxed: true,
      quality: "1080p HD",
      url: isMovie
        ? `https://flixtrz.to/embed/movie/${tmdbId}${startQuery}`
        : `https://flixtrz.to/embed/tv/${tmdbId}/${season}/${episode}${startQuery}`,
    },
    {
      id: "cinecat-engine",
      name: "Cinecat Engine (שרת עילית)",
      type: "embed",
      tier: 1,
      sandboxed: true,
      quality: "1080p FHD",
      url: isMovie
        ? `https://beta.cinecat.eu/media/tmdb-movie-${tmdbId}${startQuery}`
        : `https://beta.cinecat.eu/media/tmdb-tv-${tmdbId}/${season}/${episode}${startQuery}`,
    },
    {
      id: "atlantic-server",
      name: "Atlantic Server (הזרמה יציבה)",
      type: "embed",
      tier: 1,
      sandboxed: true,
      quality: "1080p HD",
      url: isMovie
        ? `https://atlantic.st/watch-movie/${tmdbId}${startQuery}`
        : `https://atlantic.st/watch-tv/${tmdbId}?season=${season}&episode=${episode}${startParam}`,
    },

    // -------------------------------------------------------------
    // Tier 3: Broad Catalog Global CDNs (Massive library coverage)
    // -------------------------------------------------------------
    {
      id: "vidsrc-to",
      name: "VidSrc.to (CDN עולמי)",
      type: "embed",
      tier: 3,
      sandboxed: true,
      quality: "1080p HD",
      url: isMovie
        ? `https://vidsrc.to/embed/movie/${tmdbId}${startQuery}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}${startQuery}`,
    },
    {
      id: "vidsrc-me",
      name: "VidSrc Classic Mirror",
      type: "embed",
      tier: 3,
      sandboxed: true,
      quality: "1080p",
      url: isMovie
        ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}${startParam}`
        : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}${startParam}`,
    },

    // -------------------------------------------------------------
    // Tier 4: Deep Archive & Multi-Host Aggregators (Emergency redundancy)
    // -------------------------------------------------------------
    {
      id: "multiembed",
      name: "MultiEmbed (רב-שרת גיבוי)",
      type: "embed",
      tier: 4,
      sandboxed: true,
      quality: "1080p Auto",
      url: isMovie
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1${startParam}`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}${startParam}`,
    },
    {
      id: "2embed-global",
      name: "2Embed Global",
      type: "embed",
      tier: 4,
      sandboxed: true,
      quality: "720p / 1080p",
      url: isMovie
        ? `https://www.2embed.cc/embed/${tmdbId}${startQuery}`
        : `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}${startParam}`,
    },
    {
      id: "smashystream",
      name: "SmashyStream",
      type: "embed",
      tier: 4,
      sandboxed: true,
      quality: "HD",
      url: isMovie
        ? `https://player.smashystream.com/movie/${tmdbId}${resumePos > 0 ? `?startTime=${resumePos}` : ""}`
        : `https://player.smashystream.com/tv/${tmdbId}?s=${season}&e=${episode}${resumePos > 0 ? `&startTime=${resumePos}` : ""}`,
    },
  ];

  return sources;
}
