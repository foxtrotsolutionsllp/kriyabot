"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Member = { id: number; name: string };
type Project = { id: number; name: string };
type Attachment = { id: number; original_name: string; mime_type: string; size: number; uploader?: Member; created_at: string; can_delete?: boolean };
type Task = { id: number; title: string; description?: string | null; status: string; priority: string; start_at?: string | null; due_at?: string | null; project?: { id: number; name: string } | null; assignees?: Member[]; attachments?: Attachment[]; can_manage?: boolean; can_upload?: boolean };
const statuses = ["open", "in_progress", "blocked", "done", "cancelled"];
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "No deadline";
const dateTimeValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]); const [members, setMembers] = useState<Member[]>([]); const [projects, setProjects] = useState<Project[]>([]); const [assignees, setAssignees] = useState<number[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null); const [statusFilter, setStatusFilter] = useState("all"); const [projectFilter, setProjectFilter] = useState("all");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tasksResponse, membersResponse, projectsResponse] = await Promise.all([fetch("/api/backend/tasks", { cache: "no-store" }), fetch("/api/backend/workspace/members", { cache: "no-store" }), fetch("/api/backend/projects", { cache: "no-store" })]);
      const [taskData, memberData, projectData] = await Promise.all([tasksResponse.json(), membersResponse.json(), projectsResponse.json()]);
      if (!tasksResponse.ok || !membersResponse.ok || !projectsResponse.ok) { setError(taskData.message ?? memberData.message ?? projectData.message ?? "Unable to load your work."); return; }
      setTasks(taskData.data ?? []); setMembers(memberData); setProjects(projectData.data ?? []); setError("");
    } catch { setError("We couldn’t connect to your workspace. Check that the API is running."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visibleTasks = useMemo(() => tasks.filter(task => (statusFilter === "all" || task.status === statusFilter) && (projectFilter === "all" || (projectFilter === "personal" ? !task.project : task.project?.id === Number(projectFilter)))), [tasks, statusFilter, projectFilter]);
  const completedCount = tasks.filter(task => task.status === "done").length; const activeCount = tasks.filter(task => !["done", "cancelled"].includes(task.status)).length;

  function startEdit(task: Task) { setEditingTask(task); setAssignees(task.assignees?.map(person => person.id) ?? []); setFormOpen(true); setError(""); }
  function closeForm() { setFormOpen(false); setEditingTask(null); setAssignees([]); }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const projectId = form.get("project_id");
    setBusy(true); setError("");
    try {
      const body = { title: form.get("title"), description: form.get("description"), priority: form.get("priority"), ...(editingTask ? { status: form.get("status") } : {}), project_id: projectId ? Number(projectId) : null, start_at: form.get("start_at") || null, due_at: form.get("due_at") || null, assignee_ids: assignees };
      const response = await fetch(editingTask ? `/api/backend/tasks/${editingTask.id}` : "/api/backend/tasks", { method: editingTask ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.message ?? "Unable to save this task."); return; }
      closeForm(); await load();
    } catch { setError("We couldn’t connect to your workspace. Try again."); }
    finally { setBusy(false); }
  }

  async function setStatus(taskId: number, status: string) {
    try { const response = await fetch(`/api/backend/tasks/${taskId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.message ?? "Unable to update task."); return; } await load(); }
    catch { setError("We couldn’t update this task. Try again."); }
  }

  async function moveToTrash(task: Task) {
    if (!window.confirm(`Move “${task.title}” to Trash? You can restore it for 10 days.`)) return;
    try { const response = await fetch(`/api/backend/tasks/${task.id}`, { method: "DELETE" }); const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.message ?? "Unable to move this task to Trash."); return; } await load(); }
    catch { setError("We couldn’t move this task to Trash. Try again."); }
  }

  async function uploadFiles(task: Task, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget; const files = Array.from(input.files ?? []); if (!files.length) return;
    setError(""); setBusy(true);
    try {
      for (const file of files) { const body = new FormData(); body.append("file", file); const response = await fetch(`/api/backend/tasks/${task.id}/attachments`, { method: "POST", body }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message ?? `Couldn’t upload ${file.name}.`); }
      await load();
    } catch (exception) { await load(); setError(exception instanceof Error ? exception.message : "A file couldn’t be uploaded."); }
    finally { setBusy(false); input.value = ""; }
  }

  async function deleteAttachment(task: Task, attachment: Attachment) {
    if (!window.confirm(`Remove “${attachment.original_name}” from this task?`)) return;
    try { const response = await fetch(`/api/backend/tasks/${task.id}/attachments/${attachment.id}`, { method: "DELETE" }); const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.message ?? "Unable to remove this file."); return; } await load(); }
    catch { setError("We couldn’t remove this file. Try again."); }
  }

  return <section className="work-page">
    <div className="work-page-heading"><div><p className="eyebrow">YOUR FOCUS, YOUR PACE</p><h1>My work</h1><p className="work-page-subtitle">A calm place to see what’s yours and choose what comes next.</p></div><button className="button-primary" onClick={() => { setEditingTask(null); setAssignees([]); setFormOpen(value => !value); }}>{formOpen && !editingTask ? "Close form" : "＋ Add a task"}</button></div>
    <div className="task-summary-strip"><div><span className="summary-mark summary-mark-purple">◷</span><span><b>{loading ? "—" : activeCount}</b><small>In progress</small></span></div><i/><div><span className="summary-mark summary-mark-green">✓</span><span><b>{loading ? "—" : completedCount}</b><small>Completed</small></span></div><i/><div><span className="summary-mark summary-mark-blue">▦</span><span><b>{loading ? "—" : projects.length}</b><small>Projects</small></span></div><div className="summary-note">Work at a pace that works for you. <span>✦</span></div></div>

    {formOpen && <form key={editingTask?.id ?? "new-task"} className="create-panel" onSubmit={saveTask}><div className="create-panel-heading"><span className="create-icon">✦</span><div><strong>{editingTask ? "Edit task" : "Create a task"}</strong><small>Add a personal task or connect it to a project.</small></div></div><div className="form-grid"><label className="form-field form-field-wide"><span>Task title <i>Required</i></span><input name="title" placeholder="What needs to get done?" required maxLength={240} defaultValue={editingTask?.title ?? ""}/></label><label className="form-field form-field-wide"><span>Details <i>Optional</i></span><textarea name="description" placeholder="Add context or a few helpful details" rows={3} defaultValue={editingTask?.description ?? ""}/></label><label className="form-field"><span>Project <i>Optional</i></span><select name="project_id" defaultValue={editingTask?.project?.id ?? ""}><option value="">Personal task — no project</option>{projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label><label className="form-field"><span>Priority</span><select name="priority" defaultValue={editingTask?.priority ?? "normal"}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label className="form-field"><span>Start date <i>Optional</i></span><input name="start_at" type="datetime-local" defaultValue={dateTimeValue(editingTask?.start_at)}/></label><label className="form-field"><span>Due date <i>Optional</i></span><input name="due_at" type="datetime-local" defaultValue={dateTimeValue(editingTask?.due_at)}/><small>No deadline? Leave this blank.</small></label>{editingTask && <label className="form-field"><span>Status</span><select name="status" defaultValue={editingTask.status}>{statuses.map(status => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select></label>}<fieldset className="assignee-picker form-field-wide"><legend>Assign to workspace members <i>Optional</i></legend><div className="assignee-options">{members.map(member => <label className="assignee-option" key={member.id}><input type="checkbox" checked={assignees.includes(member.id)} onChange={event => setAssignees(current => event.target.checked ? [...current, member.id] : current.filter(value => value !== member.id))}/><span className="mini-avatar">{initials(member.name)}</span><span>{member.name}</span></label>)}</div>{!members.length && <small>No other visible workspace members yet.</small>}</fieldset></div><div className="form-actions"><span>Project and dates are optional. Personal tasks stay in My work.</span><div className="form-action-buttons"><button className="button-secondary" type="button" onClick={closeForm}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? "Saving…" : editingTask ? "Save changes" : "Create task"}</button></div></div></form>}

    {error && <div className="work-alert" role="alert">{error}</div>}
    <div className="collection-toolbar"><div><strong>{loading ? "Your tasks" : `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`}</strong><span>Choose a pace and keep moving forward.</span></div><div className="task-filters"><label><span className="visually-hidden">Filter by project</span><select value={projectFilter} onChange={event => setProjectFilter(event.target.value)}><option value="all">All work</option><option value="personal">Personal tasks</option>{projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label><label><span className="visually-hidden">Filter by status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Every status</option>{statuses.map(status => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select></label></div></div>

    {loading ? <div className="task-card-grid">{[0, 1, 2].map(item => <div className="task-skeleton" key={item}/>)}</div> : visibleTasks.length ? <div className="task-card-grid">{visibleTasks.map(task => <article className="task-card" key={task.id}><div className="task-card-top"><span className={`priority-chip priority-${task.priority}`}>{task.priority}</span><label className="task-status-control"><span className="visually-hidden">Update status for {task.title}</span><select value={task.status} onChange={event => void setStatus(task.id, event.target.value)}>{statuses.map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label></div><h2>{task.title}</h2><p className="task-card-description">{task.description || "No extra details added."}</p><div className="task-card-meta"><span className="task-project-tag"><span>▧</span>{task.project?.name ?? "Personal task"}</span><span className={`task-date-chip ${task.due_at ? "has-date" : "no-date"}`}>◷ {dateLabel(task.due_at)}</span></div><div className="task-card-footer"><span className="task-assignee-stack">{task.assignees?.length ? task.assignees.slice(0, 3).map(person => <span title={person.name} className="mini-avatar" key={person.id}>{initials(person.name)}</span>) : <span className="unassigned-label">No one assigned</span>}{!!task.assignees && task.assignees.length > 3 && <small>+{task.assignees.length - 3}</small>}</span><span className="task-card-priority-note">{task.start_at ? `Starts ${dateLabel(task.start_at)}` : "Ready when you are"}</span></div>
      {!!task.attachments?.length && <div className="task-attachments"><div className="attachments-heading">FILES <span>{task.attachments.length}</span></div>{task.attachments.map(attachment => <div className="attachment-row" key={attachment.id}><span className="attachment-type">{attachment.mime_type.startsWith("image/") ? "▧" : attachment.mime_type === "application/pdf" ? "PDF" : "DOC"}</span><a href={`/api/backend/tasks/${task.id}/attachments/${attachment.id}/preview`} target="_blank" rel="noreferrer" title={attachment.original_name}>{attachment.original_name}<small>{fileSize(attachment.size)} · {attachment.uploader?.name ?? "Workspace member"}</small></a>{attachment.can_delete && <button className="attachment-remove" type="button" aria-label={`Remove ${attachment.original_name}`} onClick={() => void deleteAttachment(task, attachment)}>×</button>}</div>)}</div>}
      <div className="task-card-actions">{task.can_manage && <><button type="button" className="task-action-button" onClick={() => startEdit(task)}>Edit</button><button type="button" className="task-action-button task-delete-action" onClick={() => void moveToTrash(task)}>Move to Trash</button></>}{task.can_upload && <label title="Images, PDF, text, CSV, Word, Excel, or PowerPoint. Up to 10 MB per file." className={`task-action-button file-action ${busy ? "disabled" : ""}`}>＋ Attach file<input type="file" multiple disabled={busy} accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={event => void uploadFiles(task, event)}/></label>}</div>
    </article>)}</div> : <div className="work-empty"><div className="empty-symbol">✓</div><h2>{tasks.length ? "No tasks match those filters" : "Make room for your next idea"}</h2><p>{tasks.length ? "Try another project or status filter." : "Add a task with or without a deadline. You set the pace."}</p>{tasks.length ? <button className="button-secondary" onClick={() => { setProjectFilter("all"); setStatusFilter("all"); }}>Clear filters</button> : <button className="button-primary" onClick={() => setFormOpen(true)}>＋ Create your first task</button>}</div>}
  </section>;
}
