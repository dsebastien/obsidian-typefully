import { App, PluginSettingTab, Setting } from 'obsidian';
import { MyPlugin } from '../plugin';

// eslint-disable-next-line @nx/enforce-module-boundaries
import * as pluginManifest from '../../../../../manifest.json';
import { Draft, produce } from 'immer';
import { PluginSettings } from '../types';

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
      'https://github.com/dsebastien/obsidian-plugin-template/blob/master/apps/plugin/src/assets/buy-me-a-coffee.png?raw=true';
    imgEl.alt = 'Buy me a coffee';
    imgEl.width = width;
  }
}
