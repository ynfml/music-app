"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import FavoriteGenreSelector from "@/components/FavoriteGenreSelector";


const GENRE_STYLES = {
  Rock: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  Alternative: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  Pop: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  Idol: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  HipHop: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  EDM: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
};

// ダミーユーザーのリスト (おすすめ音楽ファン)
const RECOMMENDED_USERS = [
  { id: "d8ac2bde-bfd9-43c7-bfd1-419b679a838a", name: "Taro_Rock", genre: "Rock" },
  { id: "a4c90e0b-222a-48d0-8f6a-096ab6fa7139", name: "Alice_EDM", genre: "EDM / Pop" },
  { id: "c7b50f7c-7d9a-4c22-90b9-509ab5fa8130", name: "Ken_Pop", genre: "Pop / HipHop" },
];

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export default function MyPage() {
  const {
    user,
    profile,
    loading,
    events,
    savedEventIds,
    attendedEventIds,
    followingIds,
    followerIds,
    toggleSaveEvent,
    toggleAttendEvent,
    updateProfileBio,
    updateDisplayName,
    uploadAvatar,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"saved" | "attended">("saved");
  const [bioInput, setBioInput] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioSaveSuccess, setBioSaveSuccess] = useState(false);
  
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaveSuccess, setNameSaveSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (profile?.bio) setBioInput(profile.bio);
    if (profile?.display_name) setNameInput(profile.display_name);
    if (user?.id) {
      // 初期アバターURL（デフォルトはDiceBear）
      setAvatarUrl(`https://vxxlkbtfiqhzpriplixa.supabase.co/storage/v1/object/public/avatars/${user.id}.png`);
    }
  }, [profile?.bio, profile?.display_name, user?.id]);

  const handleBioSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBio(true);
    setBioSaveSuccess(false);
    const { error } = await updateProfileBio(bioInput);
    setIsSavingBio(false);
    if (!error) {
      setBioSaveSuccess(true);
      setTimeout(() => setBioSaveSuccess(false), 3000);
    } else {
      alert("自己紹介の保存に失敗しました: " + error);
    }
  };

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingName(true);
    setNameSaveSuccess(false);
    const { error } = await updateDisplayName(nameInput);
    setIsSavingName(false);
    if (!error) {
      setNameSaveSuccess(true);
      setTimeout(() => setNameSaveSuccess(false), 3000);
    } else {
      alert("ユーザー名の保存に失敗しました: " + error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const { url, error } = await uploadAvatar(file);
    setIsUploading(false);
    if (!error && url) {
      setAvatarUrl(url);
    } else {
      alert("画像のアップロードに失敗しました: " + error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-400">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <span className="ml-3 text-sm">読み込み中...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-[70vh] bg-black text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(255,82,0,0.1),transparent)]" aria-hidden />
        <div className="relative z-10 max-w-sm">
          <svg className="mx-auto h-16 w-16 text-zinc-600 mb-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-3">ログインが必要です</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            マイページを表示するにはログインが必要です。画面右上のボタンからログインまたは新規登録を行ってください。
          </p>
        </div>
      </div>
    );
  }

  const savedEvents = events.filter((event) => savedEventIds.includes(event.id));
  const attendedEvents = events.filter((event) => attendedEventIds.includes(event.id));


  return (
    <div className="relative min-h-full bg-black text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_60%_30%_at_50%_0%,rgba(255,82,0,0.15),transparent)]" aria-hidden />

      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 sm:mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-primary-400">My Dashboard</p>
          <h1 className="bg-gradient-to-r from-white via-primary-400 to-amber-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            マイページ
          </h1>
        </header>

        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          {/* 左カラム：プロフィール ＆ お気に入りジャンル設定 */}
          <div className="space-y-6 lg:col-span-1">
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-sm sm:p-6" aria-label="ユーザー情報">
              <h2 className="text-lg font-bold text-white mb-4">アカウント</h2>
              
              {/* プロフィール画像 */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden bg-zinc-900 ring-2 ring-primary-500/50 mb-3 shadow-xl">
                  <img 
                    src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                    alt="プロフィール画像" 
                    onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}` }}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-xs font-bold">{isUploading ? "送信中..." : "変更"}</span>
                  </div>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} disabled={isUploading} />
                </div>
                <p className="text-zinc-500 text-xs">画像をクリックして変更</p>
              </div>

              <div className="space-y-4 text-sm border-t border-zinc-900 pt-5">
                {/* ユーザー名編集 */}
                <form onSubmit={handleNameSave}>
                  <label className="text-zinc-500 text-xs block mb-1">ユーザー名</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="未設定"
                      className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 p-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={isSavingName}
                      className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                        nameSaveSuccess
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 ring-1 ring-zinc-700"
                      }`}
                    >
                      {isSavingName ? "..." : nameSaveSuccess ? "✓" : "保存"}
                    </button>
                  </div>
                </form>

                <div>
                  <p className="text-zinc-500 text-xs">メールアドレス</p>
                  <p className="text-zinc-200 font-medium break-all">{user.email}</p>
                </div>
                {/* フォロー・フォロワー数 */}
                <div className="flex gap-4 pt-2 border-t border-zinc-900">
                  <div>
                    <span className="text-zinc-500 text-xs block">フォロー中</span>
                    <span className="text-lg font-bold text-primary-400">{followingIds.length}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs block">フォロワー</span>
                    <span className="text-lg font-bold text-amber-400">{followerIds.length}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-sm sm:p-6" aria-label="自己紹介">
              <h2 className="text-lg font-bold text-white mb-3">自己紹介</h2>
              <form onSubmit={handleBioSave} className="space-y-3">
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="ライブへの意気込みや、好きなアーティストについて自由に書いてみましょう！（150文字程度）"
                  maxLength={200}
                  rows={3}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none transition-all"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {bioInput.length} / 200 文字
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingBio}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                      bioSaveSuccess
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 ring-1 ring-zinc-700"
                    }`}
                  >
                    {isSavingBio ? "保存中..." : bioSaveSuccess ? "✓ 保存完了" : "保存する"}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-sm overflow-hidden" aria-label="お気に入りジャンル設定">
              <div className="p-5 sm:p-6 pb-0">
                <h2 className="text-lg font-bold text-white">設定</h2>
              </div>
              <FavoriteGenreSelector />
            </section>

            {/* おすすめ音楽ファン (SNS導線) */}
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-sm sm:p-6" aria-label="おすすめ音楽ファン">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">おすすめの音楽ファン</h2>
              <ul className="space-y-3.5">
                {RECOMMENDED_USERS.map((recUser) => (
                  <li key={recUser.id}>
                    <Link
                      href={`/users/${recUser.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-900 hover:border-primary-500/30 hover:bg-zinc-900/80 transition-all group"
                    >
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors">
                          {recUser.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">好み: {recUser.genre}</p>
                      </div>
                      <span className="text-xs text-primary-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        覗く →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 右カラム：公演スケジュール（マイリスト・タブ切り替え） */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-sm sm:p-6 min-h-[400px]" aria-label="公演リスト">
              
              {/* タブヘッダー */}
              <div className="flex border-b border-zinc-900 mb-6 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("saved")}
                  className={`pb-3 text-sm font-bold transition-all relative ${
                    activeTab === "saved"
                      ? "text-pink-500"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  行きたい公演 ({savedEvents.length})
                  {activeTab === "saved" && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-pink-500 rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attended")}
                  className={`pb-3 text-sm font-bold transition-all relative ${
                    activeTab === "attended"
                      ? "text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  行った公演 ({attendedEvents.length})
                  {activeTab === "attended" && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400 rounded-full" />
                  )}
                </button>
              </div>

              {/* タブごとの中身 */}
              {activeTab === "saved" ? (
                savedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
                    <p className="mb-2">保存された公演はまだありません。</p>
                    <p className="text-xs text-zinc-600">
                      ホーム画面で公演カードの右上にあるハートマークを押すと、ここに保存されます。
                    </p>
                    <Link href="/" className="mt-6 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-white transition-all">
                      公演スケジュールを見る
                    </Link>
                  </div>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-1">
                    {savedEvents.map((event) => (
                      <li key={event.id} style={{ viewTransitionName: `event-${event.id}` } as any}>
                        <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-850 bg-zinc-950/60 p-4 transition-all duration-300 hover:border-primary-500/30 hover:shadow-[0_0_30px_-10px_rgba(255,82,0,0.25)] sm:p-5">
                          
                          {/* 保存解除ボタン */}
                          <button
                            type="button"
                            onClick={() => toggleSaveEvent(event.id)}
                            className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-pink-500 transition-all hover:bg-zinc-900 hover:text-pink-400"
                            title="お気に入りから削除"
                          >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                            </svg>
                          </button>

                          <div className="mb-4 pr-10">
                            <div className="flex flex-wrap gap-1.5">
                              {event.is_festival && (
                                <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30">
                                  Festival
                                </span>
                              )}
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${GENRE_STYLES[event.genre]}`}>
                                {event.genre}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">
                              {event.artist_name}
                            </h3>
                          </div>

                          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-xs text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <span className="text-primary-400">📅</span>
                              <time dateTime={event.event_date}>{formatDate(event.event_date)}</time>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-400">📍</span>
                              <span>{event.venue_name} ({event.location_city})</span>
                            </div>
                          </div>

                          <Link
                            href={`/events/${event.id}`}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-800 transition-all hover:bg-zinc-800 hover:text-white"
                          >
                            公演の詳細を見る
                          </Link>
                        </article>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                attendedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
                    <p className="mb-2">行った公演はまだ登録されていません。</p>
                    <p className="text-xs text-zinc-600">
                      ホームや公演詳細ページで、公演カードのチェックマークをクリックするとここに記録されます。
                    </p>
                  </div>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-1">
                    {attendedEvents.map((event) => (
                      <li key={event.id} style={{ viewTransitionName: `event-${event.id}` } as any}>
                        <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-850 bg-zinc-950/60 p-4 transition-all duration-300 hover:border-primary-500/30 hover:shadow-[0_0_30px_-10px_rgba(255,82,0,0.25)] sm:p-5">
                          
                          {/* チェックイン解除ボタン */}
                          <button
                            type="button"
                            onClick={() => toggleAttendEvent(event.id)}
                            className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-emerald-400 transition-all hover:bg-zinc-900 hover:text-emerald-300"
                            title="行ったリストから削除"
                          >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.6Z" clipRule="evenodd" />
                            </svg>
                          </button>

                          <div className="mb-4 pr-10">
                            <div className="flex flex-wrap gap-1.5">
                              {event.is_festival && (
                                <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30">
                                  Festival
                                </span>
                              )}
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${GENRE_STYLES[event.genre]}`}>
                                {event.genre}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">
                              {event.artist_name}
                            </h3>
                          </div>

                          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-xs text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <span className="text-primary-400">📅</span>
                              <time dateTime={event.event_date}>{formatDate(event.event_date)}</time>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-400">📍</span>
                              <span>{event.venue_name} ({event.location_city})</span>
                            </div>
                          </div>

                          <Link
                            href={`/events/${event.id}`}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-800 transition-all hover:bg-zinc-800 hover:text-white"
                          >
                            公演の詳細を見る
                          </Link>
                        </article>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
