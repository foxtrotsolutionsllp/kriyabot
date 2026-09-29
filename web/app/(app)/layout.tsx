import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TaskFlowShell } from "@/components/TaskFlowShell";

export default async function MemberLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const token = (await cookies()).get("taskflow_session")?.value;
  if (!token) redirect("/login");
  const response = await fetch(`${process.env.API_SERVER_URL ?? "http://localhost:8000/api/v1"}/me`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) redirect("/login");
  const user = await response.json();
  return <TaskFlowShell user={user}>{children}</TaskFlowShell>;
}
