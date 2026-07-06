const fs = require('fs');
const path = require('path');

const scriptsToUpdate = [
  'scrape-creativeman.js',
  'scrape-fob.js',
  'scrape-liquidroom.js',
  'scrape-lots.js',
  'scrape-quattro.js',
  'scrape-zepp.js'
];

for (const file of scriptsToUpdate) {
  const filePath = path.join(__dirname, '..', 'scripts', file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // ファイル冒頭付近（supabaseのimportの下あたり）にrequireを追加
  if (!content.includes('./utils/genre')) {
    content = content.replace(
      /const \{ createClient \} = require\('@supabase\/supabase-js'\);/,
      "const { createClient } = require('@supabase/supabase-js');\nconst { detectGenre } = require('./utils/genre');"
    );
  }

  // 古い function detectGenre(...) { ... } を削除
  // "function detectGenre" から次の "\n}" までを最短マッチで削除
  // ただし内部に if (...) { ... } があるため、単純な正規表現では難しい。
  // 幸い、どのスクリプトも "return 'Rock';\n}" または "return 'Pop';\n}" 等で終わっているはずだが、
  // 最も安全な方法は、"function detectGenre" から "=== 4. メイン処理" の前までを削ること。
  
  // 各スクリプトは "// ==========================================================" 
  // みたいな区切り線があるので、それを目印にする。
  content = content.replace(
    /function detectGenre\([\s\S]*?return 'Rock';\s*\n\}/,
    '// 共通化された detectGenre を使用'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated: ${file}`);
}
