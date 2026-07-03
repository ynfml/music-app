"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import { createSupabaseClient } from "@/lib/supabase/client";
import { TOUR_EVENTS } from "@/lib/events";
import type { Genre, Profile } from "@/lib/types";

const GENRE_STYLES: Record<Genre, string> = {
  Rock: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  Pop: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
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

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = use(params);
  const { user, events, followingIds, toggleFollow } = useAuth();
  
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [attendedEventIds, setAttendedEventIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isFollowing = followingIds.includes(targetUserId);

  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      setError(null);
      
      const supabase = createSupabaseClient();
      
      // 1. プロフィール取得
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, favorite_genres, bio")
        .eq("id", targetUserId)
        .maybeSingle();
        
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
      
      if (!profileData) {
        setError("ユーザーが見つかりません");
        setLoading(false);
        return;
      }
      
      setTargetProfile(profileData);

      // 2. 行きたい（Saved）公演ID取得
      const { data: savedData } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", targetUserId);
      setSavedEventIds(savedData?.map(item => item.event_id) || []);

      // 3. 行った（Attended）公演ID取得
      const { data: attendedData } = await supabase
        .from("attended_events")
        .select("event_id")
        .eq("user_id", targetUserId);
      setAttendedEventIds(attendedData?.map(item => item.event_id) || []);

      setLoading(false);
    }

    loadUserData();
  }, [targetUserId]);

  const handleFollowToggle = async () => {
    if (!user) {
      alert("ログインが必要です");
      return;
    }
    setActionLoading(true);
    await toggleFollow(targetUserId);
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-400">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        <span className="ml-3 text-sm">ユーザー情報を読み込み中...</span>
      </div>
    );
  }

  if (error || !targetProfile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6 bg-black text-zinc-100">
        <h1 className="text-xl font-bold mb-4">{error || "ユーザーが見つかりません"}</h1>
        <Link href="/" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800">
          ホームに戻る
        </Link>
      </div>
    );
  }

  // 行きたい / 行った公演リスト
  const savedEvents = events.filter((e) => savedEventIds.includes(e.id));
  const attendedEvents = events.filter((e) => attendedEventIds.includes(e.id));

  const isMe = user?.id === targetUserId;

  return (
    <div className="relative min-h-full bg-black text-zinc-100 pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(168,85,247,0.12),transparent)]" aria-hidden />

      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* プロフィールヘッダー */}
        <header className="mb-10 sm:mb-12 pb-6 border-b border-zinc-900">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-400">Music Fan Profile</span>
              <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                {targetProfile.display_name || "名無しの音楽ファン"}
              </h1>
              <div className="flex flex-wrap gap-2">
                {targetProfile.favorite_genres?.map((genre) => (
                  <span key={genre} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ring-1 ${GENRE_STYLES[genre]}`}>
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* フォローボタン */}
            {!isMe && user && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleFollowToggle}
                className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                  isFollowing
                    ? "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:bg-red-950/20 hover:text-red-400 hover:ring-red-900/30"
                    : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg hover:from-violet-500 hover:to-fuchsia-500"
                }`}
              >
                {actionLoading ? "処理中..." : isFollowing ? "フォロー中 (解除)" : "フォローする"}
              </button>
            )}
          </div>

          {/* 自己紹介 */}
          {targetProfile.bio && (
            <div className="mt-6 max-w-2xl rounded-2xl border border-zinc-900 bg-zinc-950/30 p-4 backdrop-blur-sm">
              <p className="text-sm text-zinc-300 leading-relaxed break-words whitespace-pre-wrap">
                {targetProfile.bio}
              </p>
            </div>
          )}
        </header>

        {/* コンテンツエリア (2カラム) */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* 左：行った公演 */}
          <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 backdrop-blur-sm sm:p-6 min-h-[300px]">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-emerald-400">✔</span> 行った公演 ({attendedEvents.length})
            </h2>
            {attendedEvents.length === 0 ? (
              <p className="text-sm text-zinc-500 py-10 text-center">行った公演の記録はまだありません。</p>
            ) : (
              <ul className="space-y-4">
                {attendedEvents.map((event) => (
                  <li key={event.id}>
                    <div className="flex justify-between items-start p-4 rounded-xl border border-zinc-900 bg-zinc-950/80">
                      <div>
                        <div className="flex flex-wrap gap-1">
                          {event.is_festival && (
                            <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30">
                              Festival
                            </span>
                          )}
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ${GENRE_STYLES[event.genre]}`}>
                            {event.genre}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1">{event.artist_name}</h3>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          📅 {formatDate(event.event_date)} · 📍 {event.venue_name}
                        </p>

                      </div>
                      <Link href={`/events/${event.id}`} className="text-xs text-violet-400 hover:text-violet-300 font-semibold pt-1">
                        詳細 →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 右：行きたい公演 */}
          <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 backdrop-blur-sm sm:p-6 min-h-[300px]">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-pink-500">♥</span> 行きたい公演 ({savedEvents.length})
            </h2>
            {savedEvents.length === 0 ? (
              <p className="text-sm text-zinc-500 py-10 text-center">行きたい公演の登録はまだありません。</p>
            ) : (
              <ul className="space-y-4">
                {savedEvents.map((event) => (
                  <li key={event.id}>
                    <div className="flex justify-between items-start p-4 rounded-xl border border-zinc-900 bg-zinc-950/80">
                      <div>
                        <div className="flex flex-wrap gap-1">
                          {event.is_festival && (
                            <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30">
                              Festival
                            </span>
                          )}
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ${GENRE_STYLES[event.genre]}`}>
                            {event.genre}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1">{event.artist_name}</h3>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          📅 {formatDate(event.event_date)} · 📍 {event.venue_name}
                        </p>

                      </div>
                      <Link href={`/events/${event.id}`} className="text-xs text-violet-400 hover:text-violet-300 font-semibold pt-1">
                        詳細 →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
