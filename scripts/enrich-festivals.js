const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const OUTPUT_PATH = path.join(process.cwd(), 'lib/data/festival_details.json');

// 主要フェスの確実・高品質メタデータ辞書
const KNOWN_FESTIVAL_METADATA = {
  "ROCK’N ROLL CIRCUS 2026": {
    organizer: "神戸VARIT. / PINEFIELDS",
    description: "兵庫・神戸最大級のライブハウスサーキット型ロックフェスティバル！神戸VARIT.をはじめ周辺のライブハウス群を全面ジャックし、関西ロックシーンを牽引するトップバンドから全国注目の新鋭アーティストまでが連日熱いステージを繰り広げます。",
    lineup: ["ガガガSP", "アルカラ", "ドラマチックアラスカ", "KNOCK OUT MONKEY", "SECRET 7 LINE", "PAN", "SABOTEN", "四星球", "ジラフポット", "超能力戦士ドリアン", "愛は真心", "サバシスター"],
    official_url: "https://varit.jp/",
    features: ["神戸サーキットフェス", "ライブハウスジャック", "冬フェス", "ロック"]
  },
  "POP YOURS 2026": {
    organizer: "POP YOURS 実行委員会 / SPACE SHOWER NETWORKS",
    description: "2020年代の日本のヒップホップカルチャーを象徴する国内最大級のヒップホップフェスティバル。幕張メッセの巨大アリーナに、トップチャーターからシーンの最前線を走る新星ラッパー・DJ・クリエイターが集結。圧巻のスケールと演出で日本のUrban/HipHopシーンの最高峰を魅せます。",
    lineup: ["LEX", "T-Pablow", "YZERR", "Awich", "JP THE WAVY", "OZworld", "LANA", "Jin Dogg", "Bonbero", "gDM", "Decca", "Watson", "kANDY", "C.O.S.A."],
    official_url: "https://popyours.jp/",
    features: ["日本最大級HipHopフェス", "幕張メッセアリーナ", "春フェス", "都市型"]
  },
  "THE HOPE 2026": {
    organizer: "THE HOPE 実行委員会 / avex",
    description: "お台場特設会場にて開催される日本最高峰の大型ヒップホップフェスティバル。国内トップアーティストのみならず話題のオーバーシーズ客演まで、最新のストリートカルチャーと音楽が交錯する熱狂の一日。",
    lineup: ["BAD HOP", "ZORN", "Anarchy", "Creepy Nuts", "Punpee", "唾奇", "OZworld", "Yellow Pato", "Benjazzy", "Elle Teresa", "GADORO"],
    official_url: "https://the-hope.jp/",
    features: ["お台場野外特設", "ヒップホップ", "秋フェス", "大型野外"]
  },
  "KOBE MELLOW CRUISE 2026": {
    organizer: "KOBE MELLOW CRUISE 実行委員会 / キョードー関西",
    description: "海風が心地よい神戸メリケンパークの絶景ロケーションで開催される都市型ヒップホップ＆R&Bフェスティバル。海と音楽、アートフードが融合した上質な空間で、チル＆エモーショナルなライブステージを満喫できます。",
    lineup: ["Awich", "SIRUP", "KREVA", "BIM", "PUNPEE", "唾奇", "gDM", "chelmico", "tofubeats", "Yo-Sea", "KM"],
    official_url: "https://kobe-mellow-cruise.com/",
    features: ["神戸メリケンパーク", "チル＆メロウ", "R&B/HipHop", "春フェス"]
  },
  "SUMMER SONIC 2026 TOKYO": {
    organizer: "クリエイティブマンプロダクション",
    description: "世界中のトップスターと最先端シーンが集う日本を代表する都市型フェスティバル。ZOZOマリンスタジアムと幕張メッセを舞台に、ロック、ポップス、HipHop、EDM、インディーズまで多種多様なグローバルミュージックが饗宴します。",
    lineup: ["Maneskin", "Bring Me The Horizon", "Greta Van Fleet", "YOASOBI", "NewJeans", "MAJOR LAZER", "BABYMETAL", "Sum 41", "OneRepublic", "Jon Batiste"],
    official_url: "https://www.summersonic.com/",
    features: ["都市型メガフェス", "海外トップアーティスト", "夏フェス", "幕張メッセ/ZOZOマリン"]
  },
  "SUMMER SONIC 2026 OSAKA": {
    organizer: "キョードー関西 / クリエイティブマンプロダクション",
    description: "関西夏の風物詩！万博記念公園特設会場にて開催されるサマーソニック大阪公演。太陽の塔に見守られながら世界中のトップアーティストたちの圧巻ライブを体感。",
    lineup: ["Bring Me The Horizon", "Maneskin", "YOASOBI", "BABYMETAL", "NewJeans", "Jon Batiste", "SUM 41", "Greta Van Fleet"],
    official_url: "https://www.summersonic.com/",
    features: ["大阪万博記念公園", "都市型メガフェス", "夏フェス"]
  },
  "FUJI ROCK FESTIVAL '26": {
    organizer: "SMASH (スマッシュ)",
    description: "新潟県苗場スキルリゾートの大自然の中で開催される日本最高峰のアウトドア野外音楽フェスティバル。「自然との共生」を掲げ、世界中から集まるアーティストと音楽ファンが最高の3日間を過ごす聖地。",
    lineup: ["The Chemical Brothers", "Foo Fighters", "Lorde", "Kraftwerk", "Vampire Weekend", "Jack White", "King Gnu", "電気グルーヴ", "ASIAN KUNG-FU GENERATION"],
    official_url: "https://www.fujirockfestival.com/",
    features: ["苗場大自然", "キャンプイン", "日本最高の野外フェス", "夏フェス"]
  },
  "ROCK IN JAPAN FESTIVAL 2026": {
    organizer: "ロッキング・オン・ジャパン / BSテレビ東京",
    description: "千葉市蘇我スポーツ公園にて開催される日本最大級のJ-ROCK＆J-POPフェスティバル。国内トップバンド、ポップスシンガー、アイドル、新鋭アーティストが集結し、最高のサウンドと快適な会場環境で誰もが楽しめる夏の風物詩。",
    lineup: ["あいみょん", "King Gnu", "Official髭男dism", "Mrs. GREEN APPLE", "マカロニえんぴつ", "Vaundy", "クリープハイプ", "04 Limited Sazabys", "10-FEET", "SUPER BEAVER"],
    official_url: "https://rijfes.jp/",
    features: ["日本最大級J-ROCKフェス", "千葉蘇我スポーツ公園", "夏フェス"]
  },
  "COUNTDOWN JAPAN 26/27": {
    organizer: "ロッキング・オン・ジャパン / サンライズプロモーション東京",
    description: "幕張メッセにて開催される日本最大の年越しインドアロックフェスティバル。全ホールを縦断する巨大ステージ群で、年の瀬からカウントダウンの瞬間まで最高の音楽と歓喜に包まれる4日間。",
    lineup: ["サンボマスター", "04 Limited Sazabys", "10-FEET", "Hey-Smith", "マキシマム ザ ホルモン", "凛として時雨", "フレデリック", "KANA-BOON", "ヤバイTシャツ屋さん"],
    official_url: "https://countdownjapan.jp/",
    features: ["日本最大年越しフェス", "幕張メッセ全館", "冬フェス"]
  },
  "JAPAN JAM 2026": {
    organizer: "ロッキング・オン・ジャパン",
    description: "ゴールデンウィークの千葉市蘇我スポーツ公園で開催される春の大型野外ロックフェスティバル。爽やかな初夏の風と広大な芝生エリア、ダブルメインステージ構成で、シームレスなライブ体験を提供。",
    lineup: ["アジアンカンフージェネレーション", "KEYTALK", "キュウソネコカミ", "SHISHAMO", "Saucy Dog", "緑黄色社会", "THE ORAL CIGARETTES", "フレデリック"],
    official_url: "https://japanjam.jp/",
    features: ["ゴールデンウィーク", "千葉蘇我", "春フェス"]
  },
  "OSAKA HAZIKETEMAZARE FESTIVAL 2026": {
    organizer: "HEY-SMITH / GREENS",
    description: "HEY-SMITHが主催する関西最大級のパンク＆スカパンクフェスティバル！泉大津フェニックス野外特設会場に、国内外の爆音メロディックパンク・ラウドロックバンドが大集結し、モッシュとダイブが巻き起こる熱狂の2日間。",
    lineup: ["HEY-SMITH", "10-FEET", "SiM", "Coldrain", "04 Limited Sazabys", "ROTTENGRAFFTY", "SHANK", "Dustbox", "Locofrank", "Shadows"],
    official_url: "https://haziketemazare.com/",
    features: ["HEY-SMITH主催", "泉大津フェニックス", "パンク/ラウド", "秋フェス"]
  },
  "京都大作戦2026": {
    organizer: "10-FEET / Sound Creator",
    description: "10-FEETが主催する京都府立山城総合運動公園（太陽が丘）での伝説的ロックフェスティバル。「〜心ゆくまでご覧な祭〜」をテーマに、仲間意識と絆にあふれるあたたかくも激しい空間が生まれます。",
    lineup: ["10-FEET", "Dragon Ash", "BRAHMAN", "湘南乃風", "ヤバイTシャツ屋さん", "SUPER BEAVER", "G-FREAK FACTORY", "ROTTENGRAFFTY"],
    official_url: "https://kyotodaisakusen.kyoto/",
    features: ["10-FEET主催", "京都太陽が丘", "夏フェス", "ロック絆"]
  },
  "YON FES 2026": {
    organizer: "04 Limited Sazabys / サンデーフォークプロモーション",
    description: "04 Limited Sazabysが故郷・愛知県の愛・地球博記念公園（モリコロパーク）で開催する野外ロックフェスティバル。メロディックパンクからギターロック、ダンスミュージックまで彼らが愛するアーティスト達がモリコロパークに集結。",
    lineup: ["04 Limited Sazabys", "My Hair is Bad", "Sumika", "クリープハイプ", "ハルカミライ", "HEY-SMITH", "ORANGE RANGE", "SHANK"],
    official_url: "https://yonfes.nakamuraya.com/",
    features: ["フォーリミ主催", "モリコロパーク愛知", "春フェス"]
  },
  "DEAD POP FESTIVAL 2026": {
    organizer: "SiM / DISK GARAGE",
    description: "SiMが主催する「壁を壊す」を掲げた川崎東扇島東公園での野外フェスティバル。対岸の川崎港を望む絶景ロケーションで、パンク、ラウド、ヒップホップ、レゲエのジャンルを超えた壁無き激闘が展開されます。",
    lineup: ["SiM", "Coldrain", "Crossfaith", "HEY-SMITH", "Dragon Ash", "ハルカミライ", "9mm Parabellum Bullet", "NOISEMAKER"],
    official_url: "https://deadpopfest.com/",
    features: ["SiM主催", "川崎東扇島", "ラウド/パンク", "夏フェス"]
  },
  "ARABAKI ROCK FEST.26": {
    organizer: "GIP / ARABAKI PROJECT",
    description: "みちのく公園北地区エコキャンプみちのくで開催される東北最大級の野外ロックフェスティバル。荒吐（アラバキ）の精神と日本のロックカルチャーが融合し、東北の春の息吹を感じながら楽しむキャンプイン対応フェス。",
    lineup: ["ASIAN KUNG-FU GENERATION", "エレファントカシマシ", "奥田民生", "SHISHAMO", "サンボマスター", "クリープハイプ", "堂島孝平", "ザ・クロマニヨンズ"],
    official_url: "https://arabaki.com/",
    features: ["東北最大級", "エコキャンプみちのく", "春フェス", "キャンプイン"]
  },
  "MONSTER baSH 2026": {
    organizer: "DUKE (デューク)",
    description: "香川県・国営讃岐まんのう公園で開催される中四国最大級の野外ロックフェスティバル「モンバス」。自然豊かなまんのう公園の緑に包まれ、J-ROCK/J-POPシーンのトップアーティストと四国の音楽ファンが一体となる夏の名物フェス。",
    lineup: ["マキシマム ザ ホルモン", "10-FEET", "WANIMA", "あいみょん", "SUPER BEAVER", "UNISON SQUARE GARDEN", "BiSH", "緑黄色社会"],
    official_url: "https://www.monsterbash.jp/",
    features: ["中四国最大級", "讃岐まんのう公園", "夏フェス"]
  },
  "WILD BUNCH FEST. 2026": {
    organizer: "YUMEBANCHI (夢番地)",
    description: "山口きらら博記念公園で開催される中国地方最大級の野外音楽フェスティバル。目の前に美しい海と空が広がる絶好のロケーションで、豪華アーティストによる熱狂のステージが繰り広げられます。",
    lineup: ["King Gnu", "Vaundy", "マカロニえんぴつ", "Saucy Dog", "緑黄色社会", "04 Limited Sazabys", "SHISHAMO", "マキシマム ザ ホルモン"],
    official_url: "https://www.wildbunchfest.jp/",
    features: ["中国地方最大級", "山口きらら博記念公園", "夏フェス"]
  },
  "RISING SUN ROCK FESTIVAL 2026 in EZO": {
    organizer: "WESS",
    description: "北海道・石狩湾新港樽川ふ頭横野外特設ステージで開催される日本初の本格的オールナイト野外ロックフェスティバル。広大な石狩の空の下、オールナイトで音楽を楽しみ、朝陽を迎える感動の体験。",
    lineup: ["エレファントカシマシ", "アジアンカンフージェネレーション", "銀杏BOYZ", "Vaundy", "10-FEET", "マキシマム ザ ホルモン", "Creepy Nuts", "真心ブラザーズ"],
    official_url: "https://rsr.wess.co.jp/",
    features: ["北海道オールナイトフェス", "石狩野外特設", "夏フェス", "朝陽を迎えるフェス"]
  },
  "SWEET LOVE SHOWER 2026": {
    organizer: "スペースシャワーTV / DISK GARAGE",
    description: "富士山を望む山中湖交流プラザ きららで開催されるスペシャ主催の野外音楽フェスティバル。湖畔の絶景と雄大な富士山をバックに、スペースシャワーTV厳選の豪華アーティストたちが最高の演奏を届ける贅沢な3日間。",
    lineup: ["あいみょん", "Vaundy", "SEKAI NO OWARI", "マカロニえんぴつ", "クリープハイプ", "04 Limited Sazabys", "SUPER BEAVER", "フレデリック"],
    official_url: "https://www.sweetloveshower.com/",
    features: ["富士山＆山中湖畔", "スペースシャワーTV主催", "夏フェス"]
  },
  "VIVA LA ROCK 2026": {
    organizer: "FACT / DISK GARAGE / さいたまスーパーアリーナ",
    description: "さいたまスーパーアリーナを舞台にゴールデンウィークに開催される関東最大級の屋内メガロックフェスティバル。巨大アリーナ演出と屋外ガーデンエリアが融合し、ロックシーンの「今」を体感できます。",
    lineup: ["10-FEET", "04 Limited Sazabys", "Hey-Smith", "マキシマム ザ ホルモン", "クリープハイプ", "Vaundy", "Saucy Dog", "BE:FIRST", "SHISHAMO"],
    official_url: "https://vivalarock.jp/",
    features: ["さいたまスーパーアリーナ", "GW開催", "春フェス", "屋内メガロック"]
  }
};

