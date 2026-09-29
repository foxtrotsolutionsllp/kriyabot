"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Project = { id: number; name: string; description?: string | null; status: string; tasks_count?: number; due_date?: string | null; start_date?: string | null; creator?: { id: number; name: string } | null; can_manage?: boolean };
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : "No deadline";
const dateValue = (value?: string | null) => value ? value.slice(0, 10) : "";
const accents = ["lavender", "blue", "peach", "mint"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<Project | null>(null);
  const load = useCallback(async () => { try { const response = await fetch("/api/backend/projects", { cache: "no-store" }); const data = await response.json(); if (!response.ok) { setError(data.message ?? "Unable to load projects."); return; } setProjects(data.data ?? []); setError(""); } catch { setError("We couldn’t connect to your workspace. Check that the API is running."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  function beginEdit(project: Project) { setEditing(project); setFormOpen(true); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function closeForm() { setFormOpen(false); setEditing(null); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setBusy(true); setError("");
    try {
      const body: Record<string, unknown> = { name: form.get("name"), description: form.get("description"), start_date: form.get("start_date") || null, due_date: form.get("due_date") || null };
      if (editing) body.status = form.get("status");
      const response = await fetch(editing ? `/api/backend/projects/${editing.id}` : "/api/backend/projects", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.message ?? "Unable to save this project."); return; }
      closeForm(); await load();
    } catch { setError("We couldn’t connect to your workspace. Try again."); } finally { setBusy(false); }
  }

  async function moveToTrash(project: Project) {
    if (!window.confirm(`Move “${project.name}” and its tasks to Trash? You can restore them for 10 days.`)) return;
    try { const response = await fetch(`/api/backend/projects/${project.id}`, { method: "DELETE" }); const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.message ?? "Unable to move this project to Trash."); return; } await load(); }
    catch { setError("We couldn’t move this project to Trash. Try again."); }
  }

  return <section className="work-page">
    <div className="work-page-heading"><div><p className="eyebrow">PLAN TOGETHER</p><h1>Projects</h1><p className="work-page-subtitle">Bring related tasks into one focused space.</p></div><button className="button-primary" onClick={() => { if (formOpen && !editing) closeForm(); else { setEditing(null); setFormOpen(true); } }}>{formOpen && !editing ? "Close form" : "＋ Create project"}</button></div>
    {formOpen && <form key={editing?.id ?? "new-project"} className="create-panel" onSubmit={save}><div className="create-panel-heading"><span className="create-icon">✦</span><div><strong>{editing ? "Edit project" : "Start a new project"}</strong><small>{editing ? "Update the details and timing for this project." : "Give your team a shared place to move work forward."}</small></div></div><div className="form-grid"><label className="form-field form-field-wide"><span>Project name <i>Required</i></span><input name="name" placeholder="e.g. Website refresh" required maxLength={180} defaultValue={editing?.name ?? ""}/></label><label className="form-field form-field-wide"><span>Description <i>Optional</i></span><textarea name="description" placeholder="What are you working toward?" rows={3} defaultValue={editing?.description ?? ""}/></label><label className="form-field"><span>Start date <i>Optional</i></span><input name="start_date" type="date" defaultValue={dateValue(editing?.start_date)}/></label><label className="form-field"><span>Target date <i>Optional</i></span><input name="due_date" type="date" defaultValue={dateValue(editing?.due_date)}/></label>{editing && <label className="form-field"><span>Project status</span><select name="status" defaultValue={editing.status}><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>}</div><div className="form-actions"><span>Dates are optional. Projects can stay open-ended.</span><div className="form-action-buttons"><button className="button-secondary" type="button" onClick={closeForm}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create project"}</button></div></div></form>}
    {error && <div className="work-alert" role="alert">{error}</div>}
    <div className="collection-toolbar"><div><strong>{loading ? "Your projects" : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}</strong><span>Keep goals, tasks, and progress connected.</span></div><span className="collection-view-label"><span className="view-grid-icon">▦</span> Cards</span></div>
    {loading ? <div className="project-grid">{[0, 1, 2].map(item => <div className="project-skeleton" key={item}/>)}</div> : projects.length ? <div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project.id}><Link href={`/app/projects/${project.id}`} className="project-card-main"><div className={`project-card-art art-${accents[index % accents.length]}`}><span className="project-monogram">{project.name.slice(0, 1).toUpperCase()}</span><span className={`project-status status-${project.status}`}><span/>{project.status.replaceAll("_", " ")}</span><span className="project-decor decor-one"/><span className="project-decor decor-two"/></div><div className="project-card-body"><div className="project-card-title"><h2>{project.name}</h2><span className="project-open-arrow">↗</span></div><p className="project-card-description">{project.description || "A shared space for this project’s work and progress."}</p><div className="project-card-meta"><span className="project-task-count"><span>☷</span>{project.tasks_count ?? 0} tasks</span><span className="project-deadline">◷ {project.due_date ? `Due ${dateLabel(project.due_date)}` : "No deadline"}</span></div></div></Link><div className="project-card-footer"><span className="project-footer-avatar">{(project.creator?.name ?? project.name).slice(0, 1).toUpperCase()}</span><span className="project-creator-name">{project.creator?.name ?? "Workspace project"}</span>{project.can_manage && <><button type="button" className="project-card-action" onClick={() => beginEdit(project)}>Edit</button><button type="button" className="project-card-action project-card-delete" onClick={() => void moveToTrash(project)}>Delete</button></>}</div></article>)}</div> : <div className="work-empty"><div className="empty-symbol">▧</div><h2>Your first project starts here</h2><p>Give a goal its own space. Add a few details now, then bring its tasks together as you go.</p><button className="button-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>＋ Create your first project</button></div>}
  </section>;
}
