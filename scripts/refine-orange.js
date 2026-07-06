const fs = require('fs');
const path = require('path');

function refineOrangeTheme(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      refineOrangeTheme(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      // 1. ハードコードされたRGBA(紫・ピンク)をオレンジ・アンバー系へ置換
      // violet (168,85,247) -> primary FF5200 (255,82,0)
      content = content.replace(/rgba\(168,85,247/g, 'rgba(255,82,0');
      // pink/fuchsia (236,72,153) -> amber (255,140,0)
      content = content.replace(/rgba\(236,72,153/g, 'rgba(255,140,0');
      
      // 2. グラデーションの相方として置換されていた rose を amber に変更し、暖色のみで構成する
      content = content.replace(/rose/g, 'amber');
      
      // 3. テキストグラデーションの調整 (白〜薄いオレンジ〜黄色 へ)
      content = content.replace(/via-primary-200 to-amber-300/g, 'via-primary-400 to-amber-400');
      content = content.replace(/via-primary-200/g, 'via-primary-400');
      content = content.replace(/to-amber-300/g, 'to-amber-400');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Refined: ${fullPath}`);
      }
    }
  }
}

const rootDir = path.join(__dirname, '..');
refineOrangeTheme(path.join(rootDir, 'app'));
refineOrangeTheme(path.join(rootDir, 'components'));

console.log('Orange theme refinement completed!');
