import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  
  // フロントエンドから渡されたSpotifyのアクセストークンを取得
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!name) {
    return NextResponse.json({ error: "Missing artist name" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Missing Spotify access token" }, { status: 401 });
  }

  try {
    // Spotifyの検索APIを叩いて、該当するアーティストの情報を取得
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch artist from Spotify");
    }

    const data = await res.json();
    const artist = data.artists?.items?.[0];

    if (!artist) {
      return NextResponse.json({ error: "Artist not found on Spotify" }, { status: 404 });
    }

    // 必要な情報（画像、ジャンル、フォロワー数など）だけを抽出して返す
    return NextResponse.json({
      id: artist.id,
      name: artist.name,
      images: artist.images,
      genres: artist.genres,
      followers: artist.followers?.total,
      external_url: artist.external_urls?.spotify,
    });
  } catch (error: any) {
    console.error("Spotify Artist Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
