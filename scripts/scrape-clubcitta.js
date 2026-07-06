const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const { detectGenre } = require('./utils/genre');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const venueName = "CLUB CITTA'";
const locationCity = "神奈川"; // 川崎

async function scrapeClubCitta() {
  console.log(`🚀 Starting ${venueName} schedule scraper...`);

  // とりあえず現在の月を取得
  const res = await fetch('https://clubcitta.co.jp/schedule');
  const html = await res.text();
  const $ = cheerio.load(html);

  // 年と月を取得 (セレクトボックスの selected から推測)
  const yearStr = $('.year_select option:selected').first().text().trim();
  let monthStr = $('.month_select option:selected').first().text().trim();
  
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month) {
    console.error("❌ Failed to parse year/month from page.");
    return;
  }

  const events = [];

  $('.schedule_list .item').each((i, el) => {
    // 日付 (e.g., "7<span>Tue</span>" -> "7")
    const dateText = $(el).find('.item_detail p').text().trim();
    const dayMatch = dateText.match(/^(\d+)/);
    if (!dayMatch) return; // 日付がないものはスキップ(PRIVATEなど)
    const day = parseInt(dayMatch[1], 10);
    
    // タイトルと詳細
    const title = $(el).find('.txt_wrap h3').text().trim();
    if (title === 'PRIVATE') return; // 貸切

    // 詳細テキストから出演者や時間を拾う
    // <p>タグの中に OPEN / START や【出演】などが書かれている
    let details = "";
    $(el).find('.txt_wrap').children().not('h3').each((_, child) => {
      details += $(child).text().trim() + " ";
    });

    let artistName = title; // デフォルトはタイトルをアーティスト名に
    let eventTitle = null;

    // もし 【出演】 があればそこをアーティスト名として扱うヒューリスティック
    const castMatch = details.match(/【出演】([^【]+)/);
    if (castMatch) {
      eventTitle = title;
      artistName = castMatch[1].trim();
    } else {
      // 出演が明記されていない場合は、タイトルをそのままアーティスト名にする
      // 対バン等の区切りをパースするのは難しいのでそのまま
    }

    // ジャンル判定
    const genre = detectGenre(artistName, eventTitle || title);
    
    // 日付フォーマット YYYY-MM-DD
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    events.push({
      artist_name: artistName,
      event_title: eventTitle,
      event_date: formattedDate,
      venue_name: venueName,
      location_city: locationCity,
      genre: genre,
      is_festival: genre === 'Festival' || title.toLowerCase().includes('fes') || title.includes('フェス'),
    });
  });

  console.log(`Found ${events.length} events for ${year}-${month} at ${venueName}.`);

  // DBへUpsert
  for (const event of events) {
    // 既存レコードチェック
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('artist_name', event.artist_name)
      .eq('venue_name', event.venue_name)
      .eq('event_date', event.event_date)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase.from('events').insert([event]);
      if (insertError) {
        console.error(`   ❌ Failed to insert ${event.artist_name}:`, insertError.message);
      } else {
        console.log(`   ✅ Inserted: ${event.event_date} | ${event.artist_name} [${event.genre}]`);
      }
    } else {
      // 存在する場合は event_title や genre 等をアップデート
      const { error: updateError } = await supabase
        .from('events')
        .update({ event_title: event.event_title, genre: event.genre, is_festival: event.is_festival })
        .eq('id', existing.id);
      if (!updateError) {
        console.log(`   🔄 Updated: ${event.event_date} | ${event.artist_name} [${event.genre}]`);
      }
    }
  }

  console.log("🎉 CLUB CITTA' scrape completed!");
}

scrapeClubCitta();
