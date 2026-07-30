import { App, Notice, PluginSettingTab, Setting } from 'obsidian'
import type { ToggleComponent } from 'obsidian'
import type TypefullyPlugin from '../../main'
import { log } from '../../utils/log'
import { produce } from 'immer'
import type { Draft } from 'immer'
import type {
    PlatformSettings,
    PluginSettings,
    ScreenshotAspectRatio,
    ScreenshotBackgroundId,
    ScreenshotCardTheme,
    ScreenshotFontId,
    ScreenshotSettings,
    ScreenshotTextSize,
    ScreenshotWatermarkPosition
} from '../types/plugin-settings.intf'
import {
    PLATFORM_NAMES,
    SCREENSHOT_ASPECT_RATIOS,
    SCREENSHOT_BACKGROUND_IDS,
    SCREENSHOT_FONT_IDS,
    SCREENSHOT_TEXT_SIZES,
    SCREENSHOT_WATERMARK_POSITIONS
} from '../types/plugin-settings.intf'
import { fetchSocialSets } from '../utils/publish-typefully-draft.fn'
import { formatExcludedTags, parseExcludedTags } from '../utils/parse-excluded-tags.fn'
import { NOTICE_TIMEOUT, SCREENSHOT_BACKGROUNDS, SCREENSHOT_FONTS } from '../constants'
import { BUY_ME_A_COFFEE_BADGE_DATA_URL } from '../assets/buy-me-a-coffee'
import { renderSupportSection } from '../ui/support-links'

const ASPECT_RATIO_LABELS: Record<ScreenshotAspectRatio, string> = {
    portrait: 'Portrait (4:5)',
    square: 'Square (1:1)',
    landscape: 'Landscape (16:9)'
}

const TEXT_SIZE_LABELS: Record<ScreenshotTextSize, string> = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large'
}

