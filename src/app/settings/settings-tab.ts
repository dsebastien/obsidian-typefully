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

        this.renderUserProfile(containerEl)
        this.renderApiKey(containerEl)
        this.renderSocialSetSection(containerEl)
        this.renderPlatformsSection(containerEl)
        this.renderPublishingOptions(containerEl)
        this.renderTagsSection(containerEl)
        this.renderFollowButton(containerEl)
        this.renderSupportHeader(containerEl)
    }

    renderApiKey(containerEl: HTMLElement) {
        new Setting(containerEl).setName('Account').setHeading()

        const apiKeySetting = new Setting(containerEl)
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

                        // Validate API key
                        if (newValue) {
                            void this.validateApiKey(apiKeySetting.settingEl)
                        } else {
                            this.clearApiKeyStatus(apiKeySetting.settingEl)
                            this.plugin.cachedUser = null
                        }
                    })
                text.inputEl.type = 'password'
                text.inputEl.addClass('typefully-api-key-input')
            })

        // Show initial validation if key exists
        if (this.plugin.settings.apiKey) {
            void this.validateApiKey(apiKeySetting.settingEl)
        }
    }

    private clearApiKeyStatus(settingEl: HTMLElement) {
        const existing = settingEl.querySelector('.typefully-api-status')
        if (existing) existing.remove()
    }

    private async validateApiKey(settingEl: HTMLElement) {
        this.clearApiKeyStatus(settingEl)
        const statusEl = settingEl.createSpan({ cls: 'typefully-api-status' })
        statusEl.setText('Validating...')

        const client = this.plugin.getApiClient()
        if (!client) {
            statusEl.setText('No API key')
            statusEl.addClass('typefully-api-status-error')
            return
        }

        try {
            const user = await client.getMe()
            this.plugin.cachedUser = user
            statusEl.empty()
            statusEl.addClass('typefully-api-status-ok')
            statusEl.setText(`Connected as ${user.name}`)
        } catch {
            this.plugin.cachedUser = null
            statusEl.empty()
            statusEl.addClass('typefully-api-status-error')
            statusEl.setText('Invalid API key')
        }
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

    renderUserProfile(containerEl: HTMLElement) {
        if (!this.plugin.cachedUser) return

        const user = this.plugin.cachedUser
        const profileEl = containerEl.createDiv({ cls: 'typefully-user-profile' })

        if (user.profile_image_url) {
            const img = profileEl.createEl('img', { cls: 'typefully-user-avatar' })
            img.src = user.profile_image_url
            img.alt = user.name
        }

        const info = profileEl.createDiv({ cls: 'typefully-user-info' })
        info.createDiv({ cls: 'typefully-user-name', text: user.name })
        info.createDiv({ cls: 'typefully-user-email', text: user.email })
    }

    renderTagsSection(containerEl: HTMLElement) {
        new Setting(containerEl).setName('Tags').setHeading()

        if (!this.plugin.settings.apiKey || !this.plugin.settings.socialSetId) {
            containerEl.createEl('p', {
                text: 'Configure your API key and Social Set ID to manage tags.',
                cls: 'setting-item-description'
            })
            return
        }

        const tagsContainer = containerEl.createDiv({ cls: 'typefully-settings-tags' })
        const loadingEl = containerEl.createEl('p', { text: 'Loading tags...' })

        const client = this.plugin.getApiClient()
        if (!client) return

        void (async () => {
            try {
                const tags = await client.listTags(this.plugin.settings.socialSetId)
                loadingEl.remove()

                if (tags.length === 0) {
                    tagsContainer.createEl('span', {
                        text: 'No tags yet.',
                        cls: 'setting-item-description'
                    })
                } else {
                    for (const tag of tags) {
                        const tagEl = tagsContainer.createSpan({
                            text: tag.name,
                            cls: 'typefully-settings-tag'
                        })
                        if (tag.color) {
                            tagEl.setCssStyles({
                                borderLeft: `3px solid ${tag.color}`,
                                paddingLeft: '8px'
                            })
                        }
                    }
                }
            } catch (error) {
                loadingEl.setText('Failed to load tags.')
                log('Failed to load tags in settings', 'warn', error)
            }
        })()

        // Create tag input
        let newTagName = ''
        new Setting(containerEl)
            .setName('Create new tag')
            .addText((text) => {
                text.setPlaceholder('Tag name')
                text.onChange((value) => {
                    newTagName = value
                })
            })
            .addButton((button) => {
                button.setButtonText('Create').onClick(() => {
                    if (!newTagName.trim()) {
                        new Notice('Please enter a tag name', NOTICE_TIMEOUT)
                        return
                    }
                    void (async () => {
                        try {
                            await client.createTag(this.plugin.settings.socialSetId, {
                                name: newTagName.trim()
                            })
                            new Notice(`Tag "${newTagName}" created`, NOTICE_TIMEOUT)
                            this.display() // Refresh
                        } catch (error) {
                            log('Failed to create tag', 'error', error)
                            new Notice('Failed to create tag', NOTICE_TIMEOUT)
                        }
                    })()
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
