"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const body = Object.fromEntries(new FormData(event.currentTarget)); const result = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await result.json(); setBusy(false); if (!result.ok) { setError(data.message ?? "Unable to sign in."); return; } router.push(data.is_admin ? "/admin" : "/app"); router.refresh(); }
  return <main className="auth-page"><section className="auth-card"><img className="auth-brand-logo" src="/kriyabot-logo.png" alt="Kriyabot" /><h1>Welcome back</h1><p className="muted">Sign in to continue to your workspace.</p><form onSubmit={submit}><label className="field">Email<input name="email" type="email" required autoComplete="email" /></label><label className="field">Password<input name="password" type="password" required autoComplete="current-password" /></label><button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>{error && <p className="error" role="alert">{error}</p>}</form><p className="muted"><Link href="/forgot-password">Forgot your password?</Link></p><p className="muted">New here? <Link href="/register">Create an account</Link></p></section></main>;
}
