export type Genre = "Rock" | "Alternative" | "Pop" | "Idol" | "HipHop" | "EDM";

export const MUSIC_GENRES: Genre[] = ["Rock", "Alternative", "Pop", "Idol", "HipHop", "EDM"];

export const GENRE_FILTERS = ["All", ...MUSIC_GENRES, "Festival"] as const;
export type GenreFilter = (typeof GENRE_FILTERS)[number];

export type Profile = {
  id: string;
  display_name: string | null;
  favorite_genres: Genre[] | null;
  bio: string | null;
  spotify_access_token?: string | null;
  spotify_refresh_token?: string | null;
  spotify_token_expires_at?: string | null;
};
