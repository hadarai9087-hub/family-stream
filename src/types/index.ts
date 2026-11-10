export type MediaType = "movie" | "tv";

export interface MediaItem {
  id: number;
  tmdb_id: number;
  title: string;
  original_title?: string;
  name?: string; // For TV
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: MediaType;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  trailer_key?: string;
  logo_path?: string;
}

export interface Season {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  episode_count: number;
}

export interface Episode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime?: number;
  vote_average?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  is_kids: boolean;
  pin?: string;
}

export interface WatchProgress {
  id?: string;
  profile_id?: string;
  userId?: string;
  user_id?: string;
  media_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  season_number?: number;
  episode_number?: number;
  episode_name?: string | null;
  progress_seconds: number;
  duration_seconds: number;
  percentage: number;
  genre_ids?: number[];
  updated_at: string;
}

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  avatar: string;
  preferredGenres: number[]; // TMDB genre IDs
  createdAt: number | string;
  lastLoginAt?: string;
  token?: string;
  familyName?: string; // backwards compatibility with legacy Account
}

export interface UserSession {
  user: UserAccount;
  token: string;
  expiresAt: number; // Unix timestamp ms
}

export interface UserWatchProgress {
  userId: string;
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName?: string;
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: string;
}

export interface UserWatchlistItem {
  userId: string;
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  addedAt: string;
}

export interface UserGenrePreferences {
  userId: string;
  explicitGenreIds: number[];
  computedGenreAffinities: Record<number, number>;
  updatedAt: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url: string;
  isDefault?: boolean;
  source?: "stremio" | "wizdom" | "opensubtitles" | "manual";
  encoding?: string;
}

export interface StreamSource {
  id?: string;
  name: string;
  url: string;
  type: "hls" | "embed" | "mp4";
  quality?: string;
  tier?: number;
  sandboxed?: boolean;
}
