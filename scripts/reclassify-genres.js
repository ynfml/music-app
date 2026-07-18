const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

// ここでrequireしないと、環境変数が読み込まれる前に評価されてundefinedになる
const { detectGenre } = require('./utils/genre');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase URL or Key is missing in environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🔍 Fetching all events from database...");
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, artist_name, event_title, genre');

  if (error) {
    console.error("❌ Failed to fetch events:", error.message);
    process.exit(1);
  }

  console.log(`📦 Found ${events.length} events. Starting highly accurate reclassification...`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    // APIレート制限を避けるためのディレイ (Spotify APIを使用するため)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newGenre = await detectGenre(event.artist_name, event.event_title);
    
    if (newGenre !== event.genre) {
      console.log(`🔄 Updating: [${event.genre} -> ${newGenre}] ${event.artist_name} ${event.event_title ? '- ' + event.event_title : ''}`);
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ genre: newGenre })
        .eq('id', event.id);
        
      if (updateError) {
        console.error(`   ❌ Failed to update ${event.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    } else {
      // 変更なし
      skippedCount++;
    }
    
    if (i > 0 && i % 50 === 0) {
      console.log(`⏱️ Processed ${i} / ${events.length}...`);
    }
  }

  console.log("=================================================");
  console.log(`🎉 Finished reclassification!`);
  console.log(`✅ Updated: ${updatedCount} events`);
  console.log(`⏭️ Skipped (already correct): ${skippedCount} events`);
  console.log("=================================================");
}

run();
