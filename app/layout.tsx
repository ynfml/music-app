import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthProvider";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MUSIC JOURNEY | ライブで繋がる音楽コミュニティ",
  description: "行ったライブを記録して、気になる音楽ファンをフォロー。みんなの音楽ジャーニーを覗いてみよう。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-black">
        <AuthProvider>
          <Header />
          <div className="flex-1">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
