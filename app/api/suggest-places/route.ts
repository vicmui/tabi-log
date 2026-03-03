import { NextRequest, NextResponse } from "next/server";

// Built-in curated suggestions — no API key needed, always works, free forever
const DESTINATION_DB: Record<string, Array<{name: string; category: string; note: string}>> = {
  osaka: [
    { name: "道頓堀", category: "景點", note: "大阪標誌性霓虹燈美食街，必食蟹道樂和串炸" },
    { name: "心齋橋筋", category: "購物", note: "大阪最熱鬧購物步行街，藥妝、潮牌應有盡有" },
    { name: "黑門市場", category: "美食", note: "大阪廚房，新鮮海鮮、和牛刺身即買即食" },
    { name: "大阪城公園", category: "景點", note: "日本名城，春季賞櫻、夏季綠蔭，附設博物館" },
    { name: "通天閣", category: "景點", note: "新世界地標，登頂俯瞰大阪全景" },
    { name: "梅田空中庭園", category: "景點", note: "空中連橋展望台，夜景一流" },
    { name: "難波八阪神社", category: "文化", note: "巨大獅子頭造型神社，大阪獨特打卡景點" },
    { name: "美國村", category: "購物", note: "潮流服飾、二手古著、街頭塗鴉集中地" },
    { name: "住吉大社", category: "文化", note: "全日本住吉神社總本社，初詣參拜人數全國最多" },
    { name: "法善寺橫丁", category: "夜生活", note: "青苔石板路小巷，傳統居酒屋、懷舊氣氛" },
    { name: "新世界", category: "美食", note: "昭和復古風情，串炸文化發源地" },
    { name: "天保山摩天輪", category: "景點", note: "世界最大級摩天輪，海遊館旁，夜景漂亮" },
  ],
  tokyo: [
    { name: "淺草寺", category: "文化", note: "東京最古老寺廟，雷門大燈籠是標誌性地標" },
    { name: "渋谷スクランブル交差点", category: "景點", note: "全球最繁忙行人交叉路口，夜晚尤其壯觀" },
    { name: "築地場外市場", category: "美食", note: "新鮮壽司刺身、海鮮丼，早餐首選" },
    { name: "新宿歌舞伎町", category: "夜生活", note: "東京最大娛樂區，餐廳居酒屋不夜城" },
    { name: "原宿竹下通", category: "購物", note: "日本青少年潮流聖地，可麗餅必食" },
    { name: "上野恩賜公園", category: "自然", note: "春季賞櫻名所，附設多個世界級博物館" },
    { name: "秋葉原電器街", category: "購物", note: "電器、動漫、手辦聖地，宅文化發源地" },
    { name: "六本木之丘", category: "景點", note: "藝術、時尚、美食集中地，城市景觀展望台" },
    { name: "明治神宮", category: "文化", note: "東京市中心森林神社，感受日本傳統靜謐" },
    { name: "台場", category: "景點", note: "海濱商業區，自由女神像複製品、彩虹橋夜景" },
    { name: "中目黑", category: "美食", note: "目黑川沿岸咖啡廳、精品店，春季賞櫻必去" },
    { name: "銀座", category: "購物", note: "東京最高級購物街，國際品牌旗艦店雲集" },
  ],
  kyoto: [
    { name: "伏見稻荷大社", category: "文化", note: "千本鳥居穿越山林，日本最知名神社之一" },
    { name: "嵐山竹林", category: "自然", note: "翠綠竹林小徑，清晨最為靜謐唯美" },
    { name: "清水寺", category: "文化", note: "UNESCO世界遺產，清水舞台懸空木構造建築" },
    { name: "祇園四條", category: "文化", note: "京都藝妓街，石板小路保留江戶時代風情" },
    { name: "金閣寺", category: "景點", note: "全金箔貼面舍利殿，倒影湖面如夢如畫" },
    { name: "錦市場", category: "美食", note: "京都廚房，醃漬物、豆腐、和菓子必試" },
    { name: "二条城", category: "文化", note: "德川家康修建，鶯張地板、二之丸御殿壁畫" },
    { name: "哲學之道", category: "自然", note: "琵琶湖疏水沿岸散步道，春季賞櫻絕佳" },
    { name: "嵐山渡月橋", category: "景點", note: "橫跨大堰川，楓葉季和雪景都絕美" },
    { name: "三十三間堂", category: "文化", note: "1001尊千手觀音像，氣勢震撼" },
    { name: "下鴨神社", category: "文化", note: "世界遺產，森林神社，糺之森必須一逛" },
    { name: "河原町", category: "購物", note: "京都最大商業區，百貨公司與個性小店混雜" },
  ],
  hokkaido: [
    { name: "札幌大通公園", category: "景點", note: "貫穿市中心，啤酒節、雪祭會場" },
    { name: "小樽運河", category: "景點", note: "明治時代石造倉庫群，夜燈倒影極為浪漫" },
    { name: "函館朝市", category: "美食", note: "清晨海鮮丼、帝王蟹，北海道海鮮天堂" },
    { name: "富良野薰衣草田", category: "自然", note: "七月紫色花海，北海道最具代表性風景" },
    { name: "知床半島", category: "自然", note: "UNESCO自然遺產，棕熊出沒的原始自然" },
    { name: "洞爺湖", category: "自然", note: "火山口湖，溫泉旅館，冬夏皆宜" },
  ],
  taipei: [
    { name: "九份老街", category: "景點", note: "山城石板路，紅燈籠夜景是宮崎駿靈感來源" },
    { name: "士林夜市", category: "美食", note: "台灣最大夜市，炸雞排、珍珠奶茶必食" },
    { name: "國立故宮博物院", category: "文化", note: "全球最重要中華文物收藏，翠玉白菜鎮館之寶" },
    { name: "饒河街夜市", category: "美食", note: "胡椒餅、蚵仔煎，台北最受歡迎傳統夜市" },
    { name: "台北101", category: "景點", note: "508米摩天大樓，登頂俯瞰盆地全景" },
    { name: "西門町", category: "購物", note: "台北潮流聖地，電影街、手搖杯、日系服飾" },
    { name: "陽明山國家公園", category: "自然", note: "火山地形、溫泉、芒草步道，離市區最近山野" },
    { name: "迪化街", category: "文化", note: "清末古建築保留完好，乾貨南北行、文創小店" },
    { name: "象山步道", category: "自然", note: "30分鐘登頂，可拍101最佳角度" },
    { name: "永康街", category: "美食", note: "鼎泰豐本店、芒果冰，台北美食一條街" },
  ],
  hongkong: [
    { name: "維多利亞港夜景", category: "景點", note: "全球三大夜景之一，天際線光影無與倫比" },
    { name: "廟街夜市", category: "夜生活", note: "香港最具特色露天夜市，算命、海鮮、老歌" },
    { name: "赤柱市集", category: "購物", note: "殖民地建築海濱市集，手工藝品與異國餐廳" },
    { name: "旺角女人街", category: "購物", note: "平價服飾、手信聖地，感受香港市井文化" },
    { name: "大澳漁村", category: "文化", note: "香港威尼斯，棚屋水鄉，傳統蝦醬飄香" },
    { name: "天星小輪", category: "景點", note: "維港兩岸穿梭百年渡輪，最平最美海上遊" },
    { name: "蘭桂坊", category: "夜生活", note: "香港派對中心，國際酒吧與餐廳密集" },
    { name: "龍脊山徑", category: "自然", note: "全球最佳城市郊遊步道之一，俯瞰南中國海" },
    { name: "上環荷李活道", category: "文化", note: "古玩文物街，PMQ元創方，藝術創意薈萃" },
    { name: "薄扶林農場", category: "自然", note: "百年歷史農場，隱世牛棚、城市綠洲" },
  ],
  singapore: [
    { name: "濱海灣花園", category: "自然", note: "超級樹夜間燈光秀、室內花穹，未來感十足" },
    { name: "牛車水", category: "文化", note: "新加坡唐人街，廟宇、老店、美食交融" },
    { name: "小印度", category: "文化", note: "七彩繽紛廟宇與街道，香料市場飄香" },
    { name: "克拉碼頭", category: "夜生活", note: "河畔餐廳酒吧密集，夜晚燈火通明最熱鬧" },
    { name: "聖淘沙島", category: "景點", note: "環球影城、海灘、賭場一島盡覽" },
    { name: "哈芝巷", category: "購物", note: "馬來回教區塗鴉牆，文青咖啡館與手工藝品" },
  ],
  bangkok: [
    { name: "臥佛寺", category: "文化", note: "泰國最古老寺廟，46米長金身臥佛震撼" },
    { name: "恰圖恰週末市集", category: "購物", note: "全球最大週末市集，手工藝品和二手貨天堂" },
    { name: "考山路", category: "夜生活", note: "背包客聖地，街頭小食、酒吧、按摩" },
    { name: "鄭王廟", category: "文化", note: "夜晚燈光絕美，河對岸望過去更漂亮" },
    { name: "Asiatique夜市", category: "夜生活", note: "河畔摩天輪，露天商場結合夜市" },
    { name: "Or Tor Kor市場", category: "美食", note: "曼谷最優質生鮮市場，泰式甜品必試" },
  ],
};

