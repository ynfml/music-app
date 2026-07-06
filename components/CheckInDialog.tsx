"use client";

import { useEffect, useState } from "react";

type CheckInDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
  onConfirmDelete: () => Promise<void>;
  isAttended: boolean;
  artistName: string;
};

export default function CheckInDialog({
  isOpen,
  onClose,
  onSubmit,
  onConfirmDelete,
  isAttended,
  artistName,
}: CheckInDialogProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setComment("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(comment);
    setIsSubmitting(false);
    onClose();
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    await onConfirmDelete();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* モーダルカード */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 shadow-2xl transition-all duration-300">
        {/* 装飾用の光彩 */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-600/10 blur-2xl" />

        {isAttended ? (
          // チェックイン解除モーダル
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">チェックインの解除</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                {artistName} の公演に行った記録（感想コメント含む）をリストから削除しますか？
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-all"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600/15 text-red-400 ring-1 ring-red-500/30 px-4 py-2.5 text-xs font-semibold hover:bg-red-600/30 hover:text-red-300 transition-all"
              >
                {isSubmitting ? "解除中..." : "チェックインを解除する"}
              </button>
            </div>
          </div>
        ) : (
          // チェックイン感想入力モーダル
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">行った公演にチェックイン！</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {artistName} のライブはいかがでしたか？（任意）
              </p>
            </div>

            <div className="space-y-1.5">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="神セトリだった！演出が最高！など、ライブの簡単な感想を書いてみましょう（100文字まで）"
                maxLength={100}
                rows={3}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-850 p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none transition-all"
              />
              <div className="flex justify-end">
                <span className="text-[10px] text-zinc-600 font-medium">
                  {comment.length} / 100 文字
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-all"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-primary-600 to-rose-600 text-white shadow-lg px-5 py-2.5 text-xs font-semibold hover:from-primary-500 hover:to-rose-500 transition-all"
              >
                {isSubmitting ? "登録中..." : "チェックインする"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
