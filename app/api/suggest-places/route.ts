import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [], error: "ANTHROPIC_API_KEY not configured in Vercel" }, { status: 500 });
  }

  try {
    const { destination, tripDays } = await req.json();

    const prompt = `You are a travel expert. User is visiting "${destination}" for ${tripDays} days.
Return ONLY a JSON array of exactly 3 must-visit places. No markdown, no explanation, just the raw JSON array.
Use local language for place names. Example format:
[{"name":"道頓堀","category":"景點","note":"大阪最著名的霓虹燈美食街"},{"name":"黑門市場","category":"美食","note":"新鮮海鮮和日本小食的天堂"},{"name":"心齋橋筋","category":"購物","note":"大阪最熱鬧的購物步行街"}]
category must be one of: 美食 景點 購物 自然 文化 夜生活`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ suggestions: [], error: data?.error?.message || "API error" }, { status: 500 });
    }

    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      const arr = Array.isArray(parsed) ? parsed : [];
      if (arr.length > 0) return NextResponse.json({ suggestions: arr });
    } catch (_e) {}

    const match = clean.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr) && arr.length > 0) return NextResponse.json({ suggestions: arr });
      } catch (_e) {}
    }

    return NextResponse.json({ suggestions: [], error: "Could not parse response" }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ suggestions: [], error: e?.message || "Unknown error" }, { status: 500 });
  }
}
