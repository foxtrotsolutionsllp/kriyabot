import { NextRequest } from "next/server";
import { adminRequest } from "@/lib/admin-api";

export async function GET(request: NextRequest) {
  return adminRequest(request, "/admin/registrations");
}
