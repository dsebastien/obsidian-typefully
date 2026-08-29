# Changelog

All notable changes to this project will be documented in this file.

## [4.0.0](https://github.com/dsebastien/obsidian-typefully/compare/3.11.0...4.0.0) (2026-08-29)

### ⚠ BREAKING CHANGES

- **plugin:** minAppVersion moves from 1.8.7 to 1.13.0 — the
  declarative settings API (getSettingDefinitions) only exists there.

getSettingDefinitions() replaces the 820-line display() tab across all
seven sections. Plain controls wherever the framework can own them
(toggles, dropdowns, text, textarea, color); render rows where a row
needs more than one control or a masked input — the API key, the
social-set input with its Load button, the paired custom-color pickers,
and link color with its conditional reset button. Conditional rows
(custom gradient, custom card colors, custom font family) declare
visible: hooks, and the fetched social sets are rows with a row
action:, which is exactly the old list's click-to-use behavior.

Nested settings are addressed through explicit prefixed keys
(platform:x, screenshot:background) instead of dot paths, so an unknown
key cannot resolve into an object; every write validates its type and
dropdown writes are narrowed to the declared options.

The write path is a single serialized persist-then-commit
updateSettings(mutator): memory swaps only after saveData() succeeds,
and each mutation derives from the previously committed state. The
platform toggles keep enableAllPlatforms in sync INSIDE the mutator —
concurrently enabling the last two platforms has to end with the flag
set, which a pre-await snapshot gets wrong.

The async paths (API-key validation, tag loading) write into their own
row rather than re-rendering, so a slow API cannot replace text the
user is still typing, and both are guarded on containerEl.isConnected:
Obsidian also calls getSettingDefinitions() when it registers the tab
for settings search, and an unguarded call would hit the Typefully API
on every plugin load.

295 tests (13 new; ordering, serialization and the derived-flag
concurrency case each mutation-checked), tsc, lint --max-warnings 0 and
build green — the prefer-setting-definitions advisory from the previous
commit is now satisfied.

### Features

