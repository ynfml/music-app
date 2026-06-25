import type { Genre } from "./types";

export type TourEvent = {
  id: string;
  artist: string;
  date: string;
  venue: string;
  city: string;
  genre: Genre;
  ticketUrl: string;
};

export const TOUR_EVENTS: TourEvent[] = [
  {
    id: "1",
    artist: "Taylor Swift",
    date: "2026-04-12",
    venue: "東京ドーム",
    city: "東京",
    genre: "Pop",
    ticketUrl: "#",
  },
  {
    id: "2",
    artist: "The Weeknd",
    date: "2026-05-20",
    venue: "Zepp Haneda",
    city: "東京",
    genre: "Pop",
    ticketUrl: "#",
  },
  {
    id: "3",
    artist: "Metallica",
    date: "2026-06-08",
    venue: "さいたまスーパーアリーナ",
    city: "埼玉",
    genre: "Rock",
    ticketUrl: "#",
  },
  {
    id: "4",
    artist: "Coldplay",
    date: "2026-07-15",
    venue: "東京ドーム",
    city: "東京",
    genre: "Rock",
    ticketUrl: "#",
  },
  {
    id: "5",
    artist: "Kendrick Lamar",
    date: "2026-08-22",
    venue: "大阪城ホール",
    city: "大阪",
    genre: "HipHop",
    ticketUrl: "#",
  },
  {
    id: "6",
    artist: "Tyler, The Creator",
    date: "2026-09-10",
    venue: "幕張メッセ",
    city: "千葉",
    genre: "HipHop",
    ticketUrl: "#",
  },
  {
    id: "7",
    artist: "Fred again..",
    date: "2026-10-05",
    venue: "Zepp Osaka Bayside",
    city: "大阪",
    genre: "EDM",
    ticketUrl: "#",
  },
  {
    id: "8",
    artist: "Skrillex",
    date: "2026-11-18",
    venue: "東京ガーデンシアター",
    city: "東京",
    genre: "EDM",
    ticketUrl: "#",
  },
];
