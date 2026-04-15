---
title: Configuration
nav_order: 3
---

# Configuration

All plugin settings are available in Obsidian Settings > Community Plugins > Typefully.

## Settings

### Account

| Setting           | Type     | Default | Description                                                                                                   |
| ----------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| Typefully API key | password | `""`    | Your Typefully API key. Get it from Typefully Settings > API & Integrations. Required for the plugin to work. |

When you enter your API key, the plugin validates it immediately by calling `GET /me`. A green status message confirms the connection, or a red message indicates an invalid key.

Your user profile (name, email, avatar) is displayed at the top of the settings when authenticated.

### Social Set

| Setting       | Type | Default            | Description                                                                                                         |
| ------------- | ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Social Set ID | text | `""` (auto-detect) | Your Typefully Social Set ID. Leave empty for auto-detect, or click "Load" to fetch and select from available sets. |

**Loading Social Sets:**

1. Enter your API key first
2. Click "Load available sets"
3. Click on a social set to select it
4. The plugin will use this set for all future drafts

### Target Platforms

| Setting              | Type   | Default | Description                                                           |
| -------------------- | ------ | ------- | --------------------------------------------------------------------- |
| Enable all platforms | toggle | `false` | When enabled, drafts are created for all connected platforms at once. |
| X (Twitter)          | toggle | `true`  | Enable publishing to X (Twitter).                                     |
| LinkedIn             | toggle | `false` | Enable publishing to LinkedIn.                                        |
| Threads              | toggle | `false` | Enable publishing to Threads.                                         |
| Bluesky              | toggle | `false` | Enable publishing to Bluesky.                                         |
| Mastodon             | toggle | `false` | Enable publishing to Mastodon.                                        |

**Note:** You must enable at least one platform to publish. Platforms must also be connected in your Typefully account.

### Publishing Options

| Setting                    | Type   | Default | Description                                                                 |
| -------------------------- | ------ | ------- | --------------------------------------------------------------------------- |
| Show publish options modal | toggle | `false` | Show a modal before publishing to configure schedule, title, notes, etc.    |
| Enable Auto scheduling     | toggle | `false` | Automatically schedule posts to the next free slot in your Typefully queue. |
| Enable Threadify           | toggle | `false` | Split content into multiple posts at 4 consecutive newlines.                |
| Append tags to posts       | toggle | `false` | Append note tags as hashtags at the end of posts.                           |
| Enable Auto retweet        | toggle | `false` | Enable AutoRT according to your Typefully account settings.                 |
| Enable Auto plug           | toggle | `false` | Enable AutoPlug according to your Typefully account settings.               |

### Tags

When your API key and Social Set ID are configured, this section shows:

- All existing Typefully tags with color indicators
- A text input and "Create" button to add new tags

Tags can also be selected per-draft in the publish options modal.

### Queue Schedule

When configured, this section shows your current Typefully queue schedule (read-only).

To edit the schedule, open the Typefully panel (Schedule tab) where you can toggle days, add/remove time slots, and save changes.

## Advanced Configuration

### Getting Your API Key

1. Log in to [Typefully](https://typefully.com)
2. Go to Settings (gear icon)
3. Navigate to "API & Integrations"
4. Create or copy your API key

### Connecting Social Accounts

Before you can publish to a platform, you must connect it in Typefully:

1. Log in to Typefully
2. Go to Settings
3. Connect your social media accounts
4. Enable the corresponding toggle in the Obsidian plugin

### Social Sets

Social Sets in Typefully allow you to group multiple social accounts. If you have multiple sets:

1. Use the "Load" button to see available sets
2. Select the set you want to publish to
3. Leave empty to auto-detect (uses your default set)
