import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const upstream = await fetch(`${process.env.API_SERVER_URL ?? "http://127.0.0.1:8000/api/v1"}/login`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...body, device_name: "Kriyabot browser" }), cache: "no-store" });
  const data = await upstream.json();
  if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });
  const response = NextResponse.json({ is_admin: data.user?.roles?.includes("super_admin") ?? false });
  response.cookies.set("taskflow_session", data.token, { httpOnly: true, secure: process.env.TASKFLOW_COOKIE_SECURE === "true", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
