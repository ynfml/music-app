import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { refresh_token } = await request.json();
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const authOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
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
