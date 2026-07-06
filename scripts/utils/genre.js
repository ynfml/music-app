/**
 * 超高精度 ジャンル判定エンジン
 * @param {string} performer - アーティスト名
 * @param {string} title - イベントタイトル
 * @returns {string} - 'HipHop', 'EDM', 'Pop', 'Rock' のいずれか
 */
function detectGenre(performer, title = '') {
  let text = `${performer} ${title}`.toLowerCase();
  
  // サブアクト・転換DJなどの表記をクレンジングで排除
  text = text.replace(/dj\s*[:：]\s*[^\s/、,]+([/、,\s]|$)/g, ' ');
  text = text.replace(/\(\s*dj\s*\)/g, ' ');
  text = text.replace(/o\.a\s*[:：]\s*[^\s/、,]+/g, ' ');
  text = text.replace(/fan\s*club/g, ' ');
  text = text.replace(/club\s*quattro/g, ' ');
  text = text.replace(/club\s*tour/g, ' ');

  // ----------------------------------------------------
  // 1. HipHop / R&B 判定
  // ----------------------------------------------------
  const hiphopKeywords = /\b(rap|hiphop|rapper|def jam)\b/i;
  const hiphopArtists = [
    // 国内
    'awich', 'bad hop', 'lex', 'jp the wavy', '舐達麻', 'punpee', 'zorn', '¥ellow bucks', 
    'kandytown', 'creepy nuts', 'kohh', 'tohji', 'guca owl', 'wilywnka', '唾奇', 'jindogg', 
    'ralph', 'schadaraparr', 'スチャダラパー', 'ak-69', 't-pablow', 'yzerr', 'kzm',
    'rykey', 'anarchy', '般若', 'ozrosaurus', 'dj krush',
    // 海外
    'travis scott', 'kendrick lamar', 'the weeknd', 'eminem', 'snoop dogg', 
    '50 cent', 'j. cole', 'tyler the creator', 'tyler, the creator', 'a$ap rocky', 'asap rocky', 
    'post malone', 'doja cat', 'megan thee stallion', 'nicki minaj', 'cardi b', 'g-eazy', 
    'tyga', '2pac', 'kanye west', 'jay-z', 'jay z', 'lil uzi vert', 'lil baby', 
    '21 savage', 'migos', 'wiz khalifa', 'kid cudi', 'playboi carti', 'mac miller', 
    'chance the rapper', 'dj khaled', 'chris brown', 'bruno mars'
  ];
  
  if (hiphopKeywords.test(text) || text.includes('ラップ') || text.includes('ヒップホップ') || text.includes('mcbattle')) {
    return 'HipHop';
  }
  for (const artist of hiphopArtists) {
    if (text.includes(artist)) return 'HipHop';
  }

  // ----------------------------------------------------
  // 2. EDM / Dance 判定
  // ----------------------------------------------------
  const edmKeywords = /\b(dj|edm|techno|house|trance)\b/i;
  const edmArtists = [
    'david guetta', 'calvin harris', 'zedd', 'skrillex', 'martin garrix', 'tiësto', 'tiesto', 
    'afrojack', 'steve aoki', 'kygo', 'the chainsmokers', 'marshmello', 'dj snake', 'alan walker', 
    'avicii', 'swedish house mafia', 'diplo', 'major lazer', 'hardwell', 'armin van buuren', 
    'alesso', 'deadmau5', 'galantis', '電気グルーヴ', '石野卓球', 'testset', 'ピノキオピー'
  ];

  if (edmKeywords.test(text) || text.includes('クラブ') || text.includes('テクノ')) {
    return 'EDM';
  }
  for (const artist of edmArtists) {
    if (text.includes(artist)) return 'EDM';
  }

  // ----------------------------------------------------
  // 3. Pop / Idol / K-POP 判定
  // ----------------------------------------------------
  const popKeywords = [
    'アイドル', 'バースデー', 'アニソン', '声優', '天月', 'eve', '鈴木愛理', 
    'juice=juice', '秦 基博', 'genic', 'owv', 'シンガー', '弾き語り', 'vtuber', 'hololive'
  ];
  const popArtists = [
    // アイドル・K-POP
    '乃木坂', '櫻坂', '日向坂', 'akb', 'ももクロ', 'niziu', 'twice', 'blackpink', 'bts', 
    'seventeen', 'newjeans', 'le sserafim', 'aespa', 'ive', 'stray kids', 'enhypen', 'txt', 
    'treasure', 'jo1', 'ini', 'be:first',
    // 国内外ポップ
    'lisa', '髭男', 'yoasobi', 'ado', '宇多田ヒカル', 'taylor swift', 'ed sheeran', 
    'justin bieber', 'ariana grande', 'billie eilish', 'dua lipa', 'harry styles', 'charlie puth'
  ];

  for (const kw of popKeywords) {
    if (text.includes(kw)) return 'Pop';
  }
  for (const artist of popArtists) {
    if (text.includes(artist)) return 'Pop';
  }

  // ----------------------------------------------------
  // 4. Rock (デフォルト)
  // ----------------------------------------------------
  // 上記のいずれにも該当しない場合は、バンドやロック系アーティストとしてRockにフォールバック
  return 'Rock';
}

module.exports = { detectGenre };
