import { App, Notice, PluginSettingTab, Setting } from 'obsidian'
import type { ToggleComponent } from 'obsidian'
import type TypefullyPlugin from '../../main'
import { log } from '../../utils/log'
import { produce } from 'immer'
import type { Draft } from 'immer'
import type { PlatformSettings, PluginSettings } from '../types/plugin-settings.intf'
import { PLATFORM_NAMES } from '../types/plugin-settings.intf'
import { fetchSocialSets } from '../utils/publish-typefully-draft.fn'
import { NOTICE_TIMEOUT } from '../constants'

export class TypefullySettingTab extends PluginSettingTab {
    plugin: TypefullyPlugin
    private platformToggles: Map<keyof PlatformSettings, ToggleComponent> = new Map()

    constructor(app: App, plugin: TypefullyPlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()
        this.platformToggles.clear()

        this.renderApiKey(containerEl)
        this.renderSocialSetSection(containerEl)
        this.renderPlatformsSection(containerEl)
        this.renderPublishingOptions(containerEl)
        this.renderFollowButton(containerEl)
        this.renderSupportHeader(containerEl)
    }

    renderApiKey(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Typefully API key')
            .setDesc('Your Typefully API key. Get it from Typefully Settings → API & Integrations.')
            .addText((text) => {
                text.setPlaceholder('Enter your API key')
                    .setValue(this.plugin.settings.apiKey)
                    .onChange(async (newValue) => {
                        log(`Typefully API Key set`, 'debug')
                        this.plugin.settings = produce(
                            this.plugin.settings,
                            (draft: Draft<PluginSettings>) => {
                                draft.apiKey = newValue
                            }
                        )
                        await this.plugin.saveSettings()
                    })
                text.inputEl.type = 'password'
                text.inputEl.addClass('typefully-api-key-input')
            })
    }

    renderSocialSetSection(containerEl: HTMLElement) {
        new Setting(containerEl).setName('Social set').setHeading()

        const socialSetSetting = new Setting(containerEl)
            .setName('Social Set ID')
            .setDesc('Your Typefully Social Set ID. Click "Load" to fetch available sets.')
            .addText((text) => {
                text.setPlaceholder('Auto-detect')
                    .setValue(this.plugin.settings.socialSetId)
                    .onChange(async (newValue) => {
                        log(`Social Set ID set to: `, 'debug', newValue)
                        this.plugin.settings = produce(
                            this.plugin.settings,
                            (draft: Draft<PluginSettings>) => {
                                draft.socialSetId = newValue
                            }
                        )
                        await this.plugin.saveSettings()
                    })
                text.inputEl.addClass('typefully-social-set-input')
            })
            .addButton((button) => {
                button.setButtonText('Load available sets').onClick(() => {
                    void this.loadSocialSets(containerEl, socialSetSetting)
                })
            })
    }

