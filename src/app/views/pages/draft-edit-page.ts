import { Notice } from 'obsidian'
import type { App } from 'obsidian'
import type { TypefullyApiClient } from '../../api/typefully-api-client'
import type {
    TypefullyDraft,
    TypefullyDraftUpdatePayload,
    TypefullyDraftPlatformDetail
} from '../../types/typefully-api.intf'
import { ConfirmModal } from '../../modals/confirm-modal'
import { NOTICE_TIMEOUT, DRAFT_ACTION_REFRESH_DELAY_MS } from '../../constants'
import { log } from '../../../utils/log'
import type { ViewPage } from '../typefully-view-state'
import { parseISO, formatISO } from 'date-fns'
import { renderCalendarPicker } from '../calendar-picker'

const CHAR_LIMIT = 280

const PLATFORM_LABELS: Record<string, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    threads: 'Threads',
    bluesky: 'Bluesky',
    mastodon: 'Mastodon'
}

function renderCharCount(container: HTMLElement, length: number): HTMLElement {
    const counter = container.createSpan({ cls: 'typefully-char-count' })
    updateCharCount(counter, length)
    return counter
}

function updateCharCount(counter: HTMLElement, length: number) {
    counter.setText(`${length} / ${CHAR_LIMIT}`)
    counter.toggleClass('typefully-char-count-over', length > CHAR_LIMIT)
}

