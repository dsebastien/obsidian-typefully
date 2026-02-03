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
