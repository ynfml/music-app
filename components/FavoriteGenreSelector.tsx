"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { MUSIC_GENRES, type Genre } from "@/lib/types";

export default function FavoriteGenreSelector() {
  const { user, profile, profileLoading, updateFavoriteGenres } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || profileLoading) {
    return null;
  }

  const currentGenres = profile?.favorite_genres || [];

  async function handleToggle(genre: Genre) {
    if (saving) return;

    setSaving(true);
    setError(null);

    const nextGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];

    const result = await updateFavoriteGenres(nextGenres);

    setSaving(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <div className="w-full border-t border-zinc-900/80 bg-zinc-950/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-zinc-400 sm:text-sm">
            {currentGenres.length > 0
              ? `お気に入りジャンル: ${currentGenres.join(", ")}`
              : "お気に入りジャンルを選ぶと、公演が優先表示されます（複数選択可）"}
          </p>
          {saving && (
            <span className="text-xs text-primary-400">保存中...</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {MUSIC_GENRES.map((genre) => {
            const isActive = currentGenres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                disabled={saving}
                onClick={() => handleToggle(genre)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                  isActive
                    ? "bg-primary-600/20 text-primary-300 ring-1 ring-primary-500/40"
                    : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-red-400">
            {error.includes("profiles")
              ? "プロフィールテーブルが未設定です。Supabase で supabase/schema.sql を実行してください。"
              : error}
          </p>
        )}
      </div>
    </div>
  );
}
