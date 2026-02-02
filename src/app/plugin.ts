import { Notice, Plugin } from 'obsidian'
import type { TFile } from 'obsidian'
import { DEFAULT_PLATFORM_SETTINGS, DEFAULT_SETTINGS } from './types/plugin-settings.intf'
import type { PluginSettings } from './types/plugin-settings.intf'
import { TypefullySettingTab } from './settings/settings-tab'
import { log } from '../utils/log'
import { produce } from 'immer'
import type { Draft } from 'immer'
import {
    DEFAULT_CANVAS_FILE_NAME,
    MARKDOWN_FILE_EXTENSION,
    MSG_API_KEY_CONFIGURATION_REQUIRED,
    NOTICE_TIMEOUT
} from './constants'
import { isExcalidrawFile } from './utils/is-excalidraw-file.fn'
import { publishTypefullyDraft } from './utils/publish-typefully-draft.fn'
import { cleanMarkdownForTypeFully } from './utils/clean-markdown-for-typefully.fn'
import { getFileTags } from './utils/get-file-tags.fn'
import type { TypefullyPlatforms } from './types/typefully-draft-contents.intf'

export class TypefullyPlugin extends Plugin {
    /**
     * The plugin settings are immutable
     */
    settings: PluginSettings = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS)

    /**
     * Executed as soon as the plugin loads
     */
    override async onload() {
        log('Initializing', 'debug')
        await this.loadSettings()

        // Add a settings screen for the plugin
        this.addSettingTab(new TypefullySettingTab(this.app, this))

        if ('' === this.settings.apiKey) {
            new Notice(MSG_API_KEY_CONFIGURATION_REQUIRED, NOTICE_TIMEOUT)
        }

        // Add commands
        this.addCommand({
            id: 'publish-note',
            name: 'Publish the current note',
            editorCallback: async (_editor, view) => {
                log('Publishing the current note to Typefully', 'debug')
                const currentFile = view.file

                if (!currentFile) {
                    new Notice('Please open a note before calling this command', NOTICE_TIMEOUT)
                    return
                }

                await this.publishFile(currentFile)
            }
        })

        // Add context menu entries
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor, view) => {
                menu.addSeparator()
                menu.addItem((item) => {
                    item.setIcon('arrows-up-from-line')
                    item.setTitle('Publish the current note to Typefully').onClick(async () => {
                        const currentFile = view.file

                        if (!currentFile) {
                            new Notice(
                                'Please open a note before calling this command',
                                NOTICE_TIMEOUT
                            )
                            return
                        }

                        await this.publishFile(currentFile)
                    })
                })
                menu.addItem((item) => {
                    item.setIcon('arrows-up-from-line')
                    item.setTitle('Publish the current selection to Typefully').onClick(
                        async () => {
                            const selection = editor.getSelection()
                            const file = view.file
                            const fileTags = getFileTags(file, this.app)

                            await this.publish(selection, fileTags)
                        }
                    )
                })
            })
        )
    }

    async publish(content: string, tags: string[]) {
        // Check if at least one platform is enabled
        const { platforms } = this.settings
        const hasEnabledPlatform =
            platforms.x ||
            platforms.linkedin ||
            platforms.threads ||
            platforms.bluesky ||
            platforms.mastodon

        if (!hasEnabledPlatform) {
            new Notice('Please enable at least one target platform in settings', NOTICE_TIMEOUT)
            return
        }

        let cleanedContent = cleanMarkdownForTypeFully(content)

        if (this.settings.appendTags && tags.length > 0) {
            log('Tags to append: ', 'debug', tags)
            let tagsString = '\n\n'
            tagsString += tags.join(' ')
            cleanedContent += tagsString
        }

        // Build posts array - split by 4 newlines if threadify is enabled
        let posts: { text: string }[]
        if (this.settings.threadify) {
            posts = cleanedContent
                .split('\n\n\n\n')
                .filter((text) => text.trim())
                .map((text) => ({ text: text.trim() }))
        } else {
            posts = [{ text: cleanedContent }]
        }

        log('Text to publish', 'debug', cleanedContent)

        // Build platforms object based on settings
        const platformConfig = { enabled: true, posts }
        const targetPlatforms: TypefullyPlatforms = {}

        if (platforms.x) {
            targetPlatforms.x = platformConfig
        }
        if (platforms.linkedin) {
            targetPlatforms.linkedin = platformConfig
        }
        if (platforms.threads) {
            targetPlatforms.threads = platformConfig
        }
        if (platforms.bluesky) {
            targetPlatforms.bluesky = platformConfig
        }
        if (platforms.mastodon) {
            targetPlatforms.mastodon = platformConfig
        }

        const enabledPlatformNames = Object.keys(targetPlatforms).join(', ')
        log(`Publishing to platforms: ${enabledPlatformNames}`, 'debug')

        const result = await publishTypefullyDraft(
            {
                platforms: targetPlatforms,
                publish_at: this.settings.autoSchedule ? 'next-free-slot' : undefined
            },
            this.settings.apiKey,
            this.settings.socialSetId
        )

        if (result.successful) {
            const msg = `Typefully draft created for: ${enabledPlatformNames}`
            log(msg, 'debug', result)
            new Notice(msg, NOTICE_TIMEOUT)
        } else {
            log('Failed to publish Typefully draft', 'debug', result)
            if (result.errorDetails) {
                new Notice(result.errorDetails.detail, NOTICE_TIMEOUT)
            }
        }
    }

    async publishFile(fileToPublish: TFile) {
        if (!(await this.canBePublishedToTypefully(fileToPublish))) {
            const msg = 'The file cannot be published to Typefully'
            log(msg, 'debug', fileToPublish)
            new Notice(msg, NOTICE_TIMEOUT)
            return
        }

        const fileContent = await this.app.vault.read(fileToPublish)
        const fileTags = getFileTags(fileToPublish, this.app)
        return this.publish(fileContent, fileTags)
    }

    override onunload() {}

    /**
     * Load the plugin settings
     */
    async loadSettings() {
        log('Loading settings', 'debug')
        const loadedSettings = (await this.loadData()) as PluginSettings | null

        if (!loadedSettings) {
            log('Using default settings', 'debug')
            this.settings = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS)
            return
        }

        let needToSaveSettings = false

        this.settings = produce(this.settings, (draft: Draft<PluginSettings>) => {
            // String settings - use nullish coalescing for empty strings
            draft.apiKey = loadedSettings.apiKey ?? ''
            draft.socialSetId = loadedSettings.socialSetId ?? ''

            // Boolean settings - check if defined
            if (typeof loadedSettings.autoRetweet === 'boolean') {
                draft.autoRetweet = loadedSettings.autoRetweet
            } else {
                needToSaveSettings = true
            }

            if (typeof loadedSettings.autoPlug === 'boolean') {
                draft.autoPlug = loadedSettings.autoPlug
            } else {
                needToSaveSettings = true
            }

            if (typeof loadedSettings.threadify === 'boolean') {
                draft.threadify = loadedSettings.threadify
            } else {
                needToSaveSettings = true
            }

            if (typeof loadedSettings.autoSchedule === 'boolean') {
                draft.autoSchedule = loadedSettings.autoSchedule
            } else {
                needToSaveSettings = true
            }

            if (typeof loadedSettings.appendTags === 'boolean') {
                draft.appendTags = loadedSettings.appendTags
            } else {
                needToSaveSettings = true
            }

            // New settings - enableAllPlatforms
            if (typeof loadedSettings.enableAllPlatforms === 'boolean') {
                draft.enableAllPlatforms = loadedSettings.enableAllPlatforms
            } else {
                needToSaveSettings = true
            }

            // Platform settings - merge with defaults
            if (loadedSettings.platforms && typeof loadedSettings.platforms === 'object') {
                draft.platforms = {
                    x:
                        typeof loadedSettings.platforms.x === 'boolean'
                            ? loadedSettings.platforms.x
                            : DEFAULT_PLATFORM_SETTINGS.x,
                    linkedin:
                        typeof loadedSettings.platforms.linkedin === 'boolean'
                            ? loadedSettings.platforms.linkedin
                            : DEFAULT_PLATFORM_SETTINGS.linkedin,
                    threads:
                        typeof loadedSettings.platforms.threads === 'boolean'
                            ? loadedSettings.platforms.threads
                            : DEFAULT_PLATFORM_SETTINGS.threads,
                    bluesky:
                        typeof loadedSettings.platforms.bluesky === 'boolean'
                            ? loadedSettings.platforms.bluesky
                            : DEFAULT_PLATFORM_SETTINGS.bluesky,
                    mastodon:
                        typeof loadedSettings.platforms.mastodon === 'boolean'
                            ? loadedSettings.platforms.mastodon
                            : DEFAULT_PLATFORM_SETTINGS.mastodon
                }
            } else {
                draft.platforms = { ...DEFAULT_PLATFORM_SETTINGS }
                needToSaveSettings = true
            }
        })

        log(`Settings loaded`, 'debug', this.settings)

        if (needToSaveSettings) {
            void this.saveSettings()
        }
    }

    /**
     * Save the plugin settings
     */
    async saveSettings() {
        log('Saving settings', 'debug', this.settings)
        await this.saveData(this.settings)
        log('Settings saved', 'debug', this.settings)
    }

    async canBePublishedToTypefully(file: TFile): Promise<boolean> {
        if (!file.path) {
            return false
        }

        if (MARKDOWN_FILE_EXTENSION !== file.extension) {
            return false
        }

        if (DEFAULT_CANVAS_FILE_NAME === file.name) {
            return false
        }

        const fileContent = (await this.app.vault.read(file)).trim()
        if (fileContent.length === 0) {
            return false
        }

        if (isExcalidrawFile(file)) {
            return false
        }

        return true
    }
}
