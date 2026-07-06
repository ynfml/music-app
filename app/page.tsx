"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import { GENRE_FILTERS, type Genre, type GenreFilter } from "@/lib/types";
import { safeStartViewTransition } from "@/lib/transitions";
import { TOUR_EVENTS, type TourEvent } from "@/lib/events";
import CheckInDialog from "@/components/CheckInDialog";

const GENRE_STYLES: Record<Genre, string> = {
  Rock: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  Pop: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
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

export default function Home() {
  const { user, profile, loading, profileLoading, events, savedEventIds, attendedEventIds, toggleSaveEvent, toggleAttendEvent, createEvent } = useAuth();
  const [activeGenre, setActiveGenre] = useState<GenreFilter | "Saved">("All");
  const [activeDialogEvent, setActiveDialogEvent] = useState<{ id: string; artist: string; isAttended: boolean } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // 検索・絞り込みステート
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [onlyFestival, setOnlyFestival] = useState(false);

  // イベントデータから動的にエリア（都市）を抽出
  const cities = useMemo(() => {
    const allCities = events
      .map((e) => e.location_city)
      .filter((c): c is string => Boolean(c));
    return ["All", ...Array.from(new Set(allCities))];
  }, [events]);

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
    safeStartViewTransition(() => {
      setActiveGenre(genre);
    });
  };

  const displayEvents = useMemo(() => {
    let filtered = events;

    // 1. ジャンル・保存フィルター
    if (activeGenre === "Saved") {
      filtered = events.filter((event) => savedEventIds.includes(event.id));
    } else if (activeGenre === "Festival") {
      filtered = events.filter((event) => event.is_festival);
    } else if (activeGenre !== "All") {
      filtered = events.filter((event) => event.genre === activeGenre);
    }

    // 2. キーワード検索 (アーティスト名・会場名)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (event) =>
          event.artist_name.toLowerCase().includes(q) ||
          event.venue_name.toLowerCase().includes(q)
      );
    }

    // 3. 地域（都市）フィルター
    if (selectedCity !== "All") {
      filtered = filtered.filter((event) => event.location_city === selectedCity);
    }

    // 4. フェスフィルター (トグル)
    if (onlyFestival) {
      filtered = filtered.filter((event) => event.is_festival);
    }

    return sortEventsForUser(filtered, profile?.favorite_genres, activeGenre as any);
  }, [activeGenre, profile?.favorite_genres, events, savedEventIds, searchQuery, selectedCity, onlyFestival]);

  const isPersonalized =
    profile?.favorite_genres &&
    profile.favorite_genres.length > 0 &&
    activeGenre === "All";


  return (
    <div className="relative min-h-full overflow-hidden bg-black text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(168,85,247,0.25),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(236,72,153,0.12),transparent)]"
        aria-hidden
      />



      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 text-center sm:mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-primary-400">
            MUSIC JOURNEY
          </p>
          <h1 className="bg-gradient-to-r from-white via-primary-200 to-rose-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            音で繋がる、次のライブへ。
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            行ったライブを記録して、気になる音楽ファンをフォロー。みんなの音楽ジャーニーを覗いてみよう。
          </p>
        </header>

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
                    ? "bg-gradient-to-r from-primary-600 to-rose-600 text-white shadow-lg shadow-primary-500/25"
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
                    ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/25"
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

        {/* 🔍 検索・地域・フェスフィルターコントロール */}
        <div className="mb-8 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 sm:p-5 backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* キーワード検索入力 */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm select-none">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="アーティスト、会場名で検索..."
                className="w-full rounded-xl bg-zinc-900/60 pl-9 pr-8 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 border border-zinc-800/80 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* フェストグル */}
            <div className="flex items-center justify-between sm:justify-start gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <label htmlFor="festival-toggle" className="text-xs font-semibold text-zinc-400 select-none cursor-pointer">🎪 フェスのみ表示</label>
              <input
                id="festival-toggle"
                type="checkbox"
                checked={onlyFestival}
                onChange={(e) => setOnlyFestival(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-850 bg-zinc-900 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 都市（地域）絞り込みバッジ一覧 */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">📍 地域で絞り込む</p>
            <div className="flex flex-wrap gap-1.5">
              {cities.map((city) => {
                const isCityActive = selectedCity === city;
                const label = city === "All" ? "すべてのエリア" : city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isCityActive
                        ? "bg-zinc-100 text-black font-semibold shadow-md"
                        : "bg-zinc-900/60 text-zinc-400 border border-zinc-800/80 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 件数表示 */}
          <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-900/60 pt-3">
            <span>
              該当公演: <strong className="text-primary-400 font-bold font-mono">{displayEvents.length}</strong> 件
            </span>
            {(searchQuery || selectedCity !== "All" || onlyFestival) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCity("All");
                  setOnlyFestival(false);
                }}
                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
              >
                フィルターをクリア
              </button>
            )}
          </div>
        </div>

        <section aria-label="来日スケジュール一覧">
          {loading || profileLoading ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5">
              {[1, 2, 3, 4].map((i) => (
                <li key={i}>
                  <div className="animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-sm sm:p-6 h-[200px] flex flex-col justify-between">
                    <div>
                      <div className="h-6 w-2/3 rounded bg-zinc-900/80 mb-3" />
                      <div className="h-4 w-1/4 rounded bg-zinc-900/80" />
                    </div>
                    <div className="space-y-2.5">
                      <div className="h-4 w-1/2 rounded bg-zinc-800/80" />
                      <div className="h-4 w-1/3 rounded bg-zinc-800/80" />
                    </div>
                    <div className="h-10 w-full rounded-xl bg-zinc-800/40 mt-4" />
                  </div>
                </li>
              ))}
            </ul>
          ) : displayEvents.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <p className="text-zinc-500 text-sm">該当する公演が見つかりませんでした。</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCity("All");
                  setOnlyFestival(false);
                  setActiveGenre("All");
                }}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-primary-400 ring-1 ring-zinc-800 hover:bg-zinc-800 active:scale-[0.98] transition-all"
              >
                すべてのフィルターをクリア
              </button>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5">
              {displayEvents.map((event) => {
                const isSaved = savedEventIds.includes(event.id);
                const isAttended = attendedEventIds.includes(event.id);
                return (
                  <li key={event.id} style={{ viewTransitionName: `event-${event.id}` } as any}>
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary-500/40 hover:shadow-[0_0_40px_-12px_rgba(168,85,247,0.35)] sm:p-6">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />

                      {/* アクションボタン（行った ＆ 行きたい） */}
                      {user && (
                        <div className="absolute right-4 top-4 z-20 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveDialogEvent({ id: event.id, artist: event.artist_name, isAttended })}
                            className={`rounded-full p-2 transition-all hover:bg-zinc-900 ${
                              isAttended
                                ? "text-emerald-400 shadow-md shadow-emerald-500/10"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                            title={isAttended ? "行ったリストから削除" : "行った公演にチェックイン"}
                          >
                            <CheckIcon solid={isAttended} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSaveEvent(event.id)}
                            className={`rounded-full p-2 transition-all hover:bg-zinc-900 ${
                              isSaved
                                ? "text-pink-500 shadow-md shadow-pink-500/10"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                            title={isSaved ? "お気に入りから削除" : "お気に入りに追加"}
                          >
                            <HeartIcon solid={isSaved} />
                          </button>
                        </div>
                      )}

                      <div className="mb-4 pr-24">
                        <div className="flex flex-wrap gap-1.5">
                          {event.is_festival && (
                            <span className="inline-block rounded-full bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              Festival
                            </span>
                          )}
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${GENRE_STYLES[event.genre]}`}
                          >
                            {event.genre}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-white mt-1.5 sm:text-2xl leading-snug">
                          {event.event_title ? (
                            <>
                              <span className="block text-zinc-100 font-extrabold">{event.event_title}</span>
                              <span className="block text-xs sm:text-sm font-semibold text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                                {event.artist_name}
                              </span>
                            </>
                          ) : (
                            <span className="block line-clamp-2">{event.artist_name}</span>
                          )}
                        </h2>
                      </div>

                      <div className="mb-6 flex flex-1 flex-col gap-3 text-sm text-zinc-400">
                        <div className="flex items-center gap-2.5">
                          <CalendarIcon />
                          <time dateTime={event.event_date} className="text-zinc-200">
                            {formatDate(event.event_date)}
                          </time>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <PinIcon />
                          <span>
                            <span className="text-zinc-200">{event.venue_name}</span>
                            <span className="text-zinc-500"> · {event.location_city}</span>
                          </span>
                        </div>
                      </div>


                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-rose-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-primary-500 hover:to-rose-500 hover:shadow-lg hover:shadow-primary-500/20 active:scale-[0.98]"
                      >
                        詳細を見る
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
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

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-primary-600 to-rose-600 py-3 text-sm font-semibold text-white transition-all hover:from-primary-500 hover:to-rose-500 disabled:opacity-50"
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
      className="h-4 w-4 shrink-0 text-rose-400"
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

