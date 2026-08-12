"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import { GENRE_FILTERS, type Genre, type GenreFilter } from "@/lib/types";
import { safeStartViewTransition } from "@/lib/transitions";
import { type TourEvent } from "@/lib/events";
import CheckInDialog from "@/components/CheckInDialog";
import { createSupabaseClient } from "@/lib/supabase/client";

const GENRE_STYLES: Record<Genre, string> = {
  Rock: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  Alternative: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  Pop: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
  Idol: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  HipHop: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  EDM: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
};

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function compareByDate(a: TourEvent, b: TourEvent) {
  return a.event_date.localeCompare(b.event_date);
}


function sortEventsForUser(
  events: TourEvent[],
  favoriteGenres: Genre[] | null | undefined,
  genreFilter: GenreFilter,
) {
  const sorted = [...events];

  if (!favoriteGenres || favoriteGenres.length === 0 || genreFilter !== "All") {
    return sorted.sort(compareByDate);
  }

  return sorted.sort((a, b) => {
    const aPreferred = favoriteGenres.includes(a.genre) ? 0 : 1;
    const bPreferred = favoriteGenres.includes(b.genre) ? 0 : 1;
    if (aPreferred !== bPreferred) return aPreferred - bPreferred;
    return compareByDate(a, b);
  });
}

function getFestivalOrganizer(title: string, venue: string): string {
  const upper = (title + " " + venue).toUpperCase();
  if (upper.includes("ROCK IN JAPAN") || upper.includes("COUNTDOWN JAPAN") || upper.includes("JAPAN JAM")) return "ロッキング・オン・ジャパン";
  if (upper.includes("SUMMER SONIC") || upper.includes("SONICMANIA") || upper.includes("PUNKSPRING") || upper.includes("LOUD PARK") || upper.includes("SUPERSONIC")) return "クリエイティブマンプロダクション";
  if (upper.includes("FUJI ROCK") || upper.includes("朝霧")) return "SMASH (スマッシュ)";
  if (upper.includes("RISING SUN")) return "WESS";
  if (upper.includes("VIVA LA ROCK")) return "FACT / DISK GARAGE";
  if (upper.includes("SWEET LOVE SHOWER")) return "スペースシャワーTV / DISK GARAGE";
  if (upper.includes("ARABAKI")) return "GIP";
  if (upper.includes("MONSTER BASH")) return "DUKE (デューク)";
  if (upper.includes("WILD BUNCH")) return "YUMEBANCHI (夢番地)";
  if (upper.includes("京都大作戦")) return "10-FEET / Sound Creator";
  if (upper.includes("YON FES")) return "04 Limited Sazabys / サンデーフォーク";
  if (upper.includes("DEAD POP")) return "SiM / DISK GARAGE";
  if (upper.includes("MINAMI WHEEL") || upper.includes("RADIO CRAZY")) return "FM802";
  if (upper.includes("AIR JAM")) return "Hi-STANDARD / DISK GARAGE";
  if (upper.includes("氣志團万博")) return "氣志團 / DISK GARAGE";
  if (upper.includes("OTODAMA") || upper.includes("音魂")) return "清水音泉";
  if (upper.includes("RUSH BALL")) return "GREENS";
  if (upper.includes("GREENROOM")) return "GREENROOM CO.";
  if (upper.includes("ULTRA JAPAN")) return "ULTRA JAPAN 実行委員会 / avex";
  if (upper.includes("A-NATION")) return "avex";
  if (upper.includes("ベリテン")) return "RADIO BERRY";
  if (upper.includes("TREASURE05X")) return "サンデーフォークプロモーション";
  if (upper.includes("GFEST")) return "Gメッセ群馬 / DISK GARAGE";
  if (upper.includes("TOKYO ISLAND")) return "TOKYO ISLAND 実行委員会";
  if (upper.includes("京都音楽博覧会")) return "くるり / Bad News";
  if (upper.includes("風のリズム")) return "FOB企画";
  if (upper.includes("BLAZE UP NAGASAKI")) return "HEY-SMITH / キョードー西日本";
  if (upper.includes("NUMBER SHOT")) return "キョードー西日本";
  return "フェス実行委員会 / プロモーター";
}

