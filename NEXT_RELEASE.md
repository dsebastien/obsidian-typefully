### Your API key is now kept in Obsidian's secret storage

Older versions saved your Typefully API key in plain text in the plugin's data file (`data.json`), which travels with your vault through git, Syncthing, or cloud sync. The key now lives in Obsidian's secret storage instead, and the data file only records the secret's name (`typefully-api-key` by default).

**Nothing to do on your side.** Every device moves its key into its own secret storage automatically the next time it starts with this version, and you stay connected everywhere.

- The plain-text copy stays in the data file for 60 days after the first device upgraded, so devices you open less often can migrate too. It is then removed automatically.
- Once all your devices run this version, you can remove it right away from the plugin settings with **Remove plain-text copy now**.
- Changing the key, or clearing it with the new **Clear** button, also removes the plain-text copy.

### New devices

Secret storage is per device and is not synced. On a device that never had the old plain-text key, open the plugin settings, select the `typefully-api-key` secret (or the name shown there) and paste your key once. The plugin now tells you clearly when the key is missing on a device.
