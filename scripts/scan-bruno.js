const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/bruno_detail.html', 'utf-8');
const $ = cheerio.load(html);

console.log("=== Headings (h1, h2, h3) ===");
$('h1, h2, h3, h4').each((_, el) => {
  console.log(`${el.name}:`, $(el).text().trim().replace(/\s+/g, ' '));
});

console.log("\n=== Elements containing 'ドーム' or '東京' ===");
$('*').each((_, el) => {
  const children = $(el).children();
  if (children.length === 0) { // 最下層のテキストノードを持つ要素
    const text = $(el).text().trim();
    if (text.includes('東京ドーム') || text.includes('ドーム') || text.includes('2027年')) {
      console.log(`${el.name}:`, text.slice(0, 100));
    }
  }
});
