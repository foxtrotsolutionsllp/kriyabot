"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Applicant = { id: number; name: string; email: string; created_at: string; workspace?: { id: number; name: string } };
type WorkspaceOption = { id: number; name: string };
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export default function AdminHome() {
  const [items, setItems] = useState<Applicant[]>([]); const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]); const [targets, setTargets] = useState<Record<number, string>>({}); const [search, setSearch] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState<number | null>(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch("/api/admin/registrations", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Could not load registration requests."); setItems(data.registrations?.data ?? []); setWorkspaces(data.workspaces ?? []); setError(""); } catch (exception) { setError(exception instanceof Error ? exception.message : "Could not load registration requests."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => items.filter(item => `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  async function decide(id: number, action: "approve" | "reject") {
    if (action === "reject" && !window.confirm("Decline this registration request?")) return;
    setBusy(id); setError("");
    try { const target = targets[id]; const response = await fetch(`/api/admin/registrations/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: action === "reject" ? JSON.stringify({ reason: "Registration declined by Super Admin." }) : JSON.stringify(target ? { workspace_id: Number(target) } : {}) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message ?? "Could not update this request."); await load(); }
    catch (exception) { setError(exception instanceof Error ? exception.message : "Could not update this request."); }
    finally { setBusy(null); }
  }

  return <section className="admin-users-page">
    <div className="admin-users-heading"><div><div className="admin-overline"><span/>SUPER ADMIN · ACCESS CONTROL</div><h1>Users</h1><p>Review registration requests and decide who can join Kriyabot.</p></div><div className="admin-pending-total"><span className="admin-pending-icon">♧</span><span><b>{loading ? "—" : items.length}</b><small>Pending requests</small></span></div></div>
    <div className="admin-policy-note"><span>✦</span><p><b>Approval is restricted to Super Admins.</b> Applicants must verify their email before they appear in this queue. Approving grants access to their selected workspace.</p></div>
    {error && <div className="admin-alert" role="alert">{error}</div>}
    <div className="admin-requests-card"><div className="admin-requests-toolbar"><div><h2>Registration requests</h2><p>{items.length ? `${items.length} verified ${items.length === 1 ? "applicant is" : "applicants are"} waiting for review` : "The latest verified sign-ups will appear here"}</p></div><label className="admin-search"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search registration requests"/></label></div>
      <div className="admin-table-wrap"><table className="admin-users-table"><thead><tr><th>APPLICANT</th><th>REGISTERED</th><th>WORKSPACE ACCESS</th><th>EMAIL</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>
        {loading ? [1, 2, 3].map(row => <tr className="admin-loading-row" key={row}><td colSpan={5}><span/><span/></td></tr>) : visible.map(item => <tr key={item.id}><td><div className="admin-applicant"><span className="admin-applicant-avatar">{initials(item.name)}</span><span><b>{item.name}</b><small>Registration #{item.id}</small></span></div></td><td><span className="admin-date">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.created_at))}</span></td><td><label className="admin-workspace-select"><span className="visually-hidden">Workspace for {item.name}</span><select value={targets[item.id] ?? ""} onChange={event => setTargets(current => ({ ...current, [item.id]: event.target.value }))}><option value="">Keep {item.workspace?.name ?? "personal workspace"}</option>{workspaces.filter(workspace => workspace.id !== item.workspace?.id).map(workspace => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select></label></td><td><span className="admin-email-verified"><i/>Verified</span></td><td><div className="admin-review-actions"><button className="admin-decline" disabled={busy === item.id} onClick={() => void decide(item.id, "reject")}>Decline</button><button className="admin-approve" disabled={busy === item.id} onClick={() => void decide(item.id, "approve")}>{busy === item.id ? "Saving…" : "Approve"}<span>→</span></button></div></td></tr>)}
      </tbody></table></div>
      {!loading && !visible.length && <div className="admin-empty"><span>✓</span><b>{items.length ? "No matching requests" : "You’re all caught up"}</b><small>{items.length ? "Try a different name or email." : "There are no verified registration requests waiting for approval."}</small></div>}
      <footer className="admin-requests-footer"><span><i/> Secure approval queue</span><small>Only verified, pending registrations are shown here.</small></footer>
    </div>
  </section>;
}
