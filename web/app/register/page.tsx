"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const body = Object.fromEntries(new FormData(event.currentTarget)); const result = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) }); const data = await result.json(); setBusy(false); if (!result.ok) { setError(data.message ?? "Please check your information."); return; } router.push("/pending"); }
  return <main className="auth-page"><section className="auth-card"><img className="auth-brand-logo" src="/kriyabot-logo.png" alt="Kriyabot" /><h1>Create your account</h1><p className="muted">We’ll create your private workspace. Access begins after email verification and Super Admin approval.</p><form onSubmit={submit}><label className="field">Full name<input name="name" required autoComplete="name" /></label><label className="field">Email<input name="email" type="email" required autoComplete="email" /></label><label className="field">Password<input name="password" type="password" required minLength={12} autoComplete="new-password" /></label><label className="field">Confirm password<input name="password_confirmation" type="password" required minLength={12} autoComplete="new-password" /></label><button className="primary" disabled={busy}>{busy ? "Creating account…" : "Register"}</button>{error && <p className="error" role="alert">{error}</p>}</form><p className="muted">Already registered? <Link href="/login">Sign in</Link></p></section></main>;
}
