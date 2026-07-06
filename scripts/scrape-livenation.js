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
// 2. アーティスト ➔ ジャンル のマッピングルール
// ==========================================================
const ARTIST_GENRE_MAP = {
  'Bruno Mars': 'Pop',
  'The Weeknd': 'Pop',
  'Zara Larsson': 'Pop',
  'Charlie Puth': 'Pop',
  'LANY': 'Pop',
  'wave to earth': 'Pop',
  'Post Malone': 'HipHop',
  'CA7RIEL & Paco Amoroso': 'HipHop'
};

function getArtistGenre(artistName) {
  for (const [name, genre] of Object.entries(ARTIST_GENRE_MAP)) {
    if (artistName.toLowerCase().includes(name.toLowerCase())) {
      return genre;
    }
  }
  return 'Rock'; // デフォルト
}

// ==========================================================
// 3. ヘルパー関数
// ==========================================================
function cleanArtistName(text) {
  const parts = text.split('|');
  if (parts.length >= 2) {
    const left = parts[0].trim();
    return left.replace(/^[\d\s.\-~]+/, '').trim();
  }
  return text.replace(/^[\d\s.\-~]+/, '').trim();
}

// "2027年1月4日（月）・5日（火)" ➔ ["2027-01-04", "2027-01-05"] を展開する
function extractDatesFromJapaneseRange(rangeStr) {
  const yearMatch = rangeStr.match(/(\d{4})年/);
  const monthMatch = rangeStr.match(/(\d{1,2})月/);
  if (!yearMatch || !monthMatch) return [];

  const year = yearMatch[1];
  const month = monthMatch[1];

  const dates = [];
  const dayMatches = rangeStr.matchAll(/(\d{1,2})日/g);
  for (const m of dayMatches) {
    const day = m[1];
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    dates.push(iso);
  }
  return dates;
}

