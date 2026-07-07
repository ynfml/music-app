import { NextResponse } from 'next/server';

// サーバーサイドでのみ実行されるSpotify APIとの通信処理
async function getAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    // トークンを約50分間キャッシュして無駄なAPI呼び出しを防ぐ
    next: { revalidate: 3000 }
  });

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');

  if (!artist) {
    return NextResponse.json({ error: 'Artist name is required' }, { status: 400 });
  }

  try {
    const token = await getAccessToken();

    // 1. アーティスト名で検索し、Spotify内のアーティストIDを取得
    let query = artist.trim().split(/(\(|（|feat|with)/i)[0].trim();
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&market=JP&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const searchData = await searchRes.json();
    const items = searchData.artists?.items || [];

    // アーティストが見つからない場合
    if (items.length === 0) {
      return NextResponse.json({ tracks: [], artist: null });
    }

    // アーティスト名が完全一致するものを優先する（無関係な人気アーティストを除外）
    const exactMatches = items.filter((item: any) => item.name.toLowerCase() === query.toLowerCase());
    const candidates = exactMatches.length > 0 ? exactMatches : items;

    // 候補の中から「一番人気（popularityが最も高い）」のアーティストを本物として選ぶ
    const artistData = candidates.reduce((prev: any, current: any) => {
      return ((prev.popularity || 0) > (current.popularity || 0)) ? prev : current;
    });

    // 2. アーティストIDを使って、日本市場向けのTop Tracksを取得
    const topTracksRes = await fetch(`https://api.spotify.com/v1/artists/${artistData.id}/top-tracks?market=JP`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const topTracksData = await topTracksRes.json();
    
    // Top 3 の楽曲データを抽出（エラー時は空配列にする）
    let tracks = [];
    if (Array.isArray(topTracksData.tracks)) {
      tracks = topTracksData.tracks.slice(0, 3).map((track: any) => ({
        id: track.id,
        name: track.name,
        preview_url: track.preview_url,
        album_image: track.album.images[0]?.url,
        spotify_url: track.external_urls.spotify
      }));
    }

    return NextResponse.json({
      artist: {
        id: artistData.id,
        name: artistData.name,
        image: artistData.images[0]?.url,
        spotify_url: artistData.external_urls.spotify,
        genres: artistData.genres
      },
      tracks
    });

  } catch (error) {
    console.error("Spotify API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
