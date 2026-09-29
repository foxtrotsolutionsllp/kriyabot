import { NextRequest, NextResponse } from "next/server";

const api = () => process.env.API_SERVER_URL ?? "http://127.0.0.1:8000/api/v1";

export async function adminRequest(request: NextRequest, path: string, init: RequestInit = {}) {
  const token = request.cookies.get("taskflow_session")?.value;
  if (!token) return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", ...(init.headers ?? {}) };
  const identity = await fetch(`${api()}/me`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  if (!identity.ok) return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  const user = await identity.json();
  if (!user.role_assignments?.some((assignment: { role?: { name?: string } }) => assignment.role?.name === "super_admin")) return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  const upstream = await fetch(`${api()}${path}`, { ...init, headers, cache: "no-store" });
  const data = upstream.status === 204 ? null : await upstream.json();
  return data === null ? new NextResponse(null, { status: upstream.status }) : NextResponse.json(data, { status: upstream.status });
}
