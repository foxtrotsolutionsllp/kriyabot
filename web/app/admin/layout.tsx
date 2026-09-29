import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import Link from "next/link";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const token = (await cookies()).get("taskflow_session")?.value;
  if (!token) redirect("/login");
  const response = await fetch(`${process.env.API_SERVER_URL ?? "http://localhost:8000/api/v1"}/me`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) redirect("/login");
  const user = await response.json();
  if (!user.role_assignments?.some((assignment: { role?: { name?: string } }) => assignment.role?.name === "super_admin")) redirect("/app");
  return <div className="app-shell admin"><aside className="sidebar"><Link className="admin-brand" href="/app"><img src="/kriyabot-logo.png" alt="Kriyabot" /><small>SUPER ADMIN</small></Link><div className="admin-nav-label">ACCESS CONTROL</div><nav className="admin-nav"><Link href="/admin" className="admin-nav-active"><span>♧</span><span>Users<small>Registration approvals</small></span><i>›</i></Link></nav><Link className="admin-back-link" href="/app"><span>←</span><span>Back to Kriyabot<small>View the workspace screens</small></span></Link><div className="admin-sidebar-note"><b>Protected area</b><small>Only Super Admins can review or approve new users.</small></div></aside><main className="main"><div className="topbar"><span>Super Admin workspace</span><AccountMenu name={user.name} email={user.email} avatar={user.preferences?.avatar}/></div>{children}</main></div>;
}
