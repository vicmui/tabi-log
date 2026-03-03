import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [], error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { destination, tripDays } = await req.json();

    const prompt = `Travel expert. User going to "${destination}" for ${tripDays} days.
Return ONLY a JSON array of exactly 3 must-visit places. No other text, no markdown, no explanation.
Format: [{"name":"place name","category":"category","note":"one line Chinese description"}]
category must be one of: 美食、景點、購物、自然、文化、夜生活
Use the local language for place names.`;

    // Use gemini-2.0-flash-lite — stable, free tier, no thinking overhead
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 512,
          responseMimeType: "application/json",  // force JSON output
        },
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

    // Clean and parse
    const clean = text.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(clean);
      const suggestions = Array.isArray(parsed) ? parsed : (parsed.places || parsed.suggestions || []);
      if (suggestions.length > 0) return NextResponse.json({ suggestions });
    } catch (_e) {}

    // Fallback: extract array from anywhere in text
    const match = clean.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const suggestions = JSON.parse(match[0]);
        if (Array.isArray(suggestions) && suggestions.length > 0) return NextResponse.json({ suggestions });
      } catch (_e) {}
    }

    return NextResponse.json({ suggestions: [], error: "Parse failed. Raw: " + text.slice(0, 200) }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ suggestions: [], error: e?.message || "Unknown error" }, { status: 500 });
  }
}
