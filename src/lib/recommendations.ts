import { MediaItem, WatchProgress } from "@/types";
import {
  getTrending,
  getTopRated,
  getMovieRecommendations,
  getTvRecommendations,
  getSimilarMovies,
  getSimilarTv,
  getDiscoverMedia,
} from "./tmdb";

export interface GenreMeta {
  id: number;
  name: string;
  emoji: string;
}

export const HEBREW_GENRES: GenreMeta[] = [
  { id: 28, name: "פעולה ואקשן", emoji: "💥" },
  { id: 878, name: "מד\"ב ופנטזיה", emoji: "🚀" },
  { id: 35, name: "קומדיה", emoji: "😂" },
  { id: 18, name: "דרמה", emoji: "🎭" },
  { id: 53, name: "מתח ומסתורין", emoji: "🔍" },
  { id: 16, name: "אנימציה", emoji: "🎨" },
  { id: 80, name: "פשע", emoji: "🔪" },
  { id: 99, name: "דוקומנטרי", emoji: "🌍" },
];

/**
 * Curated high-affinity fallback catalog for cold start and offline states.
 */
export const CURATED_COLD_START_CATALOG: MediaItem[] = [
  {
    id: 634649,
    tmdb_id: 634649,
    title: "ספיידרמן: אין דרך הביתה",
    original_title: "Spider-Man: No Way Home",
    overview: "לראשונה בהיסטוריה הקולנועית של ספיידרמן, זהותו של הגיבור השכונתי החביב נחשפת, והוא אינו מסוגל להפריד בין חייו הרגילים לסיכונים הכרוכים בלהיות גיבור-על.",
    poster_path: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
    backdrop_path: "/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg",
    media_type: "movie",
    release_date: "2021-12-17",
    vote_average: 8.5,
    genre_ids: [28, 12, 878],
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
    genre_ids: [18, 9648, 10765],
  },
  {
    id: 157336,
    tmdb_id: 157336,
    title: "בין כוכבים",
    original_title: "Interstellar",
    overview: "צוות חוקרים יוצא למסע הנועז ביותר בהיסטוריה האנושית: מסע מעבר לגלקסיה הזו כדי לגלות האם לאנושות יש עתיד בין הכוכבים.",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    media_type: "movie",
    release_date: "2014-11-05",
    vote_average: 8.4,
    genre_ids: [12, 18, 878],
  },
  {
    id: 1396,
    tmdb_id: 1396,
    title: "שובר שורות",
    original_title: "Breaking Bad",
    overview: "מורה לכימיה בתיכון המאובחן בסרטן ריאות סופני חובר לתלמיד לשעבר כדי לייצר ולמכור מתאמפטמין במטרה להבטיח את עתידה הכלכלי של משפחתו.",
    poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdrop_path: "/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg",
    media_type: "tv",
    release_date: "2008-01-20",
    vote_average: 8.9,
    genre_ids: [18, 80],
  },
  {
    id: 299534,
    tmdb_id: 299534,
    title: "הנוקמים: סוף המשחק",
    original_title: "Avengers: Endgame",
    overview: "לאחר האירועים ההרסניים של הנוקמים: מלחמת האינסוף, היקום חרב. בעזרת בני ברית ששרדו, הנוקמים מתאספים שוב כדי להפוך את מעשיו של תאנוס.",
    poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdrop_path: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    media_type: "movie",
    release_date: "2019-04-24",
    vote_average: 8.3,
    genre_ids: [12, 878, 28],
  },
  {
    id: 129,
    tmdb_id: 129,
    title: "המסע המופלא",
    original_title: "Spirited Away",
    overview: "צ'יהירו בת ה-10 נכנסת יחד עם הוריה לעולם מסתורי של רוחות ואלים. לאחר שהוריה הופכים לחזירים, עליה למצוא אומץ לעבוד במרחצאות קסומים כדי להצילם.",
    poster_path: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    backdrop_path: "/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg",
    media_type: "movie",
    release_date: "2001-07-20",
    vote_average: 8.5,
    genre_ids: [16, 10751, 14],
  },
  {
    id: 42009,
    tmdb_id: 42009,
    title: "מראה שחורה",
    original_title: "Black Mirror",
    overview: "סדרת אנתולוגיה החוקרת עולם מעוות שבו המצאות טכנולוגיות מתקדמות מתנגשות עם היצרים האפלים ביותר של האנושות.",
    poster_path: "/seNCtzZq2rAcmcqzB49KGQIAhUg.jpg",
    backdrop_path: "/5hX093p7lTjYv75JtK8KxRlh3c.jpg",
    media_type: "tv",
    release_date: "2011-12-04",
    vote_average: 8.3,
    genre_ids: [18, 878, 9648],
  },
  {
    id: 155,
    tmdb_id: 155,
    title: "האביר האפל",
    original_title: "The Dark Knight",
    overview: "באטמן יוצא לקרב גורלי על נשמתה של גות'אם סיטי מול הג'וקר, גאון פסיכופט המבקש להטיל כאוס מוחלט על העיר.",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop_path: "/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
    media_type: "movie",
    release_date: "2008-07-16",
    vote_average: 8.5,
    genre_ids: [18, 28, 80, 53],
  },
];

