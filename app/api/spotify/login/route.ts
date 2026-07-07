import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  
  // 本番環境（デプロイ先）のURLに自動で対応するように修正
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const redirectUri = `${origin}/auth/spotify-callback`;
  
  const scopes = "user-top-read";
  const state = Math.random().toString(36).substring(7);
  
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  return NextResponse.redirect(authUrl);
}
