# AGENTS.md

This file provides guidance for AI agents working on this codebase.

## Project Overview

**obsidian-typefully** is an Obsidian plugin that integrates with [Typefully](https://typefully.com) to publish notes as social media drafts across multiple platforms (X/Twitter, LinkedIn, Threads, Bluesky, Mastodon).

## Architecture

```
src/
├── main.ts                    # Entry point, exports TypefullyPlugin
├── app/
│   ├── plugin.ts              # Main plugin class with commands and publishing logic
│   ├── constants.ts           # API endpoints, messages, regexes
│   ├── settings/
│   │   └── settings-tab.ts    # Settings UI
│   ├── types/
│   │   ├── plugin-settings.intf.ts      # Settings interfaces
│   │   └── typefully-draft-contents.intf.ts  # API types
│   └── utils/
│       ├── clean-markdown-for-typefully.fn.ts  # Markdown preprocessing
│       ├── get-file-tags.fn.ts                 # Extract note tags
│       ├── publish-typefully-draft.fn.ts       # API integration
│       ├── remove-front-matter.fn.ts           # Strip YAML
│       ├── remove-markdown-links.fn.ts         # Clean links
│       ├── is-excalidraw-file.fn.ts           # File validation
│       ├── has-name.fn.ts                      # Error helpers
│       └── has-status.fn.ts                    # Error helpers
└── utils/
    └── log.ts                  # Logging utility
```

## Key Files

- **`src/app/plugin.ts`**: Core plugin logic, commands, publishing workflow
- **`src/app/settings/settings-tab.ts`**: All settings UI rendering
- **`src/app/types/plugin-settings.intf.ts`**: Settings interface and defaults
- **`src/app/utils/publish-typefully-draft.fn.ts`**: Typefully API integration

## Development Commands

```bash
bun run dev          # Development build with watch
bun run build        # Production build
bun run test         # Run tests
bun run lint         # Run ESLint
bun run format       # Format with Prettier
bun run validate     # Run tsc + tests + lint
```

## Testing

All utility functions in `src/app/utils/` have corresponding `.spec.ts` test files. Run tests with `bun test`.

## Documentation

Documentation lives in `docs/`:

| File               | Purpose                               |
| ------------------ | ------------------------------------- |
| `README.md`        | Plugin overview and quick start       |
| `SUMMARY.md`       | Table of contents                     |
| `usage.md`         | Commands, features, and how-to guides |
| `configuration.md` | All settings with descriptions        |
| `tips.md`          | Best practices and troubleshooting    |
| `release-notes.md` | Version history and changelog         |

## Documentation Maintenance Requirements

**CRITICAL**: When making changes to this plugin, documentation MUST be kept up to date.

### When to Update Documentation

Update the relevant docs when:

1. **Adding/removing commands** → Update `docs/usage.md` (Commands table)
2. **Adding/changing settings** → Update `docs/configuration.md` (Settings tables)
3. **Adding new features** → Update `docs/usage.md` (Features section) and `docs/README.md` (Key Features)
4. **Changing existing behavior** → Update `docs/usage.md` and `docs/tips.md`
5. **Fixing bugs** → Update `docs/tips.md` (Troubleshooting) if the bug was documented
6. **Releasing a version** → Update `docs/release-notes.md`

### Documentation Style Guide

- Use tables for settings and commands (consistent format)
- Keep descriptions concise but complete
- Include code examples where helpful
- Update the troubleshooting section for user-facing issues
- Maintain the existing markdown structure

### Pre-commit Checklist

Before committing changes:

- [ ] New settings documented in `docs/configuration.md`
- [ ] New commands documented in `docs/usage.md`
- [ ] New features explained in `docs/usage.md`
- [ ] Breaking changes noted for release notes
- [ ] Troubleshooting updated if fixing user-reported issues

## Code Style

- Use Immer for immutable state updates
- Use `log()` utility for debug logging
- Follow existing patterns for settings (produce/draft pattern)
- All settings changes should call `saveSettings()`
- Platform validation before publishing

## API Integration

The plugin uses Typefully API v2:

- Endpoint: `https://api.typefully.com/v2/`
- Auth: Bearer token (API key in settings)
- Drafts: POST `/drafts/` with platform-specific content
- Social Sets: GET `/social-sets/` for account groupings

## Documentation surfaces

Three locations, do not mix them:

- `README.md` — GitHub landing page; pitch, features, install, quick start.
- `docs/` — end-user guide, published via GitHub Pages (Jekyll).
- `documentation/` — technical documentation for you and coding agents (architecture, domain model, business rules, history, plans).

## Community catalog listing rules

These rules apply to **`id`**, **`name`**, and **`description`** in `manifest.json` AND are mirrored into `package.json` (`name`, `description`):

- **`id`**: must not contain the word "obsidian" (catalog trademark rule). The GitHub repo name can keep it; only the manifest `id` is gated. Drop the prefix (`obsidian-time-machine` → `time-machine`).
- **`name`**: must not contain "Obsidian". Must not be all-uppercase — acronym chains like `CLI REST MCP` trip the check; include at least one lowercase word.
- **`description`**: must not contain "Obsidian", must not start with the plugin name (the catalog UI already shows it), must end with `.`, `!`, or `?`. These three rules typically fire together — fix in one pass.

**Draft vs accepted timing for `id`:**

- While the catalog entry is still in **draft**: free to rename `id`. Do it before acceptance.
- Once **accepted**: `id` is locked forever (changing it breaks installed users, settings paths, and keyboard shortcuts).
- **Sticky-draft-slug gotcha**: even in draft, the catalog stores the slug from the _first_ submission and compares every later manifest against it. A rename then triggers `ERROR: The plugin ID in (<new>) does not match the existing plugin ID (<old>)` — contradicting the "must not contain obsidian" rule. Resolution: delete the draft listing in the catalog admin and resubmit fresh under the new id, or open a thread with the catalog maintainers to release the slug.

## Command and settings catalog rules

- The command `name` must not include the plugin name — Obsidian already prefixes commands with the plugin name in the palette. If you need to rebrand, **rename `name`, not `id`** (renaming an id breaks any user-bound keyboard shortcut). Grep `docs/` and `README.md` for old command names when renaming.
- File pickers in settings tabs: never hand-roll. Use `AbstractInputSuggest` for inline autocomplete and `FuzzySuggestModal` for a browse-button modal — both cover keyboard nav, theming, and popout-window correctness for free. Hand-rolled menus accumulate inline-style + `document.createElement` lint warnings fast.
- Replace `window.confirm(...)` with a `Modal` subclass: `confirm()` blocks the UI thread, can't be themed, doesn't play with popout windows, and is forbidden by the scorecard.
- Keep `minAppVersion` accurate when using newer APIs. Common bumps: `1.1.0` (`ButtonComponent.setIcon`/`setTooltip`), `1.4.10` (`AbstractInputSuggest`), `1.5.7` (`Vault.getFileByPath`), `1.7.2` (`Workspace.revealLeaf`).

## The rule floor is not yours to lower

A commit that loosens a rule instead of fixing the finding is refused. This is
enforced, not advisory: a `pre-commit` hook (`scripts/git-hooks/check-rule-integrity.sh`)
and `bun run rules:check`, which is part of `bun run validate` and therefore runs
in CI too.

Refused outright, in any staged line under `src/` or `scripts/`:

- `eslint-disable`, `eslint-disable-next-line`, `eslint-disable-line`
- `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`
- `: any`, `as any`, `as unknown as`

Refused when the RESOLVED configuration gets weaker than `rules-baseline.json`:
a rule downgraded or dropped, `--max-warnings` raised above 0, a TypeScript
strictness switch turned off, or `compilerOptions.types` losing a pin. The
baseline records the _minimum_ severity each rule resolves to across every
source file, so a file-scoped exemption counts as a weakening too.

### Regenerate `bun.lock` with bun 1.3.x, not 1.4.x

The community catalog's automated review runs a bun older than 1.4.0 and cannot
parse `lockfileVersion: 2`. It reports "Unknown lockfile version", ignores the
lockfile, then fails the frozen install — which surfaces on the review page as
two errors ("The bun lockfile is out of date" and "Build verification dependency
installation failed") plus a flood of `no-unsafe-*` warnings, because nothing
installed so no types resolved.

bun 1.4.0 PRESERVES an existing v1 lockfile but writes v2 whenever it generates
one from scratch. So a repo is one `rm bun.lock`, or one dependency change that
forces a regeneration, away from shipping a release the catalog cannot review.
Graph Explorer Base View failed two reviews this way before the cause was found.

    ~/.local/share/mise/installs/bun/1.3.14/bin/bun install

Both 1.3.x and 1.4.x read a v1 lockfile, so v1 is strictly the safer format.
`bun run rules:check` fails on anything above v1; raise `MAX_LOCKFILE_VERSION`
in `scripts/rules-baseline.ts` once the catalog can read it.

### The gate is mandatory. Do not route around it.

Never do any of the following, for any reason, however well argued:

- `git commit --no-verify` (or `-n`), or any other way of skipping the hook
- editing, renaming, or unregistering `scripts/git-hooks/check-rule-integrity.sh`,
  or removing its entry from `.gitconfig`
- removing `rules:check` from `validate`, from `ci.yml`, or from the release gate
- running `bun run rules:baseline` to make a failing commit pass

That last one is the tempting one, so be explicit about it: regenerating the
baseline is how an _intended, human-approved_ loosening gets recorded. It is not
a way to clear a red check. If the gate fires and you were not already asked to
change the rules, the gate is right and the code is wrong.

A blocked commit is not a problem to solve. It is the answer: fix the finding.
If you believe the rule genuinely does not apply, stop and say so — the decision
to loosen a rule belongs to Sébastien, not to the agent that hit it.

There is no bypass flag, deliberately. If a rule genuinely does not apply to a
file, add a scoped override in `eslint.config.ts` with a written reason, then
run `bun run rules:baseline` in its own commit — the loosening then appears in a
diff a human reads, rather than inside a config nobody re-opens.

The hook is the fast local copy, not the enforcement. `rules:check` runs in
`validate`, in `ci.yml`, and in the release gate, because a pre-commit hook is
advisory the moment someone commits from another machine or a tool writes a
commit directly.

Two lessons paid for this gate:

- **A local disable buys nothing.** Five `obsidianmd` rules were once switched
  off with careful rationales; the community catalog reviewer runs its own
  ruleset against the archive and reported every one of them at submission. The
  disable only hid the finding until it was expensive. An _inline_ disable of an
  `obsidianmd` rule is a hard failure there, not a warning.
- **A codemod cannot read.** A `setTimeout` → `setNodeTimer` rewrite made to
  satisfy `prefer-window-timers` swept through template literals holding source
  for a spawned child process, where that alias does not exist — a lint rule
  cannot see inside a string, so nothing flagged it and the suite went red. After
  any mechanical rewrite, check what it changed inside strings and template
  literals, and get the full suite green before committing.

## Community catalog review — preventative rules

The community-plugin reviewer runs a fixed set of lint rules against every submitted release. Most warnings repeat across plugins and have known idiomatic fixes. **Apply these patterns from day one** — fixing them retroactively is much more expensive than getting them right the first time.

### API conventions (DOM, timers, popouts)

- `document` → `activeDocument` (so popout windows hit their own DOM).
- Timers — `setTimeout`/`clearTimeout`/`setInterval`/`clearInterval`/`requestAnimationFrame`/`cancelAnimationFrame` → `window.X`. **Not `activeWindow.X`** — the rule complains either way for timers.
- Timer handle types: declare as plain `number`, not `ReturnType<typeof setTimeout>`. With `@types/bun` in scope, the overload resolves to Bun's `Timer` and breaks the assignment from `window.setTimeout` (which returns `number`).
- `document.createElement(tag)` → `createEl(tag, …)` / `createSpan(…)` / `createDiv(…)`. Prefer parent-bound `el.createEl(…)` when a parent exists; the child is appended automatically.
- `globalThis.X` for plugin-injected globals (Excalidraw etc.) → `window.X`.
- `processFrontMatter` callback param type: `(frontmatter: Record<string, unknown>) => …` — Obsidian's default is `any` and trips unsafe-access rules.
- External SDKs that need a custom `fetch`: inject a `requestUrl`-based adapter via the SDK's `fetch` option (most SDKs that need a custom fetch — Replicate, OpenAI, etc. — expose one). Never `node-fetch`, never `globalThis.fetch = require('node-fetch')`. The adapter wraps `requestUrl` in a `fetch`-shaped function and refuses non-string/ArrayBuffer bodies; no streaming, no AbortSignal, no FormData. Adequate for plain GET/POST polling.

### Lint / TypeScript rules

- `eslint-disable @typescript-eslint/no-explicit-any` is **forbidden** — the reviewer treats both the violation and the disable as an **error** (blocks the scorecard). Type properly instead: `typeof Chart` for dynamically-imported classes, widen your custom interface rather than `as any`, narrow `unknown` at the call site.
- Every other `eslint-disable-next-line <rule>` requires a `-- reason` description.
- `new Array(n)` leaks `any[]` — write `new Array<T>(n)` or `Array.from({ length: n }, () => …)`. `Array.from` is cleaner when each slot needs a fresh sub-array.
- `Object.values(union)` returns `any[]` for union types — annotate the local as `unknown[]` and narrow at use.
- Drop redundant `as T` casts after `instanceof T` narrowing.
- Switch over an enum: case labels reference enum members (`TimeGranularity.Daily`), not raw string literals.
- `.catch((error: unknown) => …)`: coerce to `Error` before rethrowing — `error instanceof Error ? error : new Error(String(error))`.
- Async function passed to a void-returning callback: wrap in `void (async () => { … })()`, or widen the callback type to `() => void | Promise<void>` for helpers you own.
- "Legacy" ≠ "@deprecated": types that migration code intentionally keeps reading (V1 on-disk shapes etc.) are **legacy**, not deprecated. Drop the `@deprecated` tag and document them as legacy formats — the tag will otherwise fire the no-deprecated rule on every legitimate consumer.

### CSS rules

- No hand-written `!important`. Bump specificity with a doubled-class selector (`.foo.foo`) — that goes from 0,1,0 to 0,2,0 and beats most Obsidian defaults (`.setting-item-control button` 0,1,1; `.modal-container .modal` 0,2,0).
- Before removing `!important`, identify what the rule is fighting and verify in a live vault with `getComputedStyle()`. Inline styles always win — keep `!important` only when the source it beats is itself inline.
- When `!important` is genuinely load-bearing (visibility toggles like `.lt-hidden` are the canonical example), restore it and add a `/* stylelint-disable-next-line declaration-no-important -- reason: … */` comment. The reviewer accepts descriptive disables.
- Collapse mirrored 4-value shorthands: `8px 0 12px 0` → `8px 0 12px`.
- `obsidianmd/no-static-styles-assignment` only flags **literal** RHS — dynamic style assignments (template literals with expressions, ternaries, variable RHS) can stay inline. Move only the static ones to a CSS class.

### Logging

- The reviewer flags every `console.*` call in shipped code. The template's `src/utils/log.ts` ships with its `console.*` lines commented out — re-enable only behind a `debugModeEnabled` settings toggle when you actually need verbose logs.
- Route stray `console.error(...)` from catch blocks through `log(msg, 'error', err)` so the suppression stays centralized.

### Release workflow

- Attach only `main.js`, `manifest.json`, and `styles.css` (if present) — never a zip. The CI release workflow in this template already does this; don't add zip-upload steps back.
- Build in CI; don't post-edit `main.js`.
- `bun-version-file: package.json` (already wired) keeps Bun pinned across CI and release. Update `packageManager` in `package.json` to bump.
- `actions/attest-build-provenance@v3` (already wired) attaches provenance to release artifacts.
