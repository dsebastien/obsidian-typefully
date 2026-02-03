# Usage

## Getting Started

1. Install the plugin via Obsidian's Community Plugins browser
2. Enable the plugin in Settings > Community Plugins
3. Configure your Typefully API key (see [Configuration](configuration.md))
4. Enable at least one target platform
5. Start publishing your notes!

## Commands

| Command                       | Description                                                      |
| ----------------------------- | ---------------------------------------------------------------- |
| Publish the current note      | Creates a Typefully draft from the entire note content           |
| Publish the current selection | Creates a Typefully draft from selected text only (context menu) |

### Using Commands

**Command Palette:**

1. Open a note you want to publish
2. Open the command palette (`Ctrl/Cmd + P`)
3. Search for "Typefully"
4. Select "Publish the current note"

**Context Menu:**

1. Select text in your note (or right-click anywhere for the full note)
2. Right-click to open the context menu
3. Choose "Publish the current note to Typefully" or "Publish the current selection to Typefully"

## Features

### Multi-Platform Publishing

The plugin supports publishing to multiple social media platforms simultaneously:

- **X (Twitter)**: Enabled by default
- **LinkedIn**: Connect your LinkedIn account in Typefully
- **Threads**: Connect your Threads account in Typefully
- **Bluesky**: Connect your Bluesky account in Typefully
- **Mastodon**: Connect your Mastodon account in Typefully

Enable/disable platforms individually or use "Enable all platforms" for convenience.

### Threadify (Thread Creation)

When Threadify is enabled, your content is automatically split into multiple posts at **4 consecutive newlines**.

**Example:**

```markdown
This is my first tweet.

This is my second tweet in the thread.

And this is my third!
```

This creates a thread with 3 posts. Use this to write long-form content in Obsidian that becomes a Twitter/X thread.

### Auto-Scheduling

When enabled, your draft is automatically scheduled to your next free slot in Typefully's queue. This uses your configured posting schedule in Typefully.

### Tag Appending

When enabled, tags from your note (including frontmatter tags) are automatically appended as hashtags at the end of your post.

**Example:**
A note with `tags: [productivity, obsidian]` in frontmatter will have `#productivity #obsidian` appended.

### Markdown Cleaning

The plugin automatically cleans Obsidian-specific markdown syntax for clean social posts:

| Original                      | Cleaned         |
| ----------------------------- | --------------- |
| `[[Internal Link]]`           | `Internal Link` |
| `[[Link\|Display Text]]`      | `Display Text`  |
| `[External](https://url.com)` | `External`      |
| `> Quoted text`               | `Quoted text`   |
| YAML frontmatter              | Removed         |

## File Requirements

Not all files can be published. The plugin validates files before publishing:

- Must be a Markdown file (`.md`)
- Must have content (not empty)
- Cannot be the default canvas file
- Cannot be an Excalidraw file

If a file cannot be published, you'll see a notice explaining why.
