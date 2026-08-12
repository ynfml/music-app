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
    .select('artist_name, venue_name, event_date')
    .range(0, 50000);

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
    let monthTotal = 0;

    for (let page = 1; page <= 10; page++) {
      const listUrl = page === 1 
        ? `https://festival-life.com/festival/schedule/2026/26${monthStr}`
        : `https://festival-life.com/festival/schedule/2026/26${monthStr}/page/${page}`;
        
      console.log(`Fetching 2026/${monthStr} (Page ${page}) from: ${listUrl}`);
      
      let html;
      try {
        const res = await fetch(listUrl);
        if (!res.ok) break;
        html = await res.text();
      } catch (err) {
        console.error(`   ❌ Failed to fetch 2026/${monthStr} Page ${page}:`, err.message);
        break;
      }

      const $ = cheerio.load(html);
      const festivalCards = $('div.card-festival');
      if (festivalCards.length === 0) {
        break; // このページのカードが0件なら次の月へ
      }

      let pageAdded = 0;

      festivalCards.each((_, cardEl) => {
        const title = $(cardEl).find('h4.entry-title a').text().trim();
        if (!title) return;

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

        const dateMatch = scheduleText.match(/^(\d{4}\/\d{1,2}\/\d{1,2})/);
        if (!dateMatch) return;

        const formattedDate = formatToIsoDate(dateMatch[1]);
        if (!formattedDate) return;

        // 重複チェック
        const lookupKey = `${title.toLowerCase()}|${venue.toLowerCase()}|${formattedDate}`;
        if (existingKeys.has(lookupKey)) {
          return;
        }

        const baseGenre = getFestivalGenre(title);

        crawledFestivals.push({
          artist_name: title,
          venue_name: venue,
          location_city: city,
          event_date: formattedDate,
          genre: baseGenre,
          is_festival: true
        });

        existingKeys.add(lookupKey);
        pageAdded++;
        monthTotal++;
        console.log(`   ✨ Found Festival: ${title} @ ${venue} (${formattedDate})`);
      });

      if (pageAdded === 0 && festivalCards.length < 18) {
        // カードがすでにあるものばかり、かつ全カード数が18未満ならその月は完了
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 400));
    }

    console.log(`   ℹ️ Month 2026/${monthStr} crawl completed. Added ${monthTotal} festivals.`);
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
