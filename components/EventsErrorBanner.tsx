"use client";

import { useAuth } from "@/contexts/AuthProvider";

// データ取得に失敗したときだけ表示するバナー。
// 「取得失敗」と「条件に合うフェスが0件」を画面上で区別するためのもの。
export default function EventsErrorBanner() {
  const { eventsError, retryEvents } = useAuth();

  if (!eventsError) return null;

  return (
    <div
      role="alert"
      className="mx-auto mt-4 w-full max-w-5xl px-4"
    >
      <div className="space-y-3 rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-5 text-center">
        <p className="text-sm font-semibold text-red-300">
          フェス情報の取得に失敗しました
        </p>
        <p className="text-xs text-zinc-400">
          データベースに接続できませんでした。しばらく待ってから再試行してください。
        </p>
        <button
          type="button"
          onClick={retryEvents}
          className="rounded-full bg-zinc-900 px-6 py-2.5 text-xs font-semibold text-amber-400 ring-1 ring-zinc-700 transition-all hover:bg-zinc-800 active:scale-[0.98]"
        >
          再試行する
        </button>
      </div>
    </div>
  );
}
