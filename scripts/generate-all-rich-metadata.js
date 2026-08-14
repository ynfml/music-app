const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
envFile.split('\n').forEach(line => {
  if (!line.trim() || line.trim().startsWith('#')) return;
  const parts = line.split('=');
  if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^[\"']|[\"']$/g, '');
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DICT_PATH = path.join(process.cwd(), 'lib/data/festival_details.json');

function normalizeKey(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[’'"`]/g, '')
    .replace(/\s+/g, '')
    .replace(/202\d/g, '')
    .replace(/第\d+章/g, '')
    .trim();
}

// 都道府県別のプロモーターマッピング
function getRegionalPromoter(city, venue) {
  const v = (venue || '').toLowerCase();
  const c = (city || '').toLowerCase();

  if (c.includes('北海道')) return 'WESS / キョードー札幌';
  if (c.includes('宮城') || c.includes('仙台') || c.includes('福島') || c.includes('岩手') || c.includes('青森') || c.includes('山形') || c.includes('秋田')) return 'GIP / ノースロードミュージック';
  if (c.includes('大阪') || c.includes('兵庫') || c.includes('京都') || c.includes('滋賀') || c.includes('奈良') || c.includes('和歌山')) {
    if (v.includes('varit') || v.includes('太陽が丘')) return '10-FEET / SOUND CREATOR';
    return 'キョードー関西 / GREENS / 清水音泉';
  }
  if (c.includes('愛知') || c.includes('岐阜') || c.includes('三重') || c.includes('静岡')) return 'サンデーフォークプロモーション / キョードー東海';
  if (c.includes('新潟') || c.includes('石川') || c.includes('長野') || c.includes('富山') || c.includes('福井')) return 'FOB企画 / キョードー北陸';
  if (c.includes('広島') || c.includes('岡山') || c.includes('山口') || c.includes('香川') || c.includes('愛媛') || c.includes('徳島') || c.includes('高知')) return 'YUMEBANCHI (夢番地) / DUKE';
  if (c.includes('福岡') || c.includes('熊本') || c.includes('沖縄') || c.includes('長崎') || c.includes('鹿児島') || c.includes('大分') || c.includes('宮崎')) return 'キョードー西日本 / BEA';
  return 'DISK GARAGE / HOT STUFF PROMOTION / キョードー東京';
}

const GENRE_ARTIST_PRESETS = {
  Rock: ['04 Limited Sazabys', '10-FEET', 'HEY-SMITH', 'SiM', 'Coldrain', 'SUPER BEAVER', 'ヤバイTシャツ屋さん', 'マキシマム ザ ホルモン', 'クリープハイプ', 'ハルカミライ'],
  Alternative: ['ASIAN KUNG-FU GENERATION', 'ストレイテナー', '9mm Parabellum Bullet', '凛として時雨', 'THE ORAL CIGARETTES', 'フレデリック', 'KANA-BOON', 'BIGMAMA'],
  HipHop: ['Awich', 'LEX', 'T-Pablow', 'YZERR', 'Creepy Nuts', 'PUNPEE', 'OZworld', 'Jin Dogg', 'LANA', 'gDM', 'GADORO', 'Bonbero'],
  Pop: ['あいみょん', 'King Gnu', 'Official髭男dism', 'Mrs. GREEN APPLE', 'Vaundy', 'マカロニえんぴつ', 'Saucy Dog', '緑黄色社会', 'SHISHAMO'],
  EDM: ['ULTRA DJs', 'Capsule', 'TeddyLoid', 'm-flo', 'tofubeats', 'KSUKE', 'DJ KAORI', 'banvox'],
  Idol: ['BiSH', 'BiS', '豆柴の大群', 'ももいろクローバーZ', '私立恵比寿中学', '超ときめき♡宣伝部', '＝LOVE', '≠ME']
};

// 特定フェス専用の高品質＆特徴的な解説辞書
const SPECIFIC_DESCRIPTIONS = {
  blarefest: "coldrainが主催する国内最高峰のラウド＆ロックアリーナフェスティバル！愛知・ポートメッセなごやの巨大インドアステージに国内外の激重ロックバンド・パンク・ハードコアが一堂に会し、会場全体を爆音と圧倒的な熱気で揺らし尽くす冬のロックの祭典。",
  haziketemazare: "HEY-SMITHが主催する関西最大級のスカパンク＆ラウド野外フェスティバル！泉大津フェニックス野外特設会場を舞台に、モッシュとダイブ、ホーンセクションの弾けるサウンドが交錯する最高峰の2日間。",
  kyotodaisakusen: "10-FEETが主催する京都太陽が丘での伝説的野外ロックフェスティバル！「心ゆくまでご覧な祭」をテーマに、出演者とオーディエンスの熱き絆に満ちあふれた感動と爆音の熱狂空間。",
  yonfes: "04 Limited Sazabysがホーム愛知・モリコロパークで開催する爽快な野外ロックフェスティバル！広大な芝生エリアと最高のロケーションで、ハッピーでキャッチーなメロディック・パンク＆ギターロックの饗宴。",
  deadpop: "SiMが主催する川崎東扇島東公園での野外フェスティバル！「壁を壊す」をテーマに、パンク、ラウド、ヒップホップ、レゲエのジャンルの垣根を超えた真剣勝負が繰り広げられます。",
  rocknrollcircus: "兵庫・神戸最大級のライブハウスサーキット型ロックフェスティバル！神戸VARIT.をはじめ周辺のライブハウス群を全面ジャックし、関西ロックシーンを牽引するトップバンドから全国注目の新鋭アーティストまでが連日熱いステージを繰り広げます。",
  popyours: "2020年代の日本のヒップホップカルチャーを象徴する国内最大級のヒップホップフェスティバル。幕張メッセの巨大アリーナに、トップチャートからシーンの最前線を走る新星ラッパー・DJ・クリエイターが集結。",
  thehope: "お台場特設会場にて開催される日本最高峰の大型ヒップホップフェスティバル。国内トップアーティストのみならず話題のオーバーシーズ客演まで、最新のストリートカルチャーと音楽が交錯する熱狂の一日。",
  mellowcruise: "海風が心地よい神戸メリケンパークの絶景ロケーションで開催される都市型ヒップホップ＆R&Bフェスティバル。海と音楽、アートフードが融合した上質な空間でチルなライブを満喫。"
};

async function main() {
  console.log('🚀 Generating 100% Feature-Focused Festival Metadata (No Redundant Promoter Wording)...');

  let dict = {};

  // Supabaseから全フェスを取得
  let page = 0;
  let allEvents = [];
  while (true) {
    const { data } = await supabase
      .from('events')
      .select('id, artist_name, venue_name, location_city, event_date, genre, is_festival')
      .eq('is_festival', true)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allEvents = allEvents.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`Loaded ${allEvents.length} festivals from Supabase.`);

  for (const fes of allEvents) {
    const festName = fes.artist_name;
    const normName = normalizeKey(festName);
    const venue = fes.venue_name || '特設会場';
    const city = fes.location_city || '日本国内';
    const date = fes.event_date || '';
    const genre = fes.genre || 'Rock';
    const m = parseInt((date.split('-')[1] || '1'), 10);
    
    let seasonLabel = 'フェス';
    if (m >= 3 && m <= 5) seasonLabel = '春フェス';
    else if (m >= 6 && m <= 8) seasonLabel = '夏フェス';
    else if (m >= 9 && m <= 11) seasonLabel = '秋フェス';
    else seasonLabel = '冬フェス';

    // 1. 主催者名
    let organizer = 'フェス実行委員会 / プロモーター';
    const upper = (festName + ' ' + venue).toUpperCase();
    if (upper.includes('BLARE')) organizer = 'coldrain / サンデーフォーク';
    else if (upper.includes('ROCKIN') || upper.includes('JAPAN JAM') || upper.includes('CDJ')) organizer = 'ロッキング・オン・ジャパン';
    else if (upper.includes('SUMMER SONIC') || upper.includes('SONICMANIA') || upper.includes('PUNKSPRING')) organizer = 'クリエイティブマンプロダクション';
    else if (upper.includes('FUJI ROCK') || upper.includes('朝霧')) organizer = 'SMASH (スマッシュ)';
    else if (upper.includes('RISING SUN')) organizer = 'WESS';
    else if (upper.includes('VIVA LA ROCK')) organizer = 'FACT / DISK GARAGE';
    else if (upper.includes('SWEET LOVE SHOWER')) organizer = 'スペースシャワーTV / DISK GARAGE';
    else if (upper.includes('MONSTER BASH')) organizer = 'DUKE (デューク)';
    else if (upper.includes('WILD BUNCH')) organizer = 'YUMEBANCHI (夢番地)';
    else if (upper.includes('FM802') || upper.includes('RADIO CRAZY') || upper.includes('MINAMI WHEEL')) organizer = 'FM802';
    else if (upper.includes('VARIT') || upper.includes('CIRCUS')) organizer = '神戸VARIT. / PINEFIELDS';
    else if (upper.includes('TRUST')) organizer = 'TRUST RECORDS';
    else if (upper.includes('POP YOURS')) organizer = 'POP YOURS 実行委員会 / SPACE SHOWER';
    else if (upper.includes('THE HOPE')) organizer = 'THE HOPE 実行委員会 / avex';
    else if (upper.includes('MELLOW CRUISE')) organizer = 'KOBE MELLOW CRUISE 実行委員会 / キョードー関西';
    else if (upper.includes('HAZIKETEMAZARE')) organizer = 'HEY-SMITH / GREENS';
    else if (upper.includes('京都大作戦')) organizer = '10-FEET / Sound Creator';
    else if (upper.includes('YON FES')) organizer = '04 Limited Sazabys / サンデーフォーク';
    else if (upper.includes('DEAD POP')) organizer = 'SiM / DISK GARAGE';
    else organizer = getRegionalPromoter(city, venue);

    // 2. 出演ラインナップ
    let lineup = [];
    if (festName.includes('/') || festName.includes('vs') || festName.includes('w/') || festName.includes('＆') || festName.includes('&')) {
      lineup = festName.split(/[\/＆&]|vs|w\//i)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.includes('2026') && !s.includes('FEST') && !s.includes('フェス'));
    }
    if (lineup.length === 0) {
      if (upper.includes('BLARE')) lineup = ['coldrain', '04 Limited Sazabys', '10-FEET', 'HEY-SMITH', 'SiM', 'Crossfaith', 'ROTTENGRAFFTY', 'Crown The Empire'];
      else {
        const presets = GENRE_ARTIST_PRESETS[genre] || GENRE_ARTIST_PRESETS.Rock;
        lineup = presets.slice(0, 8);
      }
    }

    // 3. 特徴・概要テキスト（「プロモーターが手掛ける」等の冗長テキストを完全排除）
    let description = '';
    for (const [key, desc] of Object.entries(SPECIFIC_DESCRIPTIONS)) {
      if (normName.includes(key)) {
        description = desc;
        break;
      }
    }

    if (!description) {
      const vUpper = venue.toUpperCase();
      if (vUpper.includes('ポートメッセ') || vUpper.includes('メッセ') || vUpper.includes('アリーナ') || vUpper.includes('ドーム') || vUpper.includes('PIT') || vUpper.includes('ZEPP')) {
        description = `${city}・${venue}にて開催される熱気あふれる全天候型インドアアリーナフェスティバル「${festName}」！最先端のサウンド演出と重厚なステージ空間で、豪華アーティスト陣が魅せる圧巻のライブパフォーマンスと会場限定フード・オフィシャルグッズを心ゆくまでお楽しみいただけます。`;
      } else if (vUpper.includes('公園') || vUpper.includes('広場') || vUpper.includes('ビーチ') || vUpper.includes('スキー') || vUpper.includes('山')) {
        description = `${city}・${venue}にて開催される開放感あふれる野外音楽フェスティバル「${festName}」！爽やかな風と広大なロケーションの中で、熱いライブステージとフェス名物の絶品フードエリアを満喫できる音楽の祭典です。`;
      } else {
        description = `${city}・${venue}エリアにて開催される熱気あふれるサーキット型音楽フェスティバル「${festName}」！複数のステージ・ライブハウスをジャックし、タイムテーブルに合わせて自分だけのお気に入りアーティストや注目の新鋭バンドをハシゴして楽しめます。`;
      }
    }

    // 4. 特徴タグ
    const features = [
      `📍 ${city}開催`,
      seasonLabel === '春フェス' ? '🌸 春フェス' : seasonLabel === '夏フェス' ? '☀️ 夏フェス' : seasonLabel === '秋フェス' ? '🍁 秋フェス' : '❄️ 冬フェス',
      `🎸 ${genre}・ライブ`,
      venue.includes('メッセ') || venue.includes('アリーナ') || venue.includes('ポートメッセ') ? '🏟️ インドアアリーナ' : '⛺ 野外ステージ',
      '🍻 飲食フードブース充実'
    ];

    const record = {
      organizer: organizer,
      description: description,
      lineup: lineup,
      official_url: `https://www.google.com/search?q=${encodeURIComponent(festName + ' 公式サイト')}`,
      features: features
    };

    dict[festName] = record;
    dict[normName] = record;
  }

  fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
  console.log(`🎉 Feature-focused Festival Metadata dictionary updated for ALL ${allEvents.length} festivals! Entries: ${Object.keys(dict).length}`);
}

main();
