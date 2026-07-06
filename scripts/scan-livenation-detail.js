const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/livenation_detail.html', 'utf-8');
const $ = cheerio.load(html);

console.log("=== 1. Page Title ===");
console.log($('title').text());

console.log("\n=== 2. Headings (h1, h2, h3) ===");
$('h1, h2, h3').each((_, el) => {
  console.log(`${el.name}:`, $(el).text().trim().replace(/\s+/g, ' '));
});

console.log("\n=== 3. Paragraphs (first 10) ===");
$('p').each((i, el) => {
  if (i < 10) {
    console.log("p:", $(el).text().trim().replace(/\s+/g, ' '));
  }
});

console.log("\n=== 4. Specific structural tags (like time, address, span) ===");
$('span, time, .venue, .date').each((i, el) => {
  const txt = $(el).text().trim().replace(/\s+/g, ' ');
  if (txt.includes('年') || txt.includes('月') || txt.includes('日') || txt.includes('アリーナ') || txt.includes('ドーム') || txt.includes('スタジアム') || txt.includes('公演')) {
    console.log(`${el.name || 'element'}:`, txt.slice(0, 100));
  }
});
