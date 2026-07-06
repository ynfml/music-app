import type { Genre } from "./types";

export type TourEvent = {
  id: string;
  artist_name: string;
  event_date: string;
  venue_name: string;
  location_city: string;
  genre: Genre;
  is_festival?: boolean;
  ticket_price_info?: string | null;
  open_time?: string | null;
  start_time?: string | null;
};

export const TOUR_EVENTS: TourEvent[] = [
  {
    id: "1",
    artist_name: "Taylor Swift",
    event_date: "2026-04-12",
    venue_name: "東京ドーム",
    location_city: "東京",
    genre: "Pop",
  },
  {
    id: "2",
    artist_name: "The Weeknd",
    event_date: "2026-05-20",
    venue_name: "Zepp Haneda",
    location_city: "東京",
    genre: "Pop",
  },
  {
    id: "3",
    artist_name: "Metallica",
    event_date: "2026-06-08",
    venue_name: "さいたまスーパーアリーナ",
    location_city: "埼玉",
    genre: "Rock",
  },
  {
    id: "4",
    artist_name: "Coldplay",
    event_date: "2026-07-15",
    venue_name: "東京ドーム",
    location_city: "東京",
    genre: "Rock",
  },
  {
    id: "5",
    artist_name: "Kendrick Lamar",
    event_date: "2026-08-22",
    venue_name: "大阪城ホール",
    location_city: "大阪",
    genre: "HipHop",
  },
  {
    id: "6",
    artist_name: "Tyler, The Creator",
    event_date: "2026-09-10",
    venue_name: "幕張メッセ",
    location_city: "千葉",
    genre: "HipHop",
  },
  {
    id: "7",
    artist_name: "Fred again..",
    event_date: "2026-10-05",
    venue_name: "Zepp Osaka Bayside",
    location_city: "大阪",
    genre: "EDM",
  },
  {
    id: "8",
    artist_name: "Skrillex",
    event_date: "2026-11-18",
    venue_name: "東京ガーデンシアター",
    location_city: "東京",
    genre: "EDM",
  },
];

