const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const { detectGenre } = require('./utils/genre');

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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================================
// 2. メイン処理
// ==========================================================
async function runWWWScraper() {
  console.log("🚀 Starting WWW schedule scraper...");

  // 重複防止＆上書き用既存データ
  const { data: existingEvents, error: fetchError } = await supabase
    .from('events')
    .select('id, artist_name, venue_name, event_date');

  if (fetchError) {
    console.error("❌ Failed to fetch existing events:", fetchError.message);
    process.exit(1);
  }

  const existingMap = new Map(
    existingEvents.map(e => [`${e.artist_name.toLowerCase()}|${e.venue_name.toLowerCase()}|${e.event_date}`, e.id])
  );

  const url = 'https://www-shibuya.jp/schedule/';
  console.log(`🔍 Fetching schedule for: 渋谷WWW (${url})`);

  let html;
  try {
    const res = await fetch(url);
    html = await res.text();
  } catch (err) {
    console.error("❌ Fetch failed for WWW:", err.message);
    process.exit(1);
  }

  const $ = cheerio.load(html);
  const venueName = '渋谷WWW';
  const city = '東京';

  // ※WWWのHTML構造に基づく抽出ロジックのベース（必要に応じてセレクタを調整してください）
  const events = $('.schedule-list li').get(); 
  
  if(events.length === 0) {
      console.log("⚠️ No events found. HTML structure might have changed, please update selectors in scripts/scrape-www.js");
  }

  for (const el of events) {
    // 例としての仮のセレクタです。実際のWWWのDOMに合わせて変更が必要です。
    const dateText = $(el).find('.date').text().trim(); // 例: "2026.07.20"
    const performer = $(el).find('.title').text().trim(); 
    let title = $(el).find('.sub-title').text().trim() || null;
    
    if (!performer || !dateText) continue;

    const formattedDate = dateText.replace(/\./g, '-');

    if (title && title.toLowerCase() === performer.toLowerCase()) {
      title = null;
    }

    const genre = detectGenre ? await detectGenre(performer, title || "") : "Rock";
    const lookupKey = `${performer.toLowerCase()}|${venueName.toLowerCase()}|${formattedDate}`;

    if (existingMap.has(lookupKey)) {
      // 既存のイベントがある場合の処理
      continue;
    }

    console.log(`   ➕ Found (NEW): ${formattedDate} | ${performer} (Genre: ${genre})`);
    
    const { error: insertError } = await supabase
      .from('events')
      .insert([{
        artist_name: performer,
        event_title: title,
        venue_name: venueName,
        location_city: city,
        event_date: formattedDate,
        genre: genre,
        is_festival: false,
      }]);

    if (insertError) {
      console.error(`   ❌ Insert failed for ${performer}:`, insertError.message);
    }
  }
}

runWWWScraper();
