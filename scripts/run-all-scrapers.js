const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// scriptsディレクトリ内のファイルを検索
const scriptsDir = __dirname;
const files = fs.readdirSync(scriptsDir);

// scrape- から始まり .js で終わるスクリプト一覧を取得
const scrapeScripts = files.filter(f => f.startsWith('scrape-') && f.endsWith('.js'));

console.log(`Found ${scrapeScripts.length} scraper scripts. Starting execution...`);

for (const script of scrapeScripts) {
  console.log(`\n======================================================`);
  console.log(`▶️ Running: ${script}`);
  console.log(`======================================================`);
  
  try {
    // スクリプトを同期的に実行し、ログをそのまま出力
    execSync(`node ${path.join(scriptsDir, script)}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Error executing ${script}:`, error.message);
    console.log(`⚠️ Continue to next script...`);
    // エラーが起きても次のスクリプトの実行を続ける
  }
}

console.log(`\n🎉 All scraper scripts finished!`);
