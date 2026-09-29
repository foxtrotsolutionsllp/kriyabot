"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { resolveAssistantVoice, type AssistantVoiceId } from "@/lib/assistant-voice";

type AgendaItem = { id: string; title: string; kind: string; phase?: string; start?: string; start_at?: string; detail?: string; status?: string };
type ChatMessage = { role: "user" | "assistant"; content: string; sources?: Array<{ url: string; title: string }> };
type Props = { userName: string; initialAssistantName?: string; initialAssistantLanguage?: "en-IN" | "hi-IN" };
type SpeechApi = EventTarget & { lang: string; interimResults: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechApi; webkitSpeechRecognition?: new () => SpeechApi };

function greetingFor(zone: string, language: "en-IN" | "hi-IN") {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (language === "hi-IN") {
    if (hour >= 5 && hour < 12) return "सुप्रभात";
    if (hour >= 12 && hour < 17) return "नमस्कार";
    if (hour >= 17 && hour < 21) return "शुभ संध्या";
    return "शुभ रात्रि";
  }
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function friendlyTime(value: string | undefined, zone: string) {
  if (!value) return "All day";
  const date = new Date(value);
  return !value.includes("T") || Number.isNaN(date.getTime()) ? "All day" : new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(date);
}

export function AssistantCorner({ userName, initialAssistantName, initialAssistantLanguage }: Props) {
  const [open, setOpen] = useState(true);
  const [assistantName, setAssistantName] = useState(initialAssistantName || "Kriyabot Assistant");
  const [inputLanguage, setInputLanguage] = useState<"en-IN" | "hi-IN">(initialAssistantLanguage || "en-IN");
  const voiceRef = useRef<AssistantVoiceId>("india_female_warm");
  const [timezone, setTimezone] = useState("UTC");
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechApi | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const contextResponse = await fetch("/api/backend/assistant/context", { cache: "no-store" });
        const context = await contextResponse.json();
        if (!contextResponse.ok) throw new Error(context.message ?? "Could not load your assistant.");
        if (!alive) return;
        const zone = context.timezone || "UTC";
        const language: "en-IN" | "hi-IN" = context.assistant_language || initialAssistantLanguage || "en-IN";
        const name = context.assistant_name || "Kriyabot Assistant";
        voiceRef.current = context.assistant_voice || "india_female_warm";
        setTimezone(zone); setAssistantName(name); setInputLanguage(language);
        const planned = (context.today_schedule ?? []).filter((item: AgendaItem) => item.phase !== "completed");
        if (!alive) return;
        setAgenda(planned);
        const meetingCount = planned.filter((item: AgendaItem) => item.kind === "meeting").length;
        const otherCount = planned.length - meetingCount;
        const scheduleSummary = language === "hi-IN"
          ? planned.length ? `${meetingCount ? `आज आपकी ${meetingCount} मीटिंग${meetingCount === 1 ? "" : "ें"}` : "आज आपकी कोई मीटिंग तय नहीं है"}${otherCount ? ` और ${otherCount} अन्य काम` : ""} हैं। पूरी सूची नीचे है।` : "आज आपके लिए कोई विशेष कार्यक्रम तय नहीं है। आप चाहें तो अभी कुछ काम तय कर सकते हैं।"
          : planned.length ? `${meetingCount ? `You have ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}` : "You have no meetings scheduled"}${otherCount ? ` and ${otherCount} other item${otherCount === 1 ? "" : "s"} on your schedule` : " on your schedule"} today. I’ve listed everything below.` : "You have no special schedule saved for today. Enjoy a free day, or tell me what you’d like to plan.";
        const welcome = language === "hi-IN" ? `${greetingFor(zone, language)}, ${context.user_name || userName}. मैं ${name} हूँ। ${scheduleSummary}` : `${greetingFor(zone, language)}, ${context.user_name || userName}. I’m ${name}. ${scheduleSummary}`;
        setMessages([{ role: "assistant", content: welcome }]);
        try {
          const spokenKey = `taskflow:assistant-greeting:${context.user_name || userName}:${language}`;
          if (!sessionStorage.getItem(spokenKey) && "speechSynthesis" in window) {
            sessionStorage.setItem(spokenKey, "1");
            speak(welcome, language);
          }
        } catch { /* Keep the on-screen greeting available when browser audio is restricted. */ }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : "Could not load today's schedule.");
      } finally { if (alive) setAgendaLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, [userName, initialAssistantLanguage]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy, open]);

  async function refreshAgenda() {
    setAgendaLoading(true);
    try {
      const response = await fetch("/api/backend/assistant/context", { cache: "no-store" });
      const context = await response.json();
      if (!response.ok) throw new Error(context.message ?? "Could not refresh today's schedule.");
      setTimezone(context.timezone || "UTC");
      setAssistantName(context.assistant_name || "Kriyabot Assistant");
      setInputLanguage(context.assistant_language || initialAssistantLanguage || "en-IN");
      voiceRef.current = context.assistant_voice || "india_female_warm";
      setAgenda((context.today_schedule ?? []).filter((item: AgendaItem) => item.phase !== "completed"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not refresh today's schedule."); }
    finally { setAgendaLoading(false); }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next); setDraft(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/backend/assistant/ask", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ message: question, input_language: inputLanguage, history: next.slice(-9, -1).map(({ role, content }) => ({ role, content })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "I could not answer that just now.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer ?? "I don't have an answer for that yet.", sources: data.sources ?? [] }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "I could not answer that just now."); }
    finally { setBusy(false); }
  }

  function dictate() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setError("Voice input is not available in this browser. You can type your question instead."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const recognition = new Recognition(); recognition.lang = inputLanguage; recognition.interimResults = false;
    recognitionRef.current = recognition;
    recognition.onresult = (event) => { const spoken = Array.from(event.results).map((row) => row[0].transcript).join(" ").trim(); setDraft(spoken); };
    recognition.onerror = () => { setListening(false); setError("Microphone access stopped. Check your browser permission and try again."); };
    recognition.onend = () => setListening(false);
    setListening(true); recognition.start();
  }

  function speak(text: string, language: "en-IN" | "hi-IN" = inputLanguage) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const selected = resolveAssistantVoice(voiceRef.current, voices);
    const hindiVoice = language === "hi-IN" ? voices.find((voice) => voice.lang.toLowerCase().replaceAll("_", "-").startsWith("hi-in")) : undefined;
    utterance.voice = language === "hi-IN" ? (hindiVoice ?? null) : (selected.voice ?? null); utterance.lang = language === "hi-IN" ? "hi-IN" : selected.lang; utterance.rate = selected.rate; utterance.pitch = selected.pitch; utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  return <div className="assistant-corner">
    <button className={`assistant-corner-trigger ${open ? "assistant-corner-trigger-open" : ""}`} aria-label={`${assistantName} assistant`} aria-expanded={open} onClick={() => { const opening = !open; setOpen(opening); if (opening) void refreshAgenda(); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8v3M5.6 5.6l2.1 2.1M2.8 12h3M18.2 12h3M16.3 7.7l2.1-2.1"/><path d="M8 14a4 4 0 1 1 8 0c0 2-1 2-1 4H9c0-2-1-2-1-4ZM9.5 21h5"/></svg>
      <span className="assistant-corner-label">{assistantName}</span><i aria-hidden="true" />
    </button>
    {open && <section className="assistant-corner-panel" aria-label={`${assistantName} chat`}>
      <header className="assistant-corner-header"><span className="assistant-corner-avatar">✦</span><div><b>{assistantName}</b><small>Your personal assistant · Today in {timezone}</small></div><button aria-label="Close assistant" onClick={() => setOpen(false)}>×</button></header>
      <div className="assistant-corner-agenda"><b>Today’s schedule</b>{agendaLoading ? <small>Checking your calendar…</small> : agenda.length ? <ul>{agenda.slice(0, 5).map((item) => <li key={item.id}><time>{friendlyTime(item.start_at, timezone)}</time><span><b>{item.title}</b><small>{item.kind === "meeting" ? "Meeting" : item.detail || "Task"}{item.detail && item.kind === "meeting" ? ` · ${item.detail}` : ""}</small></span></li>)}</ul> : <p>No special schedule saved today. Enjoy your free day, or ask me to plan something.</p>}</div>
      <div className="assistant-corner-messages" aria-live="polite">
        {messages.map((item, index) => <article key={`${item.role}-${index}`} className={`assistant-corner-message assistant-corner-${item.role}`}><p>{item.content}</p>{item.sources?.length ? <div className="assistant-corner-sources"><b>Sources</b>{item.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</div> : null}{item.role === "assistant" && <button className="assistant-read-aloud" onClick={() => speak(item.content)} aria-label="Read this answer aloud">▶ Listen</button>}</article>)}
        {busy && <div className="assistant-corner-thinking"><span/><span/><span/> Searching and thinking…</div>}
        <div ref={chatEnd}/>
      </div>
      {error && <p className="assistant-corner-error" role="alert">{error}</p>}
      <form className="assistant-corner-compose" onSubmit={(event) => void send(event)}><textarea aria-label="Ask the assistant" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={inputLanguage === "hi-IN" ? "हिन्दी में पूछें…" : "Ask me anything, or ask me to search…"}/><div><button type="button" className="assistant-language-toggle" onClick={() => setInputLanguage(language => language === "en-IN" ? "hi-IN" : "en-IN")} aria-label="Change assistant language">{inputLanguage === "hi-IN" ? "हिन्दी" : "EN"}</button><button type="button" className={`assistant-corner-mic ${listening ? "is-listening" : ""}`} onClick={dictate} aria-label={listening ? "Stop voice input" : "Speak a question"}>{listening ? "Listening…" : "🎙 Speak"}</button><button type="submit" disabled={!draft.trim() || busy} aria-label="Send question">{busy ? "…" : "↑"}</button></div></form>
      <footer className="assistant-corner-footer"><span>Web answers include source links</span><Link href="/app/assistant" onClick={() => setOpen(false)}>Plan a task or meeting →</Link></footer>
    </section>}
  </div>;
}