// Keyword matching — maps keywords to destination key
const KEYWORD_MAP: Record<string, string> = {
  osaka: "osaka", "大阪": "osaka", "なんば": "osaka", "梅田": "osaka",
  tokyo: "tokyo", "東京": "tokyo", "新宿": "tokyo", "渋谷": "tokyo", "澀谷": "tokyo",
  kyoto: "kyoto", "京都": "kyoto", "嵐山": "kyoto", "祇園": "kyoto",
  hokkaido: "hokkaido", "北海道": "hokkaido", "札幌": "hokkaido", "函館": "hokkaido",
  taipei: "taipei", "台北": "taipei", "台灣": "taipei", "taiwan": "taipei",
  hongkong: "hongkong", "香港": "hongkong", "hk": "hongkong",
  singapore: "singapore", "新加坡": "singapore", "sg": "singapore",
  bangkok: "bangkok", "曼谷": "bangkok", "泰國": "bangkok", "thailand": "bangkok",
};

function detectDestination(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [keyword, dest] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword.toLowerCase())) return dest;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { destination } = await req.json();
    const destKey = detectDestination(destination);

    if (!destKey || !DESTINATION_DB[destKey]) {
      return NextResponse.json({
        suggestions: [],
        error: `未收錄「${destination}」的景點資料。請手動搜尋新增，或聯絡開發者加入此目的地。`
      }, { status: 404 });
    }

    const pool = DESTINATION_DB[destKey];
    // Pick 3 random suggestions from pool to vary results
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const suggestions = shuffled.slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch (e: any) {
    return NextResponse.json({ suggestions: [], error: e?.message || "Unknown error" }, { status: 500 });
  }
}
