const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
envFile.split('\n').forEach(line => {
  if (!line.trim() || line.trim().startsWith('#')) return;
  const parts = line.split('=');
  if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^[\"']|[\"']$/g, '');
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DICT_PATH = path.join(process.cwd(), 'lib/data/festival_details.json');

async function main() {
  console.log('🚀 Starting Deep Festival Metadata & Lineup Enrichment (Method 1 & 2)...');

  let dict = {};
  if (fs.existsSync(DICT_PATH)) {
    try { dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8')); } catch (e) {}
  }

  // Fetch all festivals from Supabase
  let page = 0;
  let allEvents = [];
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, artist_name, venue_name, location_city, event_date, genre, is_festival')
      .eq('is_festival', true)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !data || data.length === 0) break;
    allEvents = allEvents.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`Found ${allEvents.length} festivals in Supabase DB.`);

  let enrichedCount = 0;
  for (const fes of allEvents) {
    const festName = fes.artist_name;
    
    // Check if already in dictionary with rich manual/scraped data
    if (dict[festName] && dict[festName].lineup && dict[festName].lineup.length > 0) {
      continue;
    }

    // Try generating dynamic rich festival record for this festival
    const venue = fes.venue_name || '特設会場';
    const city = fes.location_city || '日本';
    const date = fes.event_date || '';
    const m = parseInt((date.split('-')[1] || '1'), 10);
    let seasonLabel = 'フェス';
    if (m >= 3 && m <= 5) seasonLabel = '春フェス';
    else if (m >= 6 && m <= 8) seasonLabel = '夏フェス';
    else if (m >= 9 && m <= 11) seasonLabel = '秋フェス';
    else seasonLabel = '冬フェス';

    // Promoter deduction
    let organizer = 'フェス実行委員会 / プロモーター';
    const upper = (festName + ' ' + venue).toUpperCase();
    if (upper.includes('VARIT') || upper.includes('CIRCUS')) organizer = '神戸VARIT. / PINEFIELDS';
    else if (upper.includes('ROCK IN JAPAN') || upper.includes('COUNTDOWN JAPAN') || upper.includes('JAPAN JAM')) organizer = 'ロッキング・オン・ジャパン';
    else if (upper.includes('SUMMER SONIC') || upper.includes('SONICMANIA')) organizer = 'クリエイティブマンプロダクション';
    else if (upper.includes('FUJI ROCK')) organizer = 'SMASH (スマッシュ)';
    else if (upper.includes('RISING SUN')) organizer = 'WESS';
    else if (upper.includes('VIVA LA ROCK')) organizer = 'FACT / DISK GARAGE';
    else if (upper.includes('SWEET LOVE SHOWER')) organizer = 'スペースシャワーTV';
    else if (upper.includes('MONSTER BASH')) organizer = 'DUKE (デューク)';
    else if (upper.includes('WILD BUNCH')) organizer = 'YUMEBANCHI (夢番地)';
    else if (upper.includes('FM802') || upper.includes('RADIO CRAZY') || upper.includes('MINAMI WHEEL')) organizer = 'FM802';
    else if (upper.includes('04 LIMITED SAZABYS') || upper.includes('YON FES')) organizer = '04 Limited Sazabys / サンデーフォーク';
    else if (upper.includes('10-FEET') || upper.includes('京都大作戦')) organizer = '10-FEET / Sound Creator';
    else if (upper.includes('SIM') || upper.includes('DEAD POP')) organizer = 'SiM / DISK GARAGE';

    // Extract lineup performers from title if available
    let lineup = [];
    if (festName.includes('/') || festName.includes('vs') || festName.includes('w/') || festName.includes('＆') || festName.includes('&')) {
      lineup = festName.split(/[\/＆&]|vs|w\//i)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.includes('2026') && !s.includes('FEST') && !s.includes('フェス'));
    }

    dict[festName] = {
      organizer: organizer,
      description: `${city}の${venue}にて開催される注目の${seasonLabel}「${festName}」！主催・制作プロモーター「${organizer}」が手掛ける日本全国屈指の音楽フェスティバルです。豪華アーティストのステージパフォーマンスや特設会場ならではの演出・フードを心ゆくまでお楽しみください。`,
      lineup: lineup,
      official_url: `https://www.google.com/search?q=${encodeURIComponent(festName + ' 公式サイト')}`,
      features: [`${city}開催`, seasonLabel, fes.genre || 'Rock']
    };
    enrichedCount++;
  }

  fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
  console.log(`✨ Enriched and updated festival metadata dictionary with ${Object.keys(dict).length} records!`);
}

main();
