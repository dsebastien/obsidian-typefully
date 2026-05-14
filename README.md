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

## Documentation

See the [full documentation](docs/README.md) for usage guides, configuration reference, and tips.

## License

[MIT](LICENSE)

## Author

[Sebastien Dubois](https://dsebastien.net) | [GitHub](https://github.com/dsebastien/obsidian-typefully) | [Issues](https://github.com/dsebastien/obsidian-typefully/issues) | [Support](https://www.buymeacoffee.com/dsebastien)
