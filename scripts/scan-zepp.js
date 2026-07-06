const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/zepp_schedule.html', 'utf-8');
const $ = cheerio.load(html);

console.log("=== 1. Page Title ===");
console.log($('title').text().trim());

console.log("\n=== 2. H1 - H3 Headings ===");
$('h1, h2, h3').each((_, el) => {
  console.log(`${el.name}:`, $(el).text().trim().replace(/\s+/g, ' '));
});

console.log("\n=== 3. Classes that look like event cards or lists ===");
const classCounts = {};
$('*').each((_, el) => {
  const className = $(el).attr('class');
  if (className) {
    className.split(/\s+/).forEach(c => {
      if (c.includes('schedule') || c.includes('event') || c.includes('card') || c.includes('list') || c.includes('item')) {
        classCounts[c] = (classCounts[c] || 0) + 1;
      }
    });
  }
});
console.log(classCounts);

console.log("\n=== 4. Text Sample containing Dates (like '2026') ===");
$('*').each((_, el) => {
  if ($(el).children().length === 0) {
    const text = $(el).text().trim();
    if (text.includes('2026') || text.includes('開場')) {
      console.log(`${el.name}:`, text.slice(0, 100));
    }
  }
});
