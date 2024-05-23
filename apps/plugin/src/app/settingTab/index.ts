import { App, PluginSettingTab, Setting, ToggleComponent } from 'obsidian';
import { MyPlugin } from '../plugin';
import { log } from '../utils/log';
import { Draft, produce } from 'immer';
import { PluginSettings } from '../types/plugin-settings.intf';

export class SettingsTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    this.renderApiKey(containerEl);
    this.renderAutoRetweet(containerEl);
    this.renderAutoPlug(containerEl);
    this.renderThreadify(containerEl);
    this.renderAutoSchedule(containerEl);
    this.renderAppendTags(containerEl);
    this.renderSupportHeader(containerEl);
  }

  renderApiKey(containerEl: HTMLElement) {
    new Setting(containerEl).setName('Typefully API Key').addText((text) => {
      text
        .setPlaceholder('')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (newValue) => {
          log(`Typefully API Key set to: `, 'debug', newValue);
          this.plugin.settings = produce(
            this.plugin.settings,
            (draft: Draft<PluginSettings>) => {
              draft.apiKey = newValue;
            }
          );
          await this.plugin.saveSettings();
        });
    });
  }

  renderAutoRetweet(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Enable Auto retweet')
      .setDesc(
        'If enabled, the post will have an AutoRT enabled, according to the one set on Typefully for the account.'
      )
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(this.plugin.settings.autoRetweet);
        toggle.onChange(async (newValue: boolean) => {
          this.plugin.settings = produce(
            this.plugin.settings,
            (draft: Draft<PluginSettings>) => {
              draft.autoRetweet = newValue;
            }
          );
          await this.plugin.saveSettings();
        });
      });
  }

  renderAutoPlug(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Enable Auto plug')
      .setDesc(
        'If enabled, the post will have an AutoPlug enabled, according to the one set on Typefully for the account.'
      )
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(this.plugin.settings.autoPlug);
        toggle.onChange(async (newValue: boolean) => {
          this.plugin.settings = produce(
            this.plugin.settings,
            (draft: Draft<PluginSettings>) => {
              draft.autoPlug = newValue;
            }
          );
          await this.plugin.saveSettings();
        });
      });
  }

  renderThreadify(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Enable Threadify')
      .setDesc(
        'If enabled, content will be automatically split into multiple tweets.'
      )
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(this.plugin.settings.threadify);
        toggle.onChange(async (newValue: boolean) => {
          this.plugin.settings = produce(
            this.plugin.settings,
            (draft: Draft<PluginSettings>) => {
              draft.threadify = newValue;
            }
          );
          await this.plugin.saveSettings();
        });
      });
  }

  renderAutoSchedule(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Enable Auto scheduling')
      .setDesc(
        'If enabled, the post will be automatically scheduled in the next free slot.'
      )
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(this.plugin.settings.autoSchedule);
        toggle.onChange(async (newValue: boolean) => {
          this.plugin.settings = produce(
            this.plugin.settings,
            (draft: Draft<PluginSettings>) => {
              draft.autoSchedule = newValue;
            }
          );
          await this.plugin.saveSettings();
        });
      });
  }

  renderAppendTags(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Append tags to posts')
      .setDesc(
        'If enabled, the tags of the source note will be appended at the end of the post.'
      )
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(this.plugin.settings.appendTags);
        toggle.onChange(async (newValue: boolean) => {
          this.plugin.settings = produce(
            this.plugin.settings,
            (draft: Draft<PluginSettings>) => {
              draft.appendTags = newValue;
            }
          );
          await this.plugin.saveSettings();
        });
      });
  }

  renderSupportHeader(containerEl: HTMLElement) {
    new Setting(containerEl).setName('Support').setHeading();

    const supportDesc = new DocumentFragment();
    supportDesc.createDiv({
      text: 'Buy me a coffee to support the development of this plugin ❤️',
    });

    new Setting(containerEl).setDesc(supportDesc);

    this.renderBuyMeACoffeeBadge(containerEl);
    const spacing = containerEl.createDiv();
    spacing.classList.add('support-header-margin');
  }

  renderBuyMeACoffeeBadge(
    contentEl: HTMLElement | DocumentFragment,
    width = 175
  ) {
    const linkEl = contentEl.createEl('a', {
      href: 'https://www.buymeacoffee.com/dsebastien',
    });
    const imgEl = linkEl.createEl('img');
    imgEl.src =
      'https://github.com/dsebastien/obsidian-plugin-template/raw/main/apps/plugin/src/assets/buy-me-a-coffee.png';
    imgEl.alt = 'Buy me a coffee';
    imgEl.width = width;
  }
}
