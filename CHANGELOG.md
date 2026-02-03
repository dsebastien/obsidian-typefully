# Changelog

All notable changes to this project will be documented in this file.

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
