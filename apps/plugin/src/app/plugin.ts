import { Notice, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings } from './types/plugin-settings.intf';
import { SettingsTab } from './settingTab';
import { log } from './utils/log';
import { Draft, produce } from 'immer';
import {
  DEFAULT_CANVAS_FILE_NAME,
  MARKDOWN_FILE_EXTENSION,
  MSG_API_KEY_CONFIGURATION_REQUIRED,
  NOTICE_TIMEOUT,
} from './constants';
import { isExcalidrawFile } from './utils/is-excalidraw-file.fn';
import { removeFrontMatter } from './utils/remove-front-matter.fn';
import { publishTypefullyDraft } from './utils/publish-typefully-draft.fn';
import { removeMarkdownLinks } from './utils/remove-markdown-links.fn';

export class MyPlugin extends Plugin {
  /**
   * The plugin settings are immutable
   */
  settings: PluginSettings = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS);

  /**
   * Executed as soon as the plugin loads
   */
  async onload() {
    log('Initializing', 'debug');
    await this.loadSettings();

    // Add a settings screen for the plugin
    this.addSettingTab(new SettingsTab(this.app, this));

    if ('' === this.settings.apiKey) {
      new Notice(MSG_API_KEY_CONFIGURATION_REQUIRED, NOTICE_TIMEOUT);
    }

    // Add commands
    this.addCommand({
      id: 'publish-note-to-typefully',
      name: 'Publish the current note to Typefully',
      editorCallback: async (_editor, view) => {
        log('Publishing the current note to Typefully', 'debug');
        const currentFile = view.file;

        if (!currentFile) {
          new Notice(
            'Please open a note before calling this command',
            NOTICE_TIMEOUT
          );
          return;
        }

        await this.tryToPublishFile(currentFile);
      },
    });
  }

  async tryToPublishFile(fileToPublish: TFile) {
    if (!this.canBePublishedToTypefully(fileToPublish)) {
      const msg = 'The file cannot be published to Typefully';
      log(msg, 'debug', fileToPublish);
      new Notice(msg, NOTICE_TIMEOUT);
      return;
    }

    let fileContent = await this.app.vault.read(fileToPublish);
    fileContent = removeFrontMatter(fileContent);
    fileContent = fileContent.trim();
    // Remove obsidian links
    fileContent = fileContent.replace('[[', ''); // Link open
    fileContent = fileContent.replace(']]', ''); // Link close
    fileContent = fileContent.replace('> ', ''); // Quotes
    fileContent = removeMarkdownLinks(fileContent);

    log('Text to publish', 'debug', fileContent);

    publishTypefullyDraft(
      {
        content: fileContent,
        'schedule-date': this.settings.autoSchedule
          ? 'next-free-slot'
          : undefined,
        auto_retweet_enabled: this.settings.autoRetweet,
        auto_plug_enabled: this.settings.autoPlug,
        threadify: this.settings.threadify,
      },
      this.settings.apiKey
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onunload() {}

  /**
   * Load the plugin settings
   */
  async loadSettings() {
    log('Loading settings', 'debug');
    let loadedSettings = (await this.loadData()) as PluginSettings;

    if (!loadedSettings) {
      log('Using default settings', 'debug');
      loadedSettings = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS);
      return;
    }

    let needToSaveSettings = false;

    this.settings = produce(this.settings, (draft: Draft<PluginSettings>) => {
      if (loadedSettings.apiKey) {
        draft.apiKey = loadedSettings.apiKey;
      } else {
        log('The loaded settings miss the [apiKey] property', 'debug');
        needToSaveSettings = true;
      }

      if (loadedSettings.autoRetweet) {
        draft.autoRetweet = loadedSettings.autoRetweet;
      } else {
        log('The loaded settings miss the [autoRetweet] property', 'debug');
        needToSaveSettings = true;
      }

      if (loadedSettings.autoPlug) {
        draft.autoPlug = loadedSettings.autoPlug;
      } else {
        log('The loaded settings miss the [autoPlug] property', 'debug');
        needToSaveSettings = true;
      }

      if (loadedSettings.threadify) {
        draft.threadify = loadedSettings.threadify;
      } else {
        log('The loaded settings miss the [threadify] property', 'debug');
        needToSaveSettings = true;
      }

      if (loadedSettings.autoSchedule) {
        draft.autoSchedule = loadedSettings.autoSchedule;
      } else {
        log('The loaded settings miss the [autoSchedule] property', 'debug');
        needToSaveSettings = true;
      }
    });

    log(`Settings loaded`, 'debug', loadedSettings);

    if (needToSaveSettings) {
      this.saveSettings();
    }
  }

  /**
   * Save the plugin settings
   */
  async saveSettings() {
    log('Saving settings', 'debug', this.settings);
    await this.saveData(this.settings);
    log('Settings saved', 'debug', this.settings);
  }

  async canBePublishedToTypefully(file: TFile): Promise<boolean> {
    if (!file.path) {
      return false;
    }

    if (MARKDOWN_FILE_EXTENSION !== file.extension) {
      return false;
    }

    if (DEFAULT_CANVAS_FILE_NAME === file.name) {
      return false;
    }

    const fileContent = (await this.app.vault.read(file)).trim();
    if (fileContent.length === 0) {
      return false;
    }

    if (isExcalidrawFile(file)) {
      return false;
    }

    return true;
  }
}