export interface RecommendationScoringOptions {
  userId: string;
  preferredGenres?: number[];
  watchHistory?: WatchProgress[];
  watchlist?: MediaItem[];
  catalogCandidates?: MediaItem[];
}

/**
 * Computes genre affinity weight map from explicit preferences, watch duration, and watchlist.
 *
 * Weight(g) = 3.0 * [g in ExplicitLiked] + sum_h (percentage/100 * 2.0 * [g in item]) + 2.5 * [g in Watchlist]
 */
export function computeGenreWeights(
  preferredGenres: number[] = [],
  watchHistory: WatchProgress[] = [],
  watchlist: MediaItem[] = []
): Record<number, number> {
  const weights: Record<number, number> = {};

  const addWeight = (genreId: number, amount: number) => {
    if (!genreId) return;
    weights[genreId] = (weights[genreId] || 0) + amount;
  };

  // 1. Explicit liked genres (Weight: +3.0)
  const uniquePreferred = new Set<number>();
  for (const gid of preferredGenres) {
    if (gid) uniquePreferred.add(gid);
  }
  for (const gid of uniquePreferred) {
    addWeight(gid, 3.0);
  }

  // 2. Watch History engagement weights (Weight: (percentage/100) * 2.0)
  for (const item of watchHistory) {
    const factor = Math.min(1.0, Math.max(0.1, (item.percentage || 0) / 100)) * 2.0;
    const itemWithGenres = item as WatchProgress & { genre_ids?: number[]; genres?: { id: number }[] };
    const uniqueItemGenres = new Set<number>();
    if (itemWithGenres.genre_ids && Array.isArray(itemWithGenres.genre_ids)) {
      for (const gid of itemWithGenres.genre_ids) if (gid) uniqueItemGenres.add(gid);
    }
    if (itemWithGenres.genres && Array.isArray(itemWithGenres.genres)) {
      for (const g of itemWithGenres.genres) if (g && g.id) uniqueItemGenres.add(g.id);
    }
    for (const gid of uniqueItemGenres) {
      addWeight(gid, factor);
    }
  }

  // 3. Watchlist items (Weight: +2.5)
  for (const item of watchlist) {
    const itemGids = new Set<number>();
    if (item.genre_ids && Array.isArray(item.genre_ids)) {
      for (const gid of item.genre_ids) if (gid) itemGids.add(gid);
    }
    if (item.genres && Array.isArray(item.genres)) {
      for (const g of item.genres) if (g && g.id) itemGids.add(g.id);
    }
    for (const gid of itemGids) {
      addWeight(gid, 2.5);
    }
  }

  return weights;
}

/**
 * Multi-factor recommendation scoring formula:
 * TotalScore(i) = 0.50 * GenreAffinity(i) + 0.35 * NormalizedRating(i) + 0.15 * PopularityFactor(i) - Penalty
 */
