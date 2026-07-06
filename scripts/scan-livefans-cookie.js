const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/lots_livefans_cookie.html', 'utf-8');
const $ = cheerio.load(html);

console.log("=== 1. Title ===");
console.log($('title').text().trim());

console.log("\n=== 2. H1 - H3 Headings ===");
$('h1, h2, h3').each((_, el) => {
  console.log(`${el.name}:`, $(el).text().trim().replace(/\s+/g, ' '));
});

console.log("\n=== 3. Specific selectors ===");
$('.liveSchedule, .eventList, .scheduleList, li, tr').each((_, el) => {
  const text = $(el).text().trim().replace(/\s+/g, ' ');
  if (text.includes('矢井田瞳') || text.includes('STU48') || text.includes('GLIM SPANKY') || text.includes('MONGOL800') || text.includes('ヤバイTシャツ屋さん')) {
    console.log(`Tag: ${el.name}, Class: ${$(el).attr('class') || 'none'} | Content: "${text.substring(0, 150)}..."`);
  }
});
