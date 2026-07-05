import { NextResponse } from "next/server";

import { updateUserPreferences } from "@/lib/server/user-db";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const sessionToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!sessionToken) {
    return NextResponse.json({ ok: false, message: "请先登录。" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await updateUserPreferences(sessionToken, body.preferences ?? {});
    return NextResponse.json(result, { status: result.ok ? 200 : 401 });
  } catch {
    return NextResponse.json({ ok: false, message: "配置保存失败，请稍后重试。" }, { status: 500 });
  }
}
