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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================================
// 2. 会場・都市マッピング
// ==========================================================
const CITY_MAP = {
  '新潟LOTS': '新潟',
  '新潟テルサ': '新潟',
  '新潟CLUB RIVERST': '新潟',
  '新潟GOLDEN PIGS RED': '新潟',
  '新潟GOLDEN PIGS BLACK': '新潟',
  '新潟県民会館': '新潟',
  '新潟市音楽文化会館': '新潟',
  'アオーレ長岡': '新潟',
  '長岡市立劇場': '新潟',
  '長野CLUB JUNK BOX': '長野',
  '長野ライブハウス J': '長野',
  '松本ALECX': '長野',
  '長野市芸術館': '長野',
  'ホクト文化ホール': '長野',
  '金沢EIGHT HALL': '金沢',
  '金沢vanvanV4': '金沢',
  '金沢AZ': '金沢',
  '金沢GOLD CREEK': '金沢',
  '北國新聞赤羽ホール': '金沢',
  '本多の森北電ホール': '金沢',
  '金沢歌劇座': '金沢',
  '金沢REDSUN': '金沢',
  '金沢市文化ホール': '金沢',
  '金沢市アートホール': '金沢',
  '富山MAIRO': '富山',
  '富山Soul Power': '富山',
  '高周波文化ホール': '富山',
  '富山県民小劇場': '富山',
  '福井CHOP': '福井',
  '福井フェニックス・プラザ': '福井',
  '北ノ庄クラシックス': '福井',
  'サンドーム福井': '福井'
};

function detectCity(venueName) {
  for (const [key, city] of Object.entries(CITY_MAP)) {
    if (venueName.includes(key)) {
      return city;
    }
  }
  if (venueName.includes('新潟')) return '新潟';
  if (venueName.includes('長野') || venueName.includes('松本')) return '長野';
  if (venueName.includes('金沢') || venueName.includes('石川')) return '金沢';
  if (venueName.includes('富山')) return '富山';
  if (venueName.includes('福井')) return '福井';
  return '北陸'; // デフォルト地域
}

// ==========================================================
// 3. ジャンル判定ロジック
// ==========================================================
function detectGenre(performer, title) {
  const text = (performer + " " + title).toLowerCase();
  
  const hiphopKeywords = ['hiphop', 'rap', 'rapper', 'ヒップホップ', 'ラップ', 'dj', 'club', 'yzer', 'bad hop'];
  if (hiphopKeywords.some(keyword => text.includes(keyword))) {
    const isRockArtist = ['the hiatus', 'monoeyes', 'ellegarden', 'dragon ash', 'sim'].some(band => text.includes(band));
    if (!isRockArtist) return 'HipHop';
  }
  
  const edmKeywords = ['edm', 'techno', 'house', 'electro', 'dance', 'djs', 'club', 'remix', 'rave', 'vocaloid', 'あらき', '枣いつき'];
  if (edmKeywords.some(keyword => text.includes(keyword))) {
    const isRockArtist = ['sim', 'rottengraffty', 'coldrain', 'fear, and loathing in las vegas'].some(band => text.includes(band));
    if (!isRockArtist) return 'EDM';
  }
  
  const popKeywords = [
    'pop', 'idol', 'アイドル', 'snb', 'akb', 'ske', 'nmb', 'hkt', 'stu', 'nogizaka', 'keyakizaka', 'sakurazaka', 
    '乃木坂', '欅坂', '櫻坂', '声優', 'voice actor', 'アニソン', '天月', '手越祐也', '有安杏果', '鈴木愛理',
    '棗いつき', '枣いつき', '棗', '棗いつき', '枣いつき', '棗', '棗いつき', '棗いつき', '矢井田瞳', 'ソナーポケット',
    'いきものがかり', '華原朋美', '柴咲コウ', '≒joy', '中嶋ユキノ', 'c&k'
  ];
  if (popKeywords.some(keyword => text.includes(keyword))) {
    return 'Pop';
  }
  
  return 'Rock'; // デフォルト
}

