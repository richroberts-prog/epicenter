# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Epicenter: local-first workspace platform. Monorepo with Yjs CRDTs, Tauri desktop apps, and Svelte 5 UI.

## Commands

```bash
# All commands use bun (never npm/yarn/pnpm/node)
bun install                  # Install dependencies
bun run build                # Build all (Turbo-orchestrated, respects dependency order)
bun run dev                  # Dev servers for all apps
bun run typecheck            # Type check all packages
bun run lint                 # Lint + autofix (ESLint + Biome)
bun run lint:check           # Lint without fixing
bun run format               # Format (Biome for TS/JS, Prettier for Svelte/Astro/HTML)
bun run format:check         # Check formatting
bun run clean                # Remove build artifacts
bun run nuke                 # Full reset including Rust targets

# Per-app dev
cd apps/whispering && bun tauri dev   # Whispering desktop (Tauri + Rust)
cd apps/whispering && bun dev:web     # Whispering web only (no Rust)
cd apps/epicenter && bun tauri dev    # Epicenter desktop
cd apps/epicenter && bun dev:web      # Epicenter web only
cd apps/landing && bun run dev        # Landing site (Astro)

# Testing (Bun's built-in test runner)
bun test                              # Run all tests
bun test path/to/file.test.ts         # Single test file
bun test --watch                      # Watch mode

# Per-package type checking
cd packages/epicenter && bun run typecheck   # tsc --noEmit
cd apps/whispering && bun run typecheck      # svelte-kit sync && svelte-check
```

## Architecture

### Monorepo layout

- `apps/whispering/` : Main desktop app (speech-to-text, Tauri + SvelteKit + Rust)
- `apps/epicenter/` : Workspace assistant app (Tauri + SvelteKit)
- `apps/landing/` : Marketing site (Astro + Svelte)
- `apps/tab-manager/` : Browser extension (WXT)
- `packages/epicenter/` (`@epicenter/hq`) : Core library (Yjs, Drizzle, Elysia). Pure TypeScript, no framework deps.
- `packages/ui/` (`@epicenter/ui`) : Shared component library (shadcn-svelte + bits-ui)
- `packages/shared/` : Shared validation schemas (ArkType)
- `packages/svelte-utils/` : Svelte state utilities
- `packages/vault-core/` : Data adapter/codec layer (Drizzle + LibSQL)
- `specs/` : Timestamped design specs (`YYYYMMDDTHHMMSS-description.md`)
- `docs/articles/` : Technical deep-dive articles

### Three-layer architecture (Whispering app)

See `apps/whispering/ARCHITECTURE.md` for full details.

```
UI Layer (Svelte 5) -> Query Layer (TanStack Query) -> Service Layer (pure functions)
```

- **Service layer**: Pure, platform-agnostic functions returning `Result<T, E>`. Build-time platform detection (`window.__TAURI_INTERNALS__`) selects Tauri vs browser implementations. 97% code sharing.
- **Query layer**: Wraps services with TanStack Query. Handles runtime DI (user settings select service providers), optimistic cache updates, and error transformation to `WhisperingError` for toast notifications.
- **UI layer**: Svelte 5 components consuming reactive query data.

### @epicenter/hq core library

Two workspace APIs built on Yjs:
- **Dynamic**: Field-based schema (Notion-like), row-level LWW CRDTs
- **Static**: Standard Schema with compile-time types and versioning

Extension system for persistence (IndexedDB/filesystem), SQLite (Drizzle ORM), markdown serialization, WebSocket sync, and Y-Sweet sync.

Multi-path exports: `@epicenter/hq`, `@epicenter/hq/dynamic`, `@epicenter/hq/static`, `@epicenter/hq/extensions/persistence`, `@epicenter/hq/server`, `@epicenter/hq/cli`.

### Error handling

Uses `wellcrafted` (Rust-inspired `Result<T, E>` pattern). All service functions return Result types. No try-catch for control flow.

## Conventions

- **Always use bun**: `bun run`, `bun test`, `bun install`, `bun x`. Bun auto-loads `.env`.
- **Bun APIs over Node**: `bun:sqlite` (not better-sqlite3), `Bun.file` (not node:fs), `Bun.serve()` for HTTP, built-in `WebSocket`.
- **Formatting split**: Biome handles TS/JS linting+formatting. Prettier handles Svelte/Astro/HTML.
- **TypeScript**: Strict mode, ESM only, `bundler` module resolution. No JavaScript files (`allowJs: false` in base config).
- **Styling**: Tailwind CSS 4 with tabs, single quotes, trailing commas.
- **Package namespace**: All packages use `@epicenter/` prefix.
- **Catalog deps**: Shared dependency versions defined in root `package.json` `workspaces.catalog`.
- **Skills**: Task-specific instructions in `.claude/skills/`. Load on-demand.
- **Destructive actions need approval**: Force pushes, hard resets, branch deletions.
- **Token-efficient execution**: For expensive operations (tests, builds, commits), delegate to sub-agent with only the command.
- **Git worktrees**: When in `.conductor/` directories, use that worktree path, not the parent repo.
