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

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================================
// 2. クアトロ会場定義
// ==========================================================
const QUATTRO_SHOPS = [
  { slug: 'shibuya', name: '渋谷CLUB QUATTRO', city: '東京' },
  { slug: 'umeda', name: '梅田CLUB QUATTRO', city: '大阪' },
  { slug: 'nagoya', name: '名古屋CLUB QUATTRO', city: '愛知' },
  { slug: 'hiroshima', name: '広島CLUB QUATTRO', city: '広島' }
];

// ==========================================================
// 3. ジャンル自動判定ルール
// ==========================================================
function detectGenre(performer, title) {
  let text = `${performer} ${title}`.toLowerCase();
  
  // サブアクト・転換DJ・オープニングアクトなどの表記をクレンジングで排除
  text = text.replace(/dj\s*[:：]\s*[^\s/、,]+([/、,\s]|$)/g, ' ');
  text = text.replace(/\(\s*dj\s*\)/g, ' ');
  text = text.replace(/o\.a\s*[:：]\s*[^\s/、,]+/g, ' ');
  text = text.replace(/fan\s*club/g, ' ');
  text = text.replace(/club\s*quattro/g, ' ');
  text = text.replace(/club\s*tour/g, ' ');
  
  // EDM判定 (単語としての dj, edm, techno またはクレンジング後の club)
  const edmRegex = /\b(dj|edm|techno)\b|\bclub\b/i;
  if (edmRegex.test(text) || text.includes('クラブ') || text.includes('テクノ') || text.includes('電気グルーヴ') || text.includes('testset') || text.includes('opera') || text.includes('ピノキオピー')) {
    return 'EDM';
  }
  
  // HipHop判定
  const hiphopRegex = /\b(rap|hiphop|mc)\b/i;
  if (hiphopRegex.test(text) || text.includes('ラップ') || text.includes('ヒップホップ')) {
    return 'HipHop';
  }
  
  // Pop判定
  const popKeywords = [
    'アイドル', 'バースデー', 'アニソン', '声優', '天月', 'eve', '鈴木愛理', 
    'juice=juice', '秦 基博', 'genic', 'owv', 'シンガー', '弾き語り', 
    'ボーカロイド', '唄'
  ];
  if (popKeywords.some(keyword => text.includes(keyword))) {
    return 'Pop';
  }
  
  return 'Rock'; // デフォルトはクアトロの性質上ロック
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 出演順を自動分割してタイムテーブルに登録するヘルパー
async function populateTimetable(supabase, eventId, artistName) {
  // 重複防止のため、既存のタイムテーブルを全削除
  await supabase
    .from('timetables')
    .delete()
    .eq('event_id', eventId);

  // 区切り文字で出演アーティストを分割 (対バン形式のパース)
  const separators = /\s*\/\s*|\s*、\s*|\s+guest[：:]\s*|\s+vs[：:]\s*|\s+w\/\s*|\s+&\s+/i;
  const performers = artistName
    .split(separators)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (performers.length === 0) return;

  const timetableRecords = performers.map((performer, index) => ({
    event_id: eventId,
    artist_name: performer,
    track_order: index,
    stage_name: null,
    start_time: null
  }));

  const { error } = await supabase
    .from('timetables')
    .insert(timetableRecords);

  if (error) {
    console.error(`   ❌ Failed to insert timetable for event ${eventId}:`, error.message);
  } else {
    console.log(`   ⏱️ Auto-populated timetable with ${timetableRecords.length} acts.`);
  }
}

// ==========================================================
// 4. メイン処理
// ==========================================================
async function runQuattroScraper() {
  console.log("🚀 Starting CLUB QUATTRO schedule scraper...");

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

  const eventsToInsert = [];

  for (const shop of QUATTRO_SHOPS) {
    const url = `https://www.club-quattro.com/${shop.slug}/schedule/`;
    console.log(`\n🔍 Fetching schedule for: ${shop.name}`);

    await sleep(1500);

    let html;
    try {
      const res = await fetch(url);
      html = await res.text();
    } catch (err) {
      console.error(`   ❌ Fetch failed for ${shop.name}:`, err.message);
      continue;
    }

    const $ = cheerio.load(html);
    let count = 0;

    // await をループ内で使うため for ... of を使用
    for (const el of $('li.list-item').get()) {
      const dateStr = $(el).attr('data-event-date'); // YYYY-MM-DD
      const performer = $(el).find('p.txt-01').text().trim().replace(/\s+/g, ' ');
      const title = $(el).find('p.txt-02').text().trim().replace(/\s+/g, ' ');

      if (!dateStr || !performer) continue;

      // 開場・開演時間の抽出
      let openTime = null;
      let startTime = null;
      const timeText = $(el).find('dl.detail-list dt').filter((_, dt) => $(dt).text().includes('開場')).next('dd').text().trim();
      if (timeText) {
        const timeParts = timeText.split('/');
        if (timeParts.length === 2) {
          openTime = timeParts[0].trim();
          startTime = timeParts[1].trim();
        }
      }

      // 料金テキストの抽出
      let priceText = $(el).find('dl.detail-list dt').filter((_, dt) => $(dt).text().includes('料金')).next('dd').text().trim();
      if (!priceText) priceText = null;

      const genre = detectGenre(performer, title);
      const lookupKey = `${performer.toLowerCase()}|${shop.name.toLowerCase()}|${dateStr}`;

      if (existingMap.has(lookupKey)) {
        const id = existingMap.get(lookupKey);
        console.log(`   🔄 Updating price/time for: ${dateStr} | ${performer}`);
        await supabase
          .from('events')
          .update({
            ticket_price_info: priceText,
            open_time: openTime,
            start_time: startTime
          })
          .eq('id', id);
        
        // タイムテーブルを自動抽出して上書き
        await populateTimetable(supabase, id, performer);
        continue;
      }

      console.log(`   ➕ Found (NEW): ${dateStr} | ${performer} (Genre: ${genre})`);
      
      // 新規一件インサート
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([{
          artist_name: performer,
          venue_name: shop.name,
          location_city: shop.city,
          event_date: dateStr,
          genre: genre,
          is_festival: false,
          ticket_price_info: priceText,
          open_time: openTime,
          start_time: startTime
        }])
        .select('id')
        .single();

      if (insertError) {
        console.error(`   ❌ Insert failed for ${performer}:`, insertError.message);
      } else if (newEvent) {
        existingMap.set(lookupKey, newEvent.id);
        // 新しいタイムテーブルレコードを作成
        await populateTimetable(supabase, newEvent.id, performer);
        count++;
      }
    }
  }
}

runQuattroScraper();
