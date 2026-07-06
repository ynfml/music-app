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

async function fix() {
  console.log("🛠️ Fixing Ryuketsu Blizzard event genre in Supabase...");

  const { data, error } = await supabase
    .from('events')
    .update({ genre: 'Rock' })
    .ilike('artist_name', '%流血ブリザード%');

  if (error) {
    console.error("❌ Failed to update genre:", error.message);
  } else {
    console.log("🎉 Successfully updated Ryuketsu Blizzard events to 'Rock'!");
  }
}
fix();
