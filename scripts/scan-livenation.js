const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/livenation_concert.html', 'utf-8');
const $ = cheerio.load(html);

console.log("=== 1. Page Title ===");
console.log($('title').text());

console.log("\n=== 2. All A Tag Links (First 30) ===");
const links = [];
$('a').each((_, el) => {
  const href = $(el).attr('href');
  const text = $(el).text().trim().replace(/\s+/g, ' ');
  if (href) links.push({ text, href });
});
console.log(links.slice(0, 30));

console.log("\n=== 3. Headings (h1, h2, h3) ===");
$('h1, h2, h3').each((_, el) => {
  console.log(`${el.name}:`, $(el).text().trim().replace(/\s+/g, ' '));
});

console.log("\n=== 4. Raw text lengths ===");
console.log("Body length:", $('body').text().length);
console.log("Raw HTML length:", html.length);