const WATERMARK_POSITION_LABELS: Record<ScreenshotWatermarkPosition, string> = {
    'top-left': 'Top left',
    'top-right': 'Top right',
    'bottom-left': 'Bottom left',
    'bottom-right': 'Bottom right'
}

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
        this.renderNoteImageSection(containerEl)
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
        this.renderExcludedTags(containerEl)
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

    renderExcludedTags(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Tags to exclude')
            .setDesc(
                'Tags that must never be appended to posts (e.g., permanent_notes, literature_notes). Separate them with commas or newlines. Excluding a tag also excludes its nested tags.'
            )
            .addTextArea((textArea) => {
                textArea.setPlaceholder('permanent_notes, literature_notes')
                textArea.setValue(formatExcludedTags(this.plugin.settings.excludedTags))
                textArea.onChange(async (newValue: string) => {
                    const excludedTags = parseExcludedTags(newValue)
                    log('Tags to exclude set to: ', 'debug', excludedTags)
                    this.plugin.settings = produce(
                        this.plugin.settings,
                        (draft: Draft<PluginSettings>) => {
                            draft.excludedTags = excludedTags
                        }
                    )
                    await this.plugin.saveSettings()
                })
                textArea.inputEl.addClass('typefully-excluded-tags-input')
            })
    }

    /**
     * Update the screenshot (note image) settings and persist them
     */
    private async updateScreenshotSettings(
        update: (draft: Draft<ScreenshotSettings>) => void
    ): Promise<void> {
        this.plugin.settings = produce(this.plugin.settings, (draft: Draft<PluginSettings>) => {
            update(draft.screenshot)
        })
        await this.plugin.saveSettings()
    }

    renderNoteImageSection(containerEl: HTMLElement) {
        new Setting(containerEl).setName('Note images').setHeading()

        containerEl.createEl('p', {
            text: 'Appearance of the image card created by the "Publish a screenshot of the current note" command.',
            cls: 'setting-item-description'
        })

        const screenshot = this.plugin.settings.screenshot

        new Setting(containerEl)
            .setName('Background')
            .setDesc('Gradient displayed behind the content card.')
            .addDropdown((dropdown) => {
                for (const id of SCREENSHOT_BACKGROUND_IDS) {
                    dropdown.addOption(
                        id,
                        id === 'custom' ? 'Custom' : (SCREENSHOT_BACKGROUNDS[id]?.label ?? id)
                    )
                }
                dropdown.setValue(screenshot.background)
                dropdown.onChange(async (value) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.background = value as ScreenshotBackgroundId
                    })
                    this.display() // Refresh to show/hide the custom color pickers
                })
            })

        if (screenshot.background === 'custom') {
            new Setting(containerEl)
                .setName('Custom gradient colors')
                .setDesc('Start and end colors of the background gradient.')
                .addColorPicker((picker) => {
                    picker.setValue(screenshot.customGradientStart)
                    picker.onChange(async (value: string) => {
                        await this.updateScreenshotSettings((draft) => {
                            draft.customGradientStart = value
                        })
                    })
                })
                .addColorPicker((picker) => {
                    picker.setValue(screenshot.customGradientEnd)
                    picker.onChange(async (value: string) => {
                        await this.updateScreenshotSettings((draft) => {
                            draft.customGradientEnd = value
                        })
                    })
                })
        }

        new Setting(containerEl)
            .setName('Card theme')
            .setDesc('Colors of the content card.')
            .addDropdown((dropdown) => {
                dropdown.addOption('light', 'Light (white card, dark text)')
                dropdown.addOption('dark', 'Dark (dark card, light text)')
                dropdown.addOption('custom', 'Custom colors')
                dropdown.setValue(screenshot.cardTheme)
                dropdown.onChange(async (value) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.cardTheme = value as ScreenshotCardTheme
                    })
                    this.display() // Refresh to show/hide the custom color pickers
                })
            })

        if (screenshot.cardTheme === 'custom') {
            new Setting(containerEl)
                .setName('Custom card colors')
                .setDesc('Background and text colors of the content card.')
                .addColorPicker((picker) => {
                    picker.setValue(screenshot.customCardBackground)
                    picker.onChange(async (value: string) => {
                        await this.updateScreenshotSettings((draft) => {
                            draft.customCardBackground = value
                        })
                    })
                })
                .addColorPicker((picker) => {
                    picker.setValue(screenshot.customCardText)
                    picker.onChange(async (value: string) => {
                        await this.updateScreenshotSettings((draft) => {
                            draft.customCardText = value
                        })
                    })
                })
        }

        new Setting(containerEl)
            .setName('Font')
            .setDesc('Font used for the text on the card.')
            .addDropdown((dropdown) => {
                for (const id of SCREENSHOT_FONT_IDS) {
                    dropdown.addOption(
                        id,
                        id === 'custom' ? 'Custom' : (SCREENSHOT_FONTS[id]?.label ?? id)
                    )
                }
                dropdown.setValue(screenshot.font)
                dropdown.onChange(async (value) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.font = value as ScreenshotFontId
                    })
                    this.display() // Refresh to show/hide the custom font input
                })
            })

        if (screenshot.font === 'custom') {
            new Setting(containerEl)
                .setName('Custom font family')
                .setDesc(
                    'CSS font family, e.g. "Inter" or "Comic Sans MS". The font must be installed on your system.'
                )
                .addText((text) => {
                    text.setPlaceholder('Inter')
                    text.setValue(screenshot.customFont)
                    text.onChange(async (value: string) => {
                        await this.updateScreenshotSettings((draft) => {
                            draft.customFont = value
                        })
                    })
                })
        }

        new Setting(containerEl)
            .setName('Text size')
            .setDesc('Overall size of the text on the card.')
            .addDropdown((dropdown) => {
                for (const id of SCREENSHOT_TEXT_SIZES) {
                    dropdown.addOption(id, TEXT_SIZE_LABELS[id])
                }
                dropdown.setValue(screenshot.textSize)
                dropdown.onChange(async (value) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.textSize = value as ScreenshotTextSize
                    })
                })
            })

        new Setting(containerEl)
            .setName('Format')
            .setDesc('Aspect ratio of the image.')
            .addDropdown((dropdown) => {
                for (const id of SCREENSHOT_ASPECT_RATIOS) {
                    dropdown.addOption(id, ASPECT_RATIO_LABELS[id])
                }
                dropdown.setValue(screenshot.aspectRatio)
                dropdown.onChange(async (value) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.aspectRatio = value as ScreenshotAspectRatio
                    })
                })
            })

        new Setting(containerEl)
            .setName('Show note title')
            .setDesc('If enabled, the note title is displayed at the top of the card.')
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(screenshot.showTitle)
                toggle.onChange(async (newValue: boolean) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.showTitle = newValue
                    })
                })
            })

        new Setting(containerEl)
            .setName('Watermark text')
            .setDesc(
                'Short text stamped on the image, e.g. your name or handle. Leave empty to disable.'
            )
            .addText((text) => {
                text.setPlaceholder('dSebastien')
                text.setValue(screenshot.watermarkText)
                text.onChange(async (value: string) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.watermarkText = value
                    })
                })
            })

        new Setting(containerEl)
            .setName('Watermark position')
            .setDesc('Corner of the image where the watermark appears.')
            .addDropdown((dropdown) => {
                for (const id of SCREENSHOT_WATERMARK_POSITIONS) {
                    dropdown.addOption(id, WATERMARK_POSITION_LABELS[id])
                }
                dropdown.setValue(screenshot.watermarkPosition)
                dropdown.onChange(async (value) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.watermarkPosition = value as ScreenshotWatermarkPosition
                    })
                })
            })

        new Setting(containerEl)
            .setName('Watermark color')
            .setDesc('Color of the watermark text.')
            .addColorPicker((picker) => {
                picker.setValue(screenshot.watermarkColor)
                picker.onChange(async (value: string) => {
                    await this.updateScreenshotSettings((draft) => {
                        draft.watermarkColor = value
                    })
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
                    tagsContainer.createSpan({
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
        renderSupportSection(containerEl, (el) => {
            this.renderBuyMeACoffeeBadge(el)
        })
    }

    renderBuyMeACoffeeBadge(contentEl: HTMLElement | DocumentFragment, width = 175) {
        const linkEl = contentEl.createEl('a', {
            href: 'https://www.buymeacoffee.com/dsebastien'
        })
        const imgEl = linkEl.createEl('img')
        imgEl.src = BUY_ME_A_COFFEE_BADGE_DATA_URL
        imgEl.alt = 'Buy me a coffee'
        imgEl.width = width
    }
}