    async loadSocialSets(containerEl: HTMLElement, parentSetting: Setting) {
        if (!this.plugin.settings.apiKey) {
            new Notice('Please enter your API key first', NOTICE_TIMEOUT)
            return
        }

        new Notice('Loading social sets...', 2000)

        const socialSets = await fetchSocialSets(this.plugin.settings.apiKey)

        if (!socialSets || socialSets.results.length === 0) {
            new Notice('No social sets found. Check your API key.', NOTICE_TIMEOUT)
            return
        }

        // Remove any existing social set list
        const existingList = containerEl.querySelector('.social-sets-list')
        if (existingList) {
            existingList.remove()
        }

        // Create a container for the social sets list
        const listContainer = containerEl.createDiv({ cls: 'typefully-social-sets-list' })

        // Insert after the social set setting
        parentSetting.settingEl.after(listContainer)

        const listDesc = listContainer.createDiv({ cls: 'typefully-social-sets-desc' })
        listDesc.setText(`Found ${socialSets.count} social set(s). Click to use:`)

        for (const socialSet of socialSets.results) {
            const setButton = listContainer.createEl('button', {
                text: `${socialSet.name} (@${socialSet.username}) - ID: ${socialSet.id}`,
                cls: 'mod-muted typefully-social-set-button'
            })

            setButton.addEventListener('click', () => {
                void (async () => {
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.socialSetId = socialSet.id.toString()
                        }
                    )
                    await this.plugin.saveSettings()
                    new Notice(
                        `Selected: ${socialSet.name} (@${socialSet.username})`,
                        NOTICE_TIMEOUT
                    )
                    this.display() // Refresh to show updated value
                })()
            })
        }
    }

    renderPlatformsSection(containerEl: HTMLElement) {
        new Setting(containerEl).setName('Target platforms').setHeading()

        new Setting(containerEl)
            .setName('Enable all platforms')
            .setDesc('When enabled, drafts will be created for all platforms at once.')
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.enableAllPlatforms)
                toggle.onChange(async (newValue: boolean) => {
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.enableAllPlatforms = newValue
                            if (newValue) {
                                // Enable all individual platforms
                                draft.platforms.x = true
                                draft.platforms.linkedin = true
                                draft.platforms.threads = true
                                draft.platforms.bluesky = true
                                draft.platforms.mastodon = true
                            }
                        }
                    )
                    await this.plugin.saveSettings()
                    // Update all individual toggles
                    if (newValue) {
                        for (const platformToggle of this.platformToggles.values()) {
                            platformToggle.setValue(true)
                        }
                    }
                })
            })

        // Individual platform toggles
        const platforms: (keyof PlatformSettings)[] = [
            'x',
            'linkedin',
            'threads',
            'bluesky',
            'mastodon'
        ]

        for (const platform of platforms) {
            this.renderPlatformToggle(containerEl, platform)
        }
    }

    renderPlatformToggle(containerEl: HTMLElement, platform: keyof PlatformSettings) {
        new Setting(containerEl)
            .setName(PLATFORM_NAMES[platform])
            .setDesc(`Enable publishing to ${PLATFORM_NAMES[platform]}`)
            .addToggle((toggle: ToggleComponent) => {
                this.platformToggles.set(platform, toggle)
                toggle.setValue(this.plugin.settings.platforms[platform])
                toggle.onChange(async (newValue: boolean) => {
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.platforms[platform] = newValue
                            // If any platform is disabled, disable the "all platforms" toggle
                            if (!newValue) {
                                draft.enableAllPlatforms = false
                            }
                            // If all platforms are now enabled, enable the "all platforms" toggle
                            const allEnabled =
                                draft.platforms.x &&
                                draft.platforms.linkedin &&
                                draft.platforms.threads &&
                                draft.platforms.bluesky &&
                                draft.platforms.mastodon
                            if (allEnabled) {
                                draft.enableAllPlatforms = true
                            }
                        }
                    )
                    await this.plugin.saveSettings()
                })
            })
    }

    renderPublishingOptions(containerEl: HTMLElement) {
        new Setting(containerEl).setName('Publish').setHeading()

        this.renderAutoSchedule(containerEl)
        this.renderThreadify(containerEl)
        this.renderAppendTags(containerEl)
        this.renderAutoRetweet(containerEl)
        this.renderAutoPlug(containerEl)
    }

    renderAutoRetweet(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Enable Auto retweet')
            .setDesc(
                'If enabled, the post will have an AutoRT enabled, according to the one set on Typefully for the account.'
            )
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.autoRetweet)
                toggle.onChange(async (newValue: boolean) => {
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.autoRetweet = newValue
                        }
                    )
                    await this.plugin.saveSettings()
                })
            })
    }

    renderAutoPlug(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Enable Auto plug')
            .setDesc(
                'If enabled, the post will have an AutoPlug enabled, according to the one set on Typefully for the account.'
            )
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.autoPlug)
                toggle.onChange(async (newValue: boolean) => {
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.autoPlug = newValue
                        }
                    )
                    await this.plugin.saveSettings()
                })
            })
    }

    renderThreadify(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Enable Threadify')
            .setDesc(
                'If enabled, content will be automatically split into multiple posts at 4 consecutive newlines.'
            )
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.threadify)
                toggle.onChange(async (newValue: boolean) => {
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.threadify = newValue
                        }
                    )
                    await this.plugin.saveSettings()
                })
            })
    }

    renderAutoSchedule(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Enable Auto scheduling')
            .setDesc('If enabled, the post will be automatically scheduled in the next free slot.')
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.autoSchedule)
                toggle.onChange(async (newValue: boolean) => {
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.autoSchedule = newValue
                        }
                    )
                    await this.plugin.saveSettings()
                })
            })
    }

    renderAppendTags(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Append tags to posts')
            .setDesc(
                'If enabled, the tags of the source note will be appended at the end of the post.'
            )
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.appendTags)
                toggle.onChange(async (newValue: boolean) => {
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.appendTags = newValue
                        }
                    )
                    await this.plugin.saveSettings()
                })
            })
    }

    renderFollowButton(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Follow me on X')
            .setDesc('@dSebastien')
            .addButton((button) => {
                button.setCta()
                button.setButtonText('Follow me on X').onClick(() => {
                    window.open('https://x.com/dSebastien')
                })
            })
    }

    renderSupportHeader(containerEl: HTMLElement) {
        new Setting(containerEl).setName('Support').setHeading()

        const supportDesc = new DocumentFragment()
        supportDesc.createDiv({
            text: 'Buy me a coffee to support the development of this plugin'
        })

        new Setting(containerEl).setDesc(supportDesc)

        this.renderBuyMeACoffeeBadge(containerEl)
        const spacing = containerEl.createDiv()
        spacing.classList.add('support-header-margin')
    }

    renderBuyMeACoffeeBadge(contentEl: HTMLElement | DocumentFragment, width = 175) {
        const linkEl = contentEl.createEl('a', {
            href: 'https://www.buymeacoffee.com/dsebastien'
        })
        const imgEl = linkEl.createEl('img')
        imgEl.src =
            'https://github.com/dsebastien/obsidian-plugin-template/blob/main/src/assets/buy-me-a-coffee.png?raw=true'
        imgEl.alt = 'Buy me a coffee'
        imgEl.width = width
    }
}
