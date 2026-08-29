import { Notice, PluginSettingTab } from 'obsidian'
import type { App, SettingDefinitionItem, SettingGroupItem, TextComponent } from 'obsidian'
import type TypefullyPlugin from '../../main'
import { log } from '../../utils/log'
import type {
    PlatformSettings,
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
import { resolveScreenshotStyle } from '../utils/resolve-screenshot-style.fn'
import type { TypefullySocialSet } from '../types/typefully-draft-contents.intf'

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

const CARD_THEME_LABELS: Record<ScreenshotCardTheme, string> = {
    light: 'Light (white card, dark text)',
    dark: 'Dark (dark card, light text)',
    custom: 'Custom colors'
}

const PLATFORM_KEYS: (keyof PlatformSettings)[] = [
    'x',
    'linkedin',
    'threads',
    'bluesky',
    'mastodon'
]

/**
 * Control keys are flat, explicit strings — never dot paths into nested
 * objects. A dot path would have to be resolved against a possibly-absent
 * parent at write time; a closed set of literals cannot address anything the
 * switch below does not name.
 */
const PLATFORM_KEY_PREFIX = 'platform:'
const SCREENSHOT_KEY_PREFIX = 'screenshot:'

/**
 * Settings tab, declared rather than rendered (Obsidian 1.13+).
 *
 * `getSettingDefinitions()` REPLACES `display()`: when it returns a non-empty
 * array, `display()` is never called. There is no partial adoption — the whole
 * settings UI is declarative, or none of it.
 *
 * Rules that each cost a shipped bug the first time they were broken:
 *
 * - A `render:` hook renders the ROW. Write into `setting.settingEl` only;
 *   anything written outside it is the framework's to discard.
 * - A row `action:` fires on the WHOLE row and draws no button — used
 *   deliberately for the "click a social set to use it" rows, and avoided
 *   everywhere a button is wanted.
 * - `setControlValue` MUST reject on failure; resolving tells the framework
 *   the write landed and the pane keeps showing a value that was never
 *   stored.
 * - A definition with neither `control` nor `render` is skipped entirely, so
 *   the two informational rows carry a no-op render hook.
 * - Obsidian ALSO calls `getSettingDefinitions()` when it registers the tab
 *   for settings search, i.e. on plugin load. Network work must therefore be
 *   guarded on the pane actually being on screen (`containerEl.isConnected`),
 *   or every user pays for an API round-trip they never asked for.
 * - The framework rebuilds rows from `getControlValue`, which reads the
 *   COMMITTED settings. Re-rendering while a text control has focus would
 *   replace what the user is typing with the last-saved value, so the async
 *   paths write into their own row instead of calling `update()`.
 */
export class TypefullySettingTab extends PluginSettingTab {
    plugin: TypefullyPlugin

    /** Social sets fetched on demand by the "Load available sets" button. */
    private socialSets: TypefullySocialSet[] = []

    constructor(app: App, plugin: TypefullyPlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    override getSettingDefinitions(): SettingDefinitionItem[] {
        const screenshot = this.plugin.settings.screenshot

        return [
            {
                name: 'Typefully account',
                searchable: false,
                visible: (): boolean => null !== this.plugin.cachedUser,
                render: (setting): void => {
                    const user = this.plugin.cachedUser
                    if (!user) {
                        return
                    }
                    setting.infoEl.remove()
                    setting.settingEl.addClass('settings-stack')
                    const profileEl = setting.settingEl.createDiv({
                        cls: 'typefully-user-profile'
                    })
                    if (user.profile_image_url) {
                        const img = profileEl.createEl('img', { cls: 'typefully-user-avatar' })
                        img.src = user.profile_image_url
                        img.alt = user.name
                    }
                    const info = profileEl.createDiv({ cls: 'typefully-user-info' })
                    info.createDiv({ cls: 'typefully-user-name', text: user.name })
                    info.createDiv({ cls: 'typefully-user-email', text: user.email })
                }
            },
            {
                type: 'group',
                heading: 'Account',
                items: [
                    {
                        name: 'Typefully API key',
                        desc: 'Your Typefully API key. Get it from Typefully Settings → API & Integrations.',
                        // A render row rather than a text control: the input is
                        // masked, and the validation status is written into
                        // this row asynchronously — re-rendering the pane
                        // instead would fight with the user's typing.
                        render: (setting): void => {
                            setting.addText((text) => {
                                text.inputEl.type = 'password'
                                text.inputEl.addClass('typefully-api-key-input')
                                text.setPlaceholder('Enter your API key')
                                    .setValue(this.plugin.settings.apiKey)
                                    .onChange((newValue) => {
                                        log(`Typefully API Key set`, 'debug')
                                        this.plugin
                                            .updateSettings((draft) => {
                                                draft.apiKey = newValue
                                            })
                                            .then(() => {
                                                if (newValue) {
                                                    void this.validateApiKey(setting.settingEl)
                                                } else {
                                                    this.clearApiKeyStatus(setting.settingEl)
                                                    this.plugin.cachedUser = null
                                                }
                                            })
                                            .catch(() => {
                                                new Notice(
                                                    'Failed to save settings.',
                                                    NOTICE_TIMEOUT
                                                )
                                            })
                                    })
                            })
                            // Only when the pane is really on screen: this hook
                            // also runs when Obsidian indexes the tab for
                            // settings search on plugin load.
                            if (this.plugin.settings.apiKey && this.containerEl.isConnected) {
                                void this.validateApiKey(setting.settingEl)
                            }
                        }
                    }
                ]
            },
            {
                type: 'group',
                heading: 'Social set',
                items: [
                    {
                        name: 'Social set ID',
                        desc: 'Your Typefully social set ID. Click "Load" to fetch available sets.',
                        // Text input plus its Load button: a declarative
                        // control row cannot carry an extra button.
                        render: (setting): void => {
                            let input: TextComponent | undefined
                            setting.addText((text) => {
                                input = text
                                text.inputEl.addClass('typefully-social-set-input')
                                text.setPlaceholder('Auto-detect')
                                    .setValue(this.plugin.settings.socialSetId)
                                    .onChange((newValue) => {
                                        log(`Social Set ID set to: `, 'debug', newValue)
                                        this.plugin
                                            .updateSettings((draft) => {
                                                draft.socialSetId = newValue
                                            })
                                            .catch(() => {
                                                new Notice(
                                                    'Failed to save settings.',
                                                    NOTICE_TIMEOUT
                                                )
                                            })
                                    })
                            })
                            setting.addButton((button) => {
                                button.setButtonText('Load available sets').onClick(() => {
                                    void this.loadSocialSets(input)
                                })
                            })
                        }
                    },
                    ...this.socialSetDefinitions()
                ]
            },
            {
                type: 'group',
                heading: 'Target platforms',
                items: [
                    {
                        name: 'Enable all platforms',
                        desc: 'When enabled, drafts will be created for all platforms at once.',
                        control: { type: 'toggle', key: 'enableAllPlatforms' }
                    },
                    ...PLATFORM_KEYS.map(
                        (platform): SettingGroupItem => ({
                            name: PLATFORM_NAMES[platform],
                            desc: `Enable publishing to ${PLATFORM_NAMES[platform]}`,
                            control: {
                                type: 'toggle',
                                key: `${PLATFORM_KEY_PREFIX}${platform}`
                            }
                        })
                    )
                ]
            },
            {
                type: 'group',
                heading: 'Publish',
                items: [
                    {
                        name: 'Enable auto scheduling',
                        desc: 'If enabled, the post will be automatically scheduled in the next free slot.',
                        control: { type: 'toggle', key: 'autoSchedule' }
                    },
                    {
                        name: 'Enable Threadify',
                        desc: 'If enabled, content will be automatically split into multiple posts at 4 consecutive newlines.',
                        control: { type: 'toggle', key: 'threadify' }
                    },
                    {
                        name: 'Append tags to posts',
                        desc: 'If enabled, the tags of the source note will be appended at the end of the post.',
                        control: { type: 'toggle', key: 'appendTags' }
                    },
                    {
                        name: 'Tags to exclude',
                        desc: 'Tags that must never be appended to posts (e.g., permanent_notes, literature_notes). Separate them with commas or newlines. Excluding a tag also excludes its nested tags.',
                        control: {
                            type: 'textarea',
                            key: 'excludedTags',
                            placeholder: 'permanent_notes, literature_notes'
                        }
                    },
                    {
                        name: 'Enable auto retweet',
                        desc: 'If enabled, the post will have an AutoRT enabled, according to the one set on Typefully for the account.',
                        control: { type: 'toggle', key: 'autoRetweet' }
                    },
                    {
                        name: 'Enable auto plug',
                        desc: 'If enabled, the post will have an AutoPlug enabled, according to the one set on Typefully for the account.',
                        control: { type: 'toggle', key: 'autoPlug' }
                    }
                ]
            },
            {
                type: 'group',
                heading: 'Note images',
                items: [
                    {
                        name: 'Appearance of the image card created by the "Publish a screenshot of the current note" command.',
                        searchable: false,
                        // Informational row: a definition with neither control
                        // nor render is skipped entirely.
                        render: (): void => {}
                    },
                    {
                        name: 'Background',
                        desc: 'Gradient displayed behind the content card.',
                        control: {
                            type: 'dropdown',
                            key: `${SCREENSHOT_KEY_PREFIX}background`,
                            options: Object.fromEntries(
                                SCREENSHOT_BACKGROUND_IDS.map((id) => [
                                    id,
                                    'custom' === id
                                        ? 'Custom'
                                        : (SCREENSHOT_BACKGROUNDS[id]?.label ?? id)
                                ])
                            )
                        }
                    },
                    {
                        name: 'Custom gradient colors',
                        desc: 'Start and end colors of the background gradient.',
                        visible: (): boolean =>
                            'custom' === this.plugin.settings.screenshot.background,
                        // Two pickers on one row: a declarative control row
                        // holds a single control.
                        render: (setting): void => {
                            setting.addColorPicker((picker) => {
                                picker.setValue(this.plugin.settings.screenshot.customGradientStart)
                                picker.onChange((value) => {
                                    this.writeScreenshot((draft) => {
                                        draft.customGradientStart = value
                                    })
                                })
                            })
                            setting.addColorPicker((picker) => {
                                picker.setValue(this.plugin.settings.screenshot.customGradientEnd)
                                picker.onChange((value) => {
                                    this.writeScreenshot((draft) => {
                                        draft.customGradientEnd = value
                                    })
                                })
                            })
                        }
                    },
                    {
                        name: 'Card theme',
                        desc: 'Colors of the content card.',
                        control: {
                            type: 'dropdown',
                            key: `${SCREENSHOT_KEY_PREFIX}cardTheme`,
                            options: CARD_THEME_LABELS
                        }
                    },
                    {
                        name: 'Custom card colors',
                        desc: 'Background and text colors of the content card.',
                        visible: (): boolean =>
                            'custom' === this.plugin.settings.screenshot.cardTheme,
                        render: (setting): void => {
                            setting.addColorPicker((picker) => {
                                picker.setValue(
                                    this.plugin.settings.screenshot.customCardBackground
                                )
                                picker.onChange((value) => {
                                    this.writeScreenshot((draft) => {
                                        draft.customCardBackground = value
                                    })
                                })
                            })
                            setting.addColorPicker((picker) => {
                                picker.setValue(this.plugin.settings.screenshot.customCardText)
                                picker.onChange((value) => {
                                    this.writeScreenshot((draft) => {
                                        draft.customCardText = value
                                    })
                                })
                            })
                        }
                    },
                    {
                        name: 'Font',
                        desc: 'Font used for the text on the card.',
                        control: {
                            type: 'dropdown',
                            key: `${SCREENSHOT_KEY_PREFIX}font`,
                            options: Object.fromEntries(
                                SCREENSHOT_FONT_IDS.map((id) => [
                                    id,
                                    'custom' === id ? 'Custom' : (SCREENSHOT_FONTS[id]?.label ?? id)
                                ])
                            )
                        }
                    },
                    {
                        name: 'Custom font family',
                        desc: 'CSS font family, e.g. "Inter" or "Comic Sans MS". The font must be installed on your system.',
                        visible: (): boolean => 'custom' === this.plugin.settings.screenshot.font,
                        control: {
                            type: 'text',
                            key: `${SCREENSHOT_KEY_PREFIX}customFont`,
                            placeholder: 'Inter'
                        }
                    },
                    {
                        name: 'Text size',
                        desc: 'Overall size of the text on the card.',
                        control: {
                            type: 'dropdown',
                            key: `${SCREENSHOT_KEY_PREFIX}textSize`,
                            options: Object.fromEntries(
                                SCREENSHOT_TEXT_SIZES.map((id) => [id, TEXT_SIZE_LABELS[id]])
                            )
                        }
                    },
                    {
                        name: 'Format',
                        desc: 'Aspect ratio of the image.',
                        control: {
                            type: 'dropdown',
                            key: `${SCREENSHOT_KEY_PREFIX}aspectRatio`,
                            options: Object.fromEntries(
                                SCREENSHOT_ASPECT_RATIOS.map((id) => [id, ASPECT_RATIO_LABELS[id]])
                            )
                        }
                    },
                    {
                        name: 'Show note title',
                        desc: 'If enabled, a title is displayed at the top of the card: the first level 1 heading of the note if it has one, otherwise the note name.',
                        control: {
                            type: 'toggle',
                            key: `${SCREENSHOT_KEY_PREFIX}showTitle`
                        }
                    },
                    {
                        name: 'Watermark text',
                        desc: 'Short text stamped on the image, e.g. your name or handle. Leave empty to disable.',
                        control: {
                            type: 'text',
                            key: `${SCREENSHOT_KEY_PREFIX}watermarkText`,
                            placeholder: 'dSebastien'
                        }
                    },
                    {
                        name: 'Watermark position',
                        desc: 'Corner of the image where the watermark appears.',
                        control: {
                            type: 'dropdown',
                            key: `${SCREENSHOT_KEY_PREFIX}watermarkPosition`,
                            options: Object.fromEntries(
                                SCREENSHOT_WATERMARK_POSITIONS.map((id) => [
                                    id,
                                    WATERMARK_POSITION_LABELS[id]
                                ])
                            )
                        }
                    },
                    {
                        name: 'Watermark color',
                        desc: 'Color of the watermark text.',
                        control: {
                            type: 'color',
                            key: `${SCREENSHOT_KEY_PREFIX}watermarkColor`
                        }
                    },
                    {
                        name: 'Link color',
                        desc:
                            '' === screenshot.linkColor
                                ? 'Automatic: a readable color is derived from the card background. Pick one to override it.'
                                : 'Color of links on the image. Reset to go back to the automatic color.',
                        // Picker plus a conditional reset button, and the
                        // description depends on whether an override is set.
                        render: (setting): void => {
                            setting.addColorPicker((picker) => {
                                // The picker always holds a color, so show the
                                // automatic one when nothing has been chosen
                                // rather than an arbitrary default.
                                picker.setValue(
                                    resolveScreenshotStyle(this.plugin.settings.screenshot)
                                        .linkColor
                                )
                                picker.onChange((value) => {
                                    this.writeScreenshot(
                                        (draft) => {
                                            draft.linkColor = value
                                        },
                                        // Re-render: the description and the
                                        // reset button depend on this value.
                                        true
                                    )
                                })
                            })
                            if ('' !== this.plugin.settings.screenshot.linkColor) {
                                setting.addExtraButton((button) => {
                                    button
                                        .setIcon('rotate-ccw')
                                        .setTooltip('Reset to the automatic color')
                                        .onClick(() => {
                                            this.writeScreenshot((draft) => {
                                                draft.linkColor = ''
                                            }, true)
                                        })
                                })
                            }
                        }
                    }
                ]
            },
            {
                type: 'group',
                heading: 'Tags',
                items: this.tagDefinitions()
            },
            {
                type: 'group',
                heading: 'About',
                items: [
                    {
                        name: 'Follow me on X',
                        desc: '@dSebastien',
                        searchable: false,
                        // A CTA button, not a row `action:` — `action:` makes
                        // the whole row clickable and draws no button at all.
                        render: (setting): void => {
                            setting.addButton((button) => {
                                button
                                    .setCta()
                                    .setButtonText('Follow me on X')
                                    .onClick(() => {
                                        window.open('https://x.com/dSebastien')
                                    })
                            })
                        }
                    },
                    {
                        name: 'Support',
                        searchable: false,
                        render: (setting): void => {
                            setting.infoEl.remove() // the section draws its own headings
                            // `.setting-item` is a flex ROW; the support block
                            // is a stack of full-width rows.
                            setting.settingEl.addClass('settings-stack')
                            renderSupportSection(setting.settingEl, (el) => {
                                this.renderBuyMeACoffeeBadge(el)
                            })
                        }
                    }
                ]
            }
        ]
    }

    /**
     * The fetched social sets, one clickable row each. A row `action:` fires
     * on the whole row, which is exactly the old list's behavior (the entries
     * were bare buttons, not settings).
     */
    private socialSetDefinitions(): SettingGroupItem[] {
        if (0 === this.socialSets.length) {
            return []
        }
        return this.socialSets.map(
            (socialSet): SettingGroupItem => ({
                name: `${socialSet.name} (@${socialSet.username}) - ID: ${socialSet.id}`,
                desc: 'Click to use this social set.',
                // Fetched data, not settings: keep it out of the search index.
                searchable: false,
                action: (): void => {
                    void (async (): Promise<void> => {
                        await this.plugin.updateSettings((draft) => {
                            draft.socialSetId = socialSet.id.toString()
                        })
                        new Notice(
                            `Selected: ${socialSet.name} (@${socialSet.username})`,
                            NOTICE_TIMEOUT
                        )
                        this.update()
                    })().catch(() => {
                        new Notice('Failed to save settings.', NOTICE_TIMEOUT)
                    })
                }
            })
        )
    }

    /**
     * The tags section: an explanatory row when the API is not configured,
     * otherwise a row that loads the tag list into itself plus a create row.
     */
    private tagDefinitions(): SettingGroupItem[] {
        if (!this.plugin.settings.apiKey || !this.plugin.settings.socialSetId) {
            return [
                {
                    name: 'Configure your API key and social set ID to manage tags.',
                    searchable: false,
                    render: (): void => {}
                }
            ]
        }

        return [
            {
                name: 'Existing tags',
                searchable: false,
                // The list is fetched into THIS row rather than triggering a
                // pane re-render, so a slow API cannot interrupt typing
                // elsewhere in the pane.
                render: (setting): void => {
                    setting.infoEl.remove()
                    setting.settingEl.addClass('settings-stack')
                    const tagsContainer = setting.settingEl.createDiv({
                        cls: 'typefully-settings-tags'
                    })
                    // Guarded: this hook also runs when Obsidian indexes the
                    // tab for settings search on plugin load.
                    if (!this.containerEl.isConnected) {
                        return
                    }
                    const client = this.plugin.getApiClient()
                    if (!client) {
                        return
                    }
                    const loadingEl = setting.settingEl.createEl('p', { text: 'Loading tags...' })
                    void (async (): Promise<void> => {
                        try {
                            const tags = await client.listTags(this.plugin.settings.socialSetId)
                            loadingEl.remove()
                            if (0 === tags.length) {
                                tagsContainer.createSpan({
                                    text: 'No tags yet.',
                                    cls: 'setting-item-description'
                                })
                                return
                            }
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
                        } catch (error) {
                            loadingEl.setText('Failed to load tags.')
                            log('Failed to load tags in settings', 'warn', error)
                        }
                    })()
                }
            },
            {
                name: 'Create new tag',
                render: (setting): void => {
                    let newTagName = ''
                    setting.addText((text) => {
                        text.setPlaceholder('Tag name')
                        text.onChange((value) => {
                            newTagName = value
                        })
                    })
                    setting.addButton((button) => {
                        button.setButtonText('Create').onClick(() => {
                            if (!newTagName.trim()) {
                                new Notice('Please enter a tag name', NOTICE_TIMEOUT)
                                return
                            }
                            const client = this.plugin.getApiClient()
                            if (!client) {
                                return
                            }
                            void (async (): Promise<void> => {
                                try {
                                    await client.createTag(this.plugin.settings.socialSetId, {
                                        name: newTagName.trim()
                                    })
                                    new Notice(`Tag "${newTagName}" created`, NOTICE_TIMEOUT)
                                    this.update()
                                } catch (error) {
                                    log('Failed to create tag', 'error', error)
                                    new Notice('Failed to create tag', NOTICE_TIMEOUT)
                                }
                            })()
                        })
                    })
                }
            }
        ]
    }

    private clearApiKeyStatus(settingEl: HTMLElement): void {
        const existing = settingEl.querySelector('.typefully-api-status')
        if (existing) existing.remove()
    }

    /**
     * Validate the stored API key and report the result inside the row.
     * Writes into the row element rather than re-rendering, so a slow API
     * response cannot replace the key the user is still typing.
     */
    private async validateApiKey(settingEl: HTMLElement): Promise<void> {
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

    /**
     * Fetch the available social sets and render them as rows. The input is
     * re-synced directly (rather than through a re-render) when a set is
     * chosen, so nothing else in the pane is disturbed.
     */
    private async loadSocialSets(input: TextComponent | undefined): Promise<void> {
        if (!this.plugin.settings.apiKey) {
            new Notice('Please enter your API key first', NOTICE_TIMEOUT)
            return
        }

        new Notice('Loading social sets...', 2000)
        const socialSets = await fetchSocialSets(this.plugin.settings.apiKey)

        if (!socialSets || 0 === socialSets.results.length) {
            new Notice('No social sets found. Check your API key.', NOTICE_TIMEOUT)
            return
        }

        this.socialSets = socialSets.results
        input?.setValue(this.plugin.settings.socialSetId)
        this.update()
    }

    /**
     * Persist a screenshot-settings change made by a render row.
     *
     * `rerender` is only set where the pane's SHAPE depends on the value (the
     * link-color description and its reset button); a plain color edit must
     * not rebuild the pane.
     */
    private writeScreenshot(update: (draft: ScreenshotSettings) => void, rerender = false): void {
        this.plugin
            .updateSettings((draft) => {
                update(draft.screenshot)
            })
            .then(() => {
                if (rerender) {
                    this.update()
                }
            })
            .catch(() => {
                new Notice('Failed to save settings.', NOTICE_TIMEOUT)
            })
    }

    /**
     * Reads the value behind a control `key`. Returning undefined/null makes
     * the framework fall back to the control's declared `defaultValue`.
     */
    override getControlValue(key: string): unknown {
        if (key.startsWith(PLATFORM_KEY_PREFIX)) {
            const platform = key.slice(PLATFORM_KEY_PREFIX.length)
            return this.isPlatformKey(platform)
                ? this.plugin.settings.platforms[platform]
                : undefined
        }
        if (key.startsWith(SCREENSHOT_KEY_PREFIX)) {
            return this.readScreenshotValue(key.slice(SCREENSHOT_KEY_PREFIX.length))
        }
        switch (key) {
            case 'enableAllPlatforms':
                return this.plugin.settings.enableAllPlatforms
            case 'autoSchedule':
                return this.plugin.settings.autoSchedule
            case 'threadify':
                return this.plugin.settings.threadify
            case 'appendTags':
                return this.plugin.settings.appendTags
            case 'autoRetweet':
                return this.plugin.settings.autoRetweet
            case 'autoPlug':
                return this.plugin.settings.autoPlug
            case 'excludedTags':
                // Stored as a list, edited as text.
                return formatExcludedTags(this.plugin.settings.excludedTags)
            default:
                return undefined
        }
    }

    /**
     * Persists a control edit. Rejecting (not resolving) on failure is what
     * lets the framework roll the control back to the stored truth.
     */
    override async setControlValue(key: string, value: unknown): Promise<void> {
        if (key.startsWith(PLATFORM_KEY_PREFIX)) {
            await this.writePlatform(key, value)
            return
        }
        if (key.startsWith(SCREENSHOT_KEY_PREFIX)) {
            await this.writeScreenshotValue(key, key.slice(SCREENSHOT_KEY_PREFIX.length), value)
            return
        }

        switch (key) {
            case 'enableAllPlatforms': {
                const next = this.expectBoolean(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.enableAllPlatforms = next
                    if (next) {
                        for (const platform of PLATFORM_KEYS) {
                            draft.platforms[platform] = true
                        }
                    }
                })
                // The individual toggles are derived from this write.
                this.update()
                return
            }
            case 'autoSchedule': {
                const next = this.expectBoolean(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.autoSchedule = next
                })
                return
            }
            case 'threadify': {
                const next = this.expectBoolean(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.threadify = next
                })
                return
            }
            case 'appendTags': {
                const next = this.expectBoolean(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.appendTags = next
                })
                return
            }
            case 'autoRetweet': {
                const next = this.expectBoolean(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.autoRetweet = next
                })
                return
            }
            case 'autoPlug': {
                const next = this.expectBoolean(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.autoPlug = next
                })
                return
            }
            case 'excludedTags': {
                if ('string' !== typeof value) {
                    throw new Error(`Setting "${key}" expects a string.`)
                }
                const excludedTags = parseExcludedTags(value)
                log('Tags to exclude set to: ', 'debug', excludedTags)
                await this.plugin.updateSettings((draft) => {
                    draft.excludedTags = excludedTags
                })
                return
            }
            default:
                new Notice('Failed to save settings.', NOTICE_TIMEOUT)
                throw new Error(`Setting "${key}" does not address a known field.`)
        }
    }

    /**
     * A platform toggle also maintains the "all platforms" flag. The derived
     * value is computed INSIDE the mutator, against the state the write is
     * actually applied to: deciding out here would use a pre-await snapshot,
     * and two quick toggles would each write a stale flag.
     */
    private async writePlatform(key: string, value: unknown): Promise<void> {
        const platform = key.slice(PLATFORM_KEY_PREFIX.length)
        if (!this.isPlatformKey(platform)) {
            new Notice('Failed to save settings.', NOTICE_TIMEOUT)
            throw new Error(`Setting "${key}" does not address a known platform.`)
        }
        const next = this.expectBoolean(key, value)
        await this.plugin.updateSettings((draft) => {
            draft.platforms[platform] = next
            draft.enableAllPlatforms = PLATFORM_KEYS.every(
                (candidate) => draft.platforms[candidate]
            )
        })
        // The "all platforms" toggle is derived from this write.
        this.update()
    }

    private readScreenshotValue(field: string): unknown {
        const screenshot = this.plugin.settings.screenshot
        switch (field) {
            case 'background':
                return screenshot.background
            case 'cardTheme':
                return screenshot.cardTheme
            case 'font':
                return screenshot.font
            case 'customFont':
                return screenshot.customFont
            case 'textSize':
                return screenshot.textSize
            case 'aspectRatio':
                return screenshot.aspectRatio
            case 'showTitle':
                return screenshot.showTitle
            case 'watermarkText':
                return screenshot.watermarkText
            case 'watermarkPosition':
                return screenshot.watermarkPosition
            case 'watermarkColor':
                return screenshot.watermarkColor
            default:
                return undefined
        }
    }

    private async writeScreenshotValue(key: string, field: string, value: unknown): Promise<void> {
        switch (field) {
            case 'background': {
                const next = this.expectOption(key, value, SCREENSHOT_BACKGROUND_IDS)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.background = next as ScreenshotBackgroundId
                })
                // Shows/hides the custom gradient pickers.
                this.update()
                return
            }
            case 'cardTheme': {
                const next = this.expectOption(key, value, Object.keys(CARD_THEME_LABELS))
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.cardTheme = next as ScreenshotCardTheme
                })
                // Shows/hides the custom card color pickers.
                this.update()
                return
            }
            case 'font': {
                const next = this.expectOption(key, value, SCREENSHOT_FONT_IDS)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.font = next as ScreenshotFontId
                })
                // Shows/hides the custom font family row.
                this.update()
                return
            }
            case 'customFont': {
                const next = this.expectString(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.customFont = next
                })
                return
            }
            case 'textSize': {
                const next = this.expectOption(key, value, SCREENSHOT_TEXT_SIZES)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.textSize = next as ScreenshotTextSize
                })
                return
            }
            case 'aspectRatio': {
                const next = this.expectOption(key, value, SCREENSHOT_ASPECT_RATIOS)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.aspectRatio = next as ScreenshotAspectRatio
                })
                return
            }
            case 'showTitle': {
                const next = this.expectBoolean(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.showTitle = next
                })
                return
            }
            case 'watermarkText': {
                const next = this.expectString(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.watermarkText = next
                })
                return
            }
            case 'watermarkPosition': {
                const next = this.expectOption(key, value, SCREENSHOT_WATERMARK_POSITIONS)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.watermarkPosition = next as ScreenshotWatermarkPosition
                })
                return
            }
            case 'watermarkColor': {
                const next = this.expectString(key, value)
                await this.plugin.updateSettings((draft) => {
                    draft.screenshot.watermarkColor = next
                })
                return
            }
            default:
                new Notice('Failed to save settings.', NOTICE_TIMEOUT)
                throw new Error(`Setting "${key}" does not address a known field.`)
        }
    }

    private isPlatformKey(value: string): value is keyof PlatformSettings {
        return (PLATFORM_KEYS as string[]).includes(value)
    }

    private expectBoolean(key: string, value: unknown): boolean {
        if ('boolean' !== typeof value) {
            throw new Error(`Setting "${key}" expects a boolean.`)
        }
        return value
    }

    private expectString(key: string, value: unknown): string {
        if ('string' !== typeof value) {
            throw new Error(`Setting "${key}" expects a string.`)
        }
        return value
    }

    /**
     * Narrows a dropdown write to the declared options: membership over the
     * option list, never a bare `typeof` check (which would accept any
     * string) and never a prototype-chain lookup.
     */
    private expectOption(key: string, value: unknown, options: readonly string[]): string {
        if ('string' !== typeof value || !options.includes(value)) {
            throw new Error(`Setting "${key}" expects one of the declared options.`)
        }
        return value
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
