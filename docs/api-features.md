---
title: API features
nav_order: 10
---

# API Features

This document lists the Typefully API v2 endpoints and their support status in this plugin.

## Supported Endpoints

| Endpoint                                       | Method | Description                   | Status            |
| ---------------------------------------------- | ------ | ----------------------------- | ----------------- |
| `/me`                                          | GET    | Get current user info         | Supported         |
| `/social-sets`                                 | GET    | List social sets (accounts)   | Supported         |
| `/social-sets/{id}/drafts`                     | GET    | List drafts with filters      | Supported         |
| `/social-sets/{id}/drafts`                     | POST   | Create a new draft            | Supported         |
| `/social-sets/{id}/drafts/{draftId}`           | GET    | Get draft details             | Supported         |
| `/social-sets/{id}/drafts/{draftId}`           | PATCH  | Update a draft                | Supported         |
| `/social-sets/{id}/drafts/{draftId}`           | DELETE | Delete a draft                | Supported         |
| `/social-sets/{id}/media/upload`               | POST   | Request presigned upload URL  | Supported         |
| `/social-sets/{id}/media/{mediaId}`            | GET    | Check media processing status | Supported         |
| `/social-sets/{id}/tags`                       | GET    | List tags                     | Supported         |
| `/social-sets/{id}/tags`                       | POST   | Create a tag                  | Supported         |
| `/social-sets/{id}/queue`                      | GET    | Get queue (scheduled slots)   | Supported         |
| `/social-sets/{id}/queue/schedule`             | GET    | Get queue schedule rules      | Supported         |
| `/social-sets/{id}/queue/schedule`             | PUT    | Update queue schedule rules   | Supported (panel) |
| `/social-sets/{id}/analytics/{platform}/posts` | GET    | List post analytics           | Supported (panel) |

## Draft Features

| Feature        | Description                                        | How to use                                    |
| -------------- | -------------------------------------------------- | --------------------------------------------- |
| Multi-platform | Publish to X, LinkedIn, Threads, Bluesky, Mastodon | Enable platforms in settings                  |
| Threading      | Split content into multiple posts                  | Enable Threadify, use 4+ newlines             |
| Scheduling     | Publish now, next free slot, or specific datetime  | Use publish modal or auto-schedule setting    |
| Draft title    | Optional title for organizing drafts               | Set in publish modal                          |
| Notes          | Private scratchpad notes                           | Set in publish modal                          |
| Tags           | Categorize drafts with tags                        | Select in publish modal or manage in settings |
| Media          | Attach images and videos to posts                  | Embed images in your note                     |
| X reply-to     | Reply to a specific X post                         | Set reply-to URL in publish modal             |
| X community    | Post to an X community                             | Set community ID in publish modal             |

## Media Upload Flow

1. Plugin detects `![[image.png]]` or `![alt](path)` in content
2. Reads the file from the Obsidian vault
3. Requests a presigned upload URL from Typefully
4. Uploads the file to the presigned URL (S3)
5. Polls for processing completion (exponential backoff, max 60s)
6. Attaches the `media_id` to the appropriate post

Supported formats: PNG, JPEG, GIF, WebP, SVG, MP4, PDF (LinkedIn only).

## Not Supported

| Feature  | Reason                                          |
| -------- | ----------------------------------------------- |
| Webhooks | Not applicable for client-side Obsidian plugins |

## API Client

All API interactions go through the `TypefullyApiClient` class in `src/app/api/typefully-api-client.ts`. The client:

- Uses Obsidian's `requestUrl` for CORS compliance
- Encapsulates authentication (Bearer token)
- Provides typed methods for all endpoints
- Falls back to native `fetch()` for presigned S3 uploads if `requestUrl` fails
- Implements exponential backoff polling for media processing
