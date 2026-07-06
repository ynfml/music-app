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
  console.log("✅ Loaded environment variables from .env.local");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================================
// 2. ジャンル自動判定ルール
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
    '七海ひろき', 'しゅーくる', 'なぎちゃん'
  ];
  if (popKeywords.some(keyword => text.includes(keyword))) {
    return 'Pop';
  }
  
  return 'Rock'; // デフォルトはリキッドルームの性質上ロック
}

// ==========================================================
// 3. メイン処理
// ==========================================================
async function runLiquidroomScraper() {
  console.log("🚀 Starting LIQUIDROOM schedule scraper...");

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
  const url = 'https://www.liquidroom.net/schedule/';
  console.log(`🔍 Fetching schedule for: 恵比寿LIQUIDROOM (${url})`);

  let html;
  try {
    const res = await fetch(url);
    html = await res.text();
  } catch (err) {
    console.error("❌ Fetch failed for LIQUIDROOM:", err.message);
    process.exit(1);
  }

  const $ = cheerio.load(html);
  const venueName = '恵比寿LIQUIDROOM';
  const city = '東京';

  // await をループ内で使うため for ... of を使用
  for (const el of $('article').get()) {
    const href = $(el).find('a.s_link').attr('href');
    if (!href) continue;

    // URL末尾 of _20260716 などの日付パターンを抽出
    const dateMatch = href.match(/_(\d{8})$/);
    if (!dateMatch) continue;

    const rawDate = dateMatch[1]; // "20260716"
    const formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`; // "2026-07-16"

    // 出演アーティスト名の抽出 (LINE UPがあればそれ、無ければh2のタイトル)
    let performer = '';
    let title = '';

    const lineUpDl = $(el).find('dl.clear').filter((_, dl) => {
      return $(dl).find('dt.f1M').text().trim() === 'LINE UP';
    });

    if (lineUpDl.length > 0) {
      performer = lineUpDl.find('dd').text().trim().replace(/\s+/g, ' ');
      title = $(el).find('h2').text().trim().replace(/\s+/g, ' ');
    } else {
      performer = $(el).find('h2').text().trim().replace(/\s+/g, ' ');
      title = $(el).find('p.subtitle').text().trim().replace(/\s+/g, ' ');
    }

    if (!performer) continue;

    // タイトルがアーティスト名と同一か空なら null にする
    if (title.toLowerCase() === performer.toLowerCase() || !title) {
      title = null;
    }

    // 開場・開演時間の抽出
    let openTime = null;
    let startTime = null;

    const openDl = $(el).find('dl.clear').filter((_, dl) => $(dl).find('dt.f1M').text().trim() === 'OPEN');
    if (openDl.length > 0) {
      openTime = openDl.find('dd').text().trim();
    }
    const startDl = $(el).find('dl.clear').filter((_, dl) => $(dl).find('dt.f1M').text().trim() === 'START');
    if (startDl.length > 0) {
      startTime = startDl.find('dd').text().trim();
    }

    // 料金の抽出
    let priceText = null;
    const advDl = $(el).find('dl.clear').filter((_, dl) => $(dl).find('dt.f1M').text().trim() === 'ADV');
    if (advDl.length > 0) {
      priceText = advDl.find('dd').text().trim().replace(/\s+/g, ' ');
    }

    const genre = detectGenre(performer, title || "");
    const lookupKey = `${performer.toLowerCase()}|${venueName.toLowerCase()}|${formattedDate}`;

    if (existingMap.has(lookupKey)) {
      const id = existingMap.get(lookupKey);
      console.log(`   🔄 Updating price/time for: ${formattedDate} | ${performer}`);
      await supabase
        .from('events')
        .update({
          ticket_price_info: priceText,
          open_time: openTime,
          start_time: startTime,
          event_title: title
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
        event_title: title,
        venue_name: venueName,
        location_city: city,
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
    }
  }
}

runLiquidroomScraper();
