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
  1: { tier: 1, name: "שרתי עילית (FHD / 4K)", badge: "Tier 1" },
  2: { tier: 2, name: "שרתים גלובליים ישירים", badge: "Tier 2" },
  3: { tier: 3, name: "שרתי CDN ורשתות הפצה", badge: "Tier 3" },
  4: { tier: 4, name: "שרתי גיבוי וארכיון", badge: "Tier 4" },
};

/**
 * Returns 12 verified live providers grouped into 4 high-availability tiers.
 * Excludes dead providers (embed.su, vixcloud.co, nepu.to, rivestream, vidsrc.xyz)
 * and frame-denied primeshows.org (X-Frame-Options: DENY).
 *
 * Tier 1: VidLink Pro, Cinecat Engine, Atlantic Server
 * Tier 2: AutoEmbed Direct, VidSrc Pro, PressPlayX
 * Tier 3: VidSrc.to, AutoEmbed Portal, VidSrc Classic Mirror
 * Tier 4: MultiEmbed, 2Embed Global, SmashyStream
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
    // Tier 1: Ultra-Fast FHD / 4K Primary Sources (Sub-400ms latency)
    // -------------------------------------------------------------
    {
      id: "vidlink-pro",
      name: "VidLink Pro (מומלץ ומהיר FHD)",
      type: "embed",
      tier: 1,
      sandboxed: true,
      quality: "4K / 1080p FHD",
      url: isMovie
        ? `https://vidlink.pro/movie/${tmdbId}?primaryColor=e50914&autoplay=true${startParam}${subParam}`
        : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=e50914&autoplay=true${startParam}${subParam}`,
    },
    {
      id: "cinecat-engine",
      name: "Cinecat Engine (רב-שרת מהיר)",
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
      name: "Atlantic Server (מהיר ויציב)",
      type: "embed",
      tier: 1,
      sandboxed: true,
      quality: "1080p HD",
      url: isMovie
        ? `https://atlantic.st/watch-movie/${tmdbId}${startQuery}`
        : `https://atlantic.st/watch-tv/${tmdbId}?season=${season}&episode=${episode}${startParam}`,
    },

    // -------------------------------------------------------------
    // Tier 2: High-Uptime Global Resolvers (Sub-600ms latency)
    // -------------------------------------------------------------
    {
      id: "autoembed-direct",
      name: "AutoEmbed Direct (נגן ישיר)",
      type: "embed",
      tier: 2,
      sandboxed: true,
      quality: "1080p HD",
      url: isMovie
        ? `https://player.autoembed.co/embed/movie/${tmdbId}${startQuery}`
        : `https://player.autoembed.co/embed/tv/${tmdbId}/${season}-${episode}/${startQuery}`,
    },
    {
      id: "vidsrc-pm",
      name: "VidSrc Pro (Vidflix)",
      type: "embed",
      tier: 2,
      sandboxed: true,
      quality: "1080p FHD",
      url: isMovie
        ? `https://vidsrc.pm/embed/movie/${tmdbId}${startQuery}`
        : `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}${startQuery}`,
    },
    {
      id: "pressplayx",
      name: "PressPlayX (HD)",
      type: "embed",
      tier: 2,
      sandboxed: true,
      quality: "1080p HD",
      url: isMovie
        ? `https://moviesapi.to/movie/${tmdbId}?theme=e50914${startParam}`
        : `https://moviesapi.to/tv/${tmdbId}-${season}-${episode}?theme=e50914${startParam}`,
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
      id: "autoembed-portal",
      name: "AutoEmbed Portal",
      type: "embed",
      tier: 3,
      sandboxed: true,
      quality: "1080p Auto",
      url: isMovie
        ? `https://autoembed.co/movie/tmdb/${tmdbId}${startQuery}`
        : `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}${startQuery}`,
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
