import { NextResponse } from "next/server";

import { registerUser } from "@/lib/server/user-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerUser(body.name ?? "", body.password ?? "", body.preferences);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false, message: "注册失败，请稍后重试。" }, { status: 500 });
  }
}
