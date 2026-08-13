"use client";

import { use, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";

import type { Genre } from "@/lib/types";
import CheckInDialog from "@/components/CheckInDialog";
import EditSetlistDialog from "@/components/EditSetlistDialog";

import festivalDetailsDictRaw from "@/lib/data/festival_details.json";

const festivalDetailsDict = festivalDetailsDictRaw as Record<
  string,
  {
    organizer?: string;
    description?: string;
    lineup?: string[];
    official_url?: string;
    features?: string[];
  }
>;

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

const GENRE_STYLES: Record<Genre, string> = {
  Rock: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
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

  // Spotifyデータと複数アーティスト判定用のState
  const [spotifyData, setSpotifyData] = useState<any>(null);
  const [isMultipleArtists, setIsMultipleArtists] = useState(false);
  const [artistList, setArtistList] = useState<string[]>([]);

  useEffect(() => {
    const currentEvent = events.find((e) => e.id === id);
    if (currentEvent) {
      const name = currentEvent.artist_name;
      // 複数アーティストの可能性がある記号やワードで判定
      const isMulti = /[\/＆&,、・]/.test(name) || /w\/|ゲスト|vs|対バン|GUEST|feat/i.test(name);
      setIsMultipleArtists(isMulti);

      if (isMulti) {
        // アーティスト名を分割して配列にする
        const names = name.split(/[\/＆&,、・]|w\/|ゲスト|vs|対バン|GUEST|feat/i)
          .map(a => a.trim())
          .filter(a => a.length > 0 && a !== '他' && a !== 'O.A');
        setArtistList(names);
      } else {
        // 単独アーティストならSpotifyのTop Tracksを取得
        fetch(`/api/spotify/top-tracks?artist=${encodeURIComponent(name.trim())}`)
          .then(res => res.json())
          .then(data => setSpotifyData(data))
          .catch(err => console.error("Spotify fetch error", err));
      }
    }
  }, [id, events]);

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

function normalizeKey(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/[’'"`]/g, "")
    .replace(/\s+/g, "")
    .replace(/202\d/g, "")
    .replace(/第\d+章/g, "")
    .trim();
}

  useEffect(() => {
    async function loadAttendees() {
      setAttendeesLoading(true);
      const supabase = createSupabaseClient();
      const { data: attendedData } = await supabase
        .from("attended_events")
        .select("user_id, comment, created_at")
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (!attendedData || attendedData.length === 0) {
        setAttendees([]);
        setAttendeesLoading(false);
        return;
      }

      const userIds = Array.from(new Set(attendedData.map((a) => a.user_id)));
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, favorite_genres")
        .in("id", userIds);

      const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));
      const formatted = attendedData.map((a) => ({
        user_id: a.user_id,
        comment: a.comment,
        created_at: a.created_at,
        profiles: profilesMap.get(a.user_id) || null,
      }));

      setAttendees(formatted);
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

  const isSaved = savedEventIds.includes(event.id);
  const isAttended = attendedEventIds.includes(event.id);

  // スマート・エイリアス正規化マッチングによるリッチメタデータ参照
  const normTitle = normalizeKey(event.artist_name);
  let festMeta = festivalDetailsDict[event.artist_name];
  if (!festMeta) {
    for (const [k, val] of Object.entries(festivalDetailsDict)) {
      const nk = normalizeKey(k);
      if (nk === normTitle || (nk.length >= 4 && normTitle.includes(nk)) || (normTitle.length >= 4 && nk.includes(normTitle))) {
        festMeta = val;
        break;
      }
    }
  }

  const organizer = festMeta?.organizer || getFestivalOrganizer(event.artist_name, event.venue_name);
  const seasonInfo = getFestivalSeason(event.event_date);
  const festivalDescription = festMeta?.description || (event.event_title
    ? `${event.event_title}（${event.artist_name}）は、${event.location_city}の${event.venue_name}にて開催される注目の${seasonInfo.label}！主催・制作プロモーター「${organizer}」が手掛ける全国屈指の音楽フェスティバルです。`
    : `「${event.artist_name}」は、${event.location_city}の${event.venue_name}にて開催される注目の${seasonInfo.label}！主催・制作プロモーター「${organizer}」が手掛ける日本全国屈指の音楽フェスティバルです。豪華アーティストのステージパフォーマンスや特設会場ならではの演出をお楽しみください。`);

  const effectiveLineup = (festMeta?.lineup && festMeta.lineup.length > 0) ? festMeta.lineup : artistList;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-full bg-transparent text-zinc-100 pb-20">
      {/* ヒーローエリア */}
      <section className="relative overflow-hidden border-b border-zinc-900/60 bg-gradient-to-b from-zinc-950 to-transparent pt-16 pb-12 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.15),transparent)]" aria-hidden />
        
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-6 transition-colors font-medium">
            <span>←</span> フェス一覧に戻る
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ${seasonInfo.color}`}>
                  {seasonInfo.icon} {seasonInfo.label}
                </span>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ${GENRE_STYLES[event.genre]}`}>
                  {event.genre}
                </span>
                {festMeta?.features?.map((ft) => (
                  <span key={ft} className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-zinc-900 text-amber-300 ring-1 ring-amber-500/30">
                    🏷️ {ft}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
                {event.artist_name}
              </h1>
              <p className="text-base text-zinc-300 font-medium sm:text-lg flex flex-wrap items-center gap-x-4 gap-y-2">
                <span>📅 {formatDate(event.event_date)}</span>
                <span className="text-zinc-700">·</span>
                <span>📍 {event.venue_name} ({event.location_city})</span>
                <span className="text-zinc-700">·</span>
                <span className="text-amber-300 font-bold">🏢 主催: {organizer}</span>
              </p>
            </div>

            {/* 行った ＆ お気に入り ＆ シェア ＆ 公式サイトボタン */}
            <div className="flex flex-wrap items-center gap-3">
              {festMeta?.official_url && (
                <a
                  href={festMeta.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all scale-[1.02] active:scale-[0.98]"
                >
                  <span>🌐</span>
                  公式サイト
                </a>
              )}
              {user && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                      isAttended
                        ? "bg-emerald-600/10 text-emerald-400 ring-1 ring-emerald-500/40 hover:bg-emerald-600/20"
                        : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <CheckIcon solid={isAttended} />
                    {isAttended ? "行ったフェスに登録中" : "行ったフェスにチェックイン"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSaveEvent(event.id)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                      isSaved
                        ? "bg-pink-600/10 text-pink-400 ring-1 ring-pink-500/40 hover:bg-pink-600/20"
                        : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <svg className="h-5 w-5" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                    {isSaved ? "行きたいリストに保存中" : "行きたいリストに保存"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="rounded-2xl bg-zinc-900 p-3 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-all text-sm font-semibold flex items-center gap-1.5"
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
          
          {/* 左：フェス概要 ＆ 主催者情報 ＆ ラインナップ (2/3カラム) */}
          <div className="lg:col-span-2 space-y-8">
            <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-6 backdrop-blur-md sm:p-8 space-y-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🎪</span> フェスの概要・特徴
              </h2>
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {festivalDescription}
              </p>

              {/* 主催者 ＆ 会場詳細カード */}
              <div className="mt-6 pt-6 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">🏢 主催・制作プロモーター</p>
                  <p className="text-sm font-extrabold text-amber-300">{organizer}</p>
                </div>
                <div className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">📍 開催場所・エリア</p>
                  <p className="text-sm font-extrabold text-white">{event.venue_name} ({event.location_city})</p>
                </div>
              </div>

              {/* 出演アーティスト・ステージラインナップ表示 */}
              <div className="mt-8 pt-6 border-t border-zinc-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span className="text-amber-400">🎤</span> 出演アーティスト・ステージラインナップ
                    {effectiveLineup.length > 0 && (
                      <span className="rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 text-xs font-mono font-bold">
                        {effectiveLineup.length}組
                      </span>
                    )}
                  </h3>
                </div>

                {effectiveLineup.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {effectiveLineup.map((artist) => (
                      <Link 
                        key={artist} 
                        href={`/artists/${encodeURIComponent(artist)}`}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
                      >
                        <span className="text-xs font-bold text-zinc-200 truncate group-hover:text-amber-300">{artist}</span>
                        <span className="text-amber-400 text-xs opacity-60 group-hover:opacity-100 transition-opacity">➔</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-zinc-900/40 border border-zinc-850 p-5 text-center text-xs text-zinc-400 space-y-1">
                    <p className="font-semibold text-zinc-300">※ 第1弾・第2弾 出演アーティスト順次発表中</p>
                    <p className="text-[11px] text-zinc-500">フェス公式サイト・SNSにて随時追加アーティストが公開されます。</p>
                  </div>
                )}
              </div>
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
                {event.open_time && (
                  <li className="flex gap-4 items-start">
                    <span className="bg-zinc-900 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-400 font-mono tracking-wide">
                      {event.open_time}
                    </span>
                    <span className="text-sm text-zinc-300 pt-0.5">開場 (Doors Open)</span>
                  </li>
                )}
                {event.start_time && (
                  <li className="flex gap-4 items-start">
                    <span className="bg-zinc-900 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-400 font-mono tracking-wide">
                      {event.start_time}
                    </span>
                    <span className="text-sm text-zinc-300 pt-0.5">開演 (Show Starts)</span>
                  </li>
                )}
                {!event.open_time && !event.start_time && (
                  <li className="text-xs text-zinc-400 leading-relaxed">
                    ※ 詳細なステージタイムテーブル・出演順はフェス公式サイトにて順次発表されます。
                  </li>
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 backdrop-blur-sm space-y-6">
              <h2 className="text-lg font-bold text-white pb-3 border-b border-zinc-900">チケット料金 (税込)</h2>
              <div className="text-sm text-zinc-200 leading-relaxed font-semibold bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800 mb-6">
                {event.ticket_price_info || "※ チケット種別・価格詳細はオフィシャルプレイガイドにて順次公開中"}
              </div>

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
