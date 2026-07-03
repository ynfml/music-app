const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// ==========================================================
// 1. 環境変数の手動ロード
// ==========================================================
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    if (!line.trim() || line.trim().startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
  console.log("✅ Loaded environment variables from .env.local");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase URL or Key is missing!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================================
// 2. 設定：日本の動員上位フェスのターゲットキーワード
// ==========================================================
const TARGET_FESTIVALS = [
  'SUMMER SONIC', 'サマーソニック', 'サマソニ',
  'FUJI ROCK', 'フジロック',
  'ROCK IN JAPAN', 'ロックインジャパン',
  'COUNTDOWN JAPAN', 'カウントダウンジャパン',
  'RISING SUN ROCK', 'ライジングサン',
  'VIVA LA ROCK', 'ビバラロック',
  'METROCK', 'メトロック',
  'SWEET LOVE SHOWER', 'ラブシャ',
  'ARABAKI', 'アラバキ',
  'GREENROOM', 'グリーンルーム',
  'RUSH BALL', 'ラッシュボール',
  'MONSTER baSH', 'モンバス',
  'WILD BUNCH', 'ワイバン',
  '京都大作戦',
  'DEAD POP FESTIVAL', 'デッドポップ',
  'YON FES', 'ヨンフェス',
  'OTODAMA', '音魂',
  'Million Rock', 'ミリオンロック',
  'SATANIC', 'サタニック',
  'SONICMANIA', 'ソニマニ',
  'ULTRA JAPAN', 'ウルトラジャパン',
  'JAPAN JAM', 'ジャパンジャム',
  'PUNKSPRING', 'パンクスプリング',
  'LOUD PARK', 'ラウドパーク'
];

const FESTIVAL_GENRE_MAP = {
  // EDM / Electronic 系
  'ULTRA JAPAN': 'EDM',
  'ウルトラジャパン': 'EDM',
  'SONICMANIA': 'EDM',
  'ソニマニ': 'EDM',
  
  // HipHop 系 (将来的な拡張用)
  'HIPHOP': 'HipHop',
  'THE HOPE': 'HipHop',
  
  // Pop 系 (将来的な拡張用)
  'POP HILL': 'Pop',
  
  // デフォルトは Rock (サマソニ、フジ、ロッキンなどはすべてRock主体)
};

function getFestivalGenre(title) {
  const upperTitle = title.toUpperCase();
  for (const [keyword, genre] of Object.entries(FESTIVAL_GENRE_MAP)) {
    if (upperTitle.includes(keyword.toUpperCase())) {
      return genre;
    }
  }
  return 'Rock'; // デフォルトはRock
}

function isTargetFestival(title) {
  const upperTitle = title.toUpperCase();
  return TARGET_FESTIVALS.some(keyword => upperTitle.includes(keyword.toUpperCase()));
}

// 日付文字列 (例: "2026/07/04") を "2026-07-04" の形式に変換
function formatToIsoDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================================
// 3. クローラーのメイン処理
// ==========================================================
async function runFestivalScraper() {
  console.log("🚀 Starting Japanese Festival scraper...");

  // 3-1. 既存のイベントを取得して重複排除の準備
  console.log("Fetching existing events from Supabase...");
  const { data: existingEvents, error: fetchError } = await supabase
    .from('events')
    .select('artist_name, venue_name, event_date');

  if (fetchError) {
    console.error("❌ Failed to fetch existing events:", fetchError.message);
    process.exit(1);
  }

  const existingKeys = new Set(
    existingEvents.map(e => `${e.artist_name.trim().toLowerCase()}|${e.venue_name.trim().toLowerCase()}|${e.event_date}`)
  );
  console.log(`ℹ️ Found ${existingKeys.size} existing events in database.`);

  // 3-2. Festival Lifeの月別スケジュールページをフェッチ (2026年1月〜12月)
  const crawledFestivals = [];

  for (let month = 1; month <= 12; month++) {
    const monthStr = String(month).padStart(2, '0');
    const listUrl = `https://festival-life.com/festival/schedule/2026/26${monthStr}`;
      
    console.log(`Fetching festival list for 2026/${monthStr} from: ${listUrl}`);
    
    let html;
    try {
      const res = await fetch(listUrl);
      if (!res.ok) {
        console.log(`   ⚠️ Month 2026/${monthStr} returned status ${res.status}. Skipping.`);
        continue;
      }
      html = await res.text();
    } catch (err) {
      console.error(`   ❌ Failed to fetch festival list for month ${monthStr}:`, err.message);
      continue;
    }

    const $ = cheerio.load(html);
    let pageCount = 0;

    // 各フェスカードをループ
    $('div.card-festival').each((_, cardEl) => {
      // タイトル (フェス名)
      const title = $(cardEl).find('h4.entry-title a').text().trim();
      if (!title) return;

      // 各月ページの中にさらに別の年の情報が混ざるのを防ぐため、タイトルや日程に2026が含まれているか確認
      // (Festival Lifeは過去記事などを載せることがあるため)
      if (!title.includes('2026') && !title.includes('’26') && !title.includes('26/27')) {
        return;
      }

      // 東名阪/動員数上位フェスかどうかのフィルタリング
      if (!isTargetFestival(title)) {
        return;
      }

      // 場所 (例: "京都 立山城総合運動公園...")
      const placeText = $(cardEl).find('div.fest-place').text().trim();
      let city = '日本';
      let venue = placeText;
      
      if (placeText) {
        const parts = placeText.split(/\s+/);
        if (parts.length >= 2) {
          city = parts[0];
          venue = parts.slice(1).join(' ');
        }
      }

      // 日程 (例: "2026/07/04(土) - 07/05(日)")
      const scheduleText = $(cardEl).find('div.fest-schedule').text().trim();
      if (!scheduleText) return;

      // 開始日を正規表現で抽出
      const dateMatch = scheduleText.match(/^(\d{4}\/\d{1,2}\/\d{1,2})/);
      if (!dateMatch) return;

      const formattedDate = formatToIsoDate(dateMatch[1]);
      if (!formattedDate) return;

      // 重複チェック
      const lookupKey = `${title.toLowerCase()}|${venue.toLowerCase()}|${formattedDate}`;
      if (existingKeys.has(lookupKey)) {
        return;
      }

      // フェス名から本来の音楽ジャンルを判定
      const baseGenre = getFestivalGenre(title);

      crawledFestivals.push({
        artist_name: title,  // eventsテーブルの主キー名にフェス名を割り振る
        venue_name: venue,
        location_city: city,
        event_date: formattedDate,
        genre: baseGenre,
        is_festival: true
      });

      pageCount++;
      console.log(`   ✨ Found New Festival: ${title} @ ${venue} (${formattedDate})`);
    });

    console.log(`   ℹ️ Month 2026/${monthStr} crawl completed. Added ${pageCount} new festivals.`);

    // サーバー負荷軽減のためウェイトを入れる
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // 3-3. データベースへ保存
  if (crawledFestivals.length === 0) {
    console.log("🎉 No new target festivals to add. Database is up to date!");
    return;
  }

  console.log(`Saving ${crawledFestivals.length} new festivals to Supabase...`);
  const { data: insertedData, error: insertError } = await supabase
    .from('events')
    .insert(crawledFestivals)
    .select();

  if (insertError) {
    console.error("❌ Failed to save new festivals:", insertError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully saved ${insertedData.length} new major festivals to database!`);
}

runFestivalScraper();
