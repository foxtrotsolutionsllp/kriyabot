import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!["register", "forgot-password", "reset-password"].includes(action)) return NextResponse.json({ message: "Not found." }, { status: 404 });
  const body = await request.json();
  const upstream = await fetch(`${process.env.API_SERVER_URL ?? "http://127.0.0.1:8000/api/v1"}/${action}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  return NextResponse.json(await upstream.json(), { status: upstream.status });
}
