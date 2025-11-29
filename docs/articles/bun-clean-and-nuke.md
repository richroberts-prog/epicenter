# Why We Added bun clean and bun nuke

I kept hitting the same problem after switching branches. The app wouldn't load. Console full of cryptic errors like "render_fn is not a function." Everything was fine on the other branch. What gives?

Turns out, `.svelte-kit` caches compiled components. When you switch branches, the code changes but the cache doesn't. Now you've got compiled components from branch A trying to work with source code from branch B. They don't match. Things break in confusing ways.

The fix was always the same: delete `.svelte-kit`, delete `node_modules`, run `bun install`, try again. But this is a monorepo. There's `.svelte-kit` in multiple places. There's `node_modules` everywhere. The Turborepo cache might be stale too. Typing all those `rm -rf` commands gets old fast.

## The Solution

Two scripts, from the repo root:

```bash
bun clean    # The usual fix
bun install
```

`bun clean` removes:
- `.turbo` (Turborepo cache)
- All `node_modules` directories
- All `.svelte-kit` directories
- All `dist` build outputs

That covers 95% of "it works on their machine but not mine" problems.

## When You Need More

Sometimes the Rust build gets corrupted. Rare, but it happens. For that:

```bash
bun nuke     # Nuclear option
bun install
```

`bun nuke` does everything `clean` does, plus removes `apps/whispering/src-tauri/target`. That's about 10GB of compiled Rust artifacts. Takes a while to rebuild.

## Why Two Commands?

Cargo (Rust's build system) handles incremental builds well. When you switch branches and run `bun dev`, Cargo detects what Rust code changed and only recompiles those parts. You rarely need to blow away the whole target folder.

But JavaScript tooling isn't as smart about this. SvelteKit's cache doesn't track branch switches. It just serves whatever it compiled last. Hence the split: `clean` for the common case, `nuke` for when things are truly broken.

## The Pattern

After switching branches or pulling changes:
1. Try `bun dev` first. Usually works.
2. Getting weird errors? Run `bun clean && bun install`.
3. Still broken? Run `bun nuke && bun install`.

Most of the time you won't need step 2. But when you do, it's one command instead of hunting down cache folders.
