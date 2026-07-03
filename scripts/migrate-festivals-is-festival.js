const fs = require('fs');
const path = require('path');
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
// 2. フェスごとの厳密なジャンルマッピング辞書
// ==========================================================
const FESTIVAL_GENRE_MAP = {
  // EDM / Electronic 系
  'ULTRA JAPAN': 'EDM',
  'ウルトラジャパン': 'EDM',
  'SONICMANIA': 'EDM',
  'ソニマニ': 'EDM',
  
  // HipHop 系 (将来的な拡張用)
  'HIPHOP': 'HipHop',
  'THE HOPE': 'HipHop',
  
  // Pop 系 (将来的な拡張用)
  'POP HILL': 'Pop',
  
  // デフォルトは Rock (サマソニ、フジ、ロッキン、ビバラ、京都大作戦、ミリオンロック、サタニックなどはすべてRock主体)
};

const FESTIVAL_KEYWORDS = [
  'SUMMER SONIC', 'サマーソニック', 'サマソニ',
  'FUJI ROCK', 'フジロック',
  'ROCK IN JAPAN', 'ロックインジャパン',
  'COUNTDOWN JAPAN', 'カウントダウンジャパン',
  'RISING SUN', 'ライジングサン',
  'VIVA LA ROCK', 'ビバラロック',
  'METROCK', 'メトロック',
  'SWEET LOVE SHOWER', 'ラブシャ',
  'ARABAKI', 'アラバキ',
  'GREENROOM', 'グリーンルーム',
  'RUSH BALL', 'ラッシュボール',
  'MONSTER baSH', 'モンバス',
  'WILD BUNCH', 'ワイバン',
  '京都大作戦',
  'DEAD POP FESTIVAL', 'デッドポップ',
  'YON FES', 'ヨンフェス',
  'OTODAMA', '音魂',
  'Million Rock', 'ミリオンロック',
  'SATANIC', 'サタニック',
  'SONICMANIA', 'ソニマニ',
  'ULTRA JAPAN', 'ウルトラジャパン',
  'JAPAN JAM', 'ジャパンジャム',
  'PUNKSPRING', 'パンクスプリング',
  'LOUD PARK', 'ラウドパーク'
];

// タイトルから厳密なジャンルを引く関数
function getFestivalGenre(title) {
  const upperTitle = title.toUpperCase();
  for (const [keyword, genre] of Object.entries(FESTIVAL_GENRE_MAP)) {
    if (upperTitle.includes(keyword.toUpperCase())) {
      return genre;
    }
  }
  return 'Rock'; // デフォルトはRock
}

async function migrate() {
  console.log("Starting DB migration to add is_festival and restore strict music genres...");

  // 全イベント取得
  const { data: events, error: fetchError } = await supabase
    .from('events')
    .select('id, artist_name, genre');

  if (fetchError) {
    console.error("❌ Failed to fetch events:", fetchError.message);
    process.exit(1);
  }

  let updatedCount = 0;

  for (const event of events) {
    const nameUpper = event.artist_name.toUpperCase();
    const isFest = FESTIVAL_KEYWORDS.some(kw => nameUpper.includes(kw.toUpperCase()));

    if (isFest) {
      const baseGenre = getFestivalGenre(event.artist_name);

      console.log(`Migrating: ${event.artist_name} ➔ is_festival: true, genre: ${baseGenre}`);

      const { error: updateError } = await supabase
        .from('events')
        .update({
          is_festival: true,
          genre: baseGenre
        })
        .eq('id', event.id);

      if (updateError) {
        console.error(`   ❌ Failed to update ${event.artist_name}:`, updateError.message);
      } else {
        updatedCount++;
      }
    } else {
      // フェス以外は is_festival = false に設定
      const { error: updateError } = await supabase
        .from('events')
        .update({
          is_festival: false
        })
        .eq('id', event.id);
      
      if (updateError) {
        console.error(`   ❌ Failed to update non-fest ${event.artist_name}:`, updateError.message);
      }
    }
  }

  console.log(`🎉 Migration complete! Successfully updated ${updatedCount} festival events with strict genres.`);
}

migrate();
