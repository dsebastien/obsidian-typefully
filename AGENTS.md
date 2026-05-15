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
