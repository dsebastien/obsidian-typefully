---
title: Tips & best practices
nav_order: 90
---

# Tips and Best Practices

## Common Use Cases

### Writing Twitter/X Threads

1. Enable "Threadify" in settings
2. Write your thread content with 4 blank lines between each tweet
3. Use the command to publish
4. Review and edit in Typefully before posting

```markdown
Here's an interesting insight about productivity.

Let me break this down into actionable steps:

1. Start with the hardest task
2. Take breaks every 90 minutes
3. Review your progress daily

The key takeaway: consistency beats intensity.

What's your top productivity tip?
```

### Scheduling at Specific Times

1. Enable "Show publish options modal" in settings
2. Publish a note - the modal will appear
3. Select "Specific date & time" from the Schedule dropdown
4. Pick your desired date and time
5. Click "Create Draft"

The draft will be scheduled at the exact time you specified.

### Attaching Images

Include images in your note using standard Obsidian syntax:

```markdown
Check out this chart!

![[quarterly-results.png]]

The results speak for themselves.
```

When you publish, the plugin will:

1. Detect the image reference
2. Read the file from your vault
3. Upload it to Typefully via presigned URLs
4. Attach it to the correct post in the thread
5. Strip the image syntax from the published text

Supported formats: PNG, JPEG, GIF, WebP, SVG, MP4, PDF (LinkedIn only).

### Managing Drafts

1. Click the Typefully ribbon icon or use "Open Typefully panel" from the command palette
2. The Drafts tab shows all your drafts
3. Filter by status (draft, scheduled, published, error)
4. Click a draft to view its full details
5. Use Edit to modify text, schedule, or notes
6. Use Delete to remove drafts you no longer need

### Using Tags

1. Create tags in Settings > Tags section
2. Enable "Show publish options modal"
3. When publishing, select tags in the modal
4. Tags help organize your content in Typefully

### Scheduling Content in Advance

1. Enable "Auto scheduling"
2. Set up your posting schedule in Typefully
3. Publish notes throughout the week
4. They'll be automatically queued

### Using Tags as Hashtags

1. Enable "Append tags to posts"
2. Add relevant tags to your note frontmatter:
    ```yaml
    ---
    tags: [productivity, writing, tips]
    ---
    ```
3. These become `#productivity #writing #tips` in your post

### Cross-Platform Posting

1. Connect all your social accounts in Typefully
2. Enable "Enable all platforms" or select specific platforms
3. Publish once, reach all audiences
4. Customize per-platform in Typefully if needed

### Viewing Your Queue

1. Open the Typefully panel and click the Queue tab
2. See upcoming slots for the next 7 days
3. Click on a draft preview to view its details
4. Identify available slots for new content

### Editing Your Queue Schedule

1. Open the Typefully panel and click the Schedule tab
2. Toggle days on or off
3. Add or remove time slots for each day
4. Click "Save schedule" to apply changes

## Troubleshooting

### "Please configure your Typefully API key"

**Problem:** You see this notice when loading the plugin.

**Solution:**

1. Get your API key from Typefully Settings > API & Integrations
2. Enter it in Obsidian Settings > Typefully > API key
3. The plugin validates the key immediately - look for the green "Connected" status

### "Please enable at least one target platform in settings"

**Problem:** No platforms are enabled for publishing.

**Solution:**

1. Go to plugin settings
2. Enable at least one platform (X, LinkedIn, Threads, Bluesky, or Mastodon)
3. Make sure the platform is connected in your Typefully account

### "The file cannot be published to Typefully"

**Problem:** The current file cannot be published.

**Possible causes:**

- File is not a Markdown file (.md)
- File is empty
- File is an Excalidraw drawing
- File is a canvas file

**Solution:** Open a valid Markdown file with content.

### "Please open a note before calling this command"

**Problem:** No note is currently open.

**Solution:** Open a note in the editor before using the publish command.

### "Please configure a Social Set ID in settings first"

**Problem:** You're using the List Drafts or View Queue command without a configured Social Set.

**Solution:** Go to settings, click "Load available sets", and select one.

### Draft Created But Not Visible in Typefully

**Problem:** The plugin says success but you can't find the draft.

**Possible causes:**

- Wrong social set selected
- Draft is in a different account

**Solution:**

1. Use "Load available sets" to see your social sets
2. Select the correct one
3. Check all tabs in Typefully (Drafts, Scheduled, etc.)

### API Key Not Working

**Problem:** API calls fail despite having an API key.

**Possible causes:**

- API key is invalid or expired
- Copy/paste included extra spaces
- API key was revoked

**Solution:**

1. Go to Typefully Settings > API & Integrations
2. Revoke the old key and create a new one
3. Copy carefully (no extra spaces)
4. Paste into plugin settings
5. Check that the green "Connected" status appears

### Images Not Uploading

**Problem:** Images from your note are not attached to the published draft.

**Possible causes:**

- Image file not found in vault
- Unsupported image format
- No Social Set ID configured (required for media upload)
- Image processing timed out

**Solution:**

1. Ensure the image file exists in your vault
2. Check that the format is supported (PNG, JPEG, GIF, WebP, SVG, MP4, PDF)
3. Configure a Social Set ID in settings
4. Check the console for error messages (Ctrl/Cmd + Shift + I)

### Content Looks Different Than Expected

**Problem:** The published content doesn't match your note.

**Expected behavior:** The plugin removes:

- Image embeds `![[image.png]]` and `![alt](path)`
- Obsidian wiki links `[[link]]`
- Markdown links `[text](url)`
- Blockquotes `> text`
- YAML frontmatter

**Solution:** This is intentional for clean social posts. Preview your content in Typefully before posting to verify it looks correct.