function getFestivalSeason(dateStr: string): { label: string; icon: string; color: string } {
  const m = parseInt(dateStr.split("-")[1] || "1", 10);
  if (m >= 3 && m <= 5) return { label: "春フェス", icon: "🌸", color: "bg-pink-500/15 text-pink-300 ring-pink-500/30" };
  if (m >= 6 && m <= 8) return { label: "夏フェス", icon: "☀️", color: "bg-amber-500/15 text-amber-300 ring-amber-500/30" };
  if (m >= 9 && m <= 11) return { label: "秋フェス", icon: "🍁", color: "bg-orange-500/15 text-orange-300 ring-orange-500/30" };
  return { label: "冬フェス", icon: "❄️", color: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30" };
}

type Region = {
  id: string;
  name: string;
  icon: string;
  prefectures: string[];
};

const JAPAN_REGIONS: Region[] = [
  { id: "All", name: "全国すべて", icon: "🗾", prefectures: [] },
  { id: "Kanto", name: "関東", icon: "🗼", prefectures: ["東京", "神奈川", "千葉", "埼玉", "群馬", "茨城", "栃木", "山梨"] },
  { id: "Kansai", name: "関西", icon: "🏯", prefectures: ["大阪", "京都", "兵庫", "滋賀", "奈良", "和歌山"] },
  { id: "TokaiHokuriku", name: "東海・北陸", icon: "🌊", prefectures: ["愛知", "岐阜", "三重", "静岡", "新潟", "金沢", "福井", "富山", "石川", "長野"] },
  { id: "TohokuHokkaido", name: "東北・北海道", icon: "🌲", prefectures: ["北海道", "宮城", "仙台", "福島", "山形", "岩手", "秋田", "青森"] },
  { id: "ChugokuShikoku", name: "中国・四国", icon: "⛩️", prefectures: ["広島", "岡山", "山口", "鳥取", "島根", "香川", "徳島", "愛媛", "高知"] },
  { id: "KyushuOkinawa", name: "九州・沖縄", icon: "🌴", prefectures: ["福岡", "熊本", "長崎", "大分", "宮崎", "鹿児島", "沖縄"] },
];

export default function Home() {
  const { user, profile, loading, profileLoading, events, savedEventIds, attendedEventIds, toggleSaveEvent, toggleAttendEvent, createEvent, spotifyToken } = useAuth();
  const [activeGenre, setActiveGenre] = useState<GenreFilter | "Saved">("All");
  const [activeSeason, setActiveSeason] = useState<string>("All");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDialogEvent, setActiveDialogEvent] = useState<{ id: string; artist: string; isAttended: boolean } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // パフォーマンス最適化のためのステート（無限スクロール＆バックグラウンドレンダリング）
  const [isPending, startTransition] = useTransition();
  const [visibleCount, setVisibleCount] = useState(20);
  const { ref, inView } = useInView({
    rootMargin: "400px 0px", // 画面下部から400px手前で次をロードする
  });

  useEffect(() => {
    if (inView) {
      setVisibleCount((prev) => prev + 20);
    }
  }, [inView]);

  // Spotify パーソナライズ機能
  const [recommendedEvents, setRecommendedEvents] = useState<TourEvent[]>([]);
  const [topArtists, setTopArtists] = useState<string[]>([]);
  const [isFetchingSpotify, setIsFetchingSpotify] = useState(false);

  useEffect(() => {
    if (!profile?.spotify_refresh_token) {
      setRecommendedEvents([]);
      return;
    }
    const fetchTopArtists = async () => {
      setIsFetchingSpotify(true);
      try {
        let accessToken = profile.spotify_access_token;
        const expiresAt = profile.spotify_token_expires_at ? new Date(profile.spotify_token_expires_at) : new Date(0);
        
        // 期限切れ、または期限が近い（5分以内）なら裏でこっそりリフレッシュ
        if (!accessToken || expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
          const refreshRes = await fetch("/api/spotify/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: profile.spotify_refresh_token }),
          });
          
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            accessToken = data.access_token;
            const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
            
            // 次回のためにDBも更新しておく
            const supabase = createSupabaseClient();
            await supabase.from("profiles").update({
              spotify_access_token: accessToken,
              spotify_token_expires_at: newExpiresAt,
            }).eq("id", profile.id);
          } else {
            throw new Error("Token refresh failed");
          }
        }

        const res = await fetch("https://api.spotify.com/v1/me/top/artists?limit=20", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const topArtistNames = data.items.map((item: any) => item.name);
          setTopArtists(topArtistNames);
          
          // DBのイベントとマッチング（表記揺れや大文字小文字の違いに対応するため、部分一致・大文字小文字無視で比較する）
          const matches = events.filter((e) => 
            topArtistNames.some((topArtist: string) => {
              const topLower = topArtist.toLowerCase().trim();
              const eventLower = e.artist_name.toLowerCase().trim();
              return eventLower.includes(topLower) || topLower.includes(eventLower);
            })
          );
          safeStartViewTransition(() => {
            setRecommendedEvents(matches);
          });
        }
      } catch (err) {
        console.error("Spotify API error", err);
      } finally {
        setIsFetchingSpotify(false);
      }
    };
    fetchTopArtists();
  }, [profile?.spotify_refresh_token, profile?.spotify_access_token, profile?.spotify_token_expires_at, profile?.id, events]);

  const [isConnecting, setIsConnecting] = useState(false);

  const handleSpotifyConnect = async () => {
    setIsConnecting(true);
    // 新しく作った自前のSpotify接続ルートへ飛ばす
    window.location.href = "/api/spotify/login";
  };

  const handleCheckInSubmit = async (comment: string) => {
    if (activeDialogEvent) {
      await toggleAttendEvent(activeDialogEvent.id, comment);
    }
  };

  const handleCheckInDelete = async () => {
    if (activeDialogEvent) {
      await toggleAttendEvent(activeDialogEvent.id);
    }
  };

  const handleGenreChange = (genre: GenreFilter | "Saved") => {
    startTransition(() => {
      safeStartViewTransition(() => {
        setActiveGenre(genre);
        setVisibleCount(20);
      });
    });
  };

  // 各地方（リージョン）のライブ件数を動的計算
  const regionCounts = useMemo(() => {
    const festEvents = events.filter((e) => e.is_festival);
    const counts: Record<string, number> = { All: festEvents.length };
    
    JAPAN_REGIONS.forEach((reg) => {
      if (reg.id === "All") return;
      const cnt = festEvents.filter((e) =>
        reg.prefectures.some((p) => e.location_city && e.location_city.includes(p))
      ).length;
      counts[reg.id] = cnt;
    });
    return counts;
  }, [events]);

  // 選択中地方に含まれる都道府県一覧を抽出
  const availablePrefecturesInRegion = useMemo(() => {
    if (selectedRegion === "All") return [];
    const regObj = JAPAN_REGIONS.find((r) => r.id === selectedRegion);
    if (!regObj) return [];
    
    const festEvents = events.filter((e) => e.is_festival);
    return regObj.prefectures.filter((p) =>
      festEvents.some((e) => e.location_city && e.location_city.includes(p))
    );
  }, [events, selectedRegion]);

  const displayEvents = useMemo(() => {
    // 💡 フロントエンドは国内音楽フェス（is_festival: true）に限定
    let filtered = events.filter((event) => event.is_festival);

    // 1. ジャンル・保存フィルター
    if (activeGenre === "Saved") {
      filtered = filtered.filter((event) => savedEventIds.includes(event.id));
    } else if (activeGenre !== "All" && activeGenre !== "Festival") {
      filtered = filtered.filter((event) => event.genre === activeGenre);
    }

    // 2. 季節フィルター (春フェス・夏フェス・秋フェス・冬フェス)
    if (activeSeason !== "All") {
      filtered = filtered.filter((event) => {
        const seasonInfo = getFestivalSeason(event.event_date);
        return seasonInfo.label === activeSeason;
      });
    }

    // 3. 地方（リージョン）フィルター
    if (selectedRegion !== "All") {
      const regObj = JAPAN_REGIONS.find((r) => r.id === selectedRegion);
      if (regObj) {
        filtered = filtered.filter((event) =>
          regObj.prefectures.some((p) => event.location_city && event.location_city.includes(p))
        );
      }
    }

    // 4. エリア・都道府県フィルター
    if (selectedCity !== "All") {
      filtered = filtered.filter((event) => event.location_city && event.location_city.includes(selectedCity));
    }

    // 5. キーワード検索 (フェス名・会場名・主催者)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((event) => {
        const organizer = getFestivalOrganizer(event.artist_name, event.venue_name);
        return (
          event.artist_name.toLowerCase().includes(q) ||
          event.venue_name.toLowerCase().includes(q) ||
          organizer.toLowerCase().includes(q)
        );
      });
    }

    return sortEventsForUser(filtered, profile?.favorite_genres, activeGenre as any);
  }, [activeGenre, activeSeason, selectedRegion, selectedCity, profile?.favorite_genres, events, savedEventIds, searchQuery]);

  const isPersonalized =
    profile?.favorite_genres &&
    profile.favorite_genres.length > 0 &&
    activeGenre === "All";


  return (
    <div className="relative min-h-full overflow-hidden bg-transparent text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(255,82,0,0.15),transparent)]"
        aria-hidden="true"
      />



      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 text-center sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/20 mb-4 shadow-sm">
            <span>🎪</span> 日本全国の音楽フェス特化ガイド (全497開催)
          </div>
          <h1 className="bg-gradient-to-r from-white via-amber-300 to-primary-400 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-6xl leading-tight">
            JAPAN FESTIVAL JOURNEY
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base font-medium">
            日本全国のロックフェス・野外フェス・都市型サーキットを網羅。<br className="hidden sm:block" />
            季節・エリア・ジャンル・主催者別に探して、行ったフェスを記録しよう。
          </p>
        </header>

        {/* あなたへのおすすめ (Spotify連動) */}
        <section className="mb-12 rounded-2xl border border-[#1DB954]/20 bg-gradient-to-br from-zinc-900/80 to-[#1DB954]/5 p-6 backdrop-blur-sm relative overflow-hidden shadow-2xl shadow-[#1DB954]/5">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 rotate-12 pointer-events-none">
            <svg className="w-48 h-48 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15.001 10.62 18.66 12.84c.361.181.54.78.301 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2 relative z-10">
            <svg className="w-6 h-6 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15.001 10.62 18.66 12.84c.361.181.54.78.301 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            あなたへのおすすめ
          </h2>
          
          <div className="relative z-10">
            {!user ? (
              <p className="text-sm text-zinc-400">ログインしてSpotifyと連携すると、あなたのよく聴くアーティストのライブが表示されます。</p>
            ) : !profile?.spotify_refresh_token ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
                <p className="text-sm text-zinc-400 flex-1">Spotifyと連携して、視聴履歴からあなたにピッタリのライブ情報を見つけましょう！</p>
                <button onClick={handleSpotifyConnect} disabled={isConnecting} className="whitespace-nowrap rounded-full bg-[#1DB954] px-6 py-2.5 text-sm font-bold text-black hover:bg-[#1ed760] hover:scale-105 transition-all shadow-lg shadow-[#1DB954]/20 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed">
                  {isConnecting ? "接続中..." : "Spotifyと連携する"}
                </button>
              </div>
            ) : isFetchingSpotify ? (
              <p className="text-sm text-[#1DB954] animate-pulse font-medium mt-2">あなたのSpotify履歴を分析中...</p>
            ) : recommendedEvents.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendedEvents.slice(0, 3).map(event => (
                  <Link key={`rec-${event.id}`} href={`/events/${event.id}`} className="group block rounded-xl border border-zinc-800 bg-zinc-950 p-4 hover:border-[#1DB954]/50 transition-colors shadow-sm">
                    <p className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">Top Artist</p>
                    <p className="text-lg font-bold text-white group-hover:text-[#1DB954] transition-colors line-clamp-1 mb-1">{event.artist_name}</p>
                    <p className="text-xs text-primary-400 font-medium mb-1">{formatDate(event.event_date)}</p>
                    <p className="text-xs text-zinc-400 line-clamp-1">{event.venue_name}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-3 bg-black/20 p-4 rounded-xl border border-zinc-800/50">
                <p className="text-sm text-zinc-300">現在、あなたのトップアーティストのライブ予定はアプリ内に登録されていませんでした。</p>
                {topArtists.length > 0 && (
                  <div className="mt-3 border-t border-zinc-800/50 pt-3">
                    <p className="text-xs text-zinc-500 mb-1">✅ Spotifyからのデータ取得は成功しています。あなたのよく聴くアーティスト：</p>
                    <p className="text-xs font-bold text-[#1DB954]">{topArtists.slice(0, 10).join(" / ")}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <nav
          className="mb-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          aria-label="ジャンルフィルター"
        >
          {GENRE_FILTERS.map((genre) => {
            const isActive = activeGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => handleGenreChange(genre)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2.5 ${
                  isActive
                    ? "bg-gradient-to-r from-primary-600 to-amber-600 text-white shadow-lg shadow-primary-500/25"
                    : "bg-zinc-900/80 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {genre}
              </button>
            );
          })}
          {user && (
            <>
              <button
                type="button"
                onClick={() => handleGenreChange("Saved")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2.5 flex items-center gap-1.5 ${
                  activeGenre === "Saved"
                    ? "bg-gradient-to-r from-pink-600 to-amber-600 text-white shadow-lg shadow-pink-500/25"
                    : "bg-zinc-900/80 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <SavedIcon />
                お気に入り ({savedEventIds.length})
              </button>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2.5 flex items-center gap-1.5 bg-zinc-900/80 text-primary-300 ring-1 ring-primary-500/25 hover:bg-zinc-800 hover:text-primary-200"
              >
                <span>➕</span>
                公演を新しく登録
              </button>
            </>
          )}
        </nav>

        {isPersonalized && (
          <p className="mb-6 text-center text-xs text-primary-400/90 sm:text-sm">
            {profile?.favorite_genres?.join(", ")} ジャンルを優先して表示しています
          </p>
        )}

        {/* 🌸 季節・ジャンルフィルターナビゲーション */}
        <div className="mb-8 space-y-4">
          {/* 季節フィルタータブ */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "All", label: "すべての季節", icon: "🗓️" },
              { id: "春フェス", label: "春フェス (3~5月)", icon: "🌸" },
              { id: "夏フェス", label: "夏フェス (6~8月)", icon: "☀️" },
              { id: "秋フェス", label: "秋フェス (9~11月)", icon: "🍁" },
              { id: "冬フェス", label: "冬フェス (12~2月)", icon: "❄️" },
            ].map((season) => {
              const isActive = activeSeason === season.id;
              return (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => setActiveSeason(season.id)}
                  className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-primary-500 text-white shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/50"
                      : "bg-zinc-900/80 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <span>{season.icon}</span>
                  <span>{season.label}</span>
                </button>
              );
            })}
          </div>

          {/* ジャンルフィルター */}
          <nav
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5"
            aria-label="ジャンルフィルター"
          >
            {GENRE_FILTERS.filter(g => g !== "Festival").map((genre) => {
              const isActive = activeGenre === genre;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => handleGenreChange(genre)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-zinc-100 text-black shadow-md"
                      : "bg-zinc-900/60 text-zinc-400 ring-1 ring-zinc-800/80 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {genre === "All" ? "全ジャンル" : genre}
                </button>
              );
            })}
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => handleGenreChange("Saved")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    activeGenre === "Saved"
                      ? "bg-pink-600 text-white shadow-md shadow-pink-500/25"
                      : "bg-zinc-900/60 text-zinc-400 ring-1 ring-zinc-800/80 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <SavedIcon />
                  保存済み ({savedEventIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 flex items-center gap-1 bg-zinc-900/80 text-amber-300 ring-1 ring-amber-500/30 hover:bg-zinc-800"
                >
                  <span>➕</span>
                  フェスを登録
                </button>
              </>
            )}
          </nav>
        </div>

        {/* 🗺️ 検索 ＆ 地方・都道府県エリアフィルターパネル */}
        <div className="mb-10 rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-5 sm:p-7 backdrop-blur-xl shadow-2xl space-y-6">
          {/* キーワード検索入力バー */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-base select-none text-amber-400">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="フェス名、会場名（幕張メッセ、フジロック、お台場など）、主催プロモーターで検索..."
              className="w-full rounded-2xl bg-zinc-900/90 pl-11 pr-10 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 border border-zinc-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500 hover:text-zinc-300 text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* 地方ブロック選択（第1階層: 地方別バッジ） */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📍</span> 開催地方で絞り込む
              </span>
              {(selectedRegion !== "All" || selectedCity !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRegion("All");
                    setSelectedCity("All");
                  }}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  エリア選択をリセット
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {JAPAN_REGIONS.map((reg) => {
                const isActive = selectedRegion === reg.id;
                const count = regionCounts[reg.id] || 0;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(reg.id);
                      setSelectedCity("All");
                    }}
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 border ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-primary-500 text-white border-transparent shadow-lg shadow-amber-500/25 scale-[1.02]"
                        : "bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <span>{reg.icon}</span>
                    <span>{reg.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                        isActive ? "bg-black/30 text-white" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 都道府県細分化（第2階層: 選択中地方の都道府県チップ） */}
          {selectedRegion !== "All" && availablePrefecturesInRegion.length > 0 && (
            <div className="pt-4 border-t border-zinc-900/90 space-y-2 animate-fadeIn">
              <span className="text-[11px] font-semibold text-zinc-400 block">
                【{JAPAN_REGIONS.find((r) => r.id === selectedRegion)?.name}】内の都道府県・エリア細分化:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCity("All")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    selectedCity === "All"
                      ? "bg-zinc-100 text-black shadow"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  📍 {JAPAN_REGIONS.find((r) => r.id === selectedRegion)?.name} 全域
                </button>
                {availablePrefecturesInRegion.map((pref) => {
                  const isCityActive = selectedCity === pref;
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setSelectedCity(pref)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                        isCityActive
                          ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
                          : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      📍 {pref}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 件数表示 ＆ アクティブフィルター表示 */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 border-t border-zinc-900/80 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                該当フェス: <strong className="text-amber-400 font-bold font-mono text-sm">{displayEvents.length}</strong> 開催
              </span>
              {activeSeason !== "All" && (
                <span className="rounded-full bg-amber-500/10 text-amber-300 px-3 py-0.5 text-[11px] font-semibold border border-amber-500/20">
                  季節: {activeSeason}
                </span>
              )}
              {selectedCity !== "All" && (
                <span className="rounded-full bg-primary-500/10 text-primary-300 px-3 py-0.5 text-[11px] font-semibold border border-primary-500/20">
                  エリア: {selectedCity}
                </span>
              )}
            </div>

            {(searchQuery || selectedCity !== "All" || activeSeason !== "All" || activeGenre !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCity("All");
                  setActiveSeason("All");
                  setActiveGenre("All");
                }}
                className="text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1"
              >
                <span>✕</span> フィルターをクリア
              </button>
            )}
          </div>
        </div>

        <section aria-label="全国音楽フェススケジュール一覧">
          {loading || profileLoading ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:gap-8">
              {[1, 2, 3, 4].map((i) => (
                <li key={i}>
                  <div className="animate-pulse rounded-3xl border border-zinc-800/80 bg-zinc-950/40 p-6 sm:p-7 backdrop-blur-sm h-[240px] flex flex-col justify-between">
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-zinc-900/80 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-6 w-3/4 rounded-lg bg-zinc-900/80" />
                        <div className="h-4 w-1/2 rounded-lg bg-zinc-900/80" />
                      </div>
                    </div>
                    <div className="h-11 w-full rounded-2xl bg-zinc-800/40 mt-4" />
                  </div>
                </li>
              ))}
            </ul>
          ) : displayEvents.length === 0 ? (
            <div className="py-24 text-center space-y-5 rounded-3xl border border-zinc-900 bg-zinc-950/30">
              <p className="text-zinc-400 text-base">条件に該当する音楽フェスが見つかりませんでした。</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCity("All");
                  setActiveSeason("All");
                  setActiveGenre("All");
                }}
                className="rounded-full bg-zinc-900 px-6 py-3 text-xs font-semibold text-amber-400 ring-1 ring-zinc-800 hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg"
              >
                すべてのフィルターをクリア
              </button>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:gap-8">
              {displayEvents.slice(0, visibleCount).map((event) => {
                const isSaved = savedEventIds.includes(event.id);
                const isAttended = attendedEventIds.includes(event.id);
                
                // 日付パース
                const eventDateObj = new Date(`${event.event_date}T00:00:00`);
                const monthText = `${eventDateObj.getMonth() + 1}月`;
                const dayText = `${eventDateObj.getDate()}`;
                const weekdayText = ["日", "月", "火", "水", "木", "金", "土"][eventDateObj.getDay()];

                // 主催者 ＆ 季節の自動判定
                const organizer = getFestivalOrganizer(event.artist_name, event.venue_name);
                const seasonInfo = getFestivalSeason(event.event_date);

                return (
                  <li key={event.id} style={{ viewTransitionName: `event-${event.id}` } as any}>
                    <article 
                      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto none auto 280px' }}
                      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-md transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_50px_-15px_rgba(245,158,11,0.25)] sm:p-7"
                    >
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />

                      {/* アクションボタン（行った ＆ 行きたい） */}
                      {user && (
                        <div className="absolute right-5 top-5 z-20 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveDialogEvent({ id: event.id, artist: event.artist_name, isAttended })}
                            className={`rounded-full p-2.5 transition-all hover:bg-zinc-900/90 ${
                              isAttended
                                ? "text-emerald-400 shadow-lg shadow-emerald-500/20 bg-emerald-950/40 ring-1 ring-emerald-500/30"
                                : "text-zinc-500 hover:text-zinc-300 bg-zinc-900/40"
                            }`}
                            title={isAttended ? "行ったリストから削除" : "行ったフェスにチェックイン"}
                          >
                            <CheckIcon solid={isAttended} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSaveEvent(event.id)}
                            className={`rounded-full p-2.5 transition-all hover:bg-zinc-900/90 ${
                              isSaved
                                ? "text-pink-500 shadow-lg shadow-pink-500/20 bg-pink-950/40 ring-1 ring-pink-500/30"
                                : "text-zinc-500 hover:text-zinc-300 bg-zinc-900/40"
                            }`}
                            title={isSaved ? "お気に入りから削除" : "お気に入りに追加"}
                          >
                            <HeartIcon solid={isSaved} />
                          </button>
                        </div>
                      )}

                      <div>
                        {/* 日付バッジ ＆ タイトルヘッダー */}
                        <div className="flex items-start gap-4 mb-5 pr-20">
                          {/* 🗓️ 視覚的な日付スタンプバッジ */}
                          <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-900/90 border border-zinc-800/90 px-3.5 py-2.5 min-w-[64px] shrink-0 text-center shadow-inner group-hover:border-amber-500/40 transition-colors">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-none mb-1">{monthText}</span>
                            <span className="text-2xl font-black text-white leading-none tracking-tight">{dayText}</span>
                            <span className="text-[10px] font-semibold text-zinc-500 leading-none mt-1">({weekdayText})</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${seasonInfo.color}`}>
                                {seasonInfo.icon} {seasonInfo.label}
                              </span>
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${GENRE_STYLES[event.genre]}`}
                              >
                                {event.genre}
                              </span>
                            </div>

                            <h2 className="text-lg font-black tracking-tight text-white sm:text-xl leading-snug">
                              {event.artist_name}
                            </h2>
                          </div>
                        </div>

                        {/* 主催者・会場・都市 */}
                        <div className="mb-6 space-y-2.5 text-xs sm:text-sm text-zinc-400 bg-zinc-900/40 rounded-2xl p-4 border border-zinc-900/80">
                          {/* 🏢 主催・プロモーター */}
                          <div className="flex items-center gap-2.5 text-amber-300/90 font-semibold text-xs">
                            <span>🏢</span>
                            <span className="truncate">主催: <strong className="text-zinc-200 font-bold">{organizer}</strong></span>
                          </div>

                          {/* 📍 会場 ＆ エリア */}
                          <div className="flex items-center gap-2.5 text-zinc-200 font-medium">
                            <PinIcon />
                            <span className="truncate">
                              <strong className="text-white font-semibold">{event.venue_name}</strong>
                              <span className="text-zinc-400 font-normal"> · {event.location_city}</span>
                            </span>
                          </div>

                          {event.ticket_price_info && (
                            <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800/40 flex items-center gap-2">
                              <span>🎫</span>
                              <span>{event.ticket_price_info}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-xs sm:text-sm font-bold text-white transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-500 hover:to-primary-500 hover:shadow-xl hover:shadow-amber-500/20 active:scale-[0.98] border border-zinc-800 hover:border-transparent"
                      >
                        フェスの詳細を見る ➔
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
          {/* 無限スクロールの検知ポイント（まだ読み込んでいないデータがある場合のみ表示） */}
          {visibleCount < displayEvents.length && (
            <div ref={ref} className="mt-12 flex justify-center py-6">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent opacity-50" />
            </div>
          )}
        </section>

        <footer className="mt-14 border-t border-zinc-900 pt-8 text-center text-xs text-zinc-600">
          ※ 表示データはダミーです。実際の公演情報は公式サイトをご確認ください。
        </footer>
      </main>

      <CheckInDialog
        isOpen={activeDialogEvent !== null}
        onClose={() => setActiveDialogEvent(null)}
        onSubmit={handleCheckInSubmit}
        onConfirmDelete={handleCheckInDelete}
        isAttended={activeDialogEvent?.isAttended || false}
        artistName={activeDialogEvent?.artist || ""}
      />

      <CreateEventDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (data) => {
          const res = await createEvent({
            artist_name: data.artist,
            event_date: data.date,
            venue_name: data.venue,
            location_city: data.city,
            genre: data.genre,
            is_festival: data.isFestival,
          });
          if (res.error) {
            throw new Error(res.error);
          }
        }}
      />
    </div>
  );
}


function CreateEventDialog({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { artist: string; date: string; venue: string; city: string; genre: Genre; isFestival: boolean }) => Promise<void>;
}) {
  const [artist, setArtist] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [genre, setGenre] = useState<Genre>("Rock");
  const [isFestival, setIsFestival] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist || !date || !venue || !city) {
      setError("すべての項目を入力してください");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ artist, date, venue, city, genre, isFestival });
      setArtist("");
      setDate("");
      setVenue("");
      setCity("");
      setGenre("Rock");
      setIsFestival(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-primary-500/10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">新規公演の登録</h2>
              <p className="mt-1 text-xs text-zinc-400">ライブ情報を登録して、みんなでシェアしよう</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">アーティスト名（またはフェス名）</label>
              <input
                type="text"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="例: Coldplay / ULTRA JAPAN"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">公演日</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">会場名</label>
                <input
                  type="text"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="例: 東京ドーム"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">都市 (都道府県)</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="例: 東京"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">ジャンル</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value as Genre)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="Rock">Rock</option>
                <option value="Pop">Pop</option>
                <option value="HipHop">HipHop</option>
                <option value="EDM">EDM</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2.5 py-1">
              <input
                type="checkbox"
                id="is_festival"
                checked={isFestival}
                onChange={(e) => setIsFestival(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-primary-600 focus:ring-primary-500 focus:ring-offset-zinc-950"
              />
              <label htmlFor="is_festival" className="text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                これはフェス（Festival）ですか？
              </label>
            </div>

            {error && <p className="text-xs text-amber-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-primary-600 to-amber-600 py-3 text-sm font-semibold text-white transition-all hover:from-primary-500 hover:to-amber-500 disabled:opacity-50"
            >
              {submitting ? "登録中..." : "公演を登録する"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-primary-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-amber-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 6v.75m0 3v.75m0 3v.75M4.5 6v.75m0 3v.75m0 3v.75M4.5 6h15a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 0 0 3v3a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.75v-3a1.5 1.5 0 0 0 0-3v-3A1.5 1.5 0 0 1 4.5 6Z"
      />
    </svg>
  );
}

function HeartIcon({ solid }: { solid: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      fill={solid ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}

function SavedIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function CheckIcon({ solid }: { solid: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      fill={solid ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      {solid ? (
        <path
          fillRule="evenodd"
          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.6Z"
          clipRule="evenodd"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      )}
    </svg>
  );
}

