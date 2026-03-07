# Usage

## Getting Started

1. Install the plugin via Obsidian's Community Plugins browser
2. Enable the plugin in Settings > Community Plugins
3. Configure your Typefully API key (see [Configuration](configuration.md))
4. Enable at least one target platform
5. Start publishing your notes!

## Commands

| Command                       | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| Open Typefully panel          | Opens or reveals the Typefully panel in the right sidebar                 |
| Publish the current note      | Creates a Typefully draft from the entire note content                    |
| Publish the current selection | Creates a Typefully draft from selected text (command palette or context) |
| List drafts                   | Opens the Typefully panel to the Drafts tab                               |
| View queue                    | Opens the Typefully panel to the Queue tab                                |
| View queue schedule           | Opens the Typefully panel to the Schedule tab                             |
| Refresh drafts                | Re-fetches and re-renders the drafts list if the panel is open            |

### Using Commands

**Command Palette:**

1. Open a note you want to publish
2. Open the command palette (`Ctrl/Cmd + P`)
3. Search for "Typefully"
4. Select the desired command

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

### Typefully Panel

The Typefully panel opens in the right sidebar and persists alongside your notes. It has three tabs:

- **Drafts**: Browse, filter, sort, view, edit, and delete your Typefully drafts
- **Queue**: View upcoming scheduled slots for the next 7 days, click drafts to see details
- **Schedule**: Edit your queue schedule (toggle days, add/remove time slots, save changes)

Open the panel via the ribbon icon, the "Open Typefully panel" command, or any of the draft/queue commands.

Use the back button to navigate between detail/edit pages and the list. Clicking a tab resets navigation to that tab's root page.

### Publish Options Modal

When "Show publish options modal" is enabled in settings, a modal appears before each publish. This lets you configure per-draft:

- **Schedule mode**: Publish now, next free slot, or a specific date/time
- **Draft title**: Optional title for the draft
- **Notes**: Private scratchpad notes (not published)
- **Tags**: Select from your Typefully tags
- **X settings**: Reply-to URL and Community ID for X posts

### Image Attachments

The plugin automatically detects images in your notes and uploads them to Typefully:

- **Wiki-style**: `![[photo.png]]` or `![[photo.png|alt text]]`
- **Standard Markdown**: `![alt text](path/to/image.jpg)`

Supported formats: PNG, JPEG, GIF, WebP, SVG, MP4, PDF (LinkedIn only).

When Threadify is enabled, images are attached to the thread segment they appear in.

Image syntax is automatically stripped from the published text.

### Draft Management

Open the Typefully panel (Drafts tab) to manage your drafts:

- **Filter** by status: All, Draft, Scheduled, Published, Error
- **Sort** by created date or scheduled date
- **View** full draft details including content, platforms, tags, and URLs
- **Edit** draft text, title, notes, and schedule
- **Delete** drafts with confirmation
- **Paginate** through results with "Load more"

### Queue View

Open the Typefully panel (Queue tab) to see your upcoming schedule:

- Shows scheduled slots for the next 7 days
- Each slot shows either a draft preview or "Available"
- Click a draft preview to view its full details

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

### Tag Management

In plugin settings under the "Tags" section:

- View all existing Typefully tags
- Create new tags directly from Obsidian
- Select tags in the publish modal when creating drafts

### Markdown Cleaning

The plugin automatically cleans Obsidian-specific markdown syntax for clean social posts:

| Original                      | Cleaned         |
| ----------------------------- | --------------- |
| `![[image.png]]`              | Removed         |
| `![alt](path/image.jpg)`      | Removed         |
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
