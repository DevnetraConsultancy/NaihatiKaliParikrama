import { NextResponse } from "next/server";
import {
  adminConfigured,
  adminCookieHeader,
  isSameOrigin,
  issueToken,
  passwordMatches,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Unlocks the /admin pandal editor with the ADMIN_PASSWORD. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden-origin" }, { status: 403 });
  }
  if (!adminConfigured()) {
    return NextResponse.json({ error: "admin-not-configured" }, { status: 503 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "invalid-password" }, { status: 401 });
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "set-cookie": adminCookieHeader(issueToken()) } },
  );
}
