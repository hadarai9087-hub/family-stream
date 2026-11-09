import { NextRequest, NextResponse } from "next/server";
import { MediaType } from "@/types";

export const dynamic = "force-dynamic";

interface StremioSubtitle {
  id: string;
  url: string;
  SubEncoding?: string;
  lang: string;
  subtitleFileName?: string;
  movieReleaseName?: string;
  releaseGroup?: string;
  season?: number;
  episode?: number;
}

interface OpenSubtitlesRestItem {
  IDSubtitleFile?: string;
  SubFileName?: string;
  SubDownloadLink?: string;
  SubEncoding?: string;
  MovieReleaseName?: string;
  LanguageName?: string;
}

interface NovaSubtitleItem {
  label?: string;
  file?: string;
}

interface WizdomMovieSub {
  id: number;
  version?: string;
  format?: string;
  release_group?: string;
}

interface WizdomTvSub {
  id: number;
  version?: string;
  resolution?: string;
  format?: string;
  release_group?: string;
}

async function getImdbId(tmdbId: number, mediaType: MediaType): Promise<string | null> {
  const apiKey =
    process.env.TMDB_API_KEY ||
    process.env.NEXT_PUBLIC_TMDB_API_KEY ||
    "8265bd1679663a7ea12ac168da84d2e8";

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.imdb_id || null;
  } catch (err) {
    console.error("Error fetching IMDB ID from TMDB:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tmdbIdParam = searchParams.get("tmdbId");
    let imdbId = searchParams.get("imdbId");
    const mediaType: MediaType = searchParams.get("type") === "tv" ? "tv" : "movie";
    const season = searchParams.get("season") ? parseInt(searchParams.get("season")!, 10) : 1;
    const episode = searchParams.get("episode") ? parseInt(searchParams.get("episode")!, 10) : 1;
    const lang = searchParams.get("lang") || "he";

    if (!tmdbIdParam && !imdbId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: tmdbId or imdbId" },
        { status: 400 }
      );
    }

    const tmdbId = tmdbIdParam ? parseInt(tmdbIdParam, 10) : 0;

    // Resolve IMDb ID if not provided
    if (!imdbId && tmdbId > 0) {
      imdbId = await getImdbId(tmdbId, mediaType);
    }

    const cleanImdbNumeric = imdbId ? imdbId.replace(/^tt/i, "") : null;

    const formattedTracks: Array<{
      id: string;
      source: "stremio" | "wizdom" | "opensubtitles" | "manual";
      label: string;
      language: string;
      url: string;
      encoding: string;
      isDefault?: boolean;
    }> = [];

    // 1. Query OpenSubtitles Public REST Endpoint (zero key required)
    const openSubsPromise = (async () => {
      if (!cleanImdbNumeric) return [];
      try {
        const queryUrl =
          mediaType === "movie"
            ? `https://rest.opensubtitles.org/search/imdbid-${cleanImdbNumeric}/sublanguageid-heb`
            : `https://rest.opensubtitles.org/search/imdbid-${cleanImdbNumeric}/season-${season}/episode-${episode}/sublanguageid-heb`;

        const res = await fetch(queryUrl, {
          headers: {
            "User-Agent": "TemporaryUserAgent",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(4500),
        });

        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return (data as OpenSubtitlesRestItem[]).slice(0, 10).map((item, idx) => {
          const downloadUrl = item.SubDownloadLink || "";
          const encoding = item.SubEncoding || "CP1255";
          const title = item.MovieReleaseName || item.SubFileName || `גרסה ${idx + 1}`;
          return {
            id: `opensubs-${item.IDSubtitleFile || idx}`,
            source: "opensubtitles" as const,
            label: `עברית (OpenSubtitles - ${title.slice(0, 38)})`,
            language: "he",
            url: `/api/subtitles/download?url=${encodeURIComponent(downloadUrl)}&encoding=${encodeURIComponent(encoding)}`,
            encoding: encoding.toLowerCase(),
            isDefault: idx === 0,
          };
        });
      } catch {
        return [];
      }
    })();

    // 2. Query Nova / VidSrc Subtitle Endpoint
    const novaPromise = (async () => {
      if (tmdbId <= 0) return [];
      try {
        const novaUrl =
          mediaType === "movie"
            ? `https://sub.vdrk.site/v1/movie/${tmdbId}`
            : `https://sub.vdrk.site/v1/tv/${tmdbId}/${season}/${episode}`;

        const res = await fetch(novaUrl, {
          signal: AbortSignal.timeout(4000),
        });

        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return (data as NovaSubtitleItem[])
          .filter((item) => {
            const label = (item.label || "").toLowerCase();
            return label.includes("hebrew") || label.includes("heb") || label === "he";
          })
          .map((item, idx) => ({
            id: `nova-heb-${idx}`,
            source: "opensubtitles" as const,
            label: `עברית (Nova - ${item.label || "VTT"})`,
            language: "he",
            url: `/api/subtitles/download?url=${encodeURIComponent(item.file || "")}&encoding=utf-8`,
            encoding: "utf-8",
            isDefault: false,
          }));
      } catch {
        return [];
      }
    })();

    // 3. Query Stremio OpenSubtitles v3 Public Proxy
    const stremioPromise = (async () => {
      if (!imdbId) return [];
      try {
        const stremioUrl =
          mediaType === "movie"
            ? `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`
            : `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season}:${episode}.json`;

        const res = await fetch(stremioUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(4500),
        });

        if (!res.ok) return [];
        const data = await res.json();
        const list: StremioSubtitle[] = data.subtitles || [];

        return list
          .filter((s) => s.lang === "heb" || s.lang === "he")
          .slice(0, 10)
          .map((s, index) => {
            const rel = s.releaseGroup || s.movieReleaseName || s.subtitleFileName || `גרסה ${index + 1}`;
            return {
              id: `stremio-${s.id || index}`,
              source: "stremio" as const,
              label: `עברית (Stremio - ${rel.slice(0, 36)})`,
              language: "he",
              url: `/api/subtitles/download?url=${encodeURIComponent(s.url)}&encoding=utf-8`,
              encoding: "utf-8",
              isDefault: false,
            };
          });
      } catch {
        return [];
      }
    })();

    // 4. Query Wizdom Subs (Israeli Community Releases)
    const wizdomPromise = (async () => {
      if (!imdbId) return [];
      try {
        const wizdomUrl = `https://wizdom.xyz/api/releases/${imdbId}`;
        const res = await fetch(wizdomUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(4500),
        });

        if (!res.ok) return [];
        const data = await res.json();

        if (mediaType === "movie" && Array.isArray(data.subs)) {
          return (data.subs as WizdomMovieSub[]).slice(0, 8).map((sub, idx) => ({
            id: `wizdom-${sub.id}`,
            source: "wizdom" as const,
            label: `עברית (Wizdom - ${sub.version || sub.release_group || `גרסה ${idx + 1}`})`,
            language: "he",
            url: `/api/subtitles/download?wizdomId=${sub.id}&encoding=windows-1255`,
            encoding: "windows-1255",
            isDefault: false,
          }));
        } else if (mediaType === "tv" && data.subs) {
          const seasonKey = String(season);
          const episodeKey = String(episode);
          const epSubs = data.subs[seasonKey]?.[episodeKey];
          if (Array.isArray(epSubs)) {
            return (epSubs as WizdomTvSub[]).slice(0, 8).map((sub, idx) => ({
              id: `wizdom-${sub.id}`,
              source: "wizdom" as const,
              label: `עברית (Wizdom - ${sub.version || sub.release_group || `גרסה ${idx + 1}`})`,
              language: "he",
              url: `/api/subtitles/download?wizdomId=${sub.id}&encoding=windows-1255`,
              encoding: "windows-1255",
              isDefault: false,
            }));
          }
        }
        return [];
      } catch {
        return [];
      }
    })();

    const [openSubs, novaSubs, stremioSubs, wizdomSubs] = await Promise.all([
      openSubsPromise,
      novaPromise,
      stremioPromise,
      wizdomPromise,
    ]);

    formattedTracks.push(...openSubs);
    formattedTracks.push(...novaSubs);
    formattedTracks.push(...stremioSubs);
    formattedTracks.push(...wizdomSubs);

    // If no tracks were found, add fallback track
    if (formattedTracks.length === 0) {
      formattedTracks.push({
        id: "auto-heb-1",
        source: "manual",
        label: "עברית (תרגום אוטומטי)",
        language: "he",
        url: `/api/subtitles/download?tmdbId=${tmdbId}&type=${mediaType}&season=${season}&episode=${episode}&lang=he`,
        encoding: "utf-8",
        isDefault: true,
      });
    }

    // Ensure at least one track is marked default
    if (formattedTracks.length > 0 && !formattedTracks.some((t) => t.isDefault)) {
      formattedTracks[0].isDefault = true;
    }

    return NextResponse.json(
      {
        success: true,
        tmdbId,
        imdbId,
        mediaType,
        season: mediaType === "tv" ? season : undefined,
        episode: mediaType === "tv" ? episode : undefined,
        lang,
        total: formattedTracks.length,
        subtitles: formattedTracks,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
