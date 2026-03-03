import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { destination, tripDays } = await req.json();

    const prompt = `你係一個旅遊專家。用戶將去「${destination}」旅遊 ${tripDays} 日。
請推薦12個必去景點，要多元化覆蓋唔同類別。
只返回 JSON array，唔好有任何其他文字、解釋或 markdown：
[{"name":"景點名稱","category":"類別","note":"一句話中文介紹"}]
category 只能係以下之一：美食、景點、購物、自然、文化、夜生活`;

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
      return NextResponse.json({ suggestions: [] }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    try {
      const suggestions = JSON.parse(clean);
      return NextResponse.json({ suggestions });
    } catch (_e) {
      const match = clean.match(/\[[\s\S]*\]/);
      if (match) {
        const suggestions = JSON.parse(match[0]);
        return NextResponse.json({ suggestions });
      }
      return NextResponse.json({ suggestions: [] });
    }
  } catch (_e) {
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
