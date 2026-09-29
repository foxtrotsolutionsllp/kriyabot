"use client";

import { useCallback, useEffect, useState } from "react";

type TrashItem = { id: number; name?: string; title?: string; description?: string | null; project?: { name: string } | null; kind: "project" | "task"; trashed_at: string; expires_at: string; creator?: { name: string } | null };
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "";
const daysLeft = (value: string) => Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));

export default function TrashPage() {
  const [projects, setProjects] = useState<TrashItem[]>([]); const [tasks, setTasks] = useState<TrashItem[]>([]); const [retentionDays, setRetentionDays] = useState(10); const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState<string | null>(null); const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const response = await fetch("/api/backend/trash", { cache: "no-store" }); const data = await response.json(); if (!response.ok) { setError(data.message ?? "Unable to load Trash."); return; } setProjects(data.projects ?? []); setTasks(data.tasks ?? []); setRetentionDays(data.retention_days ?? 10); setError(""); }
    catch { setError("We couldn’t connect to your workspace. Check that the API is running."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function restore(item: TrashItem) {
    setBusyId(`${item.kind}-${item.id}`); setError("");
    try { const response = await fetch(`/api/backend/trash/${item.kind}s/${item.id}/restore`, { method: "POST" }); const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.message ?? "Unable to restore this item."); return; } await load(); }
    catch { setError("We couldn’t restore this item. Try again."); }
    finally { setBusyId(null); }
  }

  async function permanentlyDelete(item: TrashItem) {
    const title = item.name ?? item.title ?? "this item";
    const warning = item.kind === "project" ? `Permanently delete “${title}”, its tasks, and their files? This cannot be undone.` : `Permanently delete “${title}” and its attached files? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    setBusyId(`${item.kind}-${item.id}`); setError("");
    try { const response = await fetch(`/api/backend/trash/${item.kind}s/${item.id}`, { method: "DELETE" }); const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.message ?? "Unable to permanently delete this item."); return; } await load(); }
    catch { setError("We couldn’t permanently delete this item. Try again."); }
    finally { setBusyId(null); }
  }

  const items = [...projects, ...tasks].sort((a, b) => new Date(b.trashed_at).getTime() - new Date(a.trashed_at).getTime());
  return <section className="work-page">
    <div className="work-page-heading"><div><p className="eyebrow">RECOVERY & RETENTION</p><h1>Trash</h1><p className="work-page-subtitle">Restore something you still need, or remove it permanently.</p></div><span className="retention-pill">↻ Kept for {retentionDays} days</span></div>
    <div className="trash-explainer"><span>i</span><p>Deleted projects and tasks stay here for {retentionDays} days. Restore them any time during that window. Items are then permanently removed automatically.</p></div>
    {error && <div className="work-alert" role="alert">{error}</div>}
    {loading ? <div className="trash-list">{[0, 1].map(index => <div className="trash-skeleton" key={index}/>)}</div> : items.length ? <div className="trash-list">{items.map(item => { const key = `${item.kind}-${item.id}`; const title = item.name ?? item.title ?? "Untitled"; const remaining = daysLeft(item.expires_at); return <article className="trash-card" key={key}><span className={`trash-type-icon trash-${item.kind}`}>{item.kind === "project" ? "▧" : "☷"}</span><div className="trash-item-main"><div className="trash-item-heading"><h2>{title}</h2><span className="trash-kind-label">{item.kind}</span></div><p>{item.kind === "project" ? `${item.description || "Project space"} · ${item.creator?.name ?? "Workspace"}` : `${item.project?.name ?? "Personal task"} · ${item.description || "Task"}`}</p><small>Deleted {dateLabel(item.trashed_at)} · {remaining ? `${remaining} ${remaining === 1 ? "day" : "days"} left` : "Restore period ends today"}</small></div><div className="trash-actions"><button className="button-secondary" disabled={busyId === key || remaining === 0} onClick={() => void restore(item)}>{busyId === key ? "Working…" : "Restore"}</button><button className="trash-permanent-button" disabled={busyId === key} onClick={() => void permanentlyDelete(item)}>Delete forever</button></div></article>; })}</div> : <div className="work-empty"><div className="empty-symbol">✓</div><h2>Your Trash is empty</h2><p>When you delete a project or task, it will stay here for {retentionDays} days so you can restore it.</p></div>}
  </section>;
}
