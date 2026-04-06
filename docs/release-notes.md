# Release Notes

## 3.2.0 (2026-04-06)

### Features

- **all:** added support for analytics
- **all:** improved analytics ui
- **all:** updated deps
- **all:** updated workflows

### Bug Fixes

- **all:** fix flaky tests

## 3.1.2 (2026-03-10)

### Bug Fixes

- **all:** added a bit of delay for refresh after publishing/scheduling

## 3.1.1 (2026-03-10)

### Bug Fixes

- **all:** fixed bug with linkedin. Posts are now merged into a single one for LI

## 3.1.0 (2026-03-10)

### Features

- **all:** enabled publishing while in reading view
- **all:** improved UI
- **all:** only show future in queue

## 3.0.0 (2026-03-07)

### Features

- **all:** major improvements and typefully pane
- **all:** updated

## 2.0.0 (2026-02-03)

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

- **all:** added docs
- **all:** added selection for the social set and settings to enable/disable target platforms
- **all:** updated workflows
- **all:** used the new Bun-based template
- migrate to Typefully API v2