- **plugin:** declare the settings tab (Obsidian 1.13 declarative settings) ([4088536](https://github.com/dsebastien/obsidian-typefully/commit/4088536474f32366a677be1e7e7a3ab8767af408))

### Bug Fixes

- **build:** align with the catalog reviewer's archive, ruleset and audit ([fd4cdd4](https://github.com/dsebastien/obsidian-typefully/commit/fd4cdd4783d924939ba96dc28154d9597f5b4f29))
- **plugin:** close the write and re-render races found in review ([3627c74](https://github.com/dsebastien/obsidian-typefully/commit/3627c74259ed006f1fb03ee768ba0f00b63a7aaa))

## [3.11.0](https://github.com/dsebastien/obsidian-typefully/compare/3.10.0...3.11.0) (2026-08-11)

### Features

- **plugin:** publish images and videos directly ([134430e](https://github.com/dsebastien/obsidian-typefully/commit/134430ef26f214189bc71e821d6c729747c80019)), closes [#13](https://github.com/dsebastien/obsidian-typefully/issues/13)

## [3.10.0](https://github.com/dsebastien/obsidian-typefully/compare/3.9.0...3.10.0) (2026-08-04)

### Features

- **plugin:** use the note's h1 heading as note image title ([8250df7](https://github.com/dsebastien/obsidian-typefully/commit/8250df782ed39e85bb5b3e79da162b196c79590e))

## [3.9.0](https://github.com/dsebastien/obsidian-typefully/compare/3.8.0...3.9.0) (2026-07-30)

### Features

- **plugin:** make the link color on note images readable and configurable ([3724032](https://github.com/dsebastien/obsidian-typefully/commit/3724032299c7169de7bcf84f9da14636a6d03378))

### Bug Fixes

- **plugin:** check image limits before uploading anything ([5586f39](https://github.com/dsebastien/obsidian-typefully/commit/5586f397391f94c875970c80aac57320ef39de33))
- **plugin:** tidy up link styling in generated images ([690af14](https://github.com/dsebastien/obsidian-typefully/commit/690af14143d508d4cd3d3fe6bf921ee9a39c5bbd))
- **plugin:** upload presigned media via requestUrl only ([a479ce3](https://github.com/dsebastien/obsidian-typefully/commit/a479ce3d071de05ef98a1bb9d9a5255a57ef918c))

## [3.8.0](https://github.com/dsebastien/obsidian-typefully/compare/3.7.0...3.8.0) (2026-07-30)

### Features

- **plugin:** publish notes and selections as branded images ([bfbcf8e](https://github.com/dsebastien/obsidian-typefully/commit/bfbcf8ede2bb70b7a61e2f0f7ac6cf641745466d))
- **plugin:** show what's new in a tab instead of a modal dialog ([a3d0311](https://github.com/dsebastien/obsidian-typefully/commit/a3d0311dfc44627f90024543027374be97ab42a6))
- **plugin:** surface support CTAs everywhere users can see them ([35331c8](https://github.com/dsebastien/obsidian-typefully/commit/35331c8fe84cc0b2a30a55aa47087e3cc15f5b43))

### Bug Fixes

- **plugin:** make media uploads work again ([5ec8508](https://github.com/dsebastien/obsidian-typefully/commit/5ec8508463e61dfe1547b554c0a6007ec157d439))
- **plugin:** stop crashing on deferred panel leaves ([29611a7](https://github.com/dsebastien/obsidian-typefully/commit/29611a7431de89cd3106133d9cc8c10105de7f51))

## [3.7.0](https://github.com/dsebastien/obsidian-typefully/compare/3.6.0...3.7.0) (2026-07-29)

### Features

- **plugin:** aggregate what's new dialogs across simultaneously updated plugins ([5dcb96f](https://github.com/dsebastien/obsidian-typefully/commit/5dcb96f80ffe3d3e01c3b28aff5b60883f2ba09c))

## [3.6.0](https://github.com/dsebastien/obsidian-typefully/compare/3.5.0...3.6.0) (2026-07-29)

### Features

- **plugin:** add Knowii community to the what's new dialog and harden it ([fbb838a](https://github.com/dsebastien/obsidian-typefully/commit/fbb838ab2acd2f7120ddca49876f5920d701ea15))

## [3.5.0](https://github.com/dsebastien/obsidian-typefully/compare/3.4.0...3.5.0) (2026-07-29)

### Features

- **plugin:** add a setting to exclude tags from appended tags ([e5f7c4b](https://github.com/dsebastien/obsidian-typefully/commit/e5f7c4b2dcf8119918c8f6916b16484b0af4cbee)), closes [#8](https://github.com/dsebastien/obsidian-typefully/issues/8)

## [3.4.0](https://github.com/dsebastien/obsidian-typefully/compare/3.3.2...3.4.0) (2026-07-27)

### Features

- **plugin:** show a what's new dialog once after plugin updates ([092b7cb](https://github.com/dsebastien/obsidian-typefully/commit/092b7cbe5ac2b5f5f78b6502304684039e66ce8b))

## [3.3.2](https://github.com/dsebastien/obsidian-typefully/compare/3.3.1...3.3.2) (2026-07-17)

## [3.3.1](https://github.com/dsebastien/obsidian-typefully/compare/3.3.0...3.3.1) (2026-06-17)

### Bug Fixes

- **deps:** override vulnerable transitive dev dependencies ([1fde453](https://github.com/dsebastien/obsidian-typefully/commit/1fde4538c72b790879c5ad14d3231e8023adb7b7))
- **deps:** pin ajv override to 6.15.0 for parity with template ([500fced](https://github.com/dsebastien/obsidian-typefully/commit/500fced4d8bdca8dc165d359d483737a1569759c))

## [3.3.0](https://github.com/dsebastien/obsidian-typefully/compare/3.2.4...3.3.0) (2026-06-09)

### Features

- **all:** automatically load next entries in tabs ([07511d6](https://github.com/dsebastien/obsidian-typefully/commit/07511d64a0b884bc9e64bcc73f0b8dbcf1589b9b))

### Bug Fixes

- **all:** worked around x limitation when posts include a url ([0c5660f](https://github.com/dsebastien/obsidian-typefully/commit/0c5660fffff6f25a624f01f065f1c3f24690a0e2))

## [3.2.4](https://github.com/dsebastien/obsidian-typefully/compare/3.2.3...3.2.4) (2026-05-14)

## [3.2.3](https://github.com/dsebastien/obsidian-typefully/compare/3.2.2...3.2.3) (2026-05-13)

## [3.2.2](https://github.com/dsebastien/obsidian-typefully/compare/3.2.1...3.2.2) (2026-05-13)

## [3.2.1](https://github.com/dsebastien/obsidian-typefully/compare/3.2.0...3.2.1) (2026-04-15)

### Bug Fixes

- **all:** fixed bug at startup ([6e36588](https://github.com/dsebastien/obsidian-typefully/commit/6e36588e74bf6c5961d7cdcb94388dd92c5a01d4))

## [3.2.0](https://github.com/dsebastien/obsidian-typefully/compare/3.1.2...3.2.0) (2026-04-06)

### Features

- **all:** added support for analytics ([ec3a93b](https://github.com/dsebastien/obsidian-typefully/commit/ec3a93bb4b4082226ab54e75823fc34ca094c590))
- **all:** improved analytics ui ([efebaf4](https://github.com/dsebastien/obsidian-typefully/commit/efebaf454df3fcc7a48d8623037ad83ad35b4981))
- **all:** updated deps ([646dd93](https://github.com/dsebastien/obsidian-typefully/commit/646dd937cdcc3a232850fd22f9adf3f91d00bf8b))
- **all:** updated workflows ([0cde850](https://github.com/dsebastien/obsidian-typefully/commit/0cde850284f75889ce472e206b5a7aede1e81a76))

### Bug Fixes

- **all:** fix flaky tests ([462a5ce](https://github.com/dsebastien/obsidian-typefully/commit/462a5cea256309559fb504ab28e2cf85347d83e2))

## [3.1.2](https://github.com/dsebastien/obsidian-typefully/compare/3.1.1...3.1.2) (2026-03-10)

### Bug Fixes

- **all:** added a bit of delay for refresh after publishing/scheduling ([41f42e9](https://github.com/dsebastien/obsidian-typefully/commit/41f42e9c1b59eb1f46e6c3f5808f54c615f0eae4))

## [3.1.1](https://github.com/dsebastien/obsidian-typefully/compare/3.1.0...3.1.1) (2026-03-10)

### Bug Fixes

- **all:** fixed bug with linkedin. Posts are now merged into a single one for LI ([5af64f7](https://github.com/dsebastien/obsidian-typefully/commit/5af64f78ce7b476d8b23538f7ea7f98c0805c448))

## [3.1.0](https://github.com/dsebastien/obsidian-typefully/compare/3.0.0...3.1.0) (2026-03-10)

### Features

- **all:** enabled publishing while in reading view ([7f4670e](https://github.com/dsebastien/obsidian-typefully/commit/7f4670ed1c4e6ab22a1e3b8456a65158e77ec3d4)), closes [#10](https://github.com/dsebastien/obsidian-typefully/issues/10)
- **all:** improved UI ([8cb99f6](https://github.com/dsebastien/obsidian-typefully/commit/8cb99f60bd5887869604be05968feff34c674d05))
- **all:** only show future in queue ([995b931](https://github.com/dsebastien/obsidian-typefully/commit/995b9311cc634a59925aa44b5b0f96302ae1c8a0))

## [3.0.0](https://github.com/dsebastien/obsidian-typefully/compare/2.0.0...3.0.0) (2026-03-07)

### Features

- **all:** major improvements and typefully pane ([d72a274](https://github.com/dsebastien/obsidian-typefully/commit/d72a27471275c58a2f44d3c02a40a3726bd677f8))
- **all:** updated ([6843fe2](https://github.com/dsebastien/obsidian-typefully/commit/6843fe20f1bb4193d551077e85ef2d51ba7fcc52))

## [2.0.0](https://github.com/dsebastien/obsidian-typefully/compare/1.2.10...2.0.0) (2026-02-03)

### ⚠ BREAKING CHANGES

- Migrated from Typefully API v1 to v2

Changes:

- Updated API endpoint from /v1/drafts to /v2/social-sets/{id}/drafts
- Changed auth header from X-API-KEY to Authorization: Bearer
- Updated draft content format to use platforms object with posts array
- Added socialSetId setting (optional - auto-detects if not set)
- Added fetchSocialSets function for auto-detection
- Updated response handling for v2 format
- Threadify now splits content into multiple post objects

The v2 API provides better multi-platform support and is the recommended
version per Typefully's December 2025 announcement.

### Features

- **all:** added docs ([24662ba](https://github.com/dsebastien/obsidian-typefully/commit/24662baa35cc4a918a7c0ee9aa6610ea6d91271a))
- **all:** added selection for the social set and settings to enable/disable target platforms ([20a1fae](https://github.com/dsebastien/obsidian-typefully/commit/20a1faeb4c426644e8cfabcd2021992660ec081f))
- **all:** updated workflows ([48764a5](https://github.com/dsebastien/obsidian-typefully/commit/48764a5027a5c71c8fa633bd31cba4020cad8a43))
- **all:** used the new Bun-based template ([1701f05](https://github.com/dsebastien/obsidian-typefully/commit/1701f05d623576fde51b630d99f3043493f3bfac))
- migrate to Typefully API v2 ([bfe33b0](https://github.com/dsebastien/obsidian-typefully/commit/bfe33b087deed4e53368475a2ed260375cf02e91))
