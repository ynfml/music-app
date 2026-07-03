const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// ==========================================================
// 1. 環境変数の手動ロード (.env.local から読み込み)
// ==========================================================
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    // コメント行や空行を除外
    if (!line.trim() || line.trim().startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
  console.log("✅ Loaded environment variables from .env.local");
} else {
  console.warn("⚠️ .env.local file not found. Make sure environment variables are set.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase URL or Key is missing in environment variables!");
  process.exit(1);
}

// サービスロールキーを使用している場合はログに出力
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("🔑 Initializing Supabase client with Admin Service Role Key (RLS bypass)");
} else {
  console.log("⚠️ Initializing Supabase client with Anon Key (RLS enabled)");
}

const supabase = createClient(supabaseUrl, supabaseKey);


// ==========================================================
// 2. ヘルパー関数 (日付フォーマット・パースなど)
// ==========================================================

// 日付文字列 (例: "2026/6/7") を "2026-06-07" の形式に変換
function formatToIsoDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// クリエイティブマンのジャンル判別 (アーティスト名やURLからラフに割り振る)
function detectGenre(artistName) {
  const name = artistName.toLowerCase();
  if (name.includes('festival') || name.includes('sonic')) return 'Rock';
  if (name.includes('dj') || name.includes('skrillex') || name.includes('again')) return 'EDM';
  if (name.includes('mc') || name.includes('hiphop') || name.includes('lamar')) return 'HipHop';
  return 'Rock'; // デフォルトは洋楽プロモーターの基本であるRockにする
}

// ==========================================================
// 3. クローラーのメイン処理
// ==========================================================
async function runScraper() {
  console.log("🚀 Starting Creativeman event scraper...");

  // 3-1. 既存のイベントをDBから取得 (重複インサート防止用)
  console.log("Fetching existing events from Supabase to prevent duplicates...");
  const { data: existingEvents, error: fetchError } = await supabase
    .from('events')
    .select('artist_name, venue_name, event_date');

  if (fetchError) {
    console.error("❌ Failed to fetch existing events:", fetchError.message);
    process.exit(1);
  }

  // 重複判定用のキーのSetを作成 (形式: "Artist Name|Venue Name|YYYY-MM-DD")
  const existingKeys = new Set(
    existingEvents.map(e => `${e.artist_name.trim().toLowerCase()}|${e.venue_name.trim().toLowerCase()}|${e.event_date}`)
  );
  console.log(`ℹ️ Found ${existingKeys.size} existing events in database.`);

  // 3-2. スケジュールページから詳細ページのURL一覧を抽出
  const scheduleUrl = 'https://www.creativeman.co.jp/event/';
  console.log(`Fetching schedule list from: ${scheduleUrl}`);
  
  let listHtml;
  try {
    const res = await fetch(scheduleUrl);
    listHtml = await res.text();
  } catch (err) {
    console.error("❌ Failed to fetch schedule page:", err.message);
    process.exit(1);
  }

  const $list = cheerio.load(listHtml);
  const detailUrls = new Set();

  // カレンダー内のリンクを抽出
  $list('table.p-calendar a').each((_, el) => {
    const href = $list(el).attr('href');
    if (href && href.startsWith('https://www.creativeman.co.jp/event/')) {
      // 過去ログなどのアーカイブページへのリンクを除外
      if (!href.includes('cmy=') && href !== 'https://www.creativeman.co.jp/event/') {
        detailUrls.add(href);
      }
    }
  });

  console.log(`ℹ️ Found ${detailUrls.size} unique event detail links to crawl.`);

  const crawledEvents = [];

  // 3-3. 各詳細ページをフェッチしてパース
  let count = 0;
  for (const url of detailUrls) {
    count++;
    console.log(`[${count}/${detailUrls.size}] Fetching detail: ${url}`);
    
    try {
      const res = await fetch(url);
      const detailHtml = await res.text();
      const $ = cheerio.load(detailHtml);

      // アーティスト名（メインタイトル）の抽出
      // <h1 class="p-jumbotron__title">iri<span class="p-jumbotron__sub">...</span></h1>
      const titleEl = $('.p-jumbotron__title');
      if (titleEl.length === 0) {
        console.log(`⚠️ Skip: Could not find title in page ${url}`);
        continue;
      }

      // 子要素のspanタグ(サブタイトル)を除いた純粋なテキストを抽出
      const artistName = titleEl.contents().filter(function() {
        return this.type === 'text';
      }).text().trim();

      if (!artistName) {
        console.log(`⚠️ Skip: Empty artist name in page ${url}`);
        continue;
      }

      // 各公演テーブルをループ
      $('table.event-table').each((_, tableEl) => {
        // thの中の u-text-large スパンを取得
        // 例: "東京 2026/6/7(日) Zepp Haneda (TOKYO)"
        const headerText = $(tableEl).find('th span.u-text-large').text().trim() || $(tableEl).find('th').first().text().trim();
        
        if (!headerText) return;

        // 正規表現で「都市」「日付」「会場」に分割
        // パターン: "都市名 2026/6/7(曜日) 会場名"
        // 例: "東京 2026/05/26(火) 渋谷" などの表記に対応
        const match = headerText.match(/^([^\s\d]+)\s+(\d{4}\/\d{1,2}\/\d{1,2})\([^\)]+\)\s+(.+)$/);
        
        if (match) {
          const city = match[1].trim();
          const rawDate = match[2].trim();
          const venue = match[3].trim().replace(/\s*SOLD OUT\s*$/, '').trim(); // SOLD OUTの文字があれば除去

          const formattedDate = formatToIsoDate(rawDate);
          if (!formattedDate) return;

          // 重複チェック
          const lookupKey = `${artistName.toLowerCase()}|${venue.toLowerCase()}|${formattedDate}`;
          if (existingKeys.has(lookupKey)) {
            console.log(`   ⏭️ Skip (Already Exists): ${artistName} @ ${venue} (${formattedDate})`);
            return;
          }

          // インサート用のデータオブジェクトを作成
          crawledEvents.push({
            artist_name: artistName,
            venue_name: venue,
            location_city: city,
            event_date: formattedDate,
            genre: detectGenre(artistName)
          });
          
          console.log(`   ✨ Found New Event: ${artistName} @ ${venue} (${formattedDate})`);
        }
      });

      // 相手サーバーへ負荷をかけないために少しウェイトを入れる (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error(`❌ Failed to parse detail page: ${url}`, err.message);
    }
  }

  // 3-4. Supabaseへ一括インサート
  if (crawledEvents.length === 0) {
    console.log("🎉 No new events to add. Database is up to date!");
    return;
  }

  console.log(`Saving ${crawledEvents.length} new events to Supabase...`);
  const { data: insertedData, error: insertError } = await supabase
    .from('events')
    .insert(crawledEvents)
    .select();

  if (insertError) {
    console.error("❌ Failed to save new events to Supabase:", insertError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully saved ${insertedData.length} new events to database!`);
}

runScraper();
