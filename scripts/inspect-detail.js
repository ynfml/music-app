const cheerio = require('cheerio');

async function inspect() {
  const url = 'https://festival-life.com/festival/thick_festival_2026';
  console.log('Fetching detail page:', url);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('--- TITLE ---');
  console.log($('h1').text().trim());

  console.log('\n--- HEADINGS ---');
  $('h2, h3, h4').each((i, el) => {
    console.log($(el).text().trim());
  });

  console.log('\n--- ARTISTS & LINEUP ---');
  $('.artist, .lineup, .entry-content ul, .entry-content p, article p').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 500) {
      console.log(`[${i}]`, text.replace(/\s+/g, ' '));
    }
  });

  console.log('\n--- LINKS & OFFICIAL ---');
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (text.includes('公式') || text.includes('HP') || href.includes('http') && !href.includes('festival-life')) {
      console.log(text, '->', href);
    }
  });
}

inspect();
