"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const supabase = createSupabaseClient();

    async function handleCallback() {
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
      router.replace("/");
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-full items-center justify-center bg-black text-zinc-400">
      認証を確認しています...
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
