"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const error_description = searchParams.get("error_description");
    const supabase = createSupabaseClient();

    async function handleCallback() {
      if (error_description) {
        setStatus("error");
        setErrorMsg(error_description);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }
      } else {
        // ハッシュベースの認証（Implicit flow）の場合
        const { error } = await supabase.auth.getSession();
        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }
      }
      
      setStatus("success");
      
      // 成功メッセージを見せるために少し待ってからリダイレクトし、
      // 確実にステートを更新させるため href を使用する
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex min-h-full items-center justify-center bg-black">
      {status === "loading" ? (
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p>認証を確認しています...</p>
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col items-center gap-4 text-red-400 max-w-md text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="font-medium text-white">認証エラーが発生しました</p>
          <p className="text-sm text-zinc-400 break-all">{errorMsg}</p>
          <button onClick={() => window.location.href = "/"} className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg text-white text-sm">トップに戻る</button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-emerald-400">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-white">認証が完了しました！</p>
          <p className="text-sm text-zinc-500">トップページへ移動します...</p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-black text-zinc-400">
          認証を確認しています...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
