# Release Notes

## 3.1.0 (2026-02-25)

### Features

- **Typefully panel**: Replaced modal dialogs with a dedicated `ItemView` in the right sidebar
- **Three tabs**: Drafts, Queue, and Schedule tabs with drill-down navigation and back button
- **Queue schedule editing**: Edit posting schedule directly from the Schedule tab (toggle days, add/remove times)
- **Ribbon icon**: One-click access to the Typefully panel
- **New commands**: "Open Typefully panel", "View queue schedule", "Refresh drafts", "Publish the current selection"

### Changes

- Draft list, detail, edit, and queue views moved from modal dialogs to persistent sidebar panel
- Commands "List drafts" and "View queue" now open the panel instead of modals
- PublishModal and ConfirmModal remain as transient action dialogs

## 3.0.0 (2026-02-23)

### Features

- **API client refactor**: Centralized `TypefullyApiClient` class covering all 15+ Typefully API v2 endpoints
- **Media upload**: Attach vault images to posts with automatic presigned URL upload and processing
- **Draft management**: List, view, edit, delete, and schedule existing drafts via modals
- **Publish options modal**: Per-draft control for scheduling, title, notes, tags, and X-specific settings
- **Tag management**: View existing tags and create new ones from plugin settings
- **Queue view**: See upcoming scheduled slots for the next 7 days
- **User profile**: API key validation with instant feedback and profile display in settings
- **Image extraction**: Detect and upload `![[image.png]]` and `![alt](path)` from notes
- **Image syntax removal**: Automatically strip image references from published text
- **Specific datetime scheduling**: Schedule drafts to exact ISO 8601 timestamps
- **Draft notes**: Add private scratchpad notes to drafts (not published)
- **X reply-to URL**: Reply to a specific X post when creating drafts
- **X community ID**: Post to an X community when creating drafts
- **New commands**: "List Typefully drafts" and "View Typefully queue" in command palette

### Improvements

- Extracted API logic into `TypefullyApiClient` class for better testability
- Added comprehensive API type definitions (`TypefullyUser`, `TypefullyDraft`, `TypefullyTag`, etc.)
- Settings reorganized into sections: Account, Social Set, Platforms, Publishing, Tags, Queue Schedule, Support
- Image syntax cleaned from published content alongside existing markdown cleaning
- Backward-compatible: existing publish behavior preserved when publish modal is disabled

## 2.0.0 (2026-02-03)

### BREAKING CHANGES

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
