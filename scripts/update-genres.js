const { createClient } = require('@supabase/supabase-js');
const { detectGenre } = require('./utils/genre');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runUpdateGenres() {
  console.log("🚀 Starting Bulk Genre Update...");

  const { data: events, error } = await supabase
    .from('events')
    .select('id, artist_name, event_title, genre');

  if (error) {
    console.error("❌ Failed to fetch events:", error);
    return;
  }

  let updatedCount = 0;
  console.log(`Found ${events.length} events in database. Checking genres...`);

  for (const event of events) {
    const newGenre = await detectGenre(event.artist_name, event.event_title);
    await new Promise(r => setTimeout(r, 100));
    
    if (newGenre !== event.genre) {
      console.log(`   🔄 Updating: ${event.artist_name} [${event.genre} -> ${newGenre}]`);
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ genre: newGenre })
        .eq('id', event.id);

      if (updateError) {
        console.error(`   ❌ Failed to update ${event.artist_name}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`🎉 Finished! Updated ${updatedCount} events to their correct genre.`);
}

runUpdateGenres();
