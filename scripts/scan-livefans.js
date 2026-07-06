const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/livefans_venue.html', 'utf-8');
const $ = cheerio.load(html);

console.log("=== 1. Title ===");
console.log($('title').text().trim());

console.log("\n=== 2. H1 - H3 Headings ===");
$('h1, h2, h3').each((_, el) => {
  console.log(`${el.name}:`, $(el).text().trim().replace(/\s+/g, ' '));
});

console.log("\n=== 3. Anchor links (hrefs containing /events/) ===");
$('a').each((_, el) => {
  const href = $(el).attr('href');
  const text = $(el).text().trim().replace(/\s+/g, ' ');
  if (href && (href.includes('/events/') || href.includes('/artists/'))) {
    console.log(`Text: "${text}" | Href: "${href}"`);
  }
});

console.log("\n=== 4. Specific schedule tables/divs ===");
$('.schedule, .event, .box, .list, table').each((i, el) => {
  if (i < 10) {
    console.log(`Tag: ${el.name}, Class: ${$(el).attr('class') || 'none'}, Text length: ${$(el).text().trim().length}`);
  }
});