export function scoreCandidate(
  item: MediaItem,
  genreWeights: Record<number, number>,
  maxWeight: number,
  rank: number,
  poolSize: number
): number {
  // 1. Genre Affinity (0 to 1)
  const itemGenreIds = new Set<number>();
  if (item.genre_ids && Array.isArray(item.genre_ids)) {
    for (const gid of item.genre_ids) if (gid) itemGenreIds.add(gid);
  }
  if (item.genres && Array.isArray(item.genres)) {
    for (const g of item.genres) if (g && g.id) itemGenreIds.add(g.id);
  }

  let itemGenreSum = 0;
  for (const gid of itemGenreIds) {
    itemGenreSum += genreWeights[gid] || 0;
  }
  const genreAffinity = maxWeight > 0 ? Math.min(1.0, itemGenreSum / maxWeight) : 0.5;

  // 2. Normalized Rating (0 to 1) based on vote_average (clamped 5.0 to 10.0)
  const vote = typeof item.vote_average === "number" ? item.vote_average : 7.0;
  const normalizedRating = Math.max(0, Math.min(1, (vote - 5.0) / 5.0));

  // Penalty for low-rated titles (< 5.8)
  const penalty = vote < 5.8 ? 0.3 : 0.0;

  // 3. Popularity rank factor (0 to 1)
  const popularityFactor = poolSize > 0 ? (poolSize - rank) / poolSize : 0.5;

  return 0.5 * genreAffinity + 0.35 * normalizedRating + 0.15 * popularityFactor - penalty;
}

/**
 * Generates personalized "מומלץ במיוחד עבורך" row.
 */
export async function getPersonalizedRecommendations(
  options: RecommendationScoringOptions
): Promise<MediaItem[]> {
  const { preferredGenres = [], watchHistory = [], watchlist = [], catalogCandidates = [] } = options;

  // Check if completely empty cold-start
  const hasHistory = watchHistory.length > 0;
  const hasWatchlist = watchlist.length > 0;
  const hasPreferred = preferredGenres.length > 0;

  if (!hasHistory && !hasWatchlist && !hasPreferred) {
    return getColdStartRecommendations();
  }

  // Calculate accumulated genre weights
  const genreWeights = computeGenreWeights(preferredGenres, watchHistory, watchlist);
  const maxWeight = Math.max(...Object.values(genreWeights), 1.0);

  // Identify top 3 user genres
  const sortedGenres = Object.entries(genreWeights)
    .sort(([, a], [, b]) => b - a)
    .map(([gid]) => parseInt(gid, 10));

  const topGenres = sortedGenres.slice(0, 3);

  // Candidate gathering: combine catalog, trending, and TMDB discover for top genres
  const candidates: MediaItem[] = [...catalogCandidates];

  if (topGenres.length > 0) {
    try {
      const genreString = topGenres.join(",");
      const [discoverMovies, discoverTv] = await Promise.all([
        getDiscoverMedia("movie", { with_genres: genreString }),
        getDiscoverMedia("tv", { with_genres: genreString }),
      ]);
      candidates.push(...discoverMovies, ...discoverTv);
    } catch (err) {
      console.warn("Discover recommendations fetch failed:", err);
    }
  }

  if (candidates.length < 10) {
    try {
      const [trending, topRated] = await Promise.all([getTrending(), getTopRated()]);
      candidates.push(...(trending || []), ...(topRated || []));
    } catch {
      candidates.push(...CURATED_COLD_START_CATALOG);
    }
    if (candidates.length === 0) {
      candidates.push(...CURATED_COLD_START_CATALOG);
    }
  }

  // Exclusion IDs:
  // - In-progress items (< 90%)
  // - Fully completed items (>= 90%) within last 60 days
  // - Items in watchlist
  const excludeIds = new Set<number>();
  for (const w of watchHistory) {
    excludeIds.add(w.media_id);
  }
  for (const l of watchlist) {
    excludeIds.add(l.id);
  }

  // Deduplicate candidate pool
  const seenIds = new Set<number>();
  const filteredCandidates: MediaItem[] = [];

  for (const item of candidates) {
    if (!item || !item.id) continue;
    if (excludeIds.has(item.id)) continue;
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    filteredCandidates.push(item);
  }

  // Score each candidate
  const scoredItems = filteredCandidates.map((item, index) => {
    const score = scoreCandidate(item, genreWeights, maxWeight, index, filteredCandidates.length);
    return { item, score };
  });

  // Sort descending by score
  scoredItems.sort((a, b) => b.score - a.score);

  const finalItems = scoredItems.map((s) => s.item).slice(0, 20);

  if (finalItems.length === 0) {
    return getColdStartRecommendations(preferredGenres);
  }

  return finalItems;
}

