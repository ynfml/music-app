const fs = require('fs');
const path = require('path');

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const { detectGenre } = require('./utils/genre');

// 1. 環境変数のロード
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
  console.error("❌ Supabase credentials are missing in environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// detectGenre は scripts/utils/genre.js からインポートされたものを使用します


// ==========================================================
// 3. メイン処理
// ==========================================================
async function runLotsScraper() {
  console.log("🚀 Starting Niigata LOTS schedule scraper...");

  const venueName = "新潟LOTS";
  const city = "新潟";

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

  const url = 'https://www.fmniigata.com/lots/concert';
  console.log(`🔍 Fetching schedule for: ${venueName} (${url})`);

  let html;
  try {
    const res = await fetch(url);
    html = await res.text();
  } catch (err) {
    console.error("❌ Fetch failed for Niigata LOTS:", err.message);
    process.exit(1);
  }

  const $ = cheerio.load(html);
  const dateLists = $('ul.concert-list > li.date-list');

  console.log(`📊 Found ${dateLists.length} date blocks in HTML. Parsing details...`);
  let count = 0;

  for (const el of dateLists.get()) {
    // 1. 年月と日のパース
    const yearMonthText = $(el).find('.date-block .year-month').text().trim(); // 例: "2026年07月"
    const dayText = $(el).find('.date-block .date_text span').text().trim(); // 例: "9"

    if (!yearMonthText || !dayText) continue;

    const yearMatch = yearMonthText.match(/(\d{4})年(\d{2})月/);
    if (!yearMatch) continue;

    const year = yearMatch[1];
    const month = yearMatch[2];
    const day = dayText.padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // 2. その日のイベントリスト
    const items = $(el).find('ul.concert-info-list > li.item');

    for (const itemEl of items.get()) {
      const performer = $(itemEl).find('p.artist').text().trim().replace(/\s+/g, ' ');
      let title = $(itemEl).find('p.name').text().trim().replace(/\s+/g, ' ');

      if (title.toLowerCase() === performer.toLowerCase() || !title) {
        title = null;
      }

      if (!performer) continue;

      // 開場・開演時間の抽出
      let openTime = null;
      let startTime = null;

      $(itemEl).find('dl').each((_, dl) => {
        const label = $(dl).find('dt').text().trim();
        const value = $(dl).find('dd').text().trim();
        if (label === '開場時間：') {
          openTime = value;
        } else if (label === '開演時間：') {
          startTime = value;
        }
      });

      const genre = await detectGenre(performer, title || "");
      const lookupKey = `${performer.toLowerCase()}|${venueName.toLowerCase()}|${formattedDate}`;

      if (existingMap.has(lookupKey)) {
        const id = existingMap.get(lookupKey);
        console.log(`   🔄 Updating price/time for: ${formattedDate} | ${performer}`);
        await supabase
          .from('events')
          .update({
            ticket_price_info: null,
            open_time: openTime,
            start_time: startTime,
            event_title: title
          })
          .eq('id', id);
        continue;
      }

      console.log(`   ➕ Found (NEW): ${formattedDate} | ${performer} (Genre: ${genre})`);
      
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([{
          artist_name: performer,
          event_title: title,
          venue_name: venueName,
          location_city: city,
          event_date: formattedDate,
          genre: genre,
          is_festival: false,
          ticket_price_info: null,
          open_time: openTime,
          start_time: startTime
        }])
        .select('id')
        .single();

      if (insertError) {
        console.error(`   ❌ Insert failed for ${performer}:`, insertError.message);
      } else if (newEvent) {
        existingMap.set(lookupKey, newEvent.id);
        count++;
      }
    }
  }

  console.log(`🎉 Finished LOTS scraping! New events inserted: ${count}`);
}

runLotsScraper();
