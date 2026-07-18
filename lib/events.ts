import { createSupabaseClient } from "./supabase/client";
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
  event_title?: string | null;
  image_url?: string | null;
};

// Supabaseから本番のライブ情報を取得する関数
export async function fetchTourEvents(): Promise<TourEvent[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("tour_events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Failed to fetch tour events:", error);
    return [];
  }

  return data as TourEvent[];
}

