# Release Notes

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
