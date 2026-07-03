const fs = require('fs');

async function test() {
  try {
    const res = await fetch('https://festival-life.com/festival');
    const html = await res.text();
    fs.writeFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/festivallife_list.html', html);
    console.log("Festival Life List HTML successfully saved! Length:", html.length);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
test();
