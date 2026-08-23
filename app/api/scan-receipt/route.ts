import { NextRequest, NextResponse } from "next/server";

/**
 * 收據掃描 —— Gemini 視覺模型。
 *
 * 為何一定要放喺 server route：
 * NEXT_PUBLIC_GOOGLE_MAPS_KEY 放喺瀏覽器係安全嘅，因為佢有 HTTP referrer 限制擋住。
 * Gemini key 冇呢種保護，一旦流出去就有人可以用你條 key 跑嘢。
 * 所以呢條 key 唔可以有 NEXT_PUBLIC_ 前綴，亦唔可以喺 client 出現。
 *
 * 設定：
 *   1. https://aistudio.google.com 開一條 API key
 *   2. .env.local 加 GEMINI_API_KEY=...
 *   3. Vercel → Settings → Environment Variables 加同一條，然後 redeploy
 */

/**
 * 候選 model，由平至貴逐個試。
 *
 * 為何要一個清單而不是寫死一個：Google 的 model ID 會汰換，
 * 舊的一停供應就直接回 404，而 404 訊息本身不會告訴你該改用哪一個。
 * 逐個試一次，型號更替時就不會整個功能斷掉。
 * 想指定某一個，在環境變數設 GEMINI_MODEL 即可。
 */
const MODEL_CANDIDATES = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : [
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash-lite",
      "gemini-3.7-flash",
    ];

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** 對應 store 入面嘅 ExpenseCategory */
const CATEGORIES = ["Food", "Transport", "Accommodation", "Sightseeing", "Shopping", "Other"] as const;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    merchant: { type: "STRING", description: "店舖名稱，用收據上的原文" },
    date: { type: "STRING", description: "交易日期，格式 YYYY-MM-DD；讀不到則留空字串" },
    total: { type: "NUMBER", description: "實際支付的總額，取『合計』而非『お預り』或『お釣り』" },
    currency: { type: "STRING", description: "ISO 4217 代碼，例如 JPY、HKD、GBP" },
    category: { type: "STRING", enum: [...CATEGORIES] },
    confidence: { type: "NUMBER", description: "0 至 1，對讀取結果的信心" },
    note: { type: "STRING", description: "主要品項，最多 40 字；沒有則留空字串" },
  },
  required: ["merchant", "date", "total", "currency", "category", "confidence"],
};

const PROMPT = `你是一個收據辨識器。讀圖中的收據，只輸出符合 schema 的 JSON。

規則：
- 金額取「合計」/「お会計」/「TOTAL」這一項。切勿取「お預り」（客人給出的現金）或「お釣り」（找續），那是最常見的錯誤。
- 金額為含稅總額（税込）。若同時列出税抜與税込，取税込。
- 日圓、韓圜、越南盾沒有小數位，直接輸出整數，不要除以 100。
- 日本收據常用和曆：R8 或 令和8年 = 2026 年，H31 = 2019 年。請換算成西曆。
- 日期讀不到就輸出空字串，不要猜。
- 幣別看收據上的符號與語言判斷；日文收據沒有特別標示的話就是 JPY。
- category 依店舖性質判斷：便利店 / 餐廳 / 超市買食物 = Food；車票 / 的士 / 加油 = Transport；
  酒店 = Accommodation；門票 / 景點 = Sightseeing；藥妝 / 服飾 / 電器 / 手信 = Shopping；其餘 Other。
- 圖片模糊、不是收據、或讀不出總額時，confidence give 0 並把 total 設為 0。`;

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "伺服器未設定 GEMINI_API_KEY" },
      { status: 500 }
    );
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { imageBase64, mimeType } = body;
  if (!imageBase64) {
    return NextResponse.json({ error: "缺少圖片" }, { status: 400 });
  }
  // base64 大約比原檔大 1/3；限 6MB base64 ≈ 4.5MB 原圖
  if (imageBase64.length > 6_000_000) {
    return NextResponse.json({ error: "圖片太大，請重試" }, { status: 413 });
  }

  const payload = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  try {
    let res: Response | null = null;
    let lastStatus = 0;
    let lastDetail = "";
    let usedModel = "";

    for (const model of MODEL_CANDIDATES) {
      const r = await fetch(`${ENDPOINT(model)}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (r.ok) { res = r; usedModel = model; break; }

      lastStatus = r.status;
      lastDetail = await r.text();
      // 404 = 這個型號不存在／未提供，換下一個再試。
      // 其他錯誤（401 key 無效、403 API 未啟用、429 超額）換型號都冇用，直接報出去。
      if (r.status !== 404) break;
    }

    if (!res) {
      // 把 Google 原本的訊息一併帶返前端 —— 裡面沒有 key，
      // 但有真正的原因（型號不存在／API 未啟用／key 無效），
      // 否則你只會見到一個沒有線索的「404」。
      let reason = "";
      try { reason = JSON.parse(lastDetail)?.error?.message ?? ""; } catch { reason = lastDetail.slice(0, 200); }
      console.error("Gemini error", lastStatus, lastDetail.slice(0, 400));
      return NextResponse.json(
        {
          error: `辨識服務回應 ${lastStatus}`,
          detail: reason,
          triedModels: MODEL_CANDIDATES,
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "辨識不到內容，請重影一張" }, { status: 422 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "辨識結果格式異常" }, { status: 502 });
    }

    // 收窄成可信的形狀再交畀前端
    const total = Number(parsed.total);
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Other";

    return NextResponse.json({
      merchant: String(parsed.merchant ?? "").slice(0, 80),
      date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date ?? "") ? parsed.date : "",
      total: Number.isFinite(total) && total > 0 ? total : 0,
      currency: /^[A-Z]{3}$/.test(parsed.currency ?? "") ? parsed.currency : "JPY",
      category,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      note: String(parsed.note ?? "").slice(0, 60),
    });
  } catch (e: any) {
    console.error("scan-receipt failed", e);
    return NextResponse.json({ error: "辨識失敗，請重試" }, { status: 500 });
  }
}
