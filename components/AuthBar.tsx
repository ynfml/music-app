"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { createSupabaseClient } from "@/lib/supabase/client";

function translateError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "メールアドレスかパスワードが間違っているか、メール認証が未完了です。未登録の場合は「新規登録」をお試しください。";
  }
  if (message.includes("User already registered")) {
    return "このメールアドレスは既に登録されています。ログインをお試しください。";
  }
  if (message.includes("Password should be at least")) {
    return "パスワードは6文字以上で入力してください。";
  }
  return message;
}

export default function AuthBar() {
  const { user, loading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
    setIsSuccess(false);
  }

  function openModal(initialMode: "login" | "signup" = "login") {
    resetForm();
    setMode(initialMode);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    if (mode === "login") {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  }

  async function handleSignIn() {
    setAuthLoading(true);
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);

    if (error) {
      setAuthError(translateError(error.message));
      return;
    }
    closeModal();
  }

  async function handleSignUp() {
    if (password.length < 6) {
      setAuthError("パスワードは6文字以上で入力してください");
      return;
    }

    setAuthLoading(true);
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
      setAuthError(translateError(error.message));
      return;
    }
    
    setIsSuccess(true);
  }

  async function handleOAuthSignIn(provider: "google" | "spotify") {
    setAuthLoading(true);
    setAuthError(null);
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    // 成功時はリダイレクトされるため、ローディング状態は解除しなくて良い
    if (error) {
      setAuthLoading(false);
      setAuthError(translateError(error.message));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-500" aria-hidden />
        読み込み中...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-block h-2 w-2 rounded-full ${user ? "bg-emerald-400" : "bg-zinc-500"}`} aria-hidden />
          <span className="text-zinc-400 hidden sm:inline">{user ? user.email : "未ログイン"}</span>
          <span className="text-zinc-400 inline sm:hidden">{user ? "ログイン中" : "未ログイン"}</span>
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
          <div className="flex gap-2">
            <button
              onClick={() => openModal("login")}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-zinc-800 transition-all hover:bg-zinc-800 sm:px-4 sm:py-2 sm:text-sm"
            >
              ログイン
            </button>
            <button
              onClick={() => openModal("signup")}
              className="whitespace-nowrap rounded-lg bg-gradient-to-r from-primary-600 to-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:from-primary-500 hover:to-amber-500 sm:px-4 sm:py-2 sm:text-sm"
            >
              新規登録
            </button>
          </div>
        )}
      </div>

      {showModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="w-full max-w-md shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-primary-500/10" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                {isSuccess ? "確認メールを送信しました" : mode === "login" ? "ログイン" : "新規アカウント登録"}
              </h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300">
                <CloseIcon />
              </button>
            </div>

            {isSuccess ? (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-zinc-300 font-medium mb-2">{email} 宛に<br/>確認メールを送信しました。</p>
                  <p className="text-sm text-zinc-500">メールアプリを開き、本文内のリンクをクリックして登録を完了させてください。</p>
                </div>
                <button type="button" onClick={closeModal} className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-zinc-800 hover:bg-zinc-800 mt-4">
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn("google")}
                    disabled={authLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    Google で続ける
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn("spotify")}
                    disabled={authLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1DB954] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1ed760] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Spotify で続ける
                  </button>
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-zinc-950 px-3 text-zinc-500 uppercase tracking-wider">or</span>
                  </div>
                </div>

                <div className="flex mb-6 rounded-lg bg-zinc-900/50 p-1 ring-1 ring-zinc-800">
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setAuthError(null); }}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === "login" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    ログイン
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setAuthError(null); }}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === "signup" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    新規登録
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-zinc-300">メールアドレス</label>
                    <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-zinc-300">パスワード</label>
                    <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="6文字以上" />
                  </div>

                  {authError && (
                    <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300 ring-1 ring-red-900/50">
                      {authError}
                    </p>
                  )}

                  <button type="submit" disabled={authLoading} className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-primary-500 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-60 mt-2">
                    {authLoading ? "処理中..." : mode === "login" ? "ログインする" : "無料で新規登録する"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
