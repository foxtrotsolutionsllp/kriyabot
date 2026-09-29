"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const email = new FormData(event.currentTarget).get("email"); const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const data = await response.json(); if (!response.ok) { setError(data.message ?? "Unable to process your request."); return; } setSent(true); }
  return <main className="auth-page"><section className="auth-card"><img className="auth-brand-logo" src="/kriyabot-logo.png" alt="Kriyabot" /><h1>Reset your password</h1>{sent ? <p className="muted">If an account exists for that email, recovery instructions are on their way.</p> : <><p className="muted">Enter your account email and we’ll send a recovery link.</p><form onSubmit={submit}><label className="field">Email<input name="email" type="email" required autoComplete="email" /></label><button className="primary">Send recovery link</button>{error && <p className="error" role="alert">{error}</p>}</form></>}<p className="muted"><Link href="/login">Return to sign in</Link></p></section></main>;
}
