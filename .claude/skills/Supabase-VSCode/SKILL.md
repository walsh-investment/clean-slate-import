---
name: Supabase-VSCode
description: Use when working with Supabase databases in VS Code Copilot — connecting to remote projects, running queries, inspecting schemas, and troubleshooting CLI issues. Covers common pitfalls with the Supabase CLI, Docker dependency, project linking, and schema access patterns.
---

# Supabase in VS Code Copilot

## Overview

This skill documents the correct workflow for agents connecting to and querying Supabase databases from VS Code Copilot using the Supabase CLI. It captures real failure modes encountered in production use and the correct commands/patterns to avoid them.

## Prerequisites

### Docker Desktop must be running

Many Supabase CLI commands require Docker Desktop, even when targeting a **remote** database.

**Commands that require Docker:**
- `supabase db dump` (uses a containerized `pg_dump`)
- `supabase db start` / `supabase db reset` (local dev)
- `supabase status` (checks local container health)

**Commands that do NOT require Docker:**
- `supabase projects list`
- `supabase login`
- `supabase link`
- `supabase inspect db *` (connects directly to remote via API)
- `supabase gen types`

**Failure signature when Docker is missing:**
```
failed to inspect docker image: error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/..."
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Action:** Check Docker first. If not running, use `supabase inspect db` commands instead of `supabase db dump` for schema inspection. If Docker is needed, ask the user to start Docker Desktop before proceeding.

### Supabase CLI version awareness

CLI commands change across versions. The following does **NOT** exist in CLI v2.75.0:
- `supabase db execute` — there is no built-in "run arbitrary SQL on remote" subcommand
- `supabase inspection` — the correct command is `supabase inspect` (no -ion)

Always verify available subcommands:
```powershell
supabase db --help
supabase inspect db --help
```

## Project Linking — The Most Common Failure

### The problem

The Supabase CLI can be **linked to the wrong project** while `config.toml` references the correct one. These are independent:

- `supabase/config.toml` → stores `project_id` (used by some commands)
- `supabase link` → stores link metadata in `.supabase/` directory (used by `--linked` flag)

When they disagree, you query the wrong database silently. There is no error — you just get unexpected tables, schemas, or empty results.

### How to detect

1. Run `supabase projects list` — the `●` marker shows which project is currently linked.
2. Compare the linked project's reference ID against `config.toml`'s `project_id`.
3. If they differ, you are querying the wrong database.

**Example of mislinked state:**
```
   LINKED | REFERENCE ID         | NAME
          | bwynwypgtdoxndusuirq | ProjectorDB    ← config.toml says this
     ●    | wkhxircgcysdzmofwnbr | NilesDB        ← CLI is linked to this
```

### How to fix

```powershell
supabase link --project-ref <correct_reference_id>
```

Then verify:
```powershell
supabase projects list
# Confirm ● is on the correct project
```

### When `.supabase/` directory is missing

If `Test-Path ".supabase"` returns `False`, the project was never linked in this workspace. Run `supabase link --project-ref <ref>` to create it.

## Querying the Remote Database

### Use `supabase inspect db` for read-only inspection (no Docker required)

```powershell
# Table sizes and estimated row counts
supabase inspect db table-stats --linked

# Index sizes
supabase inspect db index-sizes --linked

# Bloat estimates
supabase inspect db bloat --linked
```

**Note:** `table-sizes` is deprecated in v2.75.0 — use `table-stats` instead.

**Note:** `inspect db table-stats` only shows tables with data or indexes. Empty tables with no indexes may not appear.

### Use `supabase db dump` for DDL export (requires Docker)

```powershell
# Dump a specific schema's DDL
supabase db dump --linked --schema prod

# Dump data only
supabase db dump --linked --schema prod --data-only
```

**Failure when schema doesn't exist:**
```
pg_dump: error: no matching schemas were found
```
This means the schema name is wrong OR you're linked to the wrong project (see above).

### Use `psql` for arbitrary SQL (if installed)

Check availability:
```powershell
Get-Command psql -ErrorAction SilentlyContinue
```

Connection string format for Supabase:
```
postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

The password is the database password set during project creation — it is NOT stored in the CLI or config files. Check for `SUPABASE_DB_PASSWORD` environment variable or `.env` files.

## Schema Patterns in This Project

### Multi-schema architecture

This project uses a `prod` schema for application data, not `public`:

| Schema | Purpose |
|--------|---------|
| `public` | User roles, profiles, PostGIS system tables |
| `prod` | All application tables (facilities, units, rates, parcels, financial models) |
| `auth` | Supabase-managed authentication |
| `storage` | Supabase-managed file storage |

### Client code accesses `prod` via schema selector

```typescript
// Correct — targets prod schema
supabase.schema('prod').from('facilities').select()

// Wrong — targets public schema (default)
supabase.from('facilities').select()
```

### Type generation includes all schemas

```bash
npm run db:types
# Runs: supabase gen types typescript --project-id <ref> --schema public,prod,auth,storage,extensions,realtime,graphql_public
```

Generated types at `src/integrations/supabase/types.ts` include `Database['prod']['Tables']` for typed access.

## Troubleshooting Checklist

When database connectivity fails or returns unexpected results, check in this order:

1. **Is Docker Desktop running?** Required for `db dump`, `db start`, `status`.
2. **Is the correct project linked?** Run `supabase projects list` and check the `●` marker against `config.toml`.
3. **Does the target schema exist?** Try `supabase db dump --linked --schema <name>` — "no matching schemas" means wrong schema name or wrong project.
4. **Is the CLI authenticated?** Run `supabase projects list` — if it fails, run `supabase login`.
5. **Is the database password available?** Check `$env:SUPABASE_DB_PASSWORD` and `.env` files. The Supabase CLI stores auth tokens but NOT the database password.
6. **Are you using the right command?** `supabase inspect db table-stats --linked` works without Docker. `supabase db dump --linked` requires Docker.

## Commands Quick Reference

| Task | Command | Docker? |
|------|---------|---------|
| Check which project is linked | `supabase projects list` | No |
| Link to correct project | `supabase link --project-ref <ref>` | No |
| Table row counts and sizes | `supabase inspect db table-stats --linked` | No |
| Index analysis | `supabase inspect db index-sizes --linked` | No |
| Export schema DDL | `supabase db dump --linked --schema prod` | Yes |
| Export data | `supabase db dump --linked --schema prod --data-only` | Yes |
| Push migrations to remote | `supabase db push` | Yes |
| Generate TypeScript types | `supabase gen types typescript --project-id <ref> --schema public,prod` | No |
| Check CLI version | `supabase --version` | No |
| Check local containers | `supabase status` | Yes |