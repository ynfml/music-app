const fs = require('fs');

async function test() {
  try {
    // 21 は LIQUIDROOM 等の会場IDである可能性が高いのでテスト
    const res = await fetch('https://www.livefans.jp/venues/13606', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.livefans.jp/venues',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ja,en;q=0.9'
      }
    });
    console.log("Response Status:", res.status);
    console.log("Final URL:", res.url);
    const html = await res.text();
    fs.writeFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/livefans_venue.html', html);
    console.log("Live Fans HTML successfully saved! Length:", html.length);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
test();
