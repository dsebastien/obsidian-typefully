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

## Troubleshooting

### "Please configure your Typefully API key"

**Problem:** You see this notice when loading the plugin.

**Solution:**

1. Get your API key from Typefully Settings > API & Integrations
2. Enter it in Obsidian Settings > Typefully > API key
3. Restart Obsidian if the error persists

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

### Content Looks Different Than Expected

**Problem:** The published content doesn't match your note.

**Expected behavior:** The plugin removes:

- Obsidian wiki links `[[link]]`
- Markdown links `[text](url)`
- Blockquotes `> text`
- YAML frontmatter

**Solution:** This is intentional for clean social posts. Preview your content in Typefully before posting to verify it looks correct.