/**
 * Generates dynamic anchor row: "כי צפית ב..." (Because you watched [Title]).
 * Anchored on the user's latest engaged title (watched >= 3 min or most recent).
 */
export async function getBecauseYouWatched(options: {
  watchHistory: WatchProgress[];
}): Promise<{ anchorTitle: string; items: MediaItem[] } | null> {
  const { watchHistory = [] } = options;
  if (!watchHistory || watchHistory.length === 0) return null;

  // Find most recent title with >= 180s (3 min) watch time, or most recent title
  const sorted = [...watchHistory].sort((a, b) => {
    const timeA = new Date(a.updated_at || 0).getTime();
    const timeB = new Date(b.updated_at || 0).getTime();
    return timeB - timeA;
  });

  const anchor = sorted.find(
    (item) => ((item.progress_seconds || (item as any).currentTime || 0) >= 180)
  );
  if (!anchor) return null;

  const anchorId = anchor.media_id;
  const anchorType = anchor.media_type || "movie";

  let items: MediaItem[] = [];

  try {
    // 1. Primary: TMDB Recommendations API
    if (anchorType === "movie") {
      items = await getMovieRecommendations(anchorId);
    } else {
      items = await getTvRecommendations(anchorId);
    }

    // 2. Secondary fallback: TMDB Similar API
    if (items.length < 6) {
      const similar =
        anchorType === "movie" ? await getSimilarMovies(anchorId) : await getSimilarTv(anchorId);
      items = [...items, ...similar];
    }

    // 3. Tertiary fallback: Discover by top genre
    if (items.length < 6) {
      const discover = await getDiscoverMedia(anchorType);
      items = [...items, ...discover];
    }

    if (items.length === 0) {
      items = CURATED_COLD_START_CATALOG;
    }
  } catch (err) {
    console.warn("BecauseYouWatched fetch error:", err);
    items = CURATED_COLD_START_CATALOG;
  }

  // Filter out the anchor itself and items already watched
  const watchedIds = new Set(watchHistory.map((w) => w.media_id));
  const seenIds = new Set<number>();
  const filtered = items.filter((item) => {
    if (!item || item.id === anchorId) return false;
    if (watchedIds.has(item.id)) return false;
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  if (filtered.length === 0) return null;

  return {
    anchorTitle: anchor.title,
    items: filtered.slice(0, 20),
  };
}

/**
 * Generates cold-start recommendations for brand new users.
 * Supports interactive genre filtering.
 */
export async function getColdStartRecommendations(
  selectedGenres: number[] = []
): Promise<MediaItem[]> {
  if (selectedGenres.length === 0) {
    // Return curated diverse blockbusters
    return CURATED_COLD_START_CATALOG;
  }

  try {
    const genreString = selectedGenres.join(",");
    const [movies, tv] = await Promise.all([
      getDiscoverMedia("movie", { with_genres: genreString, sort_by: "popularity.desc" }),
      getDiscoverMedia("tv", { with_genres: genreString, sort_by: "popularity.desc" }),
    ]);

    const combined = [...movies, ...tv];
    if (combined.length > 0) {
      // Interleave movies and tv shows
      const interleaved: MediaItem[] = [];
      const maxLen = Math.max(movies.length, tv.length);
      const seen = new Set<number>();

      for (let i = 0; i < maxLen; i++) {
        if (movies[i] && !seen.has(movies[i].id)) {
          seen.add(movies[i].id);
          interleaved.push(movies[i]);
        }
        if (tv[i] && !seen.has(tv[i].id)) {
          seen.add(tv[i].id);
          interleaved.push(tv[i]);
        }
      }

      return interleaved.slice(0, 20);
    }
  } catch (err) {
    console.warn("Cold start discover error:", err);
  }

  return CURATED_COLD_START_CATALOG;
}
