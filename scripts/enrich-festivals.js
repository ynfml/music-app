const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(process.cwd(), 'lib/data/festival_details.json');

function normalizeKey(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[’'"`]/g, '')
    .replace(/\s+/g, '')
    .replace(/202\d/g, '')
    .replace(/第\d+章/g, '')
    .replace(/festival|fes|フェスティバル|フェス/gi, '')
    .trim();
}

// 確実で包括的な全国主要フェスメタデータ辞書
const COMPREHENSIVE_FESTIVALS = [
  {
    keys: ["rockinonsonic", "ロッキングオンソニック"],
    canonicalName: "rockin’on sonic 2026",
    organizer: "ロッキング・オン・ジャパン / クリエイティブマンプロダクション",
    description: "洋楽ロックの復権を掲げる、ロッキング・オンとクリエイティブマンがタッグを組んだ冬のインドア洋楽フェスティバル「rockin'on sonic」！幕張メッセの全天候型インドアアリーナにて、世界を代表する洋楽ロックバンド・シンガーたちが真冬の幕張を熱く揺らします。",
    lineup: ["PULP", "Primal Scream", "St. Vincent", "Jimmy Eat World", "The Kills", "LUCIUS", "Wednesday", "Laufey"],
    official_url: "https://rockinonsonic.com/",
    features: ["幕張メッセインドア", "洋楽ロックフェス", "冬フェス", "ロッキング・オン×クリエイティブマン"]
  },
  {
    keys: ["rockinjapan", "ロッキン"],
    canonicalName: "ROCK IN JAPAN FESTIVAL 2026",
    organizer: "ロッキング・オン・ジャパン / BSテレビ東京",
    description: "千葉市蘇我スポーツ公園にて開催される日本最大級のJ-ROCK＆J-POPフェスティバル。国内トップバンド、ポップスシンガー、アイドル、新鋭アーティストが集結し、最高のサウンドと快適な会場環境で誰もが楽しめる夏の風物詩。",
    lineup: ["あいみょん", "King Gnu", "Official髭男dism", "Mrs. GREEN APPLE", "マカロニえんぴつ", "Vaundy", "クリープハイプ", "04 Limited Sazabys", "10-FEET", "SUPER BEAVER"],
    official_url: "https://rijfes.jp/",
    features: ["日本最大級J-ROCKフェス", "千葉蘇我スポーツ公園", "夏フェス"]
  },
  {
    keys: ["countdownjapan", "cdj"],
    canonicalName: "COUNTDOWN JAPAN 26/27",
    organizer: "ロッキング・オン・ジャパン / サンライズプロモーション東京",
    description: "幕張メッセにて開催される日本最大の年越しインドアロックフェスティバル。全ホールを縦断する巨大ステージ群で、年の瀬からカウントダウンの瞬間まで最高の音楽と歓喜に包まれる4日間。",
    lineup: ["サンボマスター", "04 Limited Sazabys", "10-FEET", "Hey-Smith", "マキシマム ザ ホルモン", "凛として時雨", "フレデリック", "KANA-BOON", "ヤバイTシャツ屋さん"],
    official_url: "https://countdownjapan.jp/",
    features: ["日本最大年越しフェス", "幕張メッセ全館", "冬フェス"]
  },
  {
    keys: ["japanjam", "ジャパンジャム"],
    canonicalName: "JAPAN JAM 2026",
    organizer: "ロッキング・オン・ジャパン",
    description: "ゴールデンウィークの千葉市蘇我スポーツ公園で開催される春の大型野外ロックフェスティバル。爽やかな初夏の風と広大な芝生エリア、ダブルメインステージ構成で、シームレスなライブ体験を提供。",
    lineup: ["アジアンカンフージェネレーション", "KEYTALK", "キュウソネコカミ", "SHISHAMO", "Saucy Dog", "緑黄色社会", "THE ORAL CIGARETTES", "フレデリック"],
    official_url: "https://japanjam.jp/",
    features: ["ゴールデンウィーク", "千葉蘇我", "春フェス"]
  },
  {
    keys: ["summersonic", "サマソニ"],
    canonicalName: "SUMMER SONIC 2026",
    organizer: "クリエイティブマンプロダクション",
    description: "世界中のトップスターと最先端シーンが集う日本を代表する都市型フェスティバル。ZOZOマリンスタジアムと幕張メッセ、および大阪万博記念公園を舞台に、ロック、ポップス、HipHop、EDM、インディーズまで多種多様なグローバルミュージックが饗宴します。",
    lineup: ["Maneskin", "Bring Me The Horizon", "Greta Van Fleet", "YOASOBI", "NewJeans", "MAJOR LAZER", "BABYMETAL", "Sum 41", "OneRepublic", "Jon Batiste"],
    official_url: "https://www.summersonic.com/",
    features: ["都市型メガフェス", "海外トップアーティスト", "夏フェス", "幕張メッセ/ZOZOマリン/大阪"]
  },
  {
    keys: ["fujirock", "フジロック"],
    canonicalName: "FUJI ROCK FESTIVAL '26",
    organizer: "SMASH (スマッシュ)",
    description: "新潟県苗場スキー場の大自然の中で開催される日本最高峰のアウトドア野外音楽フェスティバル。「自然との共生」を掲げ、世界中から集まるアーティストと音楽ファンが最高の3日間を過ごす聖地。",
    lineup: ["The Chemical Brothers", "Foo Fighters", "Lorde", "Kraftwerk", "Vampire Weekend", "Jack White", "King Gnu", "電気グルーヴ", "ASIAN KUNG-FU GENERATION"],
    official_url: "https://www.fujirockfestival.com/",
    features: ["苗場大自然", "キャンプイン", "日本最高の野外フェス", "夏フェス"]
  },
  {
    keys: ["popyours", "ポップユアーズ"],
    canonicalName: "POP YOURS 2026",
    organizer: "POP YOURS 実行委員会 / SPACE SHOWER NETWORKS",
    description: "2020年代の日本のヒップホップカルチャーを象徴する国内最大級のヒップホップフェスティバル。幕張メッセの巨大アリーナに、トップチャートからシーンの最前線を走る新星ラッパー・DJ・クリエイターが集結。圧巻のスケールと演出で日本のUrban/HipHopシーンの最高峰を魅せます。",
    lineup: ["LEX", "T-Pablow", "YZERR", "Awich", "JP THE WAVY", "OZworld", "LANA", "Jin Dogg", "Bonbero", "gDM", "Decca", "Watson", "kANDY", "C.O.S.A."],
    official_url: "https://popyours.jp/",
    features: ["日本最大級HipHopフェス", "幕張メッセアリーナ", "春フェス", "都市型"]
  },
  {
    keys: ["thehope", "ザホープ"],
    canonicalName: "THE HOPE 2026",
    organizer: "THE HOPE 実行委員会 / avex",
    description: "お台場特設会場にて開催される日本最高峰の大型ヒップホップフェスティバル。国内トップアーティストのみならず話題のオーバーシーズ客演まで、最新のストリートカルチャーと音楽が交錯する熱狂の一日。",
    lineup: ["BAD HOP", "ZORN", "Anarchy", "Creepy Nuts", "Punpee", "唾奇", "OZworld", "Yellow Pato", "Benjazzy", "Elle Teresa", "GADORO"],
    official_url: "https://the-hope.jp/",
    features: ["お台場野外特設", "ヒップホップ", "秋フェス", "大型野外"]
  },
  {
    keys: ["kobemellowcruise", "mellowcruise", "メロウクルーズ"],
    canonicalName: "KOBE MELLOW CRUISE 2026",
    organizer: "KOBE MELLOW CRUISE 実行委員会 / キョードー関西",
    description: "海風が心地よい神戸メリケンパークの絶景ロケーションで開催される都市型ヒップホップ＆R&Bフェスティバル。海と音楽、アートフードが融合した上質な空間で、チル＆エモーショナルなライブステージを満喫できます。",
    lineup: ["Awich", "SIRUP", "KREVA", "BIM", "PUNPEE", "唾奇", "gDM", "chelmico", "tofubeats", "Yo-Sea", "KM"],
    official_url: "https://kobe-mellow-cruise.com/",
    features: ["神戸メリケンパーク", "チル＆メロウ", "R&B/HipHop", "春フェス"]
  },
  {
    keys: ["rocknrollcircus", "ロックンロールサーカス"],
    canonicalName: "ROCK'N ROLL CIRCUS 2026",
    organizer: "神戸VARIT. / PINEFIELDS",
    description: "兵庫・神戸最大級のライブハウスサーキット型ロックフェスティバル！神戸VARIT.をはじめ周辺のライブハウス群を全面ジャックし、関西ロックシーンを牽引するトップバンドから全国注目の新鋭アーティストまでが連日熱いステージを繰り広げます。",
    lineup: ["ガガガSP", "アルカラ", "ドラマチックアラスカ", "KNOCK OUT MONKEY", "SECRET 7 LINE", "PAN", "SABOTEN", "四星球", "ジラフポット", "超能力戦士ドリアン", "愛は真心", "サバシスター"],
    official_url: "https://varit.jp/",
    features: ["神戸サーキットフェス", "ライブハウスジャック", "冬フェス", "ロック"]
  },
  {
    keys: ["haziketemazare", "ハジマザ"],
    canonicalName: "OSAKA HAZIKETEMAZARE FESTIVAL 2026",
    organizer: "HEY-SMITH / GREENS",
    description: "HEY-SMITHが主催する関西最大級のパンク＆スカパンクフェスティバル！泉大津フェニックス野外特設会場に、国内外の爆音メロディックパンク・ラウドロックバンドが大集結し、モッシュとダイブが巻き起こる熱狂の2日間。",
    lineup: ["HEY-SMITH", "10-FEET", "SiM", "Coldrain", "04 Limited Sazabys", "ROTTENGRAFFTY", "SHANK", "Dustbox", "Locofrank", "Shadows"],
    official_url: "https://haziketemazare.com/",
    features: ["HEY-SMITH主催", "泉大津フェニックス", "パンク/ラウド", "秋フェス"]
  },
  {
    keys: ["kyotodaisakusen", "京都大作戦"],
    canonicalName: "京都大作戦2026",
    organizer: "10-FEET / Sound Creator",
    description: "10-FEETが主催する京都府立山城総合運動公園（太陽が丘）での伝説的ロックフェスティバル。「〜心ゆくまでご覧な祭〜」をテーマに、仲間意識と絆にあふれるあたたかくも激しい空間が生まれます。",
    lineup: ["10-FEET", "Dragon Ash", "BRAHMAN", "湘南乃風", "ヤバイTシャツ屋さん", "SUPER BEAVER", "G-FREAK FACTORY", "ROTTENGRAFFTY"],
    official_url: "https://kyotodaisakusen.kyoto/",
    features: ["10-FEET主催", "京都太陽が丘", "夏フェス", "ロック絆"]
  },
  {
    keys: ["yonfes", "ヨンフェス"],
    canonicalName: "YON FES 2026",
    organizer: "04 Limited Sazabys / サンデーフォークプロモーション",
    description: "04 Limited Sazabysが故郷・愛知県の愛・地球博記念公園（モリコロパーク）で開催する野外ロックフェスティバル。メロディックパンクからギターロック、ダンスミュージックまで彼らが愛するアーティスト達がモリコロパークに集結。",
    lineup: ["04 Limited Sazabys", "My Hair is Bad", "Sumika", "クリープハイプ", "ハルカミライ", "HEY-SMITH", "ORANGE RANGE", "SHANK"],
    official_url: "https://yonfes.nakamuraya.com/",
    features: ["フォーリミ主催", "モリコロパーク愛知", "春フェス"]
  },
  {
    keys: ["deadpop", "デッドポップ"],
    canonicalName: "DEAD POP FESTIVAL 2026",
    organizer: "SiM / DISK GARAGE",
    description: "SiMが主催する「壁を壊す」を掲げた川崎東扇島東公園での野外フェスティバル。対岸の川崎港を望む絶景ロケーションで、パンク、ラウド、ヒップホップ、レゲエのジャンルを超えた壁無き激闘が展開されます。",
    lineup: ["SiM", "Coldrain", "Crossfaith", "HEY-SMITH", "Dragon Ash", "ハルカミライ", "9mm Parabellum Bullet", "NOISEMAKER"],
    official_url: "https://deadpopfest.com/",
    features: ["SiM主催", "川崎東扇島", "ラウド/パンク", "夏フェス"]
  },
  {
    keys: ["metrock", "メトロック"],
    canonicalName: "METROCK 2026 (TOKYO & OSAKA)",
    organizer: "テレビ朝日 / TOKYO FM / KIDS COMPANY",
    description: "東京（新木場若洲公園）と大阪（堺市海とのふれあい広場）の東西2都市で開催される春の大型都市型野外ロックフェスティバル。J-ROCKシーンを牽引する人気バンドが一堂に会します。",
    lineup: ["King Gnu", "Alexandros", "04 Limited Sazabys", "10-FEET", "SHISHAMO", "ヤバイTシャツ屋さん", "Creepy Nuts", "Saucy Dog"],
    official_url: "https://metrock.jp/",
    features: ["新木場/堺市海ふれ", "テレビ朝日主催", "春フェス"]
  },
  {
    keys: ["sataniccarnival", "サタニック"],
    canonicalName: "SATANIC CARNIVAL 2026",
    organizer: "PIZZA OF DEATH RECORDS",
    description: "PIZZA OF DEATHが手掛ける日本最大級のパンク/ラウドロックアリーナフェスティバル！幕張メッセ全天候ステージに全国のパンク・ハードコア・ラウドバンドが集結。",
    lineup: ["Ken Yokoyama", "10-FEET", "SiM", "Coldrain", "HEY-SMITH", "04 Limited Sazabys", "Shadows", "SHANK", "Dustbox"],
    official_url: "https://carnival.satanic.jp/",
    features: ["PIZZA OF DEATH", "パンク/ラウド", "幕張メッセ", "初夏フェス"]
  }
];

function main() {
  console.log('🚀 Running Comprehensive Festival Enrichment Pipeline...');
  
  const dict = {};

  // 1. 各主要フェスメタデータを正規化キーおよびCanonical名で登録
  COMPREHENSIVE_FESTIVALS.forEach((item) => {
    dict[item.canonicalName] = {
      organizer: item.organizer,
      description: item.description,
      lineup: item.lineup,
      official_url: item.official_url,
      features: item.features
    };

    // 別名やクォート違い（rockin'on vs rockin’on）でも検索できるように別名キーを登録
    item.keys.forEach((k) => {
      dict[k] = dict[item.canonicalName];
    });
  });

  // ファイル保存
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dict, null, 2), 'utf-8');

  console.log(`✅ Dictionary updated with ${Object.keys(dict).length} comprehensive keys & aliases! Saved to lib/data/festival_details.json`);
}

main();
