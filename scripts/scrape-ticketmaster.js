const fs = require('fs');
const path = require('path');
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
const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase credentials are missing in environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================================
// 2. メインスクレイパー処理
// ==========================================================
async function runTicketmasterScraper() {
  console.log("🚀 Starting Ticketmaster Discovery API Fetcher...");

  if (!ticketmasterApiKey) {
    console.log("\n⚠️ [Notice] TICKETMASTER_API_KEY is not set in .env.local");
    console.log("   To enable official Ticketmaster API live event sync:");
    console.log("   1. Sign up for free at https://developer.ticketmaster.com/");
    console.log("   2. Add TICKETMASTER_API_KEY=your_key_here to .env.local\n");
    console.log("⏩ Skipping Ticketmaster API fetch for now.\n");
    return;
  }

  // 既存のイベントをSupabaseから取得して重複チェック用Mapを作成
  const { data: existingEvents, error: fetchError } = await supabase
    .from('events')
    .select('id, artist_name, venue_name, event_date')
    .range(0, 50000);

  if (fetchError) {
    console.error("❌ Failed to fetch existing events:", fetchError.message);
    process.exit(1);
  }

  const existingMap = new Map(
    existingEvents.map(e => [`${e.artist_name.trim().toLowerCase()}|${e.venue_name.trim().toLowerCase()}|${e.event_date}`, e.id])
  );

  console.log(`ℹ️ Found ${existingMap.size} existing events in database.`);

  // ページング処理で最大 1,000 件（5ページ x 200件）を一括取得
  const maxPages = 5;
  const pageSize = 200;
  let insertedCount = 0;
  let updatedCount = 0;

  for (let page = 0; page < maxPages; page++) {
    // countryCode=JP を指定して日本国内のイベントに限定
    const apiUrl = `https://app.ticketmaster.com/discovery/v2/events.json?countryCode=JP&size=${pageSize}&page=${page}&sort=date,asc&apikey=${ticketmasterApiKey}`;
    console.log(`🔍 [Page ${page + 1}/${maxPages}] Querying Ticketmaster API (Japan Only)...`);

    let res, data;
    try {
      res = await fetch(apiUrl);
      data = await res.json();
    } catch (err) {
      console.error(`❌ Failed to query Ticketmaster API (Page ${page + 1}):`, err.message);
      break;
    }

    if (res.status !== 200 || !data._embedded || !data._embedded.events) {
      console.log(`ℹ️ End of Japan events on page ${page + 1}.`);
      break;
    }

    const events = data._embedded.events;
    console.log(`   ✨ Page ${page + 1}: Received ${events.length} Japan events.`);

    for (const event of events) {
      const venueObj = event._embedded?.venues?.[0];
      const countryCode = venueObj?.country?.countryCode || venueObj?.country?.name;

      // 日本国内以外のイベントは除外（万が一混ざった場合の安全装置）
      if (countryCode && !['JP', 'Japan', '1'].includes(countryCode)) {
        continue;
      }

      const primaryAttraction = event._embedded?.attractions?.[0]?.name;
      const artistName = primaryAttraction || event.name;
      const eventTitle = event.name !== artistName ? event.name : null;

      const venueName = venueObj?.name || '未定';
      const city = venueObj?.city?.name || '日本';

      const localDate = event.dates?.start?.localDate;
      if (!localDate) continue;

      const startTime = event.dates?.start?.localTime || null;

      let priceText = null;
      if (event.priceRanges && event.priceRanges.length > 0) {
        const p = event.priceRanges[0];
        priceText = `¥${p.min.toLocaleString()} 〜 ¥${p.max.toLocaleString()}`;
      }

      const genre = await detectGenre(artistName, eventTitle || "");
      const lookupKey = `${artistName.trim().toLowerCase()}|${venueName.trim().toLowerCase()}|${localDate}`;

      if (existingMap.has(lookupKey)) {
        const existingId = existingMap.get(lookupKey);
        await supabase
          .from('events')
          .update({
            event_title: eventTitle,
            ticket_price_info: priceText,
            start_time: startTime
          })
          .eq('id', existingId);
        updatedCount++;
      } else {
        const { data: newRecord, error: insertError } = await supabase
          .from('events')
          .insert([{
            artist_name: artistName,
            event_title: eventTitle,
            venue_name: venueName,
            location_city: city,
            event_date: localDate,
            genre: genre,
            start_time: startTime,
            ticket_price_info: priceText,
            is_festival: false
          }])
          .select('id')
          .single();

        if (insertError) {
          // 重複キーエラー等はスキップ
        } else if (newRecord) {
          existingMap.set(lookupKey, newRecord.id);
          insertedCount++;
        }
      }
    }

    // 相手サーバーのレートリミット配慮（200msウェイト）
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n🎉 Ticketmaster Bulk Sync Completed! New Inserted: ${insertedCount}, Updated: ${updatedCount}`);
}

runTicketmasterScraper();
