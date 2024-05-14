import { App, PluginSettingTab, Setting } from 'obsidian';
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

    this.renderSupportHeader(containerEl);
    this.renderApiKey(containerEl);
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

  renderSupportHeader(containerEl: HTMLElement) {
    new Setting(containerEl).setName('Support').setHeading();

    const supportDesc = new DocumentFragment();
    supportDesc.createDiv({
      text: 'Buy me a coffee to support the development of this plugin ❤️',
    });

    new Setting(containerEl).setDesc(supportDesc);

    this.renderBuyMeACoffeeBadge(containerEl);
    const spacing = containerEl.createDiv();
    spacing.style.marginBottom = '0.75em';
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