function parseJapaneseDateToIso(dateStr) {
  // 単一の日付 "2026年10月6日(火)" ➔ "2026-10-06"
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  const year = match[1];
  const month = match[2].padStart(2, '0');
  const day = match[3].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function detectCity(venueName) {
  const venueLower = venueName.toLowerCase();
  if (venueLower.includes('東京') || venueLower.includes('有明') || venueLower.includes('ガーデン') || venueLower.includes('武道館') || venueLower.includes('zepp divercity') || venueLower.includes('zepp haneda') || venueLower.includes('豊洲')) {
    return '東京';
  }
  if (venueLower.includes('横浜') || venueLower.includes('kアリーナ') || venueLower.includes('ぴあアリーナ')) {
    return '神奈川';
  }
  if (venueLower.includes('さいたま') || venueLower.includes('埼玉') || venueLower.includes('ベルーナ') || venueLower.includes('西武')) {
    return '埼玉';
  }
  if (venueLower.includes('大阪') || venueLower.includes('京セラ') || venueLower.includes('おおきに') || venueLower.includes('zepp osaka') || venueLower.includes('namba') || venueLower.includes('bigcat')) {
    return '大阪';
  }
  if (venueLower.includes('幕張') || venueLower.includes('千葉')) {
    return '千葉';
  }
  if (venueLower.includes('名古屋') || venueLower.includes('ナゴヤ') || venueLower.includes('愛知') || venueLower.includes('zepp nagoya')) {
    return '愛知';
  }
  if (venueLower.includes('札幌') || venueLower.includes('北海道') || venueLower.includes('プレミスト')) {
    return '北海道';
  }
  if (venueLower.includes('福岡') || venueLower.includes('paypay') || venueLower.includes('zepp fukuoka')) {
    return '福岡';
  }
  return '東京'; // デフォルト
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================================
// 4. メインクローラー処理
// ==========================================================
async function runLiveNationScraper() {
  console.log("🚀 Starting Live Nation Japan scraper...");

  // 既存の登録イベントを取得 (重複防止用)
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

  // 1. トップページを取得
  let topHtml;
  try {
    const res = await fetch('https://www.livenationhip.co.jp');
    topHtml = await res.text();
  } catch (err) {
    console.error("❌ Failed to fetch Live Nation top page:", err.message);
    process.exit(1);
  }

  const $ = cheerio.load(topHtml);
  const rawConcerts = [];

  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (href && href.includes('/all-events/') && text.includes('|')) {
      const artist = cleanArtistName(text);
      rawConcerts.push({ artist, url: href });
    }
  });

  const uniqueConcerts = [];
  const seenUrls = new Set();
  for (const c of rawConcerts) {
    if (!seenUrls.has(c.url)) {
      seenUrls.add(c.url);
      uniqueConcerts.push(c);
    }
  }

  console.log(`Found ${uniqueConcerts.length} unique incoming tours on Live Nation H.I.P. Page.`);

  let insertedCount = 0;

  for (const concert of uniqueConcerts) {
    console.log(`\n🔍 Fetching details for: ${concert.artist} (${concert.url})`);
    
    await sleep(2000);

    let detailHtml;
    try {
      const res = await fetch(concert.url);
      detailHtml = await res.text();
    } catch (err) {
      console.error(`   ❌ Failed to fetch ${concert.url}:`, err.message);
      continue;
    }

    const $detail = cheerio.load(detailHtml);
    const schedules = [];

    // --- A. h2 交互スキャン (通常のアリーナ等) ---
    let currentEventDate = null;
    $detail('h2').each((_, el) => {
      const text = $detail(el).text().trim();
      if (text.includes('年') && text.includes('月') && text.includes('日')) {
        currentEventDate = text;
      } else if (currentEventDate) {
        schedules.push({
          dateRangeStr: currentEventDate,
          venue_name: text
        });
        currentEventDate = null;
      }
    });

    // --- B. p タグ 複数日スキャン (ブルーノ・マーズなどの変則ドームツアー) ---
    if (schedules.length === 0) {
      $detail('p').each((_, el) => {
        const text = $detail(el).text().trim();
        if ((text.includes('2026年') || text.includes('2027年')) && text.includes('月') && text.includes('日')) {
          // 次のpタグが会場名になっているパターン
          const nextText = $detail(el).next('p').text().trim();
          if (nextText && (nextText.includes('ドーム') || nextText.includes('アリーナ') || nextText.includes('PIT') || nextText.includes('Hatch') || nextText.includes('CAT'))) {
            schedules.push({
              dateRangeStr: text,
              venue_name: nextText
            });
          }
        }
      });
    }

    console.log(`   ➔ Found ${schedules.length} raw schedule blocks.`);

    for (const sched of schedules) {
      // 日付テキストを展開して配列にする (複数日に渡る場合も個別配列になる)
      const isoDates = extractDatesFromJapaneseRange(sched.dateRangeStr);
      
      for (const isoDate of isoDates) {
        const genre = getArtistGenre(concert.artist);
        const city = detectCity(sched.venue_name);
        const lookupKey = `${concert.artist.toLowerCase()}|${sched.venue_name.toLowerCase()}|${isoDate}`;

        if (existingKeys.has(lookupKey)) {
          console.log(`   (Already exists): ${concert.artist} @ ${sched.venue_name} on ${isoDate}`);
          continue;
        }

        console.log(`   ➕ Inserting: ${concert.artist} @ ${sched.venue_name} on ${isoDate} (Genre: ${genre})`);

        const { error: insertError } = await supabase
          .from('events')
          .insert({
            artist_name: concert.artist,
            venue_name: sched.venue_name,
            location_city: city,
            event_date: isoDate,
            genre: genre,
            is_festival: false
          });

        if (insertError) {
          console.error(`      ❌ Insert failed:`, insertError.message);
        } else {
          insertedCount++;
          existingKeys.add(lookupKey);
        }
      }
    }
  }

  console.log(`\n🎉 Scrape completed! Successfully inserted ${insertedCount} new Live Nation concerts.`);
}

runLiveNationScraper();
