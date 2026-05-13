# Obsidian Typefully

An Obsidian plugin that integrates with [Typefully](https://typefully.com) to publish your notes as social media posts. Supports X (Twitter), LinkedIn, Threads, Bluesky, and Mastodon with full Typefully API v2 coverage.

## Features

- Dedicated Typefully panel in the right sidebar with Drafts, Queue, and Schedule tabs
- Publish notes or selected text to multiple platforms simultaneously
- Attach vault images to posts (auto-upload via presigned URLs)
- Browse, view, edit, and delete Typefully drafts from the panel
- Edit queue schedule directly from the panel
- Schedule posts: immediately, next free slot, or specific date/time
- Thread creation via Threadify (split on 4+ consecutive newlines)
- Manage Typefully tags from within Obsidian
- View queue schedule and upcoming slots
- Optional publish modal for per-draft scheduling, notes, and X settings
- Automatic Markdown cleaning (strips frontmatter, wiki links, blockquotes, image syntax)
- Append note tags as hashtags

## Installation

### From the Obsidian community catalog (recommended)

1. In Obsidian, go to **Settings → Community plugins**.
2. Disable **Restricted mode** if you have not already.
3. Select **Browse**, search for **Typefully**, install it, and then enable it.
4. Enter your API key from [Typefully Settings > API & Integrations](https://typefully.com/settings).

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub release](https://github.com/dsebastien/obsidian-typefully/releases).
2. Copy them into `<YourVault>/.obsidian/plugins/typefully/` (create the folder if it does not exist).
3. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Documentation

See the [full documentation](docs/README.md) for usage guides, configuration reference, and tips.

## License

[MIT](LICENSE)

## Author

[Sebastien Dubois](https://dsebastien.net) | [GitHub](https://github.com/dsebastien/obsidian-typefully) | [Issues](https://github.com/dsebastien/obsidian-typefully/issues) | [Support](https://www.buymeacoffee.com/dsebastien)
