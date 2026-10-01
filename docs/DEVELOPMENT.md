# Development and operations

## API

This folder contains a source-only Laravel application skeleton compatible with PHP 8.2. Run `composer install` in `api/`, configure `.env` from `.env.example`, generate `APP_KEY`, configure MySQL, then run migrations. Ensure the PHP `pdo_mysql`, `openssl`, `mbstring`, `tokenizer`, `xml`, `ctype`, `json`, and `fileinfo` extensions are enabled.

The scaffold follows Laravel 11/12 `bootstrap/app.php` and route conventions. API URLs start at `/api/v1`. Create the first account through registration, verify its email, then run `php artisan taskflow:bootstrap-admin verified-address@example.com` once from the API folder. This command refuses to run when a Super Admin already exists. Use database-backed queues and sessions in production. On a server with command-line access, schedule `php artisan schedule:run` every minute. Configure Laravel's health route at `/up` and route logs/metrics to the deployment platform.

### Reminder delivery on shared hosting without command-line access

A shared-hosting PHP request cannot stay alive as a background process. Instead, an external HTTP scheduler can call the protected reminder endpoint once a minute:

1. Set `TASKFLOW_SCHEDULER_TOKEN` in the API `.env` file to a long random secret. Keep it private. If Laravel configuration is cached, refresh that cache through your hosting panel or ask the host to do so.
2. In an HTTP scheduler such as cron-job.org, create a job for `https://your-domain.example/api/v1/automation/reminders`, set the method to `POST`, and set the request header `X-Taskflow-Scheduler` to the same secret.
3. Set it to run every minute. A short server-side lock prevents overlapping deliveries. The endpoint returns `503` until its token is configured and `401` for a wrong token.

This triggers the existing reminder dispatcher without a terminal or a long-running PHP process on GoDaddy. Delivery still depends on the app's configured mail transport and, for browser push, valid VAPID keys and a subscribed device. GoDaddy Web Hosting (cPanel) also offers a Cron Jobs page in its hosting dashboard if you prefer its built-in scheduler.

## Web

Create a Next.js App Router app compatible with Node 20.9+ (Node 24 is available in the authoring environment), copy `web/` into its app root, install dependencies from `package.json`, and set `NEXT_PUBLIC_API_URL`. The initial cookie gate is a UI shell only; production auth must use an API-issued HttpOnly, Secure, SameSite cookie or a same-origin backend-for-frontend. Do not store bearer tokens in localStorage.

## Security and operations

- Configure TLS, `APP_DEBUG=false`, strong generated secrets, trusted hosts/proxies, CORS allow-list, mail transport, and a dedicated private file disk.
- Keep one session per user disabled by default; administrators can enable it per workspace. Device/session revocation should revoke both Laravel session rows and Sanctum tokens.
- Use framework validation plus MIME inspection and per-workspace/user quotas before accepting uploads. Keep storage behind Laravel's Storage facade; never expose private paths directly.
- Apply rate limits to registration, login, verification, recovery, and profile enumeration. Keep all tenant queries scoped by authenticated workspace membership and enforce policies server-side.
- Back up MySQL consistently and object storage separately, encrypt backups, define retention/RPO/RTO, and rehearse restore. Audit logs are append-only at the application layer; restrict DB privileges for them.
- Use queue retries/backoff and failed-job monitoring. Keep scheduler jobs idempotent. `/up` is liveness; add deployment-specific readiness checks for DB/queue/mail separately.

## Validation in this environment

The source tree can be syntax checked with local PHP. Framework migration execution requires the Laravel runtime, Sanctum, a configured MySQL database, and `.env`, none of which are present in this source-only scaffold.
