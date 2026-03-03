import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [], error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { destination, tripDays } = await req.json();

    const prompt = `你係一個旅遊專家。用戶將去「${destination}」旅遊 ${tripDays} 日。
請推薦12個必去景點，要多元化覆蓋唔同類別。
只返回 JSON array，唔好有任何其他文字、解釋或 markdown：
[{"name":"景點名稱","category":"類別","note":"一句話中文介紹"}]
category 只能係以下之一：美食、景點、購物、自然、文化、夜生活`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || "Gemini API error";
      return NextResponse.json({ suggestions: [], error: errMsg }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      return NextResponse.json({ suggestions: [], error: "Empty response from Gemini" }, { status: 500 });
    }

    const clean = text.replace(/```json|```/g, "").trim();

    // Try parse directly first, then extract array
    try {
      const suggestions = JSON.parse(clean);
      if (Array.isArray(suggestions)) return NextResponse.json({ suggestions });
    } catch (_e) {}

    const match = clean.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const suggestions = JSON.parse(match[0]);
        if (Array.isArray(suggestions)) return NextResponse.json({ suggestions });
      } catch (_e) {}
    }

    return NextResponse.json({ suggestions: [], error: "Could not parse Gemini response" }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ suggestions: [], error: e?.message || "Unknown error" }, { status: 500 });
  }
}
