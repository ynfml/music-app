"use client";

import { use, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import { TOUR_EVENTS } from "@/lib/events";
import type { Genre } from "@/lib/types";
import CheckInDialog from "@/components/CheckInDialog";
import EditSetlistDialog from "@/components/EditSetlistDialog";

// 各イベントIDに応じた詳細なダミーコンテンツ
type DetailedContent = {
  description: string;
  ticketInfo: { type: string; price: string }[];
  timetable: { time: string; label: string }[];
  tracks: { title: string; duration: string; plays: string }[];
  bio: string;
};

const DETAILED_CONTENTS: Record<string, DetailedContent> = {
  "1": {
    description: "世界的ポップアイコン、テイラー・スウィフトの歴史的ワールドツアー『THE ERAS TOUR』がついに日本上陸！これまでの彼女の音楽キャリアにおける『時代（エラ）』を網羅する、3時間を超える圧巻のステージをお見逃しなく。",
    ticketInfo: [
      { type: "SS席", price: "¥30,000" },
      { type: "S席", price: "¥22,800" },
      { type: "A席", price: "¥18,800" },
      { type: "U-20チケット", price: "¥10,000" },
    ],
    timetable: [
      { time: "16:00", label: "開場 (Doors Open)" },
      { time: "18:00", label: "開演 (Show Starts)" },
      { time: "21:30", label: "終演予定 (Show Ends)" },
    ],
    tracks: [
      { title: "Cruel Summer", duration: "2:58", plays: "2.4B" },
      { title: "Anti-Hero", duration: "3:20", plays: "1.8B" },
      { title: "Blank Space", duration: "3:51", plays: "1.5B" },
    ],
    bio: "グラミー賞を何度も受賞し、世界的シンガーソングライターとして音楽界の歴史を塗り替え続ける時代の開拓者。ファンとの強い絆が生み出す一体感のあるライブは、世界中でプレミアチケットとなっています。",
  },
  "2": {
    description: "現代のR&B/ポップス界を代表するカリスマ、ザ・ウィークエンドの待望の単独来日公演！最新アルバムを引っ提げ、巨大なLEDビジュアルと幻想的な照明、そして彼の透き通るようなハイトーンボイスで会場全体を包み込みます。",
    ticketInfo: [
      { type: "アリーナVIP席", price: "¥35,000" },
      { type: "S指定席", price: "¥18,000" },
      { type: "A指定席", price: "¥15,000" },
    ],
    timetable: [
      { time: "17:30", label: "開場 (Doors Open)" },
      { time: "19:00", label: "開演 (Show Starts)" },
      { time: "21:00", label: "終演予定 (Show Ends)" },
    ],
    tracks: [
      { title: "Blinding Lights", duration: "3:20", plays: "4.1B" },
      { title: "Save Your Tears", duration: "3:35", plays: "2.2B" },
      { title: "Starboy", duration: "3:50", plays: "3.1B" },
    ],
    bio: "カナダ出身のシンガーソングライター。数々の全米1位ヒットを放ち、グラミー賞やスーパーボウルのハーフタイムショー出演など、音楽シーンの頂点に君臨する天才アーティスト。",
  },
  "3": {
    description: "ヘヴィメタルの帝王メタリカ、数年ぶりとなる奇跡の来日！最新アルバム『72 Seasons』の世界観を表現した巨大円形ステージでの超重量級パフォーマンス。激しいリフと圧巻のグルーヴを全身で体感せよ。",
    ticketInfo: [
      { type: "GOLD スタンディング", price: "¥25,000" },
      { type: "S指定席", price: "¥18,500" },
      { type: "A指定席", price: "¥15,000" },
    ],
    timetable: [
      { time: "16:30", label: "開場 (Doors Open)" },
      { time: "18:30", label: "開演 (Show Starts)" },
      { time: "21:00", label: "終演予定 (Show Ends)" },
    ],
    tracks: [
      { title: "Enter Sandman", duration: "5:31", plays: "1.2B" },
      { title: "Master of Puppets", duration: "8:35", plays: "980M" },
      { title: "Lux Æterna", duration: "3:25", plays: "85M" },
    ],
    bio: "1981年に結成され、全世界で1億2000万枚以上のアルバム売上を誇るモンスターバンド。今なお最前線で激しい音を鳴らし続け、メタルというジャンルを超えて支持される伝説のバンドです。",
  },
};

// デフォルトのコンテンツ（定義されていないイベントID用）
const DEFAULT_CONTENT: DetailedContent = {
  description: "世界中のアリーナやスタジアムを沸かせるトップアーティストがついに日本へ！彼らの魂を揺さぶるライブパフォーマンスを至近距離で目撃する一生に一度のチャンス。",
  ticketInfo: [
    { type: "S指定席", price: "¥18,000" },
    { type: "A指定席", price: "¥14,000" },
    { type: "B指定席", price: "¥10,000" },
  ],
  timetable: [
    { time: "17:00", label: "開場 (Doors Open)" },
    { time: "18:30", label: "開演 (Show Starts)" },
    { time: "20:30", label: "終演予定 (Show Ends)" },
  ],
  tracks: [
    { title: "Popular Song #1", duration: "3:15", plays: "150M" },
    { title: "Popular Song #2", duration: "2:45", plays: "90M" },
    { title: "New Single Release", duration: "3:30", plays: "45M" },
  ],
  bio: "世界的なヒット曲を多数持ち、革新的なライブ演出で知られるトップアーティスト。日本国内の音楽ファン待望のツアーがいよいよ開幕します。",
};

const GENRE_STYLES: Record<Genre, string> = {
  Rock: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  Pop: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
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

function getCleanedArtistQuery(artistName: string) {
  let query = artistName;
  // 対バンやゲスト情報、O.A、DJ表記などを除外してメインのアーティスト名だけを切り出す
  query = query.split(/ゲスト|guest|対バン|vs|w\/|\/|&|＆/i)[0];
  return query.trim();
}

function wrapWithAffiliate(playguide: "eplus" | "pia" | "ltike", targetUrl: string) {
  const piaSid = process.env.NEXT_PUBLIC_AFFILIATE_PIA_SID;
  const piaPid = process.env.NEXT_PUBLIC_AFFILIATE_PIA_PID;
  const ltikeMatid = process.env.NEXT_PUBLIC_AFFILIATE_LTIKE_MATID;
  const eplusPartnerId = process.env.NEXT_PUBLIC_AFFILIATE_EPLUS_PARTNERID;

  if (playguide === "pia" && piaSid && piaPid) {
    return `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${piaSid}&pid=${piaPid}&vc_url=${encodeURIComponent(targetUrl)}`;
  }
  if (playguide === "ltike" && ltikeMatid) {
    return `https://px.a8.net/svt/ejp?a8mat=${ltikeMatid}&nokey=on&murl=${encodeURIComponent(targetUrl)}`;
  }
  if (playguide === "eplus" && eplusPartnerId) {
    return `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${piaSid || 'EPLUS_SID'}&pid=${eplusPartnerId}&vc_url=${encodeURIComponent(targetUrl)}`;
  }
  return targetUrl;
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, events, savedEventIds, attendedEventIds, toggleSaveEvent, toggleAttendEvent } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSetlistDialogOpen, setIsSetlistDialogOpen] = useState(false);

  const handleCheckInSubmit = async (comment: string) => {
    if (event) {
      await toggleAttendEvent(event.id, comment);
    }
  };

  const handleCheckInDelete = async () => {
    if (event) {
      await toggleAttendEvent(event.id);
    }
  };
  const [attendees, setAttendees] = useState<{
    user_id: string;
    comment: string | null;
    created_at: string;
    profiles: {
      display_name: string | null;
      favorite_genres: Genre[] | null;
    } | null;
  }[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(true);

  const [setlist, setSetlist] = useState<{
    id?: string;
    song_title: string;
    album_name: string | null;
    track_order: number;
  }[]>([]);
  const [setlistLoading, setSetlistLoading] = useState(true);


  async function loadSetlist() {
    setSetlistLoading(true);
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("setlists")
      .select("id, song_title, album_name, track_order")
      .eq("event_id", id)
      .order("track_order", { ascending: true });

    if (!error && data) {
      setSetlist(data as any);
    } else {
      console.error("Failed to load setlist:", error?.message);
    }
    setSetlistLoading(false);
  }

  useEffect(() => {
    async function loadAttendees() {
      setAttendeesLoading(true);
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("attended_events")
        .select(`
          user_id,
          comment,
          created_at,
          profiles:user_id (
            display_name,
            favorite_genres
          )
        `)
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (!error && data) {
      setAttendees(data as any);
    } else {
      console.error("Failed to load attendees:", error?.message);
    }
    setAttendeesLoading(false);
  }

  loadAttendees();
  loadSetlist();
}, [id, attendedEventIds]);

  // 公演情報を探す
  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center p-6 bg-black text-zinc-100">
        <h1 className="text-2xl font-bold mb-4">公演が見つかりません</h1>
        <Link href="/" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800">
          ホームに戻る
        </Link>
      </div>
    );
  }

  const detail = DETAILED_CONTENTS[event.id] || DEFAULT_CONTENT;
  const isSaved = savedEventIds.includes(event.id);
  const isAttended = attendedEventIds.includes(event.id);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-full bg-transparent text-zinc-100 pb-20">
      {/* ヒーローエリア */}
      <section className="relative overflow-hidden border-b border-zinc-900/60 bg-gradient-to-b from-zinc-950 to-transparent pt-16 pb-12 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]" aria-hidden />
        
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-6 transition-colors">
            <span>←</span> 公演スケジュール一覧に戻る
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {event.is_festival && (
                  <span className="inline-block rounded-full bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    Festival
                  </span>
                )}
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${GENRE_STYLES[event.genre]}`}>
                  {event.genre}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
                {event.event_title ? (
                  <>
                    <span className="block text-zinc-100">{event.event_title}</span>
                    <span className="block text-lg sm:text-xl font-semibold text-zinc-400 mt-4 leading-relaxed">
                      出演: {event.artist_name}
                    </span>
                  </>
                ) : (
                  <span className="block">{event.artist_name}</span>
                )}
              </h1>
              <p className="text-base text-zinc-400 font-medium sm:text-lg flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>📅 {formatDate(event.event_date)}</span>
                <span className="text-zinc-700">·</span>
                <span>📍 {event.venue_name} ({event.location_city})</span>
              </p>
            </div>


            {/* 行った ＆ お気に入り ＆ シェアボタン */}
            <div className="flex flex-wrap items-center gap-3">
              {user && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                      isAttended
                        ? "bg-emerald-600/10 text-emerald-400 ring-1 ring-emerald-500/40 hover:bg-emerald-600/20"
                        : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <CheckIcon solid={isAttended} />
                    {isAttended ? "行った公演に登録中" : "行った公演にチェックイン"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSaveEvent(event.id)}
                    className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                      isSaved
                        ? "bg-pink-600/10 text-pink-400 ring-1 ring-pink-500/40 hover:bg-pink-600/20"
                        : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <svg className="h-5 w-5" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                    {isSaved ? "行きたい公演に保存中" : "行きたいリストに保存"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="rounded-xl bg-zinc-900 p-3 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-all text-sm font-semibold flex items-center gap-1.5"
              >
                <span>🔗</span>
                {copied ? "コピー完了!" : "シェア"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* メインレイアウト */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          
          {/* 左：アーティスト紹介 ＆ 代表曲プレイリスト (2/3カラム) */}
          <div className="lg:col-span-2 space-y-8">
            <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 backdrop-blur-sm sm:p-8 space-y-4">
              <h2 className="text-xl font-bold text-white">公演の紹介</h2>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                {detail.description}
              </p>
              <h3 className="text-base font-bold text-zinc-300 pt-4 border-t border-zinc-900">アーティスト解説</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                {detail.bio}
              </p>
            </section>

            {/* プレイリスト風のトラックリスト */}
            <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 backdrop-blur-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🎵</span> 本日のセットリスト ({setlist.length}曲)
                </h2>
                {user ? (
                  <button
                    onClick={() => setIsSetlistDialogOpen(true)}
                    className="rounded-xl bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all font-semibold px-4 py-2 border border-zinc-800 flex items-center gap-1.5 active:scale-[0.98]"
                  >
                    <span>✍️</span> セットリストを投稿・編集
                  </button>
                ) : (
                  <span className="text-xs text-zinc-500">※ ログインすると編集に参加できます</span>
                )}
              </div>
              <div className="space-y-3">
                {setlistLoading ? (
                  <div className="flex justify-center py-12 text-zinc-500">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    <span className="ml-3 text-xs">セットリスト読み込み中...</span>
                  </div>
                ) : setlist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-2xl text-zinc-700">🎵</span>
                    <p className="text-sm text-zinc-400 mt-3 font-medium">この公演のセットリストはまだ登録されていません。</p>
                    {user ? (
                      <button
                        onClick={() => setIsSetlistDialogOpen(true)}
                        className="mt-4 rounded-xl bg-primary-600/10 text-primary-400 border border-primary-500/20 px-4 py-2 text-xs font-semibold hover:bg-primary-650/20 transition-all"
                      >
                        最初の曲を登録する
                      </button>
                    ) : (
                      <p className="text-xs text-zinc-500 mt-1">ログインして最初の曲を登録しましょう！</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {setlist.map((track, i) => (
                      <div
                        key={track.id || i}
                        className="group/track flex items-center justify-between rounded-xl p-3.5 hover:bg-zinc-900/40 transition-all border border-transparent hover:border-zinc-850"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <span className="text-sm font-mono font-bold text-zinc-500 group-hover/track:text-primary-400 transition-colors w-6 text-center">
                            {track.track_order}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white group-hover/track:text-primary-300 transition-colors truncate">
                              {track.song_title}
                            </h4>
                            {track.album_name && (
                              <span className="text-[10px] text-zinc-500 truncate block mt-0.5">
                                💿 {track.album_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* この公演に行ったファンたち (コメントタイムライン) */}
            <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 backdrop-blur-sm sm:p-8 space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400">✔</span> この公演に行ったファン ({attendees.length})
              </h2>

              {attendeesLoading ? (
                <div className="flex justify-center py-8 text-zinc-500">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                  <span className="ml-3 text-xs">読み込み中...</span>
                </div>
              ) : attendees.length === 0 ? (
                <p className="text-sm text-zinc-500 py-10 text-center">
                  この公演に行った記録はまだありません。ライブに参加したらチェックインしてみましょう！
                </p>
              ) : (
                <div className="space-y-4">
                  {attendees.map((attendee) => {
                    const isCurrentUser = attendee.user_id === user?.id;
                    return (
                      <div
                        key={attendee.user_id}
                        className="rounded-xl border border-zinc-900 bg-zinc-950/80 p-4 space-y-2.5 transition-all hover:border-zinc-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCurrentUser ? (
                              <span className="text-sm font-bold text-primary-300">
                                あなた（{attendee.profiles?.display_name || "名無しの音楽ファン"}）
                              </span>
                            ) : (
                              <Link
                                href={`/users/${attendee.user_id}`}
                                className="text-sm font-bold text-zinc-200 hover:text-primary-400 transition-colors"
                              >
                                {attendee.profiles?.display_name || "名無しの音楽ファン"}
                              </Link>
                            )}
                            <div className="flex gap-1">
                              {attendee.profiles?.favorite_genres?.map((g) => (
                                <span
                                  key={g}
                                  className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase ring-1 ${GENRE_STYLES[g]}`}
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(attendee.created_at).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-all pl-1 border-l border-zinc-800">
                          {attendee.comment || (
                            <span className="text-zinc-600 italic text-xs">コメントなしでチェックインしました</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* 右：チケット・スケジュール詳細 (1/3カラム) */}
          <div className="space-y-6 lg:col-span-1">
            <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 backdrop-blur-sm space-y-6">
              <h2 className="text-lg font-bold text-white pb-3 border-b border-zinc-900">タイムテーブル</h2>
              <ul className="space-y-4">
                {event.open_time || event.start_time ? (
                  <>
                    {event.open_time && (
                      <li className="flex gap-4 items-start">
                        <span className="bg-zinc-900 rounded-lg px-2.5 py-1 text-xs font-bold text-primary-400 font-mono tracking-wide">
                          {event.open_time}
                        </span>
                        <span className="text-sm text-zinc-300 pt-0.5">開場 (Doors Open)</span>
                      </li>
                    )}
                    {event.start_time && (
                      <li className="flex gap-4 items-start">
                        <span className="bg-zinc-900 rounded-lg px-2.5 py-1 text-xs font-bold text-primary-400 font-mono tracking-wide">
                          {event.start_time}
                        </span>
                        <span className="text-sm text-zinc-300 pt-0.5">開演 (Show Starts)</span>
                      </li>
                    )}
                  </>
                ) : (
                  detail.timetable.map((item) => (
                    <li key={item.time} className="flex gap-4 items-start">
                      <span className="bg-zinc-900 rounded-lg px-2.5 py-1 text-xs font-bold text-primary-400 font-mono tracking-wide">
                        {item.time}
                      </span>
                      <span className="text-sm text-zinc-300 pt-0.5">{item.label}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 backdrop-blur-sm space-y-6">
              <h2 className="text-lg font-bold text-white pb-3 border-b border-zinc-900">チケット料金 (税込)</h2>
              {event.ticket_price_info ? (
                <div className="text-sm text-zinc-300 leading-relaxed font-medium bg-zinc-900/30 rounded-xl p-3 border border-zinc-900 mb-6">
                  {event.ticket_price_info}
                </div>
              ) : (
                <ul className="space-y-3 mb-6">
                  {detail.ticketInfo.map((info) => (
                    <li key={info.type} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 font-medium">{info.type}</span>
                      <span className="text-white font-bold font-mono">{info.price}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-zinc-900 pt-5 space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">🎫 チケットを探す (プレイガイド)</h3>
                
                {/* イープラス */}
                <a
                  href={wrapWithAffiliate(
                    "eplus",
                    `https://eplus.jp/sf/search?keyword=${encodeURIComponent(getCleanedArtistQuery(event.artist_name))}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-150 ring-1 ring-zinc-850 px-4 py-3 text-sm font-semibold hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    イープラス (e+) で探す
                  </span>
                  <span className="text-zinc-500 text-xs">➔</span>
                </a>

                {/* チケットぴあ */}
                <a
                  href={wrapWithAffiliate(
                    "pia",
                    `https://t.pia.jp/pia/search_all.do?kw=${encodeURIComponent(getCleanedArtistQuery(event.artist_name))}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-150 ring-1 ring-zinc-850 px-4 py-3 text-sm font-semibold hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    チケットぴあ で探す
                  </span>
                  <span className="text-zinc-500 text-xs">➔</span>
                </a>

                {/* ローソンチケット */}
                <a
                  href={wrapWithAffiliate(
                    "ltike",
                    `https://l-tike.com/search/?keyword=${encodeURIComponent(getCleanedArtistQuery(event.artist_name))}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-150 ring-1 ring-zinc-850 px-4 py-3 text-sm font-semibold hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                    ローチケ で探す
                  </span>
                  <span className="text-zinc-500 text-xs">➔</span>
                </a>

                <p className="text-[10px] text-zinc-500 leading-relaxed pt-2">
                  ※ 先行受付や一般販売が終了している場合があります。各プレイガイドで最新の販売スケジュールと空席状況をご確認ください。
                </p>
              </div>
            </section>

            {/* 💸 マネタイズ用：ライブ遠征アフィリエイト導線 */}
            <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 backdrop-blur-sm space-y-4">
              <h2 className="text-lg font-bold text-white pb-3 border-b border-zinc-900">✈️ ライブ遠征サポート</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                ライブ会場への遠征準備はこちらから！遠征ホテルや交通手段をまとめて予約できます。
              </p>
              
              <div className="space-y-2.5 pt-2">
                {/* 楽天トラベル宿泊（会場付近の検索）アフィリエイト用URL */}
                <a
                  href={`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(event.venue_name + ' ホテル')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800 px-4 py-3.5 text-sm font-semibold hover:bg-zinc-800 transition-all active:scale-[0.98]"
                >
                  <span>🏨</span> 会場近くのホテルを探す
                </a>
                
                {/* 楽天トラベル高速バスアフィリエイト用URL */}
                <a
                  href="https://travel.rakuten.co.jp/bus/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800 px-4 py-3.5 text-sm font-semibold hover:bg-zinc-800 transition-all active:scale-[0.98]"
                >
                  <span>🚌</span> 遠征用の高速バスを探す
                </a>
              </div>
            </section>

          </div>

        </div>
      </main>

      <CheckInDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleCheckInSubmit}
        onConfirmDelete={handleCheckInDelete}
        isAttended={isAttended}
        artistName={event.artist_name}
      />

      <EditSetlistDialog
        isOpen={isSetlistDialogOpen}
        onClose={() => setIsSetlistDialogOpen(false)}
        eventId={event.id}
        initialTracks={setlist}
        onSave={loadSetlist}
      />
    </div>
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
