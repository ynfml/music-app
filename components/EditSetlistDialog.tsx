"use client";

import { useState, useEffect } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

type SetlistItem = {
  id?: string;
  song_title: string;
  album_name: string | null;
  track_order: number;
};

type EditSetlistDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  initialTracks: SetlistItem[];
  onSave: () => void;
};

export default function EditSetlistDialog({
  isOpen,
  onClose,
  eventId,
  initialTracks,
  onSave,
}: EditSetlistDialogProps) {
  const [tracks, setTracks] = useState<SetlistItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ダイアログが開いた際、初期データをローカルステートにコピー
  useEffect(() => {
    if (isOpen) {
      // 順序（track_order）昇順でソートしてコピー
      const sorted = [...initialTracks].sort((a, b) => a.track_order - b.track_order);
      setTracks(sorted);
      setNewTitle("");
      setNewAlbum("");
      setErrorMsg(null);
    }
  }, [isOpen, initialTracks]);

  if (!isOpen) return null;

  // 曲をリストの末尾に追加する
  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: SetlistItem = {
      song_title: newTitle.trim(),
      album_name: newAlbum.trim() || null,
      track_order: tracks.length + 1,
    };

    setTracks([...tracks, newItem]);
    setNewTitle("");
    setNewAlbum("");
  };

  // 指定の曲をリストから削除し、残りの曲の track_order を再計算する
  const handleRemoveTrack = (index: number) => {
    const updated = tracks.filter((_, i) => i !== index).map((track, i) => ({
      ...track,
      track_order: i + 1,
    }));
    setTracks(updated);
  };

  // 曲順を上へ移動する
  const handleMoveUp = (index: number) => {
    if (index === 0) return; // すでに先頭なら何もしない
    const updated = [...tracks];
    // 隣接するアイテムをスワップ
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;

    // track_order を再割り当て
    const reordered = updated.map((track, i) => ({
      ...track,
      track_order: i + 1,
    }));
    setTracks(reordered);
  };

  // 曲順を下へ移動する
  const handleMoveDown = (index: number) => {
    if (index === tracks.length - 1) return; // すでに末尾なら何もしない
    const updated = [...tracks];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    const reordered = updated.map((track, i) => ({
      ...track,
      track_order: i + 1,
    }));
    setTracks(reordered);
  };

  // 編集したセットリストをDBに保存（削除 ＆ バルクインサート）
  const handleSave = async () => {
    setLoading(true);
    setErrorMsg(null);
    const supabase = createSupabaseClient();

    try {
      // 1. 既存のセットリストを一旦全削除
      const { error: deleteError } = await supabase
        .from("setlists")
        .delete()
        .eq("event_id", eventId);

      if (deleteError) {
        throw new Error(`削除に失敗しました: ${deleteError.message}`);
      }

      // 2. 新しいリストが空でない場合、バルクインサートを実行
      if (tracks.length > 0) {
        const insertData = tracks.map(track => ({
          event_id: eventId,
          song_title: track.song_title,
          album_name: track.album_name,
          track_order: track.track_order,
        }));

        const { error: insertError } = await supabase
          .from("setlists")
          .insert(insertData);

        if (insertError) {
          throw new Error(`登録に失敗しました: ${insertError.message}`);
        }
      }

      // 保存成功
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "予期せぬエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 flex flex-col max-h-[90vh]">
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">セットリストの投稿・編集</h3>
            <p className="text-xs text-zinc-500 mt-0.5">※ 保存すると他のファンにもリアルタイムに反映されます</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* エラー表示 */}
        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3.5 text-xs text-red-400 ring-1 ring-red-500/20">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* 曲の一覧 (スクロール可能領域) */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4 min-h-[200px]">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
              <span className="text-3xl">🎵</span>
              <p className="text-sm mt-3">セットリストに曲がありません。下のフォームから追加してください。</p>
            </div>
          ) : (
            tracks.map((track, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-900/40 p-3 hover:border-zinc-850 hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="text-xs font-mono font-bold text-violet-400 bg-zinc-900 rounded-lg w-7 h-7 flex items-center justify-center">
                    {track.track_order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">{track.song_title}</h4>
                    {track.album_name && (
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">💿 {track.album_name}</p>
                    )}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-1.5 ml-3">
                  <button
                    onClick={() => handleMoveUp(i)}
                    disabled={i === 0}
                    type="button"
                    className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="上へ移動"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveDown(i)}
                    disabled={i === tracks.length - 1}
                    type="button"
                    className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="下へ移動"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => handleRemoveTrack(i)}
                    type="button"
                    className="p-1.5 rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="削除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 新規追加フォーム */}
        <form onSubmit={handleAddTrack} className="border-t border-zinc-900 pt-4 mb-4">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">曲を追加する</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              placeholder="曲名 (例: Cruel Summer)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none transition-colors"
            />
            <input
              type="text"
              placeholder="収録アルバム名 (任意)"
              value={newAlbum}
              onChange={(e) => setNewAlbum(e.target.value)}
              className="sm:w-1/3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors active:scale-[0.98] shrink-0"
            >
              リストに追加
            </button>
          </div>
        </form>

        {/* フッターアクション */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-900 pt-4 mt-auto">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-zinc-850 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-violet-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                保存中...
              </>
            ) : (
              "保存する"
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
