"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Member = { id: number; name: string };
type Project = { id: number; name: string; description?: string | null; status: string; start_date?: string | null; due_date?: string | null };
type Task = { id: number; title: string; description?: string | null; status: string; priority: string; start_at?: string | null; due_at?: string | null; assignees?: Member[] };
const states = ["open", "in_progress", "blocked", "done", "cancelled"];
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "No deadline";
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignees, setAssignees] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [projectResponse, taskResponse, memberResponse] = await Promise.all([fetch(`/api/backend/projects/${id}`, { cache: "no-store" }), fetch(`/api/backend/tasks?project_id=${id}`, { cache: "no-store" }), fetch("/api/backend/workspace/members", { cache: "no-store" })]);
      const [projectData, taskData, memberData] = await Promise.all([projectResponse.json(), taskResponse.json(), memberResponse.json()]);
      if (!projectResponse.ok || !taskResponse.ok || !memberResponse.ok) { setError(projectData.message ?? taskData.message ?? memberData.message ?? "Unable to load this project."); return; }
      setProject(projectData); setTasks(taskData.data ?? []); setMembers(memberData); setError("");
    } catch { setError("We couldn’t connect to your workspace. Check that the API is running."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/backend/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: Number(id), title: form.get("title"), description: form.get("description"), priority: form.get("priority"), start_at: form.get("start_at") || null, due_at: form.get("due_at") || null, assignee_ids: assignees }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.message ?? "Unable to create task."); return; }
      formElement.reset(); setAssignees([]); setFormOpen(false); await load();
    } catch { setError("We couldn’t connect to your workspace. Try again."); }
    finally { setBusy(false); }
  }

  async function setStatus(taskId: number, status: string) {
    try {
      const response = await fetch(`/api/backend/tasks/${taskId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.message ?? "Unable to update task."); return; }
      await load();
    } catch { setError("We couldn’t update this task. Try again."); }
  }

  const completedCount = tasks.filter(task => task.status === "done").length;
  if (loading && !project) return <section className="work-page"><div className="project-detail-skeleton"/></section>;
  if (!project) return <section className="work-page"><Link className="back-link" href="/app/projects">← All projects</Link><div className="work-empty"><h2>Project unavailable</h2><p>{error || "This project may have been removed or you may not have access."}</p><Link className="button-secondary" href="/app/projects">Back to projects</Link></div></section>;

  return <section className="work-page">
    <Link className="back-link" href="/app/projects">← All projects</Link>
    <div className="project-detail-hero"><div className="project-detail-art"><span>{project.name.slice(0, 1).toUpperCase()}</span><i/><b/></div><div className="project-detail-copy"><p className="eyebrow">PROJECT SPACE</p><div className="project-detail-title"><h1>{project.name}</h1><span className={`project-status status-${project.status}`}><span/>{project.status.replaceAll("_", " ")}</span></div><p>{project.description || "Keep the work for this goal organized and moving forward."}</p><div className="project-detail-meta"><span>▧ {tasks.length} tasks</span><span>✓ {completedCount} completed</span><span>◷ {project.due_date ? `Target ${dateLabel(project.due_date)}` : "Open-ended timeline"}</span></div></div><button className="button-primary project-add-button" onClick={() => setFormOpen(value => !value)}>{formOpen ? "Close form" : "＋ Add task"}</button></div>
    {error && <div className="work-alert" role="alert">{error}</div>}
    {formOpen && <form className="create-panel" onSubmit={createTask}><div className="create-panel-heading"><span className="create-icon">✦</span><div><strong>Add to {project.name}</strong><small>Deadlines are optional. Add them only when they help.</small></div></div><div className="form-grid"><label className="form-field form-field-wide"><span>Task title <i>Required</i></span><input name="title" placeholder="What needs to get done?" required maxLength={240}/></label><label className="form-field form-field-wide"><span>Details <i>Optional</i></span><textarea name="description" placeholder="Add a few helpful details" rows={3}/></label><label className="form-field"><span>Priority</span><select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label className="form-field"><span>Start date <i>Optional</i></span><input name="start_at" type="datetime-local"/></label><label className="form-field"><span>Due date <i>Optional</i></span><input name="due_at" type="datetime-local"/><small>Leave blank for no time limit.</small></label><fieldset className="assignee-picker form-field-wide"><legend>Assign to workspace members <i>Optional</i></legend><div className="assignee-options">{members.map(member => <label className="assignee-option" key={member.id}><input type="checkbox" checked={assignees.includes(member.id)} onChange={event => setAssignees(current => event.target.checked ? [...current, member.id] : current.filter(value => value !== member.id))}/><span className="mini-avatar">{initials(member.name)}</span><span>{member.name}</span></label>)}</div></fieldset></div><div className="form-actions"><span>This task belongs to {project.name}.</span><button className="button-primary" disabled={busy}>{busy ? "Creating…" : "Add task"}</button></div></form>}
    <div className="collection-toolbar"><div><strong>Project tasks</strong><span>Every task connected to this goal.</span></div><span className="collection-view-label"><span className="view-grid-icon">▦</span> Cards</span></div>
    {tasks.length ? <div className="task-card-grid">{tasks.map(task => <article className="task-card" key={task.id}><div className="task-card-top"><span className={`priority-chip priority-${task.priority}`}>{task.priority}</span><label className="task-status-control"><span className="visually-hidden">Update status for {task.title}</span><select value={task.status} onChange={event => void setStatus(task.id, event.target.value)}>{states.map(state => <option key={state} value={state}>{state.replaceAll("_", " ")}</option>)}</select></label></div><h2>{task.title}</h2><p className="task-card-description">{task.description || "No extra details added."}</p><div className="task-card-meta"><span className="task-project-tag"><span>▧</span>{project.name}</span><span className={`task-date-chip ${task.due_at ? "has-date" : "no-date"}`}>◷ {dateLabel(task.due_at)}</span></div><div className="task-card-footer"><span className="task-assignee-stack">{task.assignees?.length ? task.assignees.slice(0, 3).map(person => <span title={person.name} className="mini-avatar" key={person.id}>{initials(person.name)}</span>) : <span className="unassigned-label">No one assigned</span>}{!!task.assignees && task.assignees.length > 3 && <small>+{task.assignees.length - 3}</small>}</span><span className="task-card-priority-note">{task.start_at ? `Starts ${dateLabel(task.start_at)}` : "Ready when you are"}</span></div></article>)}</div> : <div className="work-empty"><div className="empty-symbol">✓</div><h2>Build this project one task at a time</h2><p>Add a task whenever you’re ready. You can set a deadline or leave the timeline open.</p><button className="button-primary" onClick={() => setFormOpen(true)}>＋ Add the first task</button></div>}
  </section>;
}
