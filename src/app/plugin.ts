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
import type { TypefullyPlatforms, TypefullyPost } from './types/typefully-draft-contents.intf'
import { TypefullyApiClient } from './api/typefully-api-client'
import type { TypefullyUser } from './types/typefully-api.intf'
import { extractImagesFromMarkdown } from './utils/extract-images-from-markdown.fn'
import type { ExtractedImage } from './utils/extract-images-from-markdown.fn'
import { uploadVaultMedia } from './utils/upload-vault-media.fn'
import { TypefullyView } from './views/typefully-view'
import { VIEW_TYPE_TYPEFULLY } from './views/typefully-view-state'
import type { ViewPage } from './views/typefully-view-state'

export class TypefullyPlugin extends Plugin {
    /**
     * The plugin settings are immutable
     */
    settings: PluginSettings = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS)

    /**
     * Cached API client instance. Recreated when the API key changes.
     */
    private apiClient: TypefullyApiClient | null = null
    private apiClientKey = ''

    /**
     * Cached user info from getMe()
     */
    cachedUser: TypefullyUser | null = null

    /**
     * Executed as soon as the plugin loads
     */
    override async onload() {
        log('Initializing', 'debug')
        await this.loadSettings()

        // Register the Typefully view
        this.registerView(VIEW_TYPE_TYPEFULLY, (leaf) => new TypefullyView(leaf, this))

        // Add a settings screen for the plugin
        this.addSettingTab(new TypefullySettingTab(this.app, this))

        if ('' === this.settings.apiKey) {
            new Notice(MSG_API_KEY_CONFIGURATION_REQUIRED, NOTICE_TIMEOUT)
        }

        // Add ribbon icon
        this.addRibbonIcon('arrows-up-from-line', 'Open Typefully', () => {
            void this.activateView()
        })

        // Add commands
        this.addCommand({
            id: 'publish-note',
            name: 'Publish the current note',
            callback: async () => {
                log('Publishing the current note to Typefully', 'debug')
                const currentFile = this.app.workspace.getActiveFile()

                if (!currentFile) {
                    new Notice('Please open a note before calling this command', NOTICE_TIMEOUT)
                    return
                }

                await this.publishFile(currentFile)
            }
        })

        this.addCommand({
            id: 'publish-selection',
            name: 'Publish the current selection',
            editorCallback: async (editor, view) => {
                const selection = editor.getSelection()
                if (!selection) {
                    new Notice('Please select some text first', NOTICE_TIMEOUT)
                    return
                }
                const file = view.file
                const fileTags = getFileTags(file, this.app)
                await this.publishContent(selection, fileTags)
            }
        })

        this.addCommand({
            id: 'open-view',
            name: 'Open panel',
            callback: () => {
                void this.activateView()
            }
        })

        this.addCommand({
            id: 'list-drafts',
            name: 'List drafts',
            callback: () => {
                void this.activateView({ type: 'drafts-list' })
            }
        })

        this.addCommand({
            id: 'view-queue',
            name: 'View queue',
            callback: () => {
                void this.activateView({ type: 'queue' })
            }
        })

        this.addCommand({
            id: 'view-queue-schedule',
            name: 'View queue schedule',
            callback: () => {
                void this.activateView({ type: 'queue-schedule' })
            }
        })

        this.addCommand({
            id: 'refresh-drafts',
            name: 'Refresh drafts',
            callback: () => {
                const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TYPEFULLY)
                if (leaves.length > 0) {
                    const view = leaves[0]!.view as TypefullyView
                    view.setPage({ type: 'drafts-list' })
                }
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

                            await this.publishContent(selection, fileTags)
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

        // Extract images before cleaning (cleaning removes image syntax)
        const extractedImages = extractImagesFromMarkdown(content)

        let cleanedContent = cleanMarkdownForTypeFully(content)

        if (this.settings.appendTags && tags.length > 0) {
            log('Tags to append: ', 'debug', tags)
            let tagsString = '\n\n'
            tagsString += tags.join(' ')
            cleanedContent += tagsString
        }

        // Build posts array - split by 4 newlines if threadify is enabled
        let posts: TypefullyPost[]
        if (this.settings.threadify) {
            posts = cleanedContent
                .split('\n\n\n\n')
                .filter((text) => text.trim())
                .map((text) => ({ text: text.trim() }))
        } else {
            posts = [{ text: cleanedContent }]
        }

        // Upload images if any found and API client is available
        if (extractedImages.length > 0) {
            await this.attachMediaToPosts(extractedImages, posts, content)
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
            this.refreshView()
        } else {
            log('Failed to publish Typefully draft', 'debug', result)
            if (result.errorDetails) {
                new Notice(result.errorDetails.detail, NOTICE_TIMEOUT)
            }
        }
    }

    /**
     * Upload extracted images and attach media_ids to the appropriate posts.
     * When threadify is enabled, images are mapped to the thread segment they belong to.
     */
    private async attachMediaToPosts(
        images: ExtractedImage[],
        posts: TypefullyPost[],
        originalContent: string
    ): Promise<void> {
        const client = this.getApiClient()
        if (!client) return

        const socialSetId = this.settings.socialSetId
        if (!socialSetId) {
            log('No social set ID for media upload, skipping images', 'warn')
            return
        }

        const totalImages = images.length
        for (let i = 0; i < totalImages; i++) {
            const image = images[i]!
            new Notice(`Uploading image ${i + 1}/${totalImages}...`, 2000)

            const uploaded = await uploadVaultMedia(this.app, client, socialSetId, image.path)
            if (!uploaded) continue

            // Find which post segment this image belongs to
            const postIndex = this.findPostIndexForImage(image, originalContent, posts)
            const target = posts[postIndex]
            if (target) {
                if (!target.media_ids) target.media_ids = []
                target.media_ids.push(uploaded.mediaId)
            }
        }
    }

    /**
     * Determine which post segment an image belongs to based on its position
     * in the original content relative to the thread split points.
     */
    private findPostIndexForImage(
        image: ExtractedImage,
        originalContent: string,
        posts: TypefullyPost[]
    ): number {
        if (posts.length <= 1) return 0

        const imagePos = originalContent.indexOf(image.originalSyntax)
        if (imagePos === -1) return 0

        // Find segment boundaries (split on 4+ newlines)
        const segments = originalContent.split('\n\n\n\n')
        let offset = 0
        for (let i = 0; i < segments.length; i++) {
            const segEnd = offset + segments[i]!.length
            if (imagePos >= offset && imagePos < segEnd) {
                return Math.min(i, posts.length - 1)
            }
            // Account for the separator length
            offset = segEnd + 4
        }

        return 0
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
        return this.publishContent(fileContent, fileTags)
    }

    async publishContent(content: string, tags: string[]) {
        return this.publish(content, tags)
    }

    /**
     * Get or create a cached API client instance.
     * Recreates the client if the API key has changed.
     */
    getApiClient(): TypefullyApiClient | null {
        if (!this.settings.apiKey) return null
        if (!this.apiClient || this.apiClientKey !== this.settings.apiKey) {
            this.apiClient = new TypefullyApiClient(this.settings.apiKey)
            this.apiClientKey = this.settings.apiKey
        }
        return this.apiClient
    }

    /**
     * Refresh the Typefully panel if it is open.
     */
    refreshView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TYPEFULLY)
        for (const leaf of leaves) {
            const view = leaf.view as TypefullyView
            view.refresh()
        }
    }

    override onunload() {}

    async activateView(initialPage?: ViewPage) {
        const { workspace } = this.app

        let leaf = workspace.getLeavesOfType(VIEW_TYPE_TYPEFULLY)[0]

        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false)
            if (rightLeaf) {
                await rightLeaf.setViewState({
                    type: VIEW_TYPE_TYPEFULLY,
                    active: true
                })
                leaf = rightLeaf
            }
        }

        if (leaf) {
            await workspace.revealLeaf(leaf)
            if (initialPage) {
                const view = leaf.view as TypefullyView
                view.setPage(initialPage)
            }
        }
    }

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
