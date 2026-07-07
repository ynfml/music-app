const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiresAt = 0;

// シンプルなインメモリキャッシュ（同じアーティストへの重複リクエストを防ぐ）
const genreCache = new Map();

/**
 * Spotifyのアクセストークンを取得する（Client Credentials Flow）
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.warn('Spotify Client ID or Secret is missing in environment variables.');
    return null;
  }

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Spotify token: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // 有効期限を少し短めに設定して安全に更新
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    
    return accessToken;
  } catch (err) {
    console.error('Error fetching Spotify token:', err);
    return null;
  }
}

/**
 * アーティスト名からSpotifyの公式ジャンル配列を取得する
 * @param {string} artistName
 * @returns {Promise<string[]>}
 */
async function getSpotifyGenres(artistName) {
  // クレンジング（不要な文字を消して検索精度を上げる）
  let query = artistName.trim();
  // ゲスト表記などを削除
  query = query.split(/(\(|（|feat|with)/i)[0].trim();
  if (!query) return [];

  const cacheKey = query.toLowerCase();
  if (genreCache.has(cacheKey)) {
    return genreCache.get(cacheKey);
  }

  const token = await getAccessToken();
  if (!token) return [];

  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Spotify API Rate limit exceeded.');
      }
      return [];
    }

    const data = await response.json();
    const artists = data.artists?.items || [];
    
    if (artists.length > 0 && artists[0].genres) {
      const genres = artists[0].genres; // e.g. ["j-pop", "anime", "j-rock"]
      genreCache.set(cacheKey, genres);
      return genres;
    }

    // アーティストが見つからなかった、またはジャンルが登録されていない場合
    genreCache.set(cacheKey, []);
    return [];
  } catch (err) {
    console.error('Error fetching genres from Spotify:', err);
    return [];
  }
}

module.exports = { getSpotifyGenres };
