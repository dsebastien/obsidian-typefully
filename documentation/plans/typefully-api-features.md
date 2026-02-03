# Typefully API v2 Feature Roadmap

This document tracks the Typefully API v2 features - both currently implemented in this plugin and available for future implementation.

## Currently Implemented Features

| Feature                     | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| Multi-platform publishing   | Support for X, LinkedIn, Threads, Bluesky, and Mastodon |
| Social set selection        | Load and select social sets from API                    |
| Auto-scheduling             | Schedule posts to `next-free-slot`                      |
| Threadify                   | Split content at 4 newlines for thread creation         |
| Append note tags            | Convert Obsidian note tags to hashtags                  |
| Individual platform toggles | Enable/disable specific platforms per post              |
| Enable all platforms toggle | Master toggle to enable all available platforms         |

## Available API Features (Not Yet Implemented)

| Feature             | API Field             | Description                       | Priority |
| ------------------- | --------------------- | --------------------------------- | -------- |
| Media uploads       | `media_ids`           | Attach images, videos, GIFs, PDFs | High     |
| Typefully tags      | `tags`                | Organize drafts with tag slugs    | Medium   |
| Draft title         | `draft_title`         | Internal label for organization   | Low      |
| Scratchpad notes    | `scratchpad_text`     | Plain text notes on drafts        | Low      |
| Share URL           | `share`               | Generate public share link        | Low      |
| Publish immediately | `publish_at: "now"`   | Instant posting                   | Medium   |
| Scheduled datetime  | `publish_at: ISO8601` | Specific datetime scheduling      | Medium   |
| X reply threading   | X platform config     | Reply to existing tweets          | Low      |
| X community posting | X platform config     | Post to X Communities             | Low      |

## API Reference

### Base URL

```
https://api.typefully.com/v2
```

### Authentication

```
Authorization: Bearer {api_key}
```

### Key Endpoints

| Endpoint                                 | Method | Description                         |
| ---------------------------------------- | ------ | ----------------------------------- |
| `/v2/social-sets`                        | GET    | List available social sets/accounts |
| `/v2/social-sets/{id}/drafts`            | POST   | Create a new draft                  |
| `/v2/social-sets/{id}/drafts/{draft_id}` | PATCH  | Update an existing draft            |

## Implementation Notes

### Media Uploads (High Priority)

To implement media uploads:

1. First upload media using the media upload endpoint
2. Receive `media_ids` from the response
3. Include `media_ids` array in the draft creation request

### Scheduled Publishing

The `publish_at` field accepts:

- `"now"` - Publish immediately
- `"next-free-slot"` - Use Typefully's auto-scheduling (currently implemented)
- ISO8601 datetime string - Schedule for specific time (e.g., `"2024-01-15T14:30:00Z"`)

### Platform-Specific Configuration

Each platform in the `platforms` object can have additional configuration:

```json
{
    "platforms": {
        "x": {
            "enabled": true,
            "reply_to_tweet_id": "1234567890",
            "community_id": "9876543210"
        }
    }
}
```