export async function renderDraftEditPage(
    container: HTMLElement,
    app: App,
    client: TypefullyApiClient,
    socialSetId: string,
    draftId: number,
    _draft: TypefullyDraft | undefined,
    _navigate: (page: ViewPage) => void,
    goBack: () => void,
    setPage: (page: ViewPage) => void
) {
    let resolvedDraft: TypefullyDraft
    try {
        resolvedDraft = await client.getDraft(socialSetId, draftId)
    } catch (error) {
        log('Failed to load draft', 'error', error)
        new Notice('Failed to load draft', NOTICE_TIMEOUT)
        container.createEl('p', { text: 'Failed to load draft.' })
        return
    }

    const d = resolvedDraft
    const payload: TypefullyDraftUpdatePayload = {}
    const displayTitle = d.draft_title || d.preview || 'Untitled draft'
    const isEditable = d.status === 'draft' || d.status === 'scheduled'

    // Build platform enabled state and find posts from first enabled platform
    const platformEntries = Object.entries(d.platforms || {}) as [
        string,
        TypefullyDraftPlatformDetail
    ][]
    const platformEnabled: Record<string, boolean> = {}
    for (const [name, config] of platformEntries) {
        platformEnabled[name] = config?.enabled ?? false
    }

    const activePlatform = platformEntries.find(([, config]) => config?.posts?.length)
    const activePlatformConfig = activePlatform?.[1]

    // Build posts array from existing data
    const posts: string[] = []
    if (activePlatformConfig?.posts?.length) {
        for (const post of activePlatformConfig.posts) {
            posts.push(post.text ?? '')
        }
    } else {
        posts.push(d.preview ?? '')
    }

    // Platforms toggles
    if (platformEntries.length > 0) {
        const platformGroup = container.createDiv({ cls: 'typefully-field-group' })
        platformGroup.createEl('label', { text: 'Platforms', cls: 'typefully-field-label' })
        const platformToggles = platformGroup.createDiv({ cls: 'typefully-platform-toggles' })

        for (const [name] of platformEntries) {
            const label = platformToggles.createEl('label', { cls: 'typefully-platform-toggle' })
            const checkbox = label.createEl('input', { type: 'checkbox' })
            checkbox.checked = platformEnabled[name] ?? false
            checkbox.disabled = !isEditable
            label.createSpan({ text: PLATFORM_LABELS[name] ?? name })
            checkbox.addEventListener('change', () => {
                platformEnabled[name] = checkbox.checked
                checkbox.disabled = true
                void (async () => {
                    try {
                        const detail: { enabled: boolean; posts?: { text: string }[] } = {
                            enabled: checkbox.checked
                        }
                        if (checkbox.checked) {
                            detail.posts = postsForPlatform(name)
                        }
                        await client.updateDraft(socialSetId, d.id, {
                            platforms: {
                                [name]: detail
                            } as TypefullyDraftUpdatePayload['platforms']
                        })
                    } catch (error) {
                        log('Failed to update platform', 'error', error)
                        new Notice('Failed to update platform', NOTICE_TIMEOUT)
                        // Revert on failure
                        platformEnabled[name] = !checkbox.checked
                        checkbox.checked = !checkbox.checked
                    } finally {
                        checkbox.disabled = false
                    }
                })()
            })
        }
    }

    // Thread container
    const threadGroup = container.createDiv({ cls: 'typefully-field-group' })
    threadGroup.createEl('label', { text: 'Thread', cls: 'typefully-field-label' })
    const threadContainer = threadGroup.createDiv({ cls: 'typefully-thread' })

    function postsForPlatform(name: string): { text: string }[] {
        // LinkedIn only supports single posts, so merge thread posts into one
        if (name === 'linkedin' && posts.length > 1) {
            return [{ text: posts.join('\n\n') }]
        }
        return posts.map((text) => ({ text }))
    }

    function buildPayload() {
        if (platformEntries.length === 0) return
        const platforms: Record<string, { enabled: boolean; posts?: { text: string }[] }> = {}
        for (const [name] of platformEntries) {
            if (platformEnabled[name]) {
                platforms[name] = {
                    enabled: true,
                    posts: postsForPlatform(name)
                }
            } else {
                platforms[name] = { enabled: false }
            }
        }
        payload.platforms = platforms as TypefullyDraftUpdatePayload['platforms']
    }

    function renderThread() {
        threadContainer.empty()

        for (let i = 0; i < posts.length; i++) {
            const postText = posts[i] ?? ''
            const postEl = threadContainer.createDiv({ cls: 'typefully-thread-post' })

            const headerEl = postEl.createDiv({ cls: 'typefully-thread-post-header' })
            headerEl.createSpan({
                text: `Post ${i + 1} of ${posts.length}`,
                cls: 'typefully-thread-post-label'
            })
            const counter = renderCharCount(headerEl, postText.length)

            if (isEditable) {
                const textarea = postEl.createEl('textarea', {
                    cls: 'typefully-field-textarea typefully-field-textarea-large'
                })
                textarea.value = postText
                textarea.addEventListener('input', () => {
                    posts[i] = textarea.value
                    updateCharCount(counter, textarea.value.length)
                    buildPayload()
                })

                if (i > 0) {
                    const removeBtn = headerEl.createEl('button', {
                        text: 'Remove',
                        cls: 'typefully-thread-remove-btn'
                    })
                    removeBtn.addEventListener('click', () => {
                        posts.splice(i, 1)
                        buildPayload()
                        renderThread()
                    })
                }
            } else {
                const textEl = postEl.createDiv({
                    cls: 'typefully-field-textarea typefully-field-textarea-large typefully-field-readonly'
                })
                textEl.setText(postText)
            }
        }

        if (isEditable) {
            const addBtn = threadContainer.createEl('button', {
                text: '+ Add post',
                cls: 'typefully-thread-add-btn'
            })
            addBtn.addEventListener('click', () => {
                posts.push('')
                buildPayload()
                renderThread()
            })
        }
    }

    renderThread()

    // Schedule
    if (isEditable) {
        const scheduleGroup = container.createDiv({ cls: 'typefully-field-group' })
        scheduleGroup.createEl('label', { text: 'Schedule', cls: 'typefully-field-label' })
        const scheduleBtns = scheduleGroup.createDiv({ cls: 'typefully-schedule-buttons' })

        const nowBtn = scheduleBtns.createEl('button', { text: 'Publish now', cls: 'mod-cta' })
        const slotBtn = scheduleBtns.createEl('button', { text: 'Next free slot' })
        const atBtn = scheduleBtns.createEl('button', { text: 'Schedule at...' })

        const datetimeRow = scheduleGroup.createDiv({
            cls: 'typefully-schedule-datetime typefully-hidden'
        })
        const initialDate = d.publish_at ? parseISO(d.publish_at) : null
        renderCalendarPicker(datetimeRow, initialDate, (date) => {
            payload.publish_at = formatISO(date)
            setActiveSchedule(atBtn)
        })

        function setActiveSchedule(active: HTMLElement) {
            nowBtn.removeClass('typefully-schedule-btn-active')
            slotBtn.removeClass('typefully-schedule-btn-active')
            atBtn.removeClass('typefully-schedule-btn-active')
            active.addClass('typefully-schedule-btn-active')
        }

        nowBtn.addEventListener('click', () => {
            void (async () => {
                try {
                    nowBtn.disabled = true
                    buildPayload()
                    await client.updateDraft(socialSetId, d.id, { ...payload, publish_at: 'now' })
                    new Notice('Draft published', NOTICE_TIMEOUT)
                    setTimeout(
                        () => setPage({ type: 'drafts-list' }),
                        DRAFT_ACTION_REFRESH_DELAY_MS
                    )
                } catch (error) {
                    log('Failed to publish draft', 'error', error)
                    new Notice('Failed to publish draft', NOTICE_TIMEOUT)
                    nowBtn.disabled = false
                }
            })()
        })

        slotBtn.addEventListener('click', () => {
            void (async () => {
                try {
                    slotBtn.disabled = true
                    buildPayload()
                    await client.updateDraft(socialSetId, d.id, {
                        ...payload,
                        publish_at: 'next-free-slot'
                    })
                    new Notice('Draft scheduled for next free slot', NOTICE_TIMEOUT)
                    setTimeout(
                        () => setPage({ type: 'drafts-list' }),
                        DRAFT_ACTION_REFRESH_DELAY_MS
                    )
                } catch (error) {
                    log('Failed to schedule draft', 'error', error)
                    new Notice('Failed to schedule draft', NOTICE_TIMEOUT)
                    slotBtn.disabled = false
                }
            })()
        })

        atBtn.addEventListener('click', () => {
            datetimeRow.removeClass('typefully-hidden')
            setActiveSchedule(atBtn)
        })
    }

    // Tags
    if (d.tags && d.tags.length > 0) {
        container.createEl('h4', { text: 'Tags' })
        const tagsEl = container.createDiv({ cls: 'typefully-tags-container' })
        for (const tag of d.tags) {
            tagsEl.createSpan({ text: tag, cls: 'typefully-settings-tag' })
        }
    }

    // Actions
    const actionsEl = container.createDiv({ cls: 'typefully-view-actions' })

    // Open in Typefully
    if (d.private_url) {
        const openBtn = actionsEl.createEl('button', {
            text: 'Open in Typefully',
            cls: 'mod-muted'
        })
        openBtn.addEventListener('click', () => {
            window.open(d.private_url)
        })
    }

    const cancelBtn = actionsEl.createEl('button', { text: 'Cancel' })
    cancelBtn.addEventListener('click', () => goBack())

    if (isEditable) {
        const saveBtn = actionsEl.createEl('button', { text: 'Save', cls: 'mod-cta' })
        saveBtn.addEventListener('click', () => {
            void (async () => {
                try {
                    buildPayload()
                    await client.updateDraft(socialSetId, d.id, payload)
                    new Notice('Draft updated successfully', NOTICE_TIMEOUT)
                    goBack()
                } catch (error) {
                    log('Failed to update draft', 'error', error)
                    new Notice('Failed to update draft', NOTICE_TIMEOUT)
                }
            })()
        })

        const deleteBtn = actionsEl.createEl('button', { text: 'Delete', cls: 'mod-warning' })
        deleteBtn.addEventListener('click', () => {
            new ConfirmModal(app, `Delete "${displayTitle}"? This cannot be undone.`, () => {
                void (async () => {
                    try {
                        await client.deleteDraft(socialSetId, d.id)
                        new Notice('Draft deleted', NOTICE_TIMEOUT)
                        goBack()
                    } catch (error) {
                        log('Failed to delete draft', 'error', error)
                        new Notice('Failed to delete draft', NOTICE_TIMEOUT)
                    }
                })()
            }).open()
        })
    }
}