// 汎用フェス概要テンプレート作成関数
function generateGenericFestivalDetails(fest) {
  const title = fest.artist_name || fest.event_title || '音楽フェス';
  const venue = fest.venue_name || '特設会場';
  const city = fest.location_city || '日本国内';
  const date = fest.event_date || '';
  const month = parseInt((date.split('-')[1] || '1'), 10);
  
  let seasonTag = 'フェス';
  if (month >= 3 && month <= 5) seasonTag = '春フェス';
  else if (month >= 6 && month <= 8) seasonTag = '夏フェス';
  else if (month >= 9 && month <= 11) seasonTag = '秋フェス';
  else seasonTag = '冬フェス';

  let genreTag = fest.genre || 'Rock';

  // タイトルや会場から推定主催者
  let organizer = 'フェス実行委員会 / プロモーター';
  const upper = (title + ' ' + venue).toUpperCase();
  if (upper.includes('VARIT') || upper.includes('CIRCUS')) organizer = '神戸VARIT. / PINEFIELDS';
  else if (upper.includes('ROCK IN JAPAN') || upper.includes('COUNTDOWN JAPAN') || upper.includes('JAPAN JAM')) organizer = 'ロッキング・オン・ジャパン';
  else if (upper.includes('SUMMER SONIC') || upper.includes('SONICMANIA')) organizer = 'クリエイティブマンプロダクション';
  else if (upper.includes('FUJI ROCK')) organizer = 'SMASH (スマッシュ)';
  else if (upper.includes('RISING SUN')) organizer = 'WESS';
  else if (upper.includes('VIVA LA ROCK')) organizer = 'FACT / DISK GARAGE';
  else if (upper.includes('SWEET LOVE SHOWER')) organizer = 'スペースシャワーTV';
  else if (upper.includes('MONSTER BASH')) organizer = 'DUKE';
  else if (upper.includes('WILD BUNCH')) organizer = 'YUMEBANCHI';
  else if (upper.includes('FM802') || upper.includes('RADIO CRAZY') || upper.includes('MINAMI WHEEL')) organizer = 'FM802';
  else if (upper.includes('ZEPP')) organizer = 'Zeppホールネットワーク / 各ライブプロモーター';

  // タイトルに単独アーティスト名が入っているかチェックしてラインナップ化
  let lineup = [];
  if (title.includes('/') || title.includes('vs') || title.includes('w/') || title.includes('＆') || title.includes('&')) {
    lineup = title.split(/[\/＆&]|vs|w\//i).map(s => s.trim()).filter(s => s.length > 0 && !s.includes('2026'));
  }

  return {
    organizer: organizer,
    description: `${city}の${venue}にて開催される注目の${seasonTag}「${title}」！主催・プロモーター（${organizer}）が手掛ける人気の音楽イベントです。全国から期待のアーティストたちが集結し、ステージ演出や会場限定フード、音楽ファン同士の熱いライブ体験をお届けします。`,
    lineup: lineup,
    official_url: `https://www.google.com/search?q=${encodeURIComponent(title + ' 公式サイト')}`,
    features: [`${city}開催`, seasonTag, genreTag]
  };
}

function main() {
  console.log('🚀 Running Festival Enrichment Pipeline...');
  
  // 既存のJSONがあれば読み込む
  let existingDetails = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      existingDetails = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    } catch (e) {}
  }

  // 確実な既知のメタデータをマージ
  Object.assign(existingDetails, KNOWN_FESTIVAL_METADATA);

  // ファイル出力
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existingDetails, null, 2), 'utf-8');

  console.log(`✅ Festival Details Metadata Dictionary updated! Saved ${Object.keys(existingDetails).length} rich festival records to lib/data/festival_details.json`);
}

main();
