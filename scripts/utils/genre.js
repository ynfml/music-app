const { getSpotifyGenres } = require('./spotify');

/**
 * Spotify APIを利用した超高精度 ジャンル判定エンジン
 * @param {string} performer - アーティスト名
 * @param {string} title - イベントタイトル
 * @returns {Promise<string>} - 'HipHop', 'EDM', 'Pop', 'Rock' のいずれか
 */
async function detectGenre(performer, title = '') {
  // 1. Spotify API から公式ジャンル配列を取得
  const spotifyGenres = await getSpotifyGenres(performer);
  
  if (spotifyGenres && spotifyGenres.length > 0) {
    // ジャンルの配列を一つの文字列に結合して部分一致させやすくする
    const genresStr = spotifyGenres.join(' ').toLowerCase();
    
    // HipHop系
    if (genresStr.includes('hip hop') || genresStr.includes('rap') || genresStr.includes('r&b') || genresStr.includes('drill')) {
      return 'HipHop';
    }
    // EDM系
    if (genresStr.includes('edm') || genresStr.includes('house') || genresStr.includes('techno') || genresStr.includes('dance') || genresStr.includes('trance')) {
      return 'EDM';
    }
    // Pop系 (j-pop, k-pop, idol, animeなど)
    if (genresStr.includes('pop') || genresStr.includes('idol') || genresStr.includes('anime') || genresStr.includes('vocaloid')) {
      return 'Pop';
    }
    // Rock系
    if (genresStr.includes('rock') || genresStr.includes('metal') || genresStr.includes('punk') || genresStr.includes('visual kei') || genresStr.includes('band')) {
      return 'Rock';
    }
  }

  // 2. Spotifyで見つからない場合の安全なフォールバック判定
  let text = `${performer} ${title}`.toLowerCase();
  text = text.replace(/dj\s*[:：]\s*[^\s/、,]+([/、,\s]|$)/g, ' ');
  text = text.replace(/\(\s*dj\s*\)/g, ' ');

  // 誤判定の原因になりやすい一般的な英単語（house, clubなど）は徹底排除
  const hiphopKeywords = /\b(rap|hiphop|rapper|def jam|mcbattle)\b/i;
  const edmKeywords = /\b(dj|edm|techno|trance)\b/i; 
  const popKeywords = ['アイドル', '声優', 'vtuber', 'hololive', 'バースデー'];

  if (hiphopKeywords.test(text) || text.includes('ラップ') || text.includes('ヒップホップ')) return 'HipHop';
  if (edmKeywords.test(text) || text.includes('テクノ')) return 'EDM';
  for (const kw of popKeywords) {
    if (text.includes(kw)) return 'Pop';
  }

  // デフォルト
  return 'Rock';
}

module.exports = { detectGenre };
