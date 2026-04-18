---
name: repo-architecture-audit
description: >
  Analyze an existing code repository to identify its key architectural aspects:
  high-level structure, main components/modules, runtime entrypoints, dependency graph,
  data flows, deployment shape, and cross-cutting concerns (configuration, auth, logging, errors, testing).
  Use when a user asks "how is this repo built?", "what are the main pieces?", "where is the entrypoint?",
  "how do services/modules interact?", or "summarize the architecture."
  Do NOT use for implementing new features, writing large refactors, or performing destructive actions.
---

# Repo Architecture Audit (Codex Skill)

You are performing an *architecture-focused* analysis of the repository.
Your goal is to produce a crisp, accurate map of how the repo is organized and how it runs.

## Safety + Scope Guardrails
- Read-only by default: do not delete, rename, or rewrite files unless explicitly requested.
- Prefer lightweight inspection (listing files, searching, reading key docs) over exhaustive file-by-file review.
- If you infer something, label it as an inference and point to the evidence (paths, configs, scripts).

## Workflow

### 1) Quick repository orientation (2-5 minutes)
1. Identify the repo type:
   - language(s), framework(s), monorepo vs single package, library vs app vs service.
2. Locate "source of truth" docs:
   - README, docs site, ADRs, `/docs`, `/architecture`, `/design`, `/CONTRIBUTING`.
3. Capture top-level layout:
   - list root directories, note any `apps/`, `packages/`, `services/`, `cmd/`, `src/`, `lib/`.

Suggested commands (adapt as appropriate):
- `ls`
- `find . -maxdepth 2 -type f -iname "readme*" -o -iname "*architecture*" -o -iname "*adr*"`
- `find . -maxdepth 2 -type f -name "package.json" -o -name "pyproject.toml" -o -name "Cargo.toml" -o -name "go.mod" -o -name "*.csproj" -o -name "pom.xml"`

### 2) Identify build + run entrypoints
Determine how the code is executed in dev and prod:
- JS/TS: `package.json` scripts, workspace tooling (pnpm/yarn/npm), `turbo.json`, `nx.json`
- Python: `pyproject.toml`, `setup.cfg`, `manage.py`, `app.py`, `uvicorn/gunicorn` configs
- Go: `cmd/*`, main packages
- Rust: `src/main.rs`, `Cargo.toml` bins
- JVM: `build.gradle`, `pom.xml`, application main class
- Containers: `Dockerfile`, `docker-compose.yml`, `helm/`, `k8s/`, `terraform/`

Extract:
- primary entrypoint(s)
- dev server command
- prod start command
- test command(s)
- lint/format command(s)

### 3) Map the module/service boundaries
Produce a component map:
- Identify "units": services, packages, modules, bounded contexts, layers (API, domain, infra, UI).
- For each major unit, summarize:
  - responsibility
  - key public interfaces (HTTP routes, CLI commands, exported modules)
  - dependencies on other units

Helpful evidence sources:
- route definitions, controllers, routers
- public exports (`index.ts`, `__init__.py`, `lib.rs`)
- dependency manifests and workspace graphs

### 4) Dependency graph (high level)
Summarize dependencies at two levels:
1. External: key third-party dependencies and why they matter (web framework, DB client, auth, observability).
2. Internal: how packages depend on each other (who calls whom).

Prefer:
- workspace tooling output (if available)
- static hints from import paths + package manifests
- keep it high-level (top ~10 relationships)

### 5) Data flow + runtime architecture
Describe the "happy path" runtime:
- request lifecycle (or event/job lifecycle)
- main data stores (DB, cache, queues) and access layers
- async boundaries (queues, background jobs, cron, workers)
- configuration flow (env vars, config files, secrets)
- error handling strategy
- authn/authz approach (where enforced)

If applicable, include a sequence-style narrative:
- "Client -> API -> Service -> DB -> response"
- "Event -> consumer -> domain logic -> storage -> side-effects"

### 6) Deployment + environments
Identify:
- environments (dev/staging/prod)
- deployment target (serverless, k8s, VM, edge, mobile, desktop)
- CI/CD (GitHub Actions, CircleCI, etc.)
- migrations and release steps

Evidence:
- `.github/workflows/*`, pipelines, `Dockerfile`, `helm/`, `k8s/`, `terraform/`, `scripts/`

### 7) Testing strategy + quality gates
Summarize:
- test types present (unit/integration/e2e)
- tooling (pytest/jest/vitest/junit/cypress/playwright/etc.)
- coverage, linting, formatting, type-checking
- where fixtures/mocks live

### 8) Output: produce an "Architecture Snapshot"
Deliver results in this exact structure (keep it skimmable):

1. **What this repo is**
   - Purpose, primary runtime(s), repo shape (monorepo? services?).
2. **Top-level layout**
   - Bullet list of key directories with 1-line meaning each.
3. **How to run**
   - Dev / Test / Build / Start (with commands if found).
4. **Core components**
   - Table: Component | Responsibility | Key entrypoints/files | Depends on
5. **Key runtime flows**
   - 2-5 bullets describing main flows (request/event/job).
6. **Dependencies that define the architecture**
   - External (top 5-10) + internal relationships (top 5-10).
7. **Deployment shape**
   - Infra, environments, CI/CD, migrations.
8. **Notable cross-cutting concerns**
   - Config, auth, logging/metrics/tracing, error handling, feature flags, i18n, etc.
9. **Risks / smells / TODOs (optional)**
   - Only if clearly evidenced (e.g., circular deps, duplicated layers, unclear boundaries).
10. **Pointers**
   - Linkable paths: "Start here: ..." (README, main entrypoint, architecture docs).

## Tips
- Prefer quoting *paths and filenames* over long excerpts.
- If the repo is large, sample intelligently: read docs + key entrypoints + manifests first, then zoom in.
- Keep conclusions grounded in evidence; avoid guessing.
