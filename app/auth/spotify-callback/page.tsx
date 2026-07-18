"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

function SpotifyCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Spotifyと連携中...");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    
    const code = searchParams.get("code");
    if (!code) {
      setStatus("連携コードが見つかりませんでした。ホームに戻ります。");
      setTimeout(() => router.push("/"), 2000);
      return;
    }
    
    processed.current = true;

    const exchangeToken = async () => {
      try {
        const res = await fetch("/api/spotify/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          throw new Error("Spotifyトークンの取得に失敗しました");
        }

        const data = await res.json();
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;
        const expiresIn = data.expires_in;

        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        const supabase = createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { error } = await supabase
            .from("profiles")
            .update({
              spotify_access_token: accessToken,
              spotify_refresh_token: refreshToken,
              spotify_token_expires_at: expiresAt,
            })
            .eq("id", user.id);

          if (error) {
            console.error("Failed to save tokens to profile:", error);
            setStatus("連携情報の保存に失敗しました。");
          } else {
            setStatus("連携が完了しました！ホームへ戻ります...");
          }
        } else {
          setStatus("ログイン情報が見つかりません。");
        }

      } catch (err: any) {
        console.error(err);
        setStatus("エラーが発生しました: " + err.message);
      } finally {
        setTimeout(() => router.push("/"), 1500);
      }
    };

    exchangeToken();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <svg className="w-16 h-16 text-[#1DB954] animate-bounce mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15.001 10.62 18.66 12.84c.361.181.54.78.301 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        <p className="text-zinc-300 font-bold">{status}</p>
      </div>
    </div>
  );
}

export default function SpotifyCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black"><p className="text-[#1DB954] font-bold animate-pulse">Loading...</p></div>}>
      <SpotifyCallbackContent />
    </Suspense>
  );
}
