import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 防止 Supabase 免費版自動暫停。
 *
 * 免費版專案閒置 7 日便會被暫停，暫停期間所有相片、資料都讀不到 ——
 * 這個 app 之前就試過一次，封面全部變成破圖。旅途中天天在用不成問題，
 * 但旅程一結束、用量回落，就很容易踩中。
 *
 * vercel.json 設定每日呼叫這裡一次，向資料庫發一條最輕的查詢，
 * 對 Supabase 而言就是「有活動」，計時器便重新開始。
 *
 * 只做 HEAD + count，不取任何資料：即使匿名身分被 RLS 擋下、回傳 0 筆，
 * 查詢本身依然在資料庫執行過，已足以算作活動。
 */

// 每次都要真正執行，不可被 Next.js 快取成靜態回應 —— 否則等於沒有呼叫過資料庫
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 若在 Vercel 設定了 CRON_SECRET，只接受 Vercel Cron 帶來的請求；
  // 未設定則照常執行（這條路徑本身不會洩露任何資料）。
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "missing supabase env" }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const startedAt = Date.now();
  const { error } = await supabase.from("trips").select("id", { count: "exact", head: true });

  if (error) {
    console.error("keepalive failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    ms: Date.now() - startedAt,
  });
}
