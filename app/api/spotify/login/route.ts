import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  
  // Vercel等の本番環境でも正確にURLを生成するための処理
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/auth/spotify-callback`;
  
  const scopes = "user-top-read";
  const state = Math.random().toString(36).substring(7);
  
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  return NextResponse.redirect(authUrl);
}
