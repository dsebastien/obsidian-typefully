---
title: Overview
nav_order: 1
permalink: /
---

# Obsidian Typefully

Publish your Obsidian notes to social media platforms through [Typefully](https://typefully.com). This plugin provides comprehensive Typefully API v2 integration, letting you manage your social media workflow entirely from Obsidian.

## Key Features

- **Multi-platform publishing**: Publish to X, LinkedIn, Threads, Bluesky, and Mastodon simultaneously
- **Image attachments**: Embed vault images in your posts with automatic upload
- **Dedicated Typefully panel**: Persistent sidebar view with Drafts, Queue, and Schedule tabs
- **Draft management**: Browse, view, edit, delete, and schedule drafts from the panel
- **Queue schedule editing**: Edit your posting schedule directly from the panel
- **Publish modal**: Set schedule, title, notes, tags, and X-specific settings per draft
- **Threadify**: Automatically split long content into threads at 4 consecutive newlines
- **Auto-scheduling**: Schedule posts to your next free slot automatically
- **Tag management**: Create and manage Typefully tags from settings
- **Queue view**: See upcoming scheduled slots for the next 7 days
- **Tag support**: Append note tags as hashtags to your posts
- **Selection publishing**: Publish entire notes or just selected text
- **Markdown cleaning**: Automatically strips Obsidian-specific syntax and image references for clean social posts
- **API key validation**: Instant validation and profile display when configuring your API key

## Installation

### Community plugins (recommended)

1. In Obsidian, go to **Settings → Community plugins**.
2. Disable **Restricted mode** if it's enabled.
3. Select **Browse**, search for **Typefully**, install it, then enable it.

You can also browse the catalog on the [Obsidian Community](https://community.obsidian.md/) website.

### Manual installation

If the plugin isn't listed in the community catalog yet (or you want a specific version):

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/dsebastien/obsidian-typefully/releases).
2. Copy them into `<Vault>/.obsidian/plugins/typefully/`.
3. Reload Obsidian and enable **Typefully** in **Settings → Community plugins**.

### BRAT (bleeding edge)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewers Auto-update Tool) installs plugins straight from a GitHub repo and keeps them updated automatically. Use this if you want the latest commits — **things might break**.

1. Install **Obsidian42 - BRAT** from **Settings → Community plugins → Browse** and enable it.
2. Run **BRAT: Add a beta plugin for testing** from the command palette.
3. Paste `https://github.com/dsebastien/obsidian-typefully`.
4. Select the latest version and confirm.
5. Enable **Typefully** in **Settings → Community plugins**.

## Quick Start

1. Install the plugin (see above) and enable it.
2. Get your Typefully API key from [Typefully Settings > API & Integrations](https://typefully.com/settings).
3. Enter your API key in the plugin settings.
4. Enable your target platforms.
5. Open a note and use the command palette or context menu to publish.

## About

Created by [Sebastien Dubois](https://dsebastien.net).

- [GitHub Repository](https://github.com/dsebastien/obsidian-typefully)
- [Report Issues](https://github.com/dsebastien/obsidian-typefully/issues)
- [Support Development](https://www.buymeacoffee.com/dsebastien)
