"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Task = { id: number; title: string; status: string; priority: string; due_at?: string | null; project?: { name: string } | null; assignees?: { id: number; name: string }[] };
type Project = { id: number; name: string; status: string; tasks_count?: number; due_date?: string | null };

const statusLabel = (status: string) => status.replaceAll("_", " ");
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value)) : "No due date";

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()));
    let active = true;
    Promise.all([
      fetch("/api/backend/tasks", { cache: "no-store" }).then(async response => ({ response, data: await response.json() })),
      fetch("/api/backend/projects", { cache: "no-store" }).then(async response => ({ response, data: await response.json() })),
    ]).then(([taskResult, projectResult]) => {
      if (!active) return;
      if (!taskResult.response.ok || !projectResult.response.ok) {
        setLoadError(taskResult.data.message ?? projectResult.data.message ?? "We couldn’t load your workspace summary.");
        return;
      }
      setTasks(taskResult.data.data ?? []);
      setProjects(projectResult.data.data ?? []);
    }).catch(() => { if (active) setLoadError("We couldn’t connect to your workspace. Check that the API is running, then refresh."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openTasks = useMemo(() => tasks.filter(task => !["done", "cancelled"].includes(task.status)), [tasks]);
  const dueSoon = useMemo(() => openTasks.filter(task => task.due_at).sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()).slice(0, 4), [openTasks]);
  const completed = tasks.filter(task => task.status === "done").length;
  const completion = tasks.length ? Math.round(completed / tasks.length * 100) : 0;

  return <div className="dashboard-page">
    <div className="dashboard-heading">
      <div><p className="eyebrow">{today || "YOUR WORKSPACE"}</p><h1>Your work, in focus.</h1><p className="dashboard-subtitle">A clear view of what’s moving and what needs you next.</p></div>
      <div className="dashboard-actions"><Link className="button-secondary" href="/app/projects">＋ New project</Link><Link className="button-primary" href="/app/tasks">＋ Add a task</Link></div>
    </div>

    {loadError && <div className="dashboard-alert" role="status">{loadError}</div>}

    <section className="welcome-banner">
      <div className="welcome-copy"><span className="banner-kicker">A GOOD DAY TO MAKE PROGRESS</span><h2>Small steps. Meaningful momentum.</h2><p>Keep your priorities visible and move the work that matters forward.</p><Link href="/app/tasks" className="banner-link">Open my work <span aria-hidden="true">↗</span></Link></div>
      <div className="banner-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-sun"/><div className="art-card"><span className="art-check">✓</span><span><b>One thing at a time</b><small>Focus creates progress</small></span></div><div className="art-sparkle">✦</div></div>
    </section>

    <section className="metric-grid" aria-label="Workspace summary">
      <article className="metric-card"><div className="metric-top"><span className="metric-icon icon-violet">◷</span><span className="metric-caption">IN PROGRESS</span></div><strong>{loading ? "—" : openTasks.length}</strong><span className="metric-foot">tasks still moving</span></article>
      <article className="metric-card"><div className="metric-top"><span className="metric-icon icon-peach">✓</span><span className="metric-caption">COMPLETED</span></div><strong>{loading ? "—" : completed}</strong><span className="metric-foot">{loading ? "Loading your work" : `${completion}% of all tasks`}</span><div className="metric-progress"><span style={{ width: `${completion}%` }}/></div></article>
      <article className="metric-card"><div className="metric-top"><span className="metric-icon icon-blue">▧</span><span className="metric-caption">PROJECTS</span></div><strong>{loading ? "—" : projects.length}</strong><span className="metric-foot">active workspaces</span></article>
      <article className="metric-card metric-card-highlight"><div className="metric-top"><span className="metric-icon icon-green">↗</span><span className="metric-caption">YOUR NEXT STEP</span></div><strong className="metric-next">{loading ? "Loading…" : dueSoon.length ? dateLabel(dueSoon[0].due_at) : "Choose one"}</strong><span className="metric-foot">{dueSoon[0]?.title ?? (loading ? "Finding your next task" : "Pick a task and build momentum")}</span></article>
    </section>

    <div className="dashboard-columns">
      <section className="content-card upcoming-card"><div className="section-heading"><div><p className="eyebrow">STAY AHEAD</p><h2>Coming up</h2></div><Link href="/app/tasks" className="text-link">All tasks <span aria-hidden="true">→</span></Link></div>
        {loading ? <div className="empty-inline">Loading your upcoming work…</div> : dueSoon.length ? <div className="task-list">{dueSoon.map((task, index) => <Link href="/app/tasks" className="task-row" key={task.id}><span className={`task-marker marker-${index % 4}`}/><span className="task-row-main"><strong>{task.title}</strong><small>{task.project?.name ?? "Personal task"} · {statusLabel(task.status)}</small></span><span className="task-date">{dateLabel(task.due_at)}</span></Link>)}</div> : <div className="empty-state"><span className="empty-illustration">✳</span><strong>{openTasks.length ? "Nothing scheduled just yet" : "You’re all caught up"}</strong><p>{openTasks.length ? "Add a due date to a task and it will show up here." : "Create a task when you’re ready for your next step."}</p><Link href="/app/tasks" className="text-link">Go to my work <span aria-hidden="true">→</span></Link></div>}
      </section>

      <section className="content-card projects-card"><div className="section-heading"><div><p className="eyebrow">MAKE IT TOGETHER</p><h2>Your projects</h2></div><Link href="/app/projects" className="text-link">View all <span aria-hidden="true">→</span></Link></div>
        {loading ? <div className="empty-inline">Loading projects…</div> : projects.length ? <div className="project-list">{projects.slice(0, 3).map((project, index) => <Link href={`/app/projects/${project.id}`} className="project-row" key={project.id}><span className={`project-avatar project-avatar-${index % 3}`}>{project.name.slice(0, 1).toUpperCase()}</span><span className="project-row-main"><strong>{project.name}</strong><small>{project.tasks_count ?? 0} tasks · {statusLabel(project.status)}</small></span><span className="project-arrow">↗</span></Link>)}</div> : <div className="empty-state project-empty"><span className="empty-illustration">▧</span><strong>Start with a project</strong><p>Bring related tasks and people together in one place.</p><Link href="/app/projects" className="text-link">Create a project <span aria-hidden="true">→</span></Link></div>}
      </section>
    </div>
    <footer className="dashboard-footer"><span>Make space for focused work.</span><Link href="/app/tasks">See all of my work <span aria-hidden="true">→</span></Link></footer>
  </div>;
}
