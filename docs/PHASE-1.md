# TaskFlow Phase 1 foundation

## Included

- Workspace-first tenant isolation, a personal workspace created atomically at registration, and a Super Admin choice to retain it or assign the verified user to an existing workspace during approval.
- Registration, email verification primitives, password recovery routes, Sanctum bearer tokens, protected API routes, pending approval state, and super-admin approval/rejection endpoints.
- Workspace roles and permission tables, profile visibility, user locale/timezone, theme tokens, notification preferences, account status, data-export/deletion request records.
- Session/device inventory table, optional 2FA readiness fields, configurable single-session policy setting.
- Private storage service with server-detected MIME checks and an adjustable per-file size limit.
- Soft deletes on users/workspaces and audit log structure/service.
- Rate-limit hooks, API v1 prefix, queue/cache/session configuration examples, scheduler/backup/health guidance, indexes, and file-storage validation guidance.
- Next.js auth entry points and separate member/admin shells.

## Deliberate boundaries

Email delivery requires a configured mail transport. Approval notifications are queued only after queue configuration. `2FA` fields are readiness only; enrollment and challenge UI are not enabled. Export/deletion are represented as requests and must be implemented with verification, authorization, and retention rules before activation. File upload endpoints and business features are out of scope.

## Registration decision

Each public registrant receives a new personal workspace and the owner role. This avoids leaking or joining an existing tenant by guessed identifier. During approval, the Super Admin can move the user into another active workspace; the user then receives the member role and the empty provisional workspace is soft-deleted. Ongoing invitations and member management remain deferred. A platform super-admin account is provisioned out of band; public registration can never assign privileged roles.

## Acceptance checklist

- [ ] Configure database, mail, queue, cache, app URL and Sanctum stateful domains.
- [ ] Run migrations on MySQL 8.0+ and review indexes using the deployment database.
- [ ] Provision exactly one initial super-admin with a one-time reviewed command/seed; disable bootstrap credentials afterward.
- [ ] Verify pending users cannot access protected routes, approved users can, and workspace IDs cannot cross tenant boundaries.
- [ ] Verify email verification, password recovery, audit writes, and queue delivery in the target environment.
- [ ] Test backup restore in staging before production data is accepted.

## Exact Phase 2 starting point

Start with the core work domain: design and migrate `projects`, `project_members`, `tasks`, and task-assignee/link tables, each keyed to `workspace_id`; then add workspace-scoped project/task policies and the first API/UI for creating projects and assigning tasks. Keep chat, rooms, and general file sharing for later phases, and do not begin those until the task/project permission checks are enforced in API requests.
