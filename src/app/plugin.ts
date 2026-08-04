import { registerWhatsNewView } from './whats-new'
import { Component, MarkdownRenderer, MarkdownView, Notice, Platform, Plugin } from 'obsidian'
import type { TFile } from 'obsidian'
import {
    DEFAULT_PLATFORM_SETTINGS,
    DEFAULT_SCREENSHOT_SETTINGS,
    DEFAULT_SETTINGS,
    SCREENSHOT_ASPECT_RATIOS,
    SCREENSHOT_BACKGROUND_IDS,
    SCREENSHOT_CARD_THEMES,
    SCREENSHOT_FONT_IDS,
    SCREENSHOT_TEXT_SIZES,
    SCREENSHOT_WATERMARK_POSITIONS
} from './types/plugin-settings.intf'
import type { PluginSettings } from './types/plugin-settings.intf'
import { TypefullySettingTab } from './settings/settings-tab'
import { log } from '../utils/log'
import { produce } from 'immer'
import type { Draft } from 'immer'
import {
    DEFAULT_CANVAS_FILE_NAME,
    DRAFT_ACTION_REFRESH_DELAY_MS,
    MARKDOWN_FILE_EXTENSION,
    MSG_API_KEY_CONFIGURATION_REQUIRED,
    NOTICE_TIMEOUT,
    SCREENSHOT_CAPTURE_DELAY_MS
} from './constants'
import { captureElementScreenshot } from './utils/capture-element-screenshot.fn'
import { extractH1Title } from './utils/extract-h1-title.fn'
import { removeFrontMatter } from './utils/remove-front-matter.fn'
import { resolveScreenshotStyle } from './utils/resolve-screenshot-style.fn'
import { isExcalidrawFile } from './utils/is-excalidraw-file.fn'
import { publishTypefullyDraft } from './utils/publish-typefully-draft.fn'
import { cleanMarkdownForTypeFully } from './utils/clean-markdown-for-typefully.fn'
import { getFileTags } from './utils/get-file-tags.fn'
import { filterExcludedTags } from './utils/filter-excluded-tags.fn'
import { checkMediaLimits } from './utils/check-media-limits.fn'
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
        // Must run before anything can call saveData (fresh-install detection)
        registerWhatsNewView(this)
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
            id: 'publish-note-screenshot',
            name: 'Publish a screenshot of the current note',
            checkCallback: (checking) => {
                // Screenshot capture relies on Electron APIs (desktop only)
                if (!Platform.isDesktopApp) {
                    return false
                }
                const view = this.app.workspace.getActiveViewOfType(MarkdownView)
                if (!view) {
                    return false
                }
                if (!checking) {
                    void this.publishNoteScreenshot(view)
                }
                return true
            }
        })

        this.addCommand({
            id: 'publish-selection-screenshot',
            name: 'Publish a screenshot of the current selection',
            checkCallback: (checking) => {
                // Screenshot capture relies on Electron APIs (desktop only)
                if (!Platform.isDesktopApp) {
                    return false
                }
                const view = this.app.workspace.getActiveViewOfType(MarkdownView)
                const selection = view?.editor.getSelection()
                if (!view || !selection || '' === selection.trim()) {
                    return false
                }
                if (!checking) {
                    void this.publishSelectionScreenshot(view, selection)
                }
                return true
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
                const view = this.getTypefullyViews()[0]
                view?.setPage({ type: 'drafts-list' })
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
                if (Platform.isDesktopApp) {
                    menu.addItem((item) => {
                        item.setIcon('camera')
                        item.setTitle(
                            'Publish a screenshot of the current note to Typefully'
                        ).onClick(async () => {
                            const markdownView =
                                this.app.workspace.getActiveViewOfType(MarkdownView)

                            if (!markdownView) {
                                new Notice(
                                    'Please open a note before calling this command',
                                    NOTICE_TIMEOUT
                                )
                                return
                            }

                            await this.publishNoteScreenshot(markdownView)
                        })
                    })
                    if ('' !== editor.getSelection().trim()) {
                        menu.addItem((item) => {
                            item.setIcon('camera')
                            item.setTitle(
                                'Publish a screenshot of the current selection to Typefully'
                            ).onClick(async () => {
                                const markdownView =
                                    this.app.workspace.getActiveViewOfType(MarkdownView)

                                if (!markdownView) {
                                    new Notice(
                                        'Please open a note before calling this command',
                                        NOTICE_TIMEOUT
                                    )
                                    return
                                }

                                await this.publishSelectionScreenshot(
                                    markdownView,
                                    editor.getSelection()
                                )
                            })
                        })
                    }
                }
            })
        )
    }

    /**
     * Check if at least one target platform is enabled in the settings
     */
    private hasEnabledPlatform(): boolean {
        const { platforms } = this.settings
        return (
            platforms.x ||
            platforms.linkedin ||
            platforms.threads ||
            platforms.bluesky ||
            platforms.mastodon
        )
    }

    async publish(content: string, tags: string[]) {
        if (!this.hasEnabledPlatform()) {
            new Notice('Please enable at least one target platform in settings', NOTICE_TIMEOUT)
            return
        }

        // Extract images before cleaning (cleaning removes image syntax)
        const extractedImages = extractImagesFromMarkdown(content)

        let cleanedContent = cleanMarkdownForTypeFully(content)

        if (this.settings.appendTags && tags.length > 0) {
            const tagsToAppend = filterExcludedTags(tags, this.settings.excludedTags)

            if (tagsToAppend.length > 0) {
                log('Tags to append: ', 'debug', tagsToAppend)
                let tagsString = '\n\n'
                tagsString += tagsToAppend.join(' ')
                cleanedContent += tagsString
            }
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
            const attached = await this.attachMediaToPosts(extractedImages, posts, content)
            if (!attached) return
        }

        log('Text to publish', 'debug', cleanedContent)

        await this.publishPosts(posts)
    }

    /**
     * Publish the given posts as a Typefully draft on all enabled platforms
     */
    private async publishPosts(posts: TypefullyPost[]) {
        const { platforms } = this.settings

        // Build platforms object based on settings
        const platformConfig = { enabled: true, posts }
        const targetPlatforms: TypefullyPlatforms = {}

        if (platforms.x) {
            targetPlatforms.x = platformConfig
        }
        if (platforms.linkedin) {
            // LinkedIn only supports single posts, so merge thread posts into one
            if (posts.length > 1) {
                const mergedText = posts.map((p) => p.text).join('\n\n')
                const mergedMediaIds = posts.flatMap((p) => p.media_ids ?? [])
                const mergedPost: TypefullyPost = { text: mergedText }
                if (mergedMediaIds.length > 0) {
                    mergedPost.media_ids = mergedMediaIds
                }
                targetPlatforms.linkedin = { enabled: true, posts: [mergedPost] }
            } else {
                targetPlatforms.linkedin = platformConfig
            }
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
            window.setTimeout(() => this.refreshView(), DRAFT_ACTION_REFRESH_DELAY_MS)
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
     *
     * @returns false when the note exceeds a platform's per-post image limit,
     * in which case nothing was uploaded and publishing must not continue.
     */
    private async attachMediaToPosts(
        images: ExtractedImage[],
        posts: TypefullyPost[],
        originalContent: string
    ): Promise<boolean> {
        const client = this.getApiClient()
        if (!client) return true

        const socialSetId = this.settings.socialSetId
        if (!socialSetId) {
            log('No social set ID for media upload, skipping images', 'warn')
            return true
        }

        // Map every image to its post up front: the platform limits have to be
        // checked before anything is uploaded, otherwise a note that is over
        // the limit leaves orphaned media behind when the draft is rejected.
        const postIndexes = images.map((image) =>
            this.findPostIndexForImage(image, originalContent, posts)
        )
        const imagesPerPost = posts.map(
            (_, index) => postIndexes.filter((postIndex) => index === postIndex).length
        )

        const violation = checkMediaLimits(imagesPerPost, this.settings.platforms)
        if (violation) {
            const msg = `${violation.platform} accepts at most ${violation.limit} images per post, but this note would attach ${violation.count}. Nothing was uploaded.`
            log(msg, 'warn', { imagesPerPost })
            new Notice(msg, NOTICE_TIMEOUT)
            return false
        }

        const totalImages = images.length
        for (let i = 0; i < totalImages; i++) {
            const image = images[i]!
            new Notice(`Uploading image ${i + 1}/${totalImages}...`, 2000)

            const uploaded = await uploadVaultMedia(this.app, client, socialSetId, image.path)
            if (!uploaded) continue

            const target = posts[postIndexes[i]!]
            if (target) {
                if (!target.media_ids) target.media_ids = []
                target.media_ids.push(uploaded.mediaId)
            }
        }

        return true
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
     * Render the note as a styled, social-media-ready image card, capture it,
     * and publish it to Typefully as a draft with the image attached.
     * Desktop only.
     */
    async publishNoteScreenshot(view: MarkdownView) {
        const file = view.file
        if (!file) {
            new Notice('Please open a note before calling this command', NOTICE_TIMEOUT)
            return
        }

        log('Publishing an image of the current note to Typefully', 'debug')

        // The front matter (note properties) is not part of the image
        const markdown = removeFrontMatter(await this.app.vault.read(file))
        await this.publishMarkdownAsImage(markdown, file, view, { allowTitle: true })
    }

    /**
     * Render the current selection as a styled image card, capture it, and
     * publish it to Typefully as a draft with the image attached.
     * Desktop only.
     */
    async publishSelectionScreenshot(view: MarkdownView, selection: string) {
        const file = view.file
        if (!file) {
            new Notice('Please open a note before calling this command', NOTICE_TIMEOUT)
            return
        }

        if ('' === selection.trim()) {
            new Notice('Please select some text first', NOTICE_TIMEOUT)
            return
        }

        log('Publishing an image of the current selection to Typefully', 'debug')

        // The note title is not part of a selection image: the selected text
        // is the whole point
        await this.publishMarkdownAsImage(selection, file, view, { allowTitle: false })
    }

    /**
     * Render the given markdown as a styled image card, capture it, and
     * publish it to Typefully as a draft with the image attached.
     */
    private async publishMarkdownAsImage(
        markdown: string,
        file: TFile,
        view: MarkdownView,
        options: { allowTitle: boolean }
    ) {
        if (!this.hasEnabledPlatform()) {
            new Notice('Please enable at least one target platform in settings', NOTICE_TIMEOUT)
            return
        }

        const client = this.getApiClient()
        if (!client) {
            new Notice(MSG_API_KEY_CONFIGURATION_REQUIRED, NOTICE_TIMEOUT)
            return
        }

        const socialSetId = this.settings.socialSetId
        if (!socialSetId) {
            new Notice(
                'Please select a social set in the plugin settings before publishing a screenshot',
                NOTICE_TIMEOUT
            )
            return
        }

        // Build a styled card with the rendered content in an overlay,
        // capture it, and remove the overlay again. The card (not the
        // Obsidian UI) is what ends up in the published image.
        const doc = view.containerEl.doc
        const overlay = doc.body.createDiv({ cls: 'typefully-screenshot-overlay' })
        // Short-lived component scoping the markdown rendering, unloaded as
        // soon as the capture is done
        const renderComponent = new Component()
        renderComponent.load()
        let screenshot: ArrayBuffer | null = null
        try {
            const screenshotSettings = this.settings.screenshot
            const style = resolveScreenshotStyle(screenshotSettings)

            const card = overlay.createDiv({
                cls: [
                    'typefully-screenshot-card',
                    `typefully-screenshot-card--${screenshotSettings.aspectRatio}`,
                    `typefully-screenshot-card--text-${screenshotSettings.textSize}`
                ]
            })
            card.style.setProperty('--typefully-ss-gradient-start', style.gradientStart)
            card.style.setProperty('--typefully-ss-gradient-end', style.gradientEnd)
            card.style.setProperty('--typefully-ss-font', style.fontFamily)
            card.style.setProperty('--typefully-ss-link', style.linkColor)
            card.style.setProperty(
                '--typefully-ss-custom-bg',
                screenshotSettings.customCardBackground
            )
            card.style.setProperty('--typefully-ss-custom-text', screenshotSettings.customCardText)
            card.style.setProperty(
                '--typefully-ss-watermark-color',
                screenshotSettings.watermarkColor
            )

            const content = card.createDiv({
                cls: [
                    'typefully-screenshot-content',
                    `typefully-screenshot-content--${screenshotSettings.cardTheme}`
                ]
            })
            let markdownToRender = markdown
            if (options.allowTitle && screenshotSettings.showTitle) {
                // When the note carries its own level 1 heading, use it as the
                // card title and drop it from the body, so that the image does
                // not end up with two titles
                const extracted = extractH1Title(markdown)
                if (extracted) {
                    markdownToRender = extracted.markdown
                }
                content.createEl('h1', {
                    text: extracted ? extracted.title : file.basename,
                    cls: 'typefully-screenshot-title'
                })
            }
            const body = content.createDiv({ cls: 'typefully-screenshot-markdown' })

            if ('' !== screenshotSettings.watermarkText.trim()) {
                card.createDiv({
                    cls: [
                        'typefully-screenshot-watermark',
                        `typefully-screenshot-watermark--${screenshotSettings.watermarkPosition}`
                    ],
                    text: screenshotSettings.watermarkText.trim()
                })
            }

            await MarkdownRenderer.render(
                this.app,
                markdownToRender,
                body,
                file.path,
                renderComponent
            )

            // Give the layout, fonts, and embedded images time to settle
            await new Promise((resolve) => window.setTimeout(resolve, SCREENSHOT_CAPTURE_DELAY_MS))

            screenshot = await captureElementScreenshot(card)
        } finally {
            renderComponent.unload()
            overlay.remove()
        }

        if (!screenshot) {
            new Notice('Failed to capture an image of the current note', NOTICE_TIMEOUT)
            return
        }

        const filename = `${file.basename}-screenshot.png`
        new Notice('Uploading screenshot...', 2000)

        let mediaId: string
        try {
            mediaId = await client.uploadAndWaitForMedia(socialSetId, filename, screenshot)
        } catch (error) {
            log('Failed to upload the screenshot to Typefully', 'warn', error)
            new Notice('Failed to upload the screenshot to Typefully', NOTICE_TIMEOUT)
            return
        }

        await this.publishPosts([{ text: '', media_ids: [mediaId] }])
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
        for (const view of this.getTypefullyViews()) {
            view.refresh()
        }
    }

    /**
     * Get the loaded Typefully views.
     *
     * A leaf that has never been opened in the current session is deferred:
     * its `view` is a placeholder without the TypefullyView methods, so every
     * access has to be guarded by an instanceof check. Deferred views are
     * skipped: they render from scratch when the user opens them, so there is
     * nothing to refresh.
     */
    private getTypefullyViews(): TypefullyView[] {
        const views: TypefullyView[] = []
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_TYPEFULLY)) {
            if (leaf.view instanceof TypefullyView) {
                views.push(leaf.view)
            }
        }
        return views
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
                // Revealing a deferred leaf loads it, but the view instance is
                // only replaced once that finished, so it still has to be
                // checked before use
                await leaf.loadIfDeferred()
                if (leaf.view instanceof TypefullyView) {
                    leaf.view.setPage(initialPage)
                }
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

            if (Array.isArray(loadedSettings.excludedTags)) {
                draft.excludedTags = loadedSettings.excludedTags.filter(
                    (tag) => typeof tag === 'string' && '' !== tag.trim()
                )
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

            // Screenshot (note image) settings - merge with defaults
            if (loadedSettings.screenshot && typeof loadedSettings.screenshot === 'object') {
                const loaded = loadedSettings.screenshot
                draft.screenshot = {
                    background: SCREENSHOT_BACKGROUND_IDS.includes(loaded.background)
                        ? loaded.background
                        : DEFAULT_SCREENSHOT_SETTINGS.background,
                    customGradientStart:
                        typeof loaded.customGradientStart === 'string'
                            ? loaded.customGradientStart
                            : DEFAULT_SCREENSHOT_SETTINGS.customGradientStart,
                    customGradientEnd:
                        typeof loaded.customGradientEnd === 'string'
                            ? loaded.customGradientEnd
                            : DEFAULT_SCREENSHOT_SETTINGS.customGradientEnd,
                    cardTheme: SCREENSHOT_CARD_THEMES.includes(loaded.cardTheme)
                        ? loaded.cardTheme
                        : DEFAULT_SCREENSHOT_SETTINGS.cardTheme,
                    customCardBackground:
                        typeof loaded.customCardBackground === 'string'
                            ? loaded.customCardBackground
                            : DEFAULT_SCREENSHOT_SETTINGS.customCardBackground,
                    customCardText:
                        typeof loaded.customCardText === 'string'
                            ? loaded.customCardText
                            : DEFAULT_SCREENSHOT_SETTINGS.customCardText,
                    font: SCREENSHOT_FONT_IDS.includes(loaded.font)
                        ? loaded.font
                        : DEFAULT_SCREENSHOT_SETTINGS.font,
                    customFont:
                        typeof loaded.customFont === 'string'
                            ? loaded.customFont
                            : DEFAULT_SCREENSHOT_SETTINGS.customFont,
                    textSize: SCREENSHOT_TEXT_SIZES.includes(loaded.textSize)
                        ? loaded.textSize
                        : DEFAULT_SCREENSHOT_SETTINGS.textSize,
                    aspectRatio: SCREENSHOT_ASPECT_RATIOS.includes(loaded.aspectRatio)
                        ? loaded.aspectRatio
                        : DEFAULT_SCREENSHOT_SETTINGS.aspectRatio,
                    showTitle:
                        typeof loaded.showTitle === 'boolean'
                            ? loaded.showTitle
                            : DEFAULT_SCREENSHOT_SETTINGS.showTitle,
                    watermarkText:
                        typeof loaded.watermarkText === 'string'
                            ? loaded.watermarkText
                            : DEFAULT_SCREENSHOT_SETTINGS.watermarkText,
                    watermarkPosition: SCREENSHOT_WATERMARK_POSITIONS.includes(
                        loaded.watermarkPosition
                    )
                        ? loaded.watermarkPosition
                        : DEFAULT_SCREENSHOT_SETTINGS.watermarkPosition,
                    watermarkColor:
                        typeof loaded.watermarkColor === 'string'
                            ? loaded.watermarkColor
                            : DEFAULT_SCREENSHOT_SETTINGS.watermarkColor,
                    linkColor:
                        typeof loaded.linkColor === 'string'
                            ? loaded.linkColor
                            : DEFAULT_SCREENSHOT_SETTINGS.linkColor
                }
            } else {
                draft.screenshot = { ...DEFAULT_SCREENSHOT_SETTINGS }
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
