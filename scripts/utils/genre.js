const { getSpotifyGenres } = require('./spotify');

// ==========================================================
// 1. 高精度フェス・イベント辞書（Spotify APIヒットしないイベント用）
// ==========================================================
const FESTIVAL_DICTIONARY = {
  EDM: [
    'ULTRA', 'EDC', 'S2O', 'Tomorrowland', 'WIRED MUSIC FESTIVAL', 'Electrox',
    'MUSIC CIRCUS', 'WARP', 'ATOM', 'CAMELOT', 'WOMB', 'AGEHA', 'V2 TOKYO',
    'ZEROTOKYO', 'TK NIGHTCLUB', 'RAISE'
  ],
  HipHop: [
    'POP YOURS', 'THE HOPE', 'Rolling Loud', 'KOBE MELLOW CRUISE', 'NAMIMONOGATARI',
    'AH1', 'X-CON', 'バトル', 'BATTLE', 'MC BATTLE', 'UMB', 'KOK', '凱旋'
  ],
  Idol: [
    'アイドル', 'IDOL', '乃木坂', '櫻坂', '日向坂', 'AKB', 'ハロプロ', 'アニメ', 
    'アニサマ', 'リスアニ', 'VTuber', 'ホロライブ', 'にじさんじ', '声優', 'KCON', 'MAMA'
  ],
  Pop: [
    'POP SPRING', 'TGC', 'TOKYO GIRLS COLLECTION'
  ],
  Rock: [
    'SUMMER SONIC', 'FUJI ROCK', 'ROCK IN JAPAN', 'COUNTDOWN JAPAN', 'RISING SUN',
    'VIVA LA ROCK', 'METROCK', 'SWEET LOVE SHOWER', 'ARABAKI', 'PUNKSPRING',
    'LOUD PARK', 'KNOTFEST', 'SATANIC', 'DEAD POP FESTIVAL', '京都大作戦',
    'YON FES', 'RUSH BALL', 'MONSTER baSH', 'TREASURE05X', '百万石音楽祭'
  ]
};

/**
 * Spotify APIを利用した超高精度 ジャンル判定エンジン (6ジャンル版)
 * @param {string} performer - アーティスト名
 * @param {string} title - イベントタイトル
 * @returns {Promise<string>} - 'Rock', 'Alternative', 'Pop', 'Idol', 'HipHop', 'EDM' のいずれか
 */
async function detectGenre(performer, title = '') {
  const combinedText = `${performer} ${title}`.toUpperCase();

  // 1. フェス辞書による事前判定（最優先）
  for (const [genre, keywords] of Object.entries(FESTIVAL_DICTIONARY)) {
    if (keywords.some(kw => combinedText.includes(kw.toUpperCase()))) {
      return genre;
    }
  }

  // 2. Spotify API から公式ジャンル配列を取得
  const spotifyGenres = await getSpotifyGenres(performer);
  
  if (spotifyGenres && spotifyGenres.length > 0) {
    const genresStr = spotifyGenres.join(' ').toLowerCase();
    
    // ① Rock / Metal 判定（激しいバンドサウンドを最優先で救出）
    const rockKeywords = ['metal', 'punk', 'screamo', 'hardcore', 'grindcore', 'visual kei', 'v-rock', 'emo', 'grunge', 'heavy rock'];
    if (rockKeywords.some(kw => genresStr.includes(kw)) || genresStr.includes('j-rock')) {
      return 'Rock';
    }

    // ② Idol / Anime 判定（Popに吸収されがちなオタクカルチャーを抽出）
    const idolAnimeKeywords = ['idol', 'anime', 'vocaloid', 'utaite', 'vtuber', 'seiyu', 'denpa'];
    if (idolAnimeKeywords.some(kw => genresStr.includes(kw))) {
      return 'Idol';
    }

    // ③ HipHop / R&B 判定
    const hiphopKeywords = ['hip hop', 'rap', 'r&b', 'trap', 'drill', 'grime', 'g-funk', 'soul', 'neo-soul'];
    if (hiphopKeywords.some(kw => genresStr.includes(kw))) {
      return 'HipHop';
    }

    // ④ EDM / Club 判定
    const edmKeywords = ['edm', 'house', 'techno', 'trance', 'dubstep', 'electro', 'club', 'hardstyle', 'future bass'];
    if (edmKeywords.some(kw => genresStr.includes(kw))) {
      return 'EDM';
    }

    // ⑤ Alternative / Indie 判定（王道ロックではない、またはインディーズポップ）
    const alternativeKeywords = ['alternative', 'indie', 'shoegaze', 'post-rock', 'math rock', 'lo-fi', 'dream pop', 'city pop'];
    if (alternativeKeywords.some(kw => genresStr.includes(kw))) {
      return 'Alternative';
    }

    // ⑥ Pop / J-Pop 判定（上記すべてに該当しない一般的なポップス）
    const popKeywords = ['pop', 'singer-songwriter', 'acoustic', 'ballad'];
    if (popKeywords.some(kw => genresStr.includes(kw)) || genresStr.includes('j-pop')) {
      return 'Pop';
    }
  }

  // 3. Spotifyで見つからない場合のフォールバック（一般的なキーワード）
  const textLower = combinedText.toLowerCase();
  
  const hiphopKeywords = /\b(rap|hiphop|rapper|def jam|dj)\b/i;
  // ⚠️ バグ修正: 'club' は 'Fan Club' などに部分一致して誤判定されるため除外
  const edmKeywords = /\b(edm|techno|trance|nightclub)\b/i; 

  if (hiphopKeywords.test(textLower) || textLower.includes('ラップ') || textLower.includes('ヒップホップ')) return 'HipHop';
  if (edmKeywords.test(textLower) || textLower.includes('テクノ')) return 'EDM';

  // デフォルトは 'Alternative' にする（'Rock'の過剰分類を防ぐ）
  return 'Alternative';
}

module.exports = { detectGenre };
