import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("taskflow_session")?.value;
  if (token) await fetch(`${process.env.API_SERVER_URL ?? "http://127.0.0.1:8000/api/v1"}/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("taskflow_session", "", { httpOnly: true, secure: process.env.TASKFLOW_COOKIE_SECURE === "true", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
