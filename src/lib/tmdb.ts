import { MediaItem, Episode } from "@/types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
// Public key or env key:
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "8265bd1679663a7ea12ac168da84d2e8"; // High-availability public fallback key

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getImageUrl(path: string | null | undefined, size: "w300" | "w500" | "w780" | "w1280" | "original" = "w500"): string {
  if (!path) return "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=60";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

async function fetchFromTmdb<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  try {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "he-IL");
    url.searchParams.set("include_adult", "false");

    for (const [key, val] of Object.entries(params)) {
      url.searchParams.set(key, val);
    }

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // Fallback to English if Hebrew request fails
      url.searchParams.set("language", "en-US");
      const fallbackRes = await fetch(url.toString());
      if (!fallbackRes.ok) return null;
      return (await fallbackRes.json()) as T;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error("TMDB fetch error:", err);
    return null;
  }
}

export async function getTrending(): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>("/trending/all/day");
  if (!data?.results) return getMockFeatured();

  return data.results.map((item) => formatMediaItem(item));
}

export async function getPopularMovies(): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>("/movie/popular");
  if (!data?.results) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: "movie" }));
}

export async function getPopularTv(): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>("/tv/popular");
  if (!data?.results) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: "tv" }));
}

export async function getTopRated(): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>("/movie/top_rated");
  if (!data?.results) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: "movie" }));
}

export async function getMoviesByGenre(genreId: number): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>("/discover/movie", {
    with_genres: genreId.toString(),
    sort_by: "popularity.desc",
  });
  if (!data?.results) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: "movie" }));
}

export async function searchMedia(query: string): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  const data = await fetchFromTmdb<{ results: any[] }>("/search/multi", {
    query: query.trim(),
  });
  if (!data?.results) return [];
  return data.results
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) => formatMediaItem(item));
}

export async function getMediaDetails(id: number, mediaType: "movie" | "tv"): Promise<MediaItem | null> {
  const data = await fetchFromTmdb<any>(`/${mediaType}/${id}`, {
    append_to_response: "videos,credits",
  });

  if (!data) return null;

  const item = formatMediaItem({ ...data, media_type: mediaType });
  const trailers = data.videos?.results || [];
  const trailer = trailers.find((v: any) => v.type === "Trailer" && v.site === "YouTube") || trailers[0];
  if (trailer) {
    item.trailer_key = trailer.key;
  }

  return item;
}

export async function getSeasonEpisodes(tvId: number, seasonNumber: number): Promise<Episode[]> {
  const [heData, enData] = await Promise.all([
    fetchFromTmdb<any>(`/tv/${tvId}/season/${seasonNumber}`, { language: "he-IL" }),
    fetchFromTmdb<any>(`/tv/${tvId}/season/${seasonNumber}`, { language: "en-US" }),
  ]);

  const episodesSource = heData?.episodes || enData?.episodes;
  if (!episodesSource || episodesSource.length === 0) return [];

  const enEpMap = new Map<number, any>();
  if (enData?.episodes) {
    for (const ep of enData.episodes) {
      enEpMap.set(ep.episode_number, ep);
    }
  }

  return episodesSource.map((ep: any) => {
    const enEp = enEpMap.get(ep.episode_number);

    // Prefer Hebrew name if present and not generic; otherwise fall back to English title
    const isGenericHebrewName = !ep.name || ep.name === `פרק ${ep.episode_number}` || ep.name === `Episode ${ep.episode_number}`;
    const name = !isGenericHebrewName ? ep.name : (enEp?.name || ep.name || `פרק ${ep.episode_number}`);

    // Overview fallback: if Hebrew is empty, use English summary
    const overview = ep.overview?.trim()
      ? ep.overview.trim()
      : (enEp?.overview?.trim() || "תקציר הפרק זמין לצפייה בשידור חי.");

    // Still image: if Hebrew payload has no still_path, use English payload still_path
    const still_path = ep.still_path || enEp?.still_path || null;

    return {
      id: ep.id,
      episode_number: ep.episode_number,
      season_number: ep.season_number,
      name,
      overview,
      still_path,
      runtime: ep.runtime || enEp?.runtime,
      vote_average: ep.vote_average || enEp?.vote_average,
    };
  });
}

export async function getMovieRecommendations(movieId: number): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>(`/movie/${movieId}/recommendations`);
  if (!data?.results || data.results.length === 0) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: "movie" }));
}

export async function getTvRecommendations(tvId: number): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>(`/tv/${tvId}/recommendations`);
  if (!data?.results || data.results.length === 0) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: "tv" }));
}

export async function getSimilarMovies(movieId: number): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>(`/movie/${movieId}/similar`);
  if (!data?.results || data.results.length === 0) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: "movie" }));
}

export async function getSimilarTv(tvId: number): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>(`/tv/${tvId}/similar`);
  if (!data?.results || data.results.length === 0) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: "tv" }));
}

export async function getDiscoverMedia(
  mediaType: "movie" | "tv",
  params: Record<string, string> = {}
): Promise<MediaItem[]> {
  const data = await fetchFromTmdb<{ results: any[] }>(`/discover/${mediaType}`, {
    sort_by: "popularity.desc",
    ...params,
  });
  if (!data?.results) return [];
  return data.results.map((item) => formatMediaItem({ ...item, media_type: mediaType }));
}

function formatMediaItem(item: any): MediaItem {
  return {
    id: item.id,
    tmdb_id: item.id,
    title: item.title || item.name || "ללא שם",
    original_title: item.original_title || item.original_name,
    name: item.name,
    overview: item.overview || "סרט / סדרה פופולריים מבית נטפליקס.",
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    media_type: item.media_type || (item.first_air_date ? "tv" : "movie"),
    release_date: item.release_date || item.first_air_date,
    vote_average: Math.round((item.vote_average || 7.5) * 10) / 10,
    genre_ids: item.genre_ids,
    genres: item.genres,
    runtime: item.runtime,
    number_of_seasons: item.number_of_seasons,
    number_of_episodes: item.number_of_episodes,
  };
}

export function getMockFeatured(): MediaItem[] {
  return [
    {
      id: 12824,
      tmdb_id: 634649,
      title: "ספיידרמן: אין דרך הביתה",
      original_title: "Spider-Man: No Way Home",
      overview: "לראשונה בהיסטוריה הקולנועית של ספיידרמן, זהותו של הגיבור השכונתי החביב נחשפת, והוא אינו מסוגל להפריד בין חייו הרגילים לסיכונים הכרוכים בלהיות גיבור-על.",
      poster_path: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
      backdrop_path: "/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg",
      media_type: "movie",
      release_date: "2021-12-17",
      vote_average: 8.5,
      genres: [{ id: 28, name: "פעולה" }, { id: 12, name: "הרפתקאות" }],
      trailer_key: "JfVOs4VSpmA",
    },
    {
      id: 66732,
      tmdb_id: 66732,
      title: "דברים מוזרים",
      original_title: "Stranger Things",
      overview: "כשילד צעיר נעלם כלא היה, עיירה שלמה חושפת תעלומה שכוללת ניסויים סודיים, כוחות על-טבעיים מבהילים וילדה קטנה ומוזרה אחת.",
      poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
      backdrop_path: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
      media_type: "tv",
      release_date: "2016-07-15",
      vote_average: 8.6,
      genres: [{ id: 18, name: "דרמה" }, { id: 9648, name: "מסתורין" }],
      trailer_key: "b9EkMc79ZSU",
    },
  ];
}
