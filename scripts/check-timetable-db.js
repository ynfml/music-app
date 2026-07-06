const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("🔍 Checking timetables table in Supabase...");

  // 1. 全体件数
  const { count, error: countError } = await supabase
    .from('timetables')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error("❌ Failed to query timetables count:", countError.message);
    return;
  }
  console.log(`📊 Total records in timetables table: ${count}`);

  // 2. 直近のサンプル表示
  const { data: samples, error: sampleError } = await supabase
    .from('timetables')
    .select(`
      id,
      event_id,
      artist_name,
      track_order,
      events(artist_name, venue_name, event_date)
    `)
    .limit(5);

  if (sampleError) {
    console.error("❌ Failed to fetch sample timetables:", sampleError.message);
    return;
  }

  console.log("\n📋 Timetable Samples:");
  console.log(JSON.stringify(samples, null, 2));
}

check();
