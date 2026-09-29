# TaskFlow Phase 1

Foundation scaffold for the approved Next.js + Laravel API + MySQL product. This workspace had no source repository when work began, so this directory is a new, reviewable starter rather than an edit to an existing application.

## Components

- `api/`: Laravel API source, first-party migrations, Sanctum token auth, workspace membership, profile/preferences, approval workflow, and audit service.
- `web/`: Next.js App Router shell with public auth pages and server-side session-aware route gating.
- `docs/`: Phase 1 scope, security/data decisions, runbook, and Phase 2 handoff.

## Important setup decision

Workspace isolation is present on all tenant-owned records from the first migration. Public self-registration provisions a personal workspace and an approval-pending owner account. Additional workspace members should be admitted through an invitation flow in a later slice; the API does not allow a public registrant to attach to an arbitrary workspace.

The source uses Laravel 11/12 style bootstrap conventions and Next.js App Router conventions. Install dependencies using the official Laravel installer/composer project and Next.js setup for versions compatible with local PHP 8.2 and Node 24. This source-only scaffold does not contain `vendor/` or `node_modules/`.

## Start-up

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Migrations assume MySQL 8.0+ and InnoDB. Do not expose the API until the first super-admin is provisioned through the documented one-time console procedure and secrets are configured.

## Scope

Phase 1 establishes identity, workspace boundaries, profile and preference settings, approval, and security/audit infrastructure. It does not implement tasks, projects, chat, rooms, or file workflows. Those are Phase 2+ features built on the policies and storage abstractions documented here.
