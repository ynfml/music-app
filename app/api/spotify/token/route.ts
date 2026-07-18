import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { code } = await request.json();
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  // Vercel等の本番環境でも正確にURLを生成するための処理
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const origin = `${protocol}://${host}`;
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
