import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/admin";

// A Vercel chama esta rota uma vez por dia (vercel.json) com Authorization: Bearer CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Não autorizado", { status: 401 });
  }
  const { data, error } = await db().rpc("expire_pending");
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, expiradas: data });
}
