const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const { detectGenre } = require('./utils/genre');

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    if (!line.trim() || line.trim().startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSmashScraper() {
  console.log("🚀 Starting SMASH schedule scraper...");

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

  const url = 'https://smash-jpn.com/';
  console.log(`🔍 Fetching schedule for: SMASH (${url})`);

  let html;
  try {
    const res = await fetch(url);
    html = await res.text();
  } catch (err) {
    console.error("❌ Fetch failed for SMASH:", err.message);
    process.exit(1);
  }

  const $ = cheerio.load(html);

  // SMASHサイトに基づく抽出ロジック（仮のセレクタ）
  const events = $('.tour-list .item').get();
  
  if(events.length === 0) {
      console.log("⚠️ No events found. HTML structure might have changed, please update selectors in scripts/scrape-smash.js");
  }

  for (const el of events) {
    const dateText = $(el).find('.date').text().trim(); 
    const performer = $(el).find('.artist').text().trim(); 
    const venueName = $(el).find('.venue').text().trim() || '未定';
    
    if (!performer || !dateText) continue;

    // YYYY-MM-DDへの変換処理（必要に応じて変更）
    let formattedDate = dateText;

    const genre = detectGenre ? await detectGenre(performer, "") : "Rock";
    const lookupKey = `${performer.toLowerCase()}|${venueName.toLowerCase()}|${formattedDate}`;

    if (existingMap.has(lookupKey)) {
      continue;
    }

    console.log(`   ➕ Found (NEW): ${formattedDate} | ${performer} @ ${venueName}`);
    
    const { error: insertError } = await supabase
      .from('events')
      .insert([{
        artist_name: performer,
        venue_name: venueName,
        location_city: '東京', // SMASHは全国ですが、簡易的に設定
        event_date: formattedDate,
        genre: genre,
        is_festival: false,
      }]);

    if (insertError) {
      console.error(`   ❌ Insert failed for ${performer}:`, insertError.message);
    }
  }
}

runSmashScraper();
