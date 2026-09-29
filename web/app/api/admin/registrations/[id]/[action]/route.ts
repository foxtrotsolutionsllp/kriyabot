import { NextRequest } from "next/server";
import { adminRequest } from "@/lib/admin-api";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await context.params;
  if (!/^\d+$/.test(id) || !["approve", "reject"].includes(action)) return Response.json({ message: "Not found." }, { status: 404 });
  const body = action === "reject" ? await request.json().catch(() => ({})) : {};
  return adminRequest(request, `/admin/registrations/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
