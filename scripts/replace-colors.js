const fs = require('fs');
const path = require('path');

function replaceColorsInDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      replaceColorsInDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      // violet を primary に置換
      content = content.replace(/violet/g, 'primary');
      // fuchsia を rose に置換 (グラデーションの相性を暖色系で合わせるため)
      content = content.replace(/fuchsia/g, 'rose');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

// スクリプトのあるディレクトリ (scripts) から1つ上のルートディレクトリへ移動して探索
const rootDir = path.join(__dirname, '..');
replaceColorsInDirectory(path.join(rootDir, 'app'));
replaceColorsInDirectory(path.join(rootDir, 'components'));

console.log('Color replacement completed!');
