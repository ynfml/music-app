export type Genre = "Rock" | "Pop" | "HipHop" | "EDM" | "Festival";

export const MUSIC_GENRES: Genre[] = ["Rock", "Pop", "HipHop", "EDM", "Festival"];

export const GENRE_FILTERS = ["All", ...MUSIC_GENRES] as const;
export type GenreFilter = (typeof GENRE_FILTERS)[number];

export type Profile = {
  id: string;
  display_name: string | null;
  favorite_genres: Genre[] | null;
  bio: string | null;
};
