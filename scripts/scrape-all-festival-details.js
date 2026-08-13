const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
envFile.split('\n').forEach(line => {
  if (!line.trim() || line.trim().startsWith('#')) return;
  const parts = line.split('=');
  if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^[\"']|[\"']$/g, '');
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DICT_PATH = path.join(process.cwd(), 'lib/data/festival_details.json');

function normalizeKey(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[’'"`]/g, '')
    .replace(/\s+/g, '')
    .replace(/202\d/g, '')
    .replace(/第\d+章/g, '')
    .trim();
}

async function main() {
  console.log('🚀 Running Full Database Festival Details Enricher...');

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

  console.log(`Processing ${allEvents.length} festivals from Supabase DB...`);

  let matchedCount = 0;
  for (const fes of allEvents) {
    const festName = fes.artist_name;
    const normFestName = normalizeKey(festName);

    // 1. Direct key match or normalized key match in dictionary
    let meta = dict[festName];
    if (!meta) {
      for (const [k, val] of Object.entries(dict)) {
        if (normalizeKey(k) === normFestName || normFestName.includes(normalizeKey(k)) || normalizeKey(k).includes(normFestName)) {
          meta = val;
          break;
        }
      }
    }

    const venue = fes.venue_name || '特設会場';
    const city = fes.location_city || '日本国内';
    const date = fes.event_date || '';
    const m = parseInt((date.split('-')[1] || '1'), 10);
    let seasonLabel = 'フェス';
    if (m >= 3 && m <= 5) seasonLabel = '春フェス';
    else if (m >= 6 && m <= 8) seasonLabel = '夏フェス';
    else if (m >= 9 && m <= 11) seasonLabel = '秋フェス';
    else seasonLabel = '冬フェス';

    // Deduce promoter
    let organizer = meta?.organizer || 'フェス実行委員会 / プロモーター';
    const upperNorm = normalizeKey(festName + ' ' + venue);
    if (upperNorm.includes('rockin') || upperNorm.includes('japanjam') || upperNorm.includes('cdj')) organizer = 'ロッキング・オン・ジャパン';
    else if (upperNorm.includes('summersonic') || upperNorm.includes('sonicmania') || upperNorm.includes('punkspring')) organizer = 'クリエイティブマンプロダクション';
    else if (upperNorm.includes('fujirock') || upperNorm.includes('asagiri')) organizer = 'SMASH (スマッシュ)';
    else if (upperNorm.includes('risingsun')) organizer = 'WESS';
    else if (upperNorm.includes('vivalarock')) organizer = 'FACT / DISK GARAGE';
    else if (upperNorm.includes('sweetloveshower')) organizer = 'スペースシャワーTV';
    else if (upperNorm.includes('monsterbash')) organizer = 'DUKE (デューク)';
    else if (upperNorm.includes('wildbunch')) organizer = 'YUMEBANCHI (夢番地)';
    else if (upperNorm.includes('fm802') || upperNorm.includes('radiocrazy') || upperNorm.includes('minamiwheel')) organizer = 'FM802';
    else if (upperNorm.includes('varit') || upperNorm.includes('circus')) organizer = '神戸VARIT. / PINEFIELDS';

    // Parse lineup from title if multiple artists present
    let lineup = meta?.lineup || [];
    if (lineup.length === 0 && (festName.includes('/') || festName.includes('vs') || festName.includes('w/') || festName.includes('＆') || festName.includes('&'))) {
      lineup = festName.split(/[\/＆&]|vs|w\//i)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.includes('2026') && !s.includes('FEST') && !s.includes('フェス'));
    }

    dict[festName] = {
      organizer: organizer,
      description: meta?.description || `${city}の${venue}にて開催される注目の${seasonLabel}「${festName}」！主催・制作プロモーター「${organizer}」が手掛ける日本全国屈指の音楽フェスティバルです。豪華アーティストのステージパフォーマンスや特設会場ならではの演出・フードを心ゆくまでお楽しみください。`,
      lineup: lineup,
      official_url: meta?.official_url || `https://www.google.com/search?q=${encodeURIComponent(festName + ' 公式サイト')}`,
      features: meta?.features || [`${city}開催`, seasonLabel, fes.genre || 'Rock']
    };
    matchedCount++;
  }

  fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
  console.log(`✨ All ${matchedCount} festivals enriched and normalized! Dictionary total records: ${Object.keys(dict).length}`);
}

main();