// ==========================================================
// 4. メイン処理
// ==========================================================
async function runFobScraper() {
  console.log("🚀 Starting FOB Concert schedule scraper...");

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

  const baseUrl = 'https://www.fobkikaku.co.jp/';
  const listUrl = baseUrl + 'concert.php';
  console.log(`🔍 Fetching concert list from: ${listUrl}`);

  let html;
  try {
    const res = await fetch(listUrl);
    html = await res.text();
  } catch (err) {
    console.error("❌ Fetch failed for FOB list page:", err.message);
    process.exit(1);
  }

  const $ = cheerio.load(html);
  
  // 1. 各公演詳細ページへのリンク (pfm.php?p=XXXX) をユニークに抽出
  const detailUrls = new Set();
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('pfm.php?p=')) {
      detailUrls.add(baseUrl + href);
    }
  });

  console.log(`📊 Found ${detailUrls.size} unique concert detail pages. Scanning details...`);
  let count = 0;

  for (const detailUrl of detailUrls) {
    console.log(`   🔎 Fetching details: ${detailUrl}`);
    await sleep(500); // サーバー負荷軽減

    let detailHtml;
    try {
      const res = await fetch(detailUrl);
      detailHtml = await res.text();
    } catch (err) {
      console.error(`      ❌ Failed to fetch: ${detailUrl}`, err.message);
      continue;
    }

    const $d = cheerio.load(detailHtml);

    // アーティスト名
    const artistName = $d('#art_head h3').text().trim();
    if (!artistName) continue;

    // ツアータイトル
    let tourTitle = $d('p.tour').text().trim() || null;
    if (tourTitle && (tourTitle.toLowerCase() === artistName.toLowerCase() || tourTitle === "")) {
      tourTitle = null;
    }

    // 年（Year）の抽出 (メタタグやツアータイトルから)
    let year = new Date().getFullYear();
    const metaDesc = $d('meta[name="description"]').attr('content') || "";
    const yearMatch = ((tourTitle || "") + " " + metaDesc).match(/(2026|2027)年?/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    }

    // 各日程テーブルのパース
    $d('div.art_right_box').each(async (_, box) => {
      const $box = $d(box);
      const $tbl = $box.find('table.art_right_tbl');
      if ($tbl.length === 0) return;

      // 日付テキスト (例: "11月28日(土)")
      const dateText = $tbl.find('td.art_blockback01:contains("公演日")').next('td').text().trim();
      // 会場名
      const venueName = $tbl.find('td.art_blockback01:contains("会場")').next('td').find('a').text().trim();

      if (!dateText || !venueName) return;

      const dateMatch = dateText.match(/(\d+)月(\d+)日/);
      if (!dateMatch) return;

      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // 開場・開演
      let openTime = null;
      let startTime = null;
      const $timeTbl = $tbl.find('td.td_table table');
      if ($timeTbl.length > 0) {
        openTime = $timeTbl.find('td.art_blockback01:contains("OPEN")').next('td').text().trim() || null;
        startTime = $timeTbl.find('td.art_blockback01:contains("START")').next('td').text().trim() || null;
      }

      // チケット代
      let priceText = $tbl.find('td.art_blockback01:contains("チケット代")').next('td').text().trim();
      priceText = priceText.replace(/\s+/g, ' ').trim();
      if (!priceText || priceText === '-') priceText = null;

      const city = detectCity(venueName);
      const genre = await detectGenre(artistName, tourTitle || "");
      const lookupKey = `${artistName.toLowerCase()}|${venueName.toLowerCase()}|${formattedDate}`;

      if (existingMap.has(lookupKey)) {
        const id = existingMap.get(lookupKey);
        console.log(`      🔄 Updating price/time for: ${formattedDate} | ${artistName} @ ${venueName}`);
        await supabase
          .from('events')
          .update({
            ticket_price_info: priceText,
            open_time: openTime,
            start_time: startTime,
            event_title: tourTitle
          })
          .eq('id', id);
        return;
      }

      console.log(`      ➕ Found (NEW): ${formattedDate} | ${artistName} @ ${venueName} (Genre: ${genre}, City: ${city})`);
      
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([{
          artist_name: artistName,
          event_title: tourTitle,
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
        console.error(`      ❌ Insert failed for ${artistName}:`, insertError.message);
      } else if (newEvent) {
        existingMap.set(lookupKey, newEvent.id);
        count++;
      }
    });
  }

  console.log(`🎉 Finished FOB Concert schedule scraping! New events inserted: ${count}`);
}

runFobScraper();
