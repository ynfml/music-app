"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthBar from "./AuthBar";
import { useAuth } from "@/contexts/AuthProvider";

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900/80 bg-black/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/"
            className="bg-gradient-to-r from-primary-400 via-rose-400 to-pink-500 bg-clip-text text-lg font-bold tracking-wider text-transparent sm:text-xl"
          >
            MUSIC JOURNEY
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="メインナビゲーション">
            <Link
              href="/"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all sm:text-sm ${
                pathname === "/"
                  ? "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800"
                  : "text-zinc-400 hover:bg-zinc-950 hover:text-zinc-200"
              }`}
            >
              ホーム
            </Link>
            {user && (
              <Link
                href="/mypage"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all sm:text-sm ${
                  pathname === "/mypage"
                    ? "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800"
                    : "text-zinc-400 hover:bg-zinc-950 hover:text-zinc-200"
                }`}
              >
                マイページ
              </Link>
            )}
          </nav>
        </div>
        <AuthBar />
      </div>
    </header>
  );
}
