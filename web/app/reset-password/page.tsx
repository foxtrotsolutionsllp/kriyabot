"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [token, setToken] = useState(""); const [email, setEmail] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState("");
  useEffect(() => { const params = new URLSearchParams(window.location.search); setToken(params.get("token") ?? ""); setEmail(params.get("email") ?? ""); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, email, password: form.get("password"), password_confirmation: form.get("password_confirmation") }) }); const data = await response.json(); if (!response.ok) { setError(data.message ?? "This recovery link is invalid or expired."); return; } setDone(true); }
  return <main className="auth-page"><section className="auth-card"><img className="auth-brand-logo" src="/kriyabot-logo.png" alt="Kriyabot" /><h1>Choose a new password</h1>{done ? <p className="muted">Your password has been updated. <Link href="/login">Sign in</Link>.</p> : <form onSubmit={submit}><label className="field">New password<input name="password" type="password" required minLength={12} autoComplete="new-password" /></label><label className="field">Confirm new password<input name="password_confirmation" type="password" required minLength={12} autoComplete="new-password" /></label><button className="primary">Update password</button>{error && <p className="error" role="alert">{error}</p>}</form>}</section></main>;
}
