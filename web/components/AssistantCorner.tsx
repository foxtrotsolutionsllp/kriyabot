"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { resolveAssistantVoice, type AssistantVoiceId } from "@/lib/assistant-voice";

type AgendaItem = { id: string; title: string; kind: string; phase?: string; start?: string; start_at?: string; detail?: string; status?: string };
type ChatMessage = { role: "user" | "assistant"; content: string; sources?: Array<{ url: string; title: string }> };
type AssistantDraft = { kind: "task" | "meeting" | "clarification"; title?: string; description?: string | null; project_name?: string | null; priority?: string; due_at?: string | null; starts_at?: string | null; ends_at?: string | null; attendee_name?: string | null; reminder_minutes?: number | null; location_type?: string | null; location_label?: string | null; online_url?: string | null; saved_place_id?: number | null; clarification?: string | null; reply?: string | null };
type ProjectOption = { id: number; name: string };
type PlaceOption = { id: number; name: string };
type Props = { userName: string; initialAssistantName?: string; initialAssistantLanguage?: "en-IN" | "hi-IN" };
type SpeechApi = EventTarget & { lang: string; interimResults: boolean; continuous?: boolean; onresult: ((event: { resultIndex?: number; results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>> }) => void) | null; onerror: ((event?: { error?: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
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
  const [portalReady, setPortalReady] = useState(false);
  const [assistantName, setAssistantName] = useState(initialAssistantName || "Kriyabot Assistant");
  const [inputLanguage, setInputLanguage] = useState<"en-IN" | "hi-IN">(initialAssistantLanguage || "en-IN");
  const voiceRef = useRef<AssistantVoiceId>("india_female_warm");
  const [timezone, setTimezone] = useState("UTC");
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"off" | "wake" | "command">("off");
  const [voiceText, setVoiceText] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechApi | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const voiceBufferRef = useRef("");
  const voiceModeRef = useRef<"off" | "wake" | "command">("off");
  const voiceReplyRef = useRef(false);
  const wakeSessionRef = useRef(false);
  const pendingVoiceCommandRef = useRef("");
  const wakeGreetingRef = useRef(false);

  useEffect(() => { setPortalReady(true); }, []);

  useEffect(() => () => {
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    microphoneRef.current?.getTracks().forEach(track => track.stop());
  }, []);

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
        setProjects(context.projects ?? []); setPlaces(context.places ?? []);
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
    await sendQuestion(draft.trim());
  }

  function stopVoiceMode() {
    voiceModeRef.current = "off"; setVoiceMode("off"); setListening(false);
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop(); recognitionRef.current = null;
    microphoneRef.current?.getTracks().forEach(track => track.stop()); microphoneRef.current = null;
  }

  function closeAssistant() { stopVoiceMode(); setOpen(false); }

  function finishVoiceCommand() {
    const command = voiceBufferRef.current.trim();
    const shouldResumeWake = wakeSessionRef.current;
    const shouldSpeakReply = voiceReplyRef.current;
    wakeSessionRef.current = false; voiceReplyRef.current = false;
    stopVoiceMode();
    if (command) void executeVoiceCommand(command).then(answer => {
      if (shouldResumeWake) speak(answer, inputLanguage, () => { window.setTimeout(() => void startVoiceMode(true), 250); });
      else if (shouldSpeakReply) speak(answer);
    });
  }

  async function startVoiceMode(wakeWord = false) {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition || !navigator.mediaDevices?.getUserMedia) { setError("Hands-free speech is not supported in this browser. Try Chrome or Edge, or type your request."); return; }
    stopVoiceMode(); setError(""); setVoiceText(""); voiceBufferRef.current = ""; wakeGreetingRef.current = false; voiceReplyRef.current = !wakeWord; wakeSessionRef.current = wakeWord;
    try {
      microphoneRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recognition = new Recognition(); recognition.lang = inputLanguage; recognition.interimResults = true; recognition.continuous = true;
      recognitionRef.current = recognition;
      const mode = wakeWord ? "wake" : "command";
      voiceModeRef.current = mode; setVoiceMode(mode); setListening(true);
      recognition.onresult = (event) => {
        let heard = "", finalText = "";
        for (let index = event.resultIndex ?? 0; index < event.results.length; index++) {
          const transcript = event.results[index][0]?.transcript?.trim() ?? "";
          heard += `${transcript} `;
          if (event.results[index][0]?.isFinal) finalText += `${transcript} `;
        }
        heard = heard.trim(); finalText = finalText.trim();
        if (!heard) return;
        if (voiceModeRef.current === "wake") {
          const normalized = finalText.toLocaleLowerCase();
          const name = assistantName.trim().toLocaleLowerCase();
          if (!name || !normalized.includes(name)) return;
          const command = finalText.slice(normalized.indexOf(name) + name.length).replace(/^[:,.\s-]+/, "").trim();
          voiceModeRef.current = "command"; setVoiceMode("command"); voiceReplyRef.current = true;
          voiceBufferRef.current = command; setVoiceText(command);
          if (command) silenceTimerRef.current = window.setTimeout(() => recognition.stop(), 1400);
          else { wakeGreetingRef.current = true; recognition.stop(); }
          return;
        }
        setVoiceText(`${voiceBufferRef.current} ${heard}`.trim());
        if (finalText) {
          voiceBufferRef.current = `${voiceBufferRef.current} ${finalText}`.trim();
          setVoiceText(voiceBufferRef.current);
          if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = window.setTimeout(() => recognition.stop(), 1400);
        }
      };
      recognition.onerror = (event) => {
        if (event?.error === "no-speech" && voiceModeRef.current === "wake") {
          window.setTimeout(() => { if (voiceModeRef.current === "wake") { try { recognition.start(); } catch { /* Recognition may still be closing. */ } } }, 350);
          return;
        }
        if (voiceModeRef.current !== "off") setError(event?.error === "not-allowed" ? "Microphone access is blocked. Allow it for this site in your browser settings." : "I couldn't hear that clearly. Check your microphone and try again.");
        stopVoiceMode();
      };
      recognition.onend = () => {
        const modeNow = voiceModeRef.current;
        if (modeNow === "command") {
          const command = voiceBufferRef.current.trim();
          const shouldResumeWake = wakeSessionRef.current;
          const shouldSpeakReply = voiceReplyRef.current;
          voiceReplyRef.current = false;
          wakeSessionRef.current = false;
          stopVoiceMode();
          if (wakeGreetingRef.current) {
            wakeGreetingRef.current = false;
            const greeting = inputLanguage === "hi-IN" ? `नमस्ते ${userName}, क्या मैं आपकी मदद करूँ?` : `Hello ${userName}, can I help you today?`;
            setVoiceText(greeting); voiceReplyRef.current = true;
            speak(greeting, inputLanguage, () => { void startVoiceMode(false).then(() => { wakeSessionRef.current = true; }); });
            return;
          }
          if (command) void executeVoiceCommand(command).then(answer => {
            if (shouldResumeWake) speak(answer, inputLanguage, () => { window.setTimeout(() => void startVoiceMode(true), 250); });
            else if (shouldSpeakReply) speak(answer);
          });
          else setError("I didn't catch a request. Tap the microphone and try again.");
        } else if (modeNow === "wake" && recognitionRef.current === recognition) {
          window.setTimeout(() => { if (voiceModeRef.current === "wake") { try { recognition.start(); } catch { /* Recognition may still be shutting down. */ } } }, 350);
        }
      };
      recognition.start();
    } catch {
      stopVoiceMode(); setError("Allow microphone access to use voice. You can change the permission in your browser settings.");
    }
  }

  async function sendQuestion(question: string) {
    if (!question || busy) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next); setDraft(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/backend/assistant/ask", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ message: question, input_language: inputLanguage, history: next.slice(-9, -1).map(({ role, content }) => ({ role, content })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "I could not answer that just now.");
      const answer = data.answer ?? "I don't have an answer for that yet.";
      setMessages((current) => [...current, { role: "assistant", content: answer, sources: data.sources ?? [] }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "I could not answer that just now."); }
    finally { setBusy(false); voiceReplyRef.current = false; }
  }

  async function executeVoiceCommand(command: string): Promise<string> {
    const conversation = [...messages, { role: "user" as const, content: command }];
    setMessages(conversation); setBusy(true); setError("");
    let answer = "";
    try {
      const parseCommand = pendingVoiceCommandRef.current ? `Continue the same request. Original request: ${pendingVoiceCommandRef.current}. The user is answering your clarification: ${command}. Update and return the original task or meeting.` : command;
      const parsedResponse = await fetch("/api/backend/assistant/parse", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ command: parseCommand, input_language: inputLanguage }) });
      const parsedData = await parsedResponse.json();
      if (!parsedResponse.ok) throw new Error(parsedData.message ?? "I couldn't understand that request.");
      const draft: AssistantDraft = parsedData.draft;
      if (draft.kind === "clarification" || !draft.title?.trim()) {
        pendingVoiceCommandRef.current = pendingVoiceCommandRef.current || command;
        answer = draft.clarification || draft.reply || (inputLanguage === "hi-IN" ? "कृपया थोड़ा और विवरण बताइए।" : "I need one more detail before I can save that. Please tell me more.");
      } else if (draft.kind === "task") {
        const project = projects.find(item => item.name.toLocaleLowerCase() === (draft.project_name ?? "").toLocaleLowerCase());
        if (draft.project_name && !project) throw new Error(`I couldn't find “${draft.project_name}” in your projects. Open the assistant planner to choose the right project.`);
        const response = await fetch("/api/backend/tasks", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ title: draft.title, description: draft.description, priority: draft.priority ?? "normal", due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null, project_id: project?.id ?? null, reminder_minutes: draft.reminder_minutes ?? null }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message ?? "I couldn't save that task.");
        pendingVoiceCommandRef.current = "";
        answer = inputLanguage === "hi-IN" ? `काम “${draft.title}” सेव कर दिया${project ? ` और ${project.name} प्रोजेक्ट में जोड़ दिया` : ""}।` : `Done. I saved “${draft.title}”${project ? ` in ${project.name}` : ""}${draft.due_at ? ` for ${new Intl.DateTimeFormat(undefined, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.due_at))}` : ""}.`;
      } else {
        const place = draft.saved_place_id ? places.find(item => item.id === draft.saved_place_id) : places.find(item => item.name.toLocaleLowerCase() === (draft.location_label ?? "").toLocaleLowerCase());
        const locationType = draft.location_type ?? "custom";
        const locationLabel = locationType === "office" ? (draft.location_label || "Office") : draft.location_label;
        const missingLocation = locationType === "saved_place" ? !place : locationType === "online" ? !draft.online_url : !locationLabel;
        if (!draft.starts_at || !draft.ends_at || missingLocation) {
          pendingVoiceCommandRef.current = pendingVoiceCommandRef.current || command;
          answer = draft.clarification || (inputLanguage === "hi-IN" ? "मीटिंग सेव करने से पहले समय और स्थान बताइए।" : "Please tell me the meeting time and location before I save it.");
        } else {
          const response = await fetch("/api/backend/meetings", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ title: draft.title, description: draft.description, attendee_name: draft.attendee_name, starts_at: draft.starts_at, ends_at: draft.ends_at, timezone, location_type: locationType, location_label: place?.name ?? locationLabel, online_url: draft.online_url, saved_place_id: place?.id ?? null, reminder_minutes: draft.reminder_minutes ?? 60 }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message ?? "I couldn't save that meeting.");
          pendingVoiceCommandRef.current = "";
          answer = inputLanguage === "hi-IN" ? `मीटिंग “${draft.title}” कैलेंडर में सेव कर दी है${place ? `, स्थान ${place.name}` : ""}। रिमाइंडर भी सेट है।` : `Done. I added “${draft.title}”${draft.attendee_name ? ` with ${draft.attendee_name}` : ""} to your calendar${place ? ` at ${place.name}` : locationLabel ? ` (${locationLabel})` : ""}, with a reminder.`;
        }
      }
    } catch (cause) { answer = cause instanceof Error ? cause.message : "I couldn't save that request."; }
    finally { setBusy(false); }
    setMessages(current => [...current, { role: "assistant", content: answer }]);
    return answer;
  }

  function dictate() { if (voiceModeRef.current !== "off") stopVoiceMode(); else void startVoiceMode(false); }

  function speak(text: string, language: "en-IN" | "hi-IN" = inputLanguage, onComplete?: () => void) {
    if (!("speechSynthesis" in window)) { onComplete?.(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const selected = resolveAssistantVoice(voiceRef.current, voices);
    const hindiVoice = language === "hi-IN" ? voices.find((voice) => voice.lang.toLowerCase().replaceAll("_", "-").startsWith("hi-in")) : undefined;
    utterance.voice = language === "hi-IN" ? (hindiVoice ?? null) : (selected.voice ?? null); utterance.lang = language === "hi-IN" ? "hi-IN" : selected.lang; utterance.rate = selected.rate; utterance.pitch = selected.pitch; utterance.volume = 0.9;
    utterance.onend = () => onComplete?.(); utterance.onerror = () => onComplete?.();
    window.speechSynthesis.speak(utterance);
  }

  return <div className="assistant-corner">
    <button className={`assistant-corner-trigger ${open ? "assistant-corner-trigger-open" : ""}`} aria-label={`${assistantName} assistant`} aria-expanded={open} onClick={() => { const opening = !open; if (!opening) stopVoiceMode(); setOpen(opening); if (opening) void refreshAgenda(); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8v3M5.6 5.6l2.1 2.1M2.8 12h3M18.2 12h3M16.3 7.7l2.1-2.1"/><path d="M8 14a4 4 0 1 1 8 0c0 2-1 2-1 4H9c0-2-1-2-1-4ZM9.5 21h5"/></svg>
      <span className="assistant-corner-label">{assistantName}</span><i aria-hidden="true" />
    </button>
    {open && portalReady && createPortal(<section className="assistant-corner-panel" aria-label={`${assistantName} chat`}>
      <header className="assistant-corner-header"><span className="assistant-corner-avatar">✦</span><div><b>{assistantName}</b><small>Your personal assistant · Today in {timezone}</small></div><button className="assistant-wake-toggle" onClick={() => voiceModeRef.current === "off" ? void startVoiceMode(true) : stopVoiceMode()} aria-label={voiceMode === "wake" ? "Stop wake word listening" : `Enable Hey ${assistantName} voice activation`}>{voiceMode === "wake" ? "Listening for name…" : `Hey ${assistantName}`}</button><button aria-label="Close assistant" onClick={closeAssistant}>×</button></header>
      <div className="assistant-corner-agenda"><b>Today’s schedule</b>{agendaLoading ? <small>Checking your calendar…</small> : agenda.length ? <ul>{agenda.slice(0, 5).map((item) => <li key={item.id}><time>{friendlyTime(item.start_at, timezone)}</time><span><b>{item.title}</b><small>{item.kind === "meeting" ? "Meeting" : item.detail || "Task"}{item.detail && item.kind === "meeting" ? ` · ${item.detail}` : ""}</small></span></li>)}</ul> : <p>No special schedule saved today. Enjoy your free day, or ask me to plan something.</p>}</div>
      <div className="assistant-corner-messages" aria-live="polite">
        {messages.map((item, index) => <article key={`${item.role}-${index}`} className={`assistant-corner-message assistant-corner-${item.role}`}><p>{item.content}</p>{item.sources?.length ? <div className="assistant-corner-sources"><b>Sources</b>{item.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</div> : null}{item.role === "assistant" && <button className="assistant-read-aloud" onClick={() => speak(item.content)} aria-label="Read this answer aloud">▶ Listen</button>}</article>)}
        {busy && <div className="assistant-corner-thinking"><span/><span/><span/> Searching and thinking…</div>}
        <div ref={chatEnd}/>
      </div>
      {error && <p className="assistant-corner-error" role="alert">{error}</p>}
      <form className="assistant-corner-compose" onSubmit={(event) => void send(event)}><textarea aria-label="Ask the assistant" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={inputLanguage === "hi-IN" ? "हिन्दी में पूछें…" : "Ask me anything, or ask me to search…"}/><div><button type="button" className="assistant-language-toggle" onClick={() => setInputLanguage(language => language === "en-IN" ? "hi-IN" : "en-IN")} aria-label="Change assistant language">{inputLanguage === "hi-IN" ? "हिन्दी" : "EN"}</button><button type="button" className={`assistant-corner-mic ${listening ? "is-listening" : ""}`} onClick={dictate} aria-label={listening ? "Stop voice input" : "Speak a question"}>{listening ? "Stop" : "🎙 Speak"}</button><button type="submit" disabled={!draft.trim() || busy} aria-label="Send question">{busy ? "…" : "↑"}</button></div></form>
      <footer className="assistant-corner-footer"><span>Web answers include source links</span><Link href="/app/assistant" onClick={closeAssistant}>Plan a task or meeting →</Link></footer>
      {voiceMode === "command" && <div className="assistant-voice-stage" role="status" aria-live="assertive"><button className="assistant-voice-close" onClick={stopVoiceMode} aria-label="Stop listening">×</button><div className="assistant-voice-orb"><span>✦</span></div><p className="assistant-voice-name">{assistantName}</p><h2>{wakeGreetingRef.current ? `Hello ${userName}` : "I'm listening"}</h2><p>{wakeGreetingRef.current ? (inputLanguage === "hi-IN" ? "क्या मैं आपकी मदद करूँ?" : "Can I help you today?") : voiceText || (inputLanguage === "hi-IN" ? "अपनी बात कहें…" : "Say your request…")}</p><div className="assistant-voice-bars" aria-hidden="true"><i/><i/><i/><i/><i/></div><button className="assistant-voice-stop" onClick={finishVoiceCommand}>Finish and send</button><small>Your voice is processed by your browser's speech service.</small></div>}
    </section>, document.body)}
  </div>;
}
