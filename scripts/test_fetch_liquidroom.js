const fs = require('fs');

async function test() {
  try {
    const res = await fetch('https://www.liquidroom.net/schedule/');
    const html = await res.text();
    fs.writeFileSync('/Users/ynfml/.gemini/antigravity/brain/53ba6ab3-4a0e-43d2-9920-ec40f4ac9581/scratch/liquidroom_schedule.html', html);
    console.log("LIQUIDROOM HTML successfully saved! Length:", html.length);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
test();
