
async function test() {
  const clientId = 'ff0dd445348d411896f2643365e1de51';
  const clientSecret = 'cbe5a36364a44b778a9dec4df01990f6';
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });
  const { access_token: token } = await tokenRes.json();

  const searchRes = await fetch(`https://api.spotify.com/v1/search?q=ASKA&type=artist&market=JP&limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const searchData = await searchRes.json();
  
  console.log("Search Results:", searchData.artists.items.map(a => ({ name: a.name, pop: a.popularity, id: a.id })));

  const aska = searchData.artists.items.find(a => a.name.toLowerCase() === 'aska');
  if (aska) {
    console.log("Found EXACT ASKA:", aska.name, aska.id);
    const topTracksRes = await fetch(`https://api.spotify.com/v1/artists/${aska.id}/top-tracks?market=JP`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tracksData = await topTracksRes.json();
    console.log("Tracks count:", tracksData.tracks ? tracksData.tracks.length : 0);
    if(tracksData.error) console.log(tracksData.error);
  }
}
test();
