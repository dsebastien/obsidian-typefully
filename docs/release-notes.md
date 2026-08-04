# Release Notes

## 3.10.0 (2026-08-04)

### Features

- **plugin:** use the note's h1 heading as note image title

## 3.9.0 (2026-07-30)

### Features

- **plugin:** make the link color on note images readable and configurable

### Bug Fixes

- **plugin:** check image limits before uploading anything
- **plugin:** tidy up link styling in generated images
- **plugin:** upload presigned media via requestUrl only

## 3.8.0 (2026-07-30)

### Features

- **plugin:** publish notes and selections as branded images
- **plugin:** show what's new in a tab instead of a modal dialog
- **plugin:** surface support CTAs everywhere users can see them

### Bug Fixes

- **plugin:** make media uploads work again
- **plugin:** stop crashing on deferred panel leaves

## 3.7.0 (2026-07-29)

### Features

- **plugin:** aggregate what's new dialogs across simultaneously updated plugins

## 3.6.0 (2026-07-29)

### Features

- **plugin:** add Knowii community to the what's new dialog and harden it

## 3.5.0 (2026-07-29)

### Features

- **plugin:** add a setting to exclude tags from appended tags

## 3.4.0 (2026-07-27)

### Features

- **plugin:** show a what's new dialog once after plugin updates

## 3.3.2 (2026-07-17)

## 3.3.1 (2026-06-17)

### Bug Fixes

- **deps:** override vulnerable transitive dev dependencies
- **deps:** pin ajv override to 6.15.0 for parity with template

## 3.3.0 (2026-06-09)

### Features

- **all:** automatically load next entries in tabs

### Bug Fixes

- **all:** worked around x limitation when posts include a url

## 3.2.4 (2026-05-14)

## 3.2.3 (2026-05-13)

## 3.2.2 (2026-05-13)

## 3.2.1 (2026-04-15)

### Bug Fixes

- **all:** fixed bug at startup

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
