import { NextRequest, NextResponse } from "next/server";

// Try these models in order until one works
const MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-exp-1206",
  "gemini-2.0-pro-exp",
  "gemini-1.5-pro",
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [], error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { destination, tripDays } = await req.json();

  const prompt = `You are a travel expert. User is going to "${destination}" for ${tripDays} days.
Return ONLY a JSON array of 3 must-visit places. No markdown, no explanation, just the array.
[{"name":"place name in local language","category":"one of: 美食 景點 購物 自然 文化 夜生活","note":"one sentence Chinese description"}]`;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
        }),
      });

      const data = await response.json();
      if (!response.ok) continue; // try next model

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) continue;

      const clean = text.replace(/```json|```/g, "").trim();

      // Try direct parse
      try {
        const parsed = JSON.parse(clean);
        const arr = Array.isArray(parsed) ? parsed : (parsed.places || parsed.suggestions || []);
        if (arr.length > 0) return NextResponse.json({ suggestions: arr, model });
      } catch (_e) {}

      // Extract array from text
      const match = clean.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          const arr = JSON.parse(match[0]);
          if (Array.isArray(arr) && arr.length > 0) return NextResponse.json({ suggestions: arr, model });
        } catch (_e) {}
      }
    } catch (_e) {
      continue; // try next model
    }
  }

  // All models failed — return a helpful error
  return NextResponse.json({
    suggestions: [],
    error: "All Gemini models unavailable. Please check your API key at aistudio.google.com/apikey"
  }, { status: 500 });
}
