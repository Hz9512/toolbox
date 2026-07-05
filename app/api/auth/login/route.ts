import { NextResponse } from "next/server";

import { loginUser } from "@/lib/server/user-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await loginUser(body.name ?? "", body.password ?? "");
    return NextResponse.json(result, { status: result.ok ? 200 : 401 });
  } catch {
    return NextResponse.json({ ok: false, message: "登录失败，请稍后重试。" }, { status: 500 });
  }
}
