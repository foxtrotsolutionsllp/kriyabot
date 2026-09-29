"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CalendarEvent = { id: string; kind: "task" | "project" | "meeting"; phase: "plan" | "completed"; start: string; end: string; start_at?: string; end_at?: string; timezone?: string; title: string; detail: string; status: string; priority?: string; url: string };
type UnscheduledTask = { id: number; title: string; status: string; priority: string; project: string };
type CalendarData = { events: CalendarEvent[]; unscheduled: UnscheduledTask[]; counts: { scheduled: number; completed: number; unscheduled: number } };
const monthName = (date: Date) => new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
const keyDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const readableDate = (date: string) => new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`));

export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(keyDate(new Date()));
  const [data, setData] = useState<CalendarData>({ events: [], unscheduled: [], counts: { scheduled: 0, completed: 0, unscheduled: 0 } });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const from = useMemo(() => { const d = new Date(month.getFullYear(), month.getMonth(), 1); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return keyDate(d); }, [month]);
  const to = useMemo(() => { const d = new Date(month.getFullYear(), month.getMonth() + 1, 0); d.setDate(d.getDate() + (7 - d.getDay()) % 7); return keyDate(d); }, [month]);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch(`/api/backend/calendar?from=${from}&to=${to}`, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "Couldn’t load your calendar."); setData(result); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn’t load your calendar."); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);
  const weeks = useMemo(() => { const start = new Date(`${from}T12:00:00`); const end = new Date(`${to}T12:00:00`); const days: Date[] = []; for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d)); const rows: Date[][] = []; for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7)); return rows; }, [from, to]);
  const today = keyDate(new Date());
  const selectedEvents = data.events.filter(event => event.start <= selectedDay && event.end >= selectedDay);
  function moveMonth(offset: number) { const next = new Date(month.getFullYear(), month.getMonth() + offset, 1); setMonth(next); setSelectedDay(keyDate(next)); }

  return <section className="module-page calendar-module">
    <div className="module-heading calendar-heading"><div><p className="eyebrow">PLAN WITH THE WHOLE PICTURE IN VIEW</p><h1>Calendar</h1><p className="module-subtitle">Your active plans, meetings, upcoming deadlines, and completed work—all in one timeline.</p></div><Link className="button-primary" href="/app/assistant">＋ Plan with assistant</Link></div>
    <div className="calendar-metrics"><article><span className="calendar-metric-icon metric-indigo">▤</span><div><b>{loading ? "—" : data.counts.scheduled}</b><small>Plans this month</small></div></article><article><span className="calendar-metric-icon metric-green">✓</span><div><b>{loading ? "—" : data.counts.completed}</b><small>Completed this month</small></div></article><article><span className="calendar-metric-icon metric-amber">◷</span><div><b>{loading ? "—" : data.counts.unscheduled}</b><small>Need a date</small></div></article><div className="calendar-metric-note"><span>✦</span> Your plan, at a glance</div></div>
    {error && <div className="work-alert">{error}</div>}
    <div className="calendar-workspace">
      <div className="calendar-main-panel">
        <header className="calendar-toolbar"><div><p className="eyebrow">MONTH VIEW</p><h2>{monthName(month)}</h2></div><div className="calendar-controls"><button className="calendar-arrow" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button><button className="calendar-today-button" onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDay(today); }}>Today</button><button className="calendar-arrow" onClick={() => moveMonth(1)} aria-label="Next month">›</button></div></header>
        <div className="calendar-legend"><span><i className="legend-task"/>In progress</span><span><i className="legend-project"/>Project</span><span><i className="legend-meeting"/>Meetings</span><span><i className="legend-completed"/>Completed</span>{loading && <small>Updating your plan…</small>}</div>
        <div className="calendar-board"><div className="calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div>{weeks.map((week, index) => <div className="calendar-week" key={index}>{week.map(day => {
          const date = keyDate(day); const dayEvents = data.events.filter(event => event.start <= date && event.end >= date);
          return <div className={`calendar-day ${day.getMonth() !== month.getMonth() ? "calendar-day-muted" : ""} ${today === date ? "calendar-day-today" : ""} ${selectedDay === date ? "calendar-day-selected" : ""}`} key={date} onClick={() => setSelectedDay(date)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") setSelectedDay(date); }} aria-label={`${readableDate(date)}, ${dayEvents.length} plans`}>
            <span className="calendar-day-number">{day.getDate()}</span><div className="calendar-day-events">{dayEvents.slice(0, 4).map(event => <Link key={event.id} href={event.url} onClick={e => e.stopPropagation()} className={`calendar-event calendar-event-${event.kind} ${event.phase === "completed" ? "calendar-event-completed" : ""} ${event.status === "done" ? "calendar-event-done" : ""}`} title={`${event.title} · ${event.detail}`}><b>{event.title}</b><small>{event.phase === "completed" ? "✓ Done" : event.kind === "project" ? "Project" : date === event.end ? "Due" : date === event.start ? "Starts" : "In progress"}</small></Link>)}{dayEvents.length > 4 && <button className="calendar-more" onClick={e => { e.stopPropagation(); setSelectedDay(date); }}>+{dayEvents.length - 4} more</button>}</div>
          </div>;
        })}</div>)}</div>
      </div>
      <aside className="calendar-side-panel"><div className="calendar-agenda-heading"><div><p className="eyebrow">YOUR DAY</p><h2>{readableDate(selectedDay)}</h2></div><span>{selectedEvents.length}</span></div>
        <div className="calendar-agenda-list">{selectedEvents.length ? selectedEvents.map(event => <Link key={`agenda-${event.id}`} href={event.url} className={`agenda-item ${event.phase === "completed" ? "agenda-item-complete" : ""}`}><span className="agenda-line"/><span className="agenda-copy"><b>{event.title}</b><small>{event.kind === "meeting"&&event.start_at?`${new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZone:event.timezone}).format(new Date(event.start_at))} · ${event.detail}`:event.phase === "completed" ? "Completed" : event.kind === "project" ? "Project milestone" : `${event.detail}${selectedDay === event.end ? " · Due" : selectedDay === event.start ? " · Starts" : " · In progress"}`}</small><span className="agenda-status">{event.phase === "completed" ? "✓ Completed" : event.status.replaceAll("_", " ")}</span></span></Link>) : <div className="agenda-empty"><span>✦</span><b>A little breathing room</b><small>No plans on this day. Add a task or enjoy the space.</small></div>}</div>
        <div className="unscheduled-panel"><div className="unscheduled-heading"><div><p className="eyebrow">FIND A PLACE FOR THESE</p><h3>Unscheduled work</h3></div><span>{data.unscheduled.length}</span></div>{data.unscheduled.length ? <div className="unscheduled-list">{data.unscheduled.slice(0, 5).map(task => <Link href="/app/tasks" key={task.id} className="unscheduled-task"><span className={`priority-dot priority-dot-${task.priority}`}/><span><b>{task.title}</b><small>{task.project}</small></span><span className="unscheduled-arrow">→</span></Link>)}{data.unscheduled.length > 5 && <Link className="unscheduled-view-all" href="/app/tasks">View all {data.unscheduled.length} tasks →</Link>}</div> : <p className="unscheduled-clear">Everything has a date. Nice work.</p>}</div>
      </aside>
    </div>
  </section>;
}
