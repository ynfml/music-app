"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function AuthBar() {
  const { user, loading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showModal]);

  function resetForm() {
    setEmail("");
    setPassword("");
    setAuthError(null);
    setAuthMessage(null);
  }

  function openModal() {
    resetForm();
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  async function handleSignIn() {
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    closeModal();
  }

  async function handleSignUp() {
    if (!email || !password) {
      setAuthError("メールアドレスとパスワードを入力してください");
      return;
    }
    if (password.length < 6) {
      setAuthError("パスワードは6文字以上で入力してください");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setAuthMessage(
      "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。",
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-500"
          aria-hidden
        />
        読み込み中...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              user ? "bg-emerald-400" : "bg-zinc-500"
            }`}
            aria-hidden
          />
          <span className="text-zinc-400">
            {user ? user.email : "未ログイン"}
          </span>
        </div>

        {user ? (
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-zinc-800 transition-all hover:bg-red-950/50 hover:text-red-300 hover:ring-red-900/50 sm:text-sm"
          >
            ログアウト
          </button>
        ) : (
          <button
            type="button"
            onClick={openModal}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:from-violet-500 hover:to-fuchsia-500 sm:text-sm"
          >
            ログイン / 新規登録
          </button>
        )}
      </div>

      {showModal &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={closeModal}
          >
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
              <div
                className="w-full max-w-md shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-violet-500/10"
                onClick={(e) => e.stopPropagation()}
              >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="auth-modal-title"
                  className="text-lg font-semibold text-white"
                >
                  ログイン / 新規登録
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  メールアドレスとパスワードを入力してください
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
                aria-label="閉じる"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSignIn();
              }}
            >
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  メールアドレス
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  パスワード
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="6文字以上"
                />
              </div>

              {authError && (
                <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300 ring-1 ring-red-900/50">
                  {authError}
                </p>
              )}

              {authMessage && (
                <p className="rounded-lg bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300 ring-1 ring-emerald-900/50">
                  {authMessage}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading ? "処理中..." : "ログイン"}
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleSignUp}
                  className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 ring-1 ring-zinc-800 transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  新規登録
                </button>
              </div>
            </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18 18 6M6 6l12 12"
      />
    </svg>
  );
}
