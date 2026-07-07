import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { code } = await request.json();
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  // 本番環境（デプロイ先）のURLに自動で対応するように修正
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const redirectUri = `${origin}/auth/spotify-callback`;

  const authOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
    },
    body: new URLSearchParams({
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  };

  const response = await fetch("https://accounts.spotify.com/api/token", authOptions);
  if (!response.ok) {
    const err = await response.json();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
