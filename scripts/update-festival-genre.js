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
// 2. フェス判定キーワード
// ==========================================================
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

async function updateGenres() {
  console.log("Fetching all events to classify festivals...");

  const { data: events, error: fetchError } = await supabase
    .from('events')
    .select('id, artist_name, genre');

  if (fetchError) {
    console.error("❌ Failed to fetch events:", fetchError.message);
    process.exit(1);
  }

  const festivalsToUpdate = [];

  for (const event of events) {
    const nameUpper = event.artist_name.toUpperCase();
    const isFest = FESTIVAL_KEYWORDS.some(kw => nameUpper.includes(kw.toUpperCase()));
    
    if (isFest && event.genre !== 'Festival') {
      festivalsToUpdate.push(event);
    }
  }

  console.log(`ℹ️ Found ${festivalsToUpdate.length} festivals that need updating to 'Festival' genre.`);

  if (festivalsToUpdate.length === 0) {
    console.log("🎉 All festivals are already set to 'Festival' genre!");
    return;
  }

  // ループして更新
  let updatedCount = 0;
  for (const fest of festivalsToUpdate) {
    const { error: updateError } = await supabase
      .from('events')
      .update({ genre: 'Festival' })
      .eq('id', fest.id);

    if (updateError) {
      console.error(`   ❌ Failed to update ${fest.artist_name}:`, updateError.message);
    } else {
      console.log(`   ✅ Updated genre to 'Festival' for: ${fest.artist_name}`);
      updatedCount++;
    }
  }

  console.log(`🎉 Successfully updated ${updatedCount} festivals in Supabase!`);
}

updateGenres();
