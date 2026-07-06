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
// 2. 全国Zepp会場定義
// ==========================================================
const ZEPP_HALLS = [
  { slug: 'sapporo', name: 'Zepp Sapporo', city: '北海道' },
  { slug: 'divercity_tokyo', name: 'Zepp DiverCity (TOKYO)', city: '東京' },
  { slug: 'haneda', name: 'Zepp Haneda (TOKYO)', city: '東京' },
  { slug: 'yokohama', name: 'KT Zepp Yokohama', city: '神奈川' },
  { slug: 'nagoya', name: 'Zepp Nagoya', city: '愛知' },
  { slug: 'namba', name: 'Zepp Namba (OSAKA)', city: '大阪' },
  { slug: 'osaka_bayside', name: 'Zepp Osaka Bayside', city: '大阪' },
  { slug: 'fukuoka', name: 'Zepp Fukuoka', city: '福岡' }
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
    'juice=juice', '秦 基博', 'genic', 'owv', 'シンガー', '弾き語り'
  ];
  if (popKeywords.some(keyword => text.includes(keyword))) {
    return 'Pop';
  }
  
  // デフォルトはロック (Suchmos, UVERworld, BLUE ENCOUNT, フレデリック, ヒトリエなどはロック)
  return 'Rock';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================================
// 4. メイン処理
// ==========================================================
async function runZeppScraper() {
  console.log("🚀 Starting Zepp schedule scraper...");

  // 重複防止のため、既存イベント取得
  const { data: existingEvents, error: fetchError } = await supabase
    .from('events')
    .select('artist_name, venue_name, event_date');

  if (fetchError) {
    console.error("❌ Failed to fetch existing events:", fetchError.message);
    process.exit(1);
  }

  const existingKeys = new Set(
    existingEvents.map(e => `${e.artist_name.toLowerCase()}|${e.venue_name.toLowerCase()}|${e.event_date}`)
  );

  let totalInserted = 0;

  for (const hall of ZEPP_HALLS) {
    const url = `https://www.zepp.co.jp/hall/${hall.slug}/schedule/`;
    console.log(`\n🔍 Fetching schedule for: ${hall.name} (${url})`);

    await sleep(1500); // サーバー負荷軽減

    let html;
    try {
      const res = await fetch(url);
      html = await res.text();
    } catch (err) {
      console.error(`   ❌ Fetch failed for ${hall.name}:`, err.message);
      continue;
    }

    const $ = cheerio.load(html);
    let count = 0;

    $('a.sch-content').each((_, el) => {
      const year = $(el).find('p.sch-content-date__year').text().trim();
      const monthDay = $(el).find('p.sch-content-date__month').text().trim();
      const performer = $(el).find('h2.sch-content-text__performer').text().trim().replace(/\s+/g, ' ');
      const title = $(el).find('h3.sch-content-text__ttl').text().trim().replace(/\s+/g, ' ');

      if (!year || !monthDay || !performer) return;

      // "7.1" ➔ month="07", day="01"
      const dateParts = monthDay.split('.');
      if (dateParts.length !== 2) return;
      const month = dateParts[0].padStart(2, '0');
      const day = dateParts[1].padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const genre = detectGenre(performer, title);
      const lookupKey = `${performer.toLowerCase()}|${hall.name.toLowerCase()}|${formattedDate}`;

      if (existingKeys.has(lookupKey)) {
        return; // すでに登録済みならスキップ
      }

      console.log(`   ➕ New Event: ${formattedDate} | ${performer} @ ${hall.name} (Genre: ${genre})`);
      rawInserts.push({
        artist_name: performer,
        venue_name: hall.name,
        location_city: hall.city,
        event_date: formattedDate,
        genre: genre,
        is_festival: false
      });
      existingKeys.add(lookupKey);
      count++;
    });

    if (count > 0) {
      // データベースにバルクインサートする
      // （エラー防止と高速化のため、ループの外で一括インサートすることも可能ですが、
      // ログ出力の明瞭さのためにここでは小分けでインサートします）
    }
  }
}

// 簡易バグ修正: rawInsertsの初期化漏れを防ぐため、以下のように一括バルクインサートで整理
async function runZeppScraperFixed() {
  console.log("🚀 Starting Zepp schedule scraper...");

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

  for (const hall of ZEPP_HALLS) {
    const url = `https://www.zepp.co.jp/hall/${hall.slug}/schedule/`;
    console.log(`\n🔍 Fetching schedule for: ${hall.name}`);

    await sleep(1500);

    let html;
    try {
      const res = await fetch(url);
      html = await res.text();
    } catch (err) {
      console.error(`   ❌ Fetch failed for ${hall.name}:`, err.message);
      continue;
    }

    const $ = cheerio.load(html);
    let count = 0;

    // await をループ内で使うため for ... of を使用
    for (const el of $('a.sch-content').get()) {
      const year = $(el).find('p.sch-content-date__year').text().trim();
      const monthDay = $(el).find('p.sch-content-date__month').text().trim();
      const performer = $(el).find('h2.sch-content-text__performer').text().trim().replace(/\s+/g, ' ');
      const title = $(el).find('h3.sch-content-text__ttl').text().trim().replace(/\s+/g, ' ');

      if (!year || !monthDay || !performer) continue;

      const dateParts = monthDay.split('.');
      if (dateParts.length !== 2) continue;
      const month = dateParts[0].padStart(2, '0');
      const day = dateParts[1].padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const openTime = $(el).find('.sch-content-text-date__open').text().trim() || null;
      const startTime = $(el).find('.sch-content-text-date__start').text().trim() || null;
      let priceText = $(el).find('.sch-content-text__desc p').first().text().trim();
      priceText = priceText.replace(/\[PRICE\]/i, '').replace(/\s+/g, ' ').trim();
      if (!priceText) priceText = null;

      const genre = detectGenre(performer, title);
      const lookupKey = `${performer.toLowerCase()}|${hall.name.toLowerCase()}|${formattedDate}`;

      if (existingMap.has(lookupKey)) {
        const id = existingMap.get(lookupKey);
        console.log(`   🔄 Updating price/time for: ${formattedDate} | ${performer}`);
        await supabase
          .from('events')
          .update({
            ticket_price_info: priceText,
            open_time: openTime,
            start_time: startTime
          })
          .eq('id', id);
        
        continue;
      }

      console.log(`   ➕ Found (NEW): ${formattedDate} | ${performer} (Genre: ${genre})`);
      
      // 新規一件インサート
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([{
          artist_name: performer,
          venue_name: hall.name,
          location_city: hall.city,
          event_date: formattedDate,
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
        count++;
      }
    }
  }
}

runZeppScraperFixed();
