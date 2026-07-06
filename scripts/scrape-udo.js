const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// ==========================================================
// 1. 環境変数のロード
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
// 2. ヘルパー関数
// ==========================================================

// 日付表記 (例: "2026年9月1日") を "2026-09-01" に変換
function parseUdoDate(dateText) {
  const cleanText = dateText.replace(/\s+/g, '');
  const match = cleanText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  const year = match[1];
  const month = match[2].padStart(2, '0');
  const day = match[3].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 会場名からラフに都市（都道府県）を判定
function detectCity(venueName) {
  const name = venueName;
  if (name.includes('大阪') || name.includes('フェスティバルホール') || name.includes('オリックス') || name.includes('BIGCAT') || name.includes('なんば')) {
    return '大阪';
  }
  if (name.includes('名古屋') || name.includes('愛知') || name.includes('日本ガイシ') || name.includes('芸術劇場')) {
    return '愛知';
  }
  if (name.includes('福岡') || name.includes('サンパレス') || name.includes('市民会館')) {
    return '福岡';
  }
  if (name.includes('札幌') || name.includes('北海道') || name.includes('ニトリ')) {
    return '北海道';
  }
  if (name.includes('パシフィコ') || name.includes('横浜') || name.includes('ぴあアリーナ') || name.includes('神奈川')) {
    return '神奈川';
  }
  if (name.includes('有明') || name.includes('武道館' || name.includes('ドーム')) || name.includes('ガーデンシアター') || name.includes('東京') || name.includes('渋谷') || name.includes('新宿') || name.includes('NHKホール')) {
    return '東京';
  }
  if (name.includes('仙台') || name.includes('宮城') || name.includes('サンプラザ')) {
    return '宮城';
  }
  if (name.includes('広島')) {
    return '広島';
  }
  return '日本'; // フォールバック
}

// ==========================================================
// 3. クローラーのメイン処理
// ==========================================================
async function runUdoScraper() {
  console.log("🚀 Starting UDO Artists event scraper...");

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

  // 3-2. ウドーのコンサート一覧ページをフェッチ
  const concertListUrl = 'https://udo.jp/concert';
  console.log(`Fetching UDO concert list from: ${concertListUrl}`);
  
  let html;
  try {
    const res = await fetch(concertListUrl);
    html = await res.text();
  } catch (err) {
    console.error("❌ Failed to fetch UDO concert list:", err.message);
    process.exit(1);
  }

  const $ = cheerio.load(html);
  const targetShows = [];

  // 一覧から公演カードを抽出
  $('a.s-showsList__card').each((_, el) => {
    const href = $(el).attr('href');
    const artistName = $(el).find('h2.s-showsList__cardTitle').text().replace(/\s+/g, ' ').trim();
    
    if (href && artistName) {
      const fullUrl = href.startsWith('http') ? href : `https://udo.jp${href}`;
      targetShows.push({
        artist_name: artistName,
        detail_url: fullUrl
      });
    }
  });

  console.log(`ℹ️ Found ${targetShows.length} concerts in UDO list. Starting detail crawl...`);

  const crawledEvents = [];
  const today = new Date().toISOString().split('T')[0];

  // 各詳細ページをクローリング
  let count = 0;
  for (const show of targetShows) {
    count++;
    console.log(`[${count}/${targetShows.length}] Fetching detail for: ${show.artist_name} (${show.detail_url})`);

    try {
      const res = await fetch(show.detail_url);
      const detailHtml = await res.text();
      const $detail = cheerio.load(detailHtml);

      // ツアータイトル (例: "FINAL FRONTIER TOUR")
      let tourTitle = $detail('.s-showsDetail__titleDescription').text().trim() || null;
      if (tourTitle && (tourTitle.toLowerCase() === show.artist_name.toLowerCase() || tourTitle === "")) {
        tourTitle = null;
      }

      // 詳細ページのスケジュール項目をパース
      $detail('li.s-showsDetail__scheduleItem').each((_, itemEl) => {
        // 日付 (例: "2026年9月1日")
        const dateText = $detail(itemEl).find('p.s-showsDetail__scheduleDate').text().trim();
        // 会場 (例: "有明アリーナ")
        const venue = $detail(itemEl).find('p.s-showsDetail__scheduleVenue').text().trim();

        if (dateText && venue) {
          const formattedDate = parseUdoDate(dateText);
          if (!formattedDate) return;

          // 2026年以降の公演のみ登録対象
          if (formattedDate < '2026-01-01') return;

          // 重複チェック
          const lookupKey = `${show.artist_name.toLowerCase()}|${venue.toLowerCase()}|${formattedDate}`;
          if (existingKeys.has(lookupKey)) {
            console.log(`   ⏭️ Updating event_title for: ${show.artist_name} @ ${venue} (${formattedDate})`);
            supabase
              .from('events')
              .update({ event_title: tourTitle })
              .match({ artist_name: show.artist_name, venue_name: venue, event_date: formattedDate })
              .then(({ error }) => {
                if (error) console.error(`      ❌ Update title failed: ${error.message}`);
              });
            return;
          }

          crawledEvents.push({
            artist_name: show.artist_name,
            event_title: tourTitle,
            venue_name: venue,
            location_city: detectCity(venue),
            event_date: formattedDate,
            genre: 'Rock' // 洋楽ロック中心なのでRockにマージ
          });

          console.log(`   ✨ Found New Concert: ${show.artist_name} @ ${venue} (${formattedDate})`);
        }
      });

      // 負荷軽減ウェイト (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error(`   ❌ Failed to parse detail page: ${show.detail_url}`, err.message);
    }
  }

  // 3-3. データベースへ保存
  if (crawledEvents.length === 0) {
    console.log("🎉 No new UDO concerts to add. Database is up to date!");
    return;
  }

  console.log(`Saving ${crawledEvents.length} new UDO concerts to Supabase...`);
  const { data: insertedData, error: insertError } = await supabase
    .from('events')
    .insert(crawledEvents)
    .select();

  if (insertError) {
    console.error("❌ Failed to save new UDO concerts:", insertError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully saved ${insertedData.length} new UDO concerts to database!`);
}

runUdoScraper();
