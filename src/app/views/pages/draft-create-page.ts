import { Notice } from 'obsidian'
import type { App } from 'obsidian'
import type { TypefullyApiClient } from '../../api/typefully-api-client'
import type {
    TypefullyDraftContents,
    TypefullyPlatforms
} from '../../types/typefully-draft-contents.intf'
import type { PluginSettings, PlatformSettings } from '../../types/plugin-settings.intf'
import { NOTICE_TIMEOUT } from '../../constants'
import { log } from '../../../utils/log'
import type { ViewPage } from '../typefully-view-state'
import { formatISO } from 'date-fns'
import { renderCalendarPicker } from '../calendar-picker'

const CHAR_LIMIT = 280

function renderCharCount(container: HTMLElement, length: number): HTMLElement {
    const counter = container.createSpan({ cls: 'typefully-char-count' })
    updateCharCount(counter, length)
    return counter
}

function updateCharCount(counter: HTMLElement, length: number) {
    counter.setText(`${length} / ${CHAR_LIMIT}`)
    counter.toggleClass('typefully-char-count-over', length > CHAR_LIMIT)
}

function buildPlatforms(settings: PluginSettings, posts: string[]): TypefullyPlatforms {
    const platforms: TypefullyPlatforms = {}
    const enabled = Object.entries(settings.platforms)
        .filter(([, on]) => on)
        .map(([name]) => name as keyof PlatformSettings)

    if (enabled.length === 0) {
        enabled.push('x')
    }

    const defaultConfig = { enabled: true, posts: posts.map((text) => ({ text })) }
    for (const platform of enabled) {
        // LinkedIn only supports single posts, so merge thread posts into one
        if (platform === 'linkedin' && posts.length > 1) {
            platforms[platform] = {
                enabled: true,
                posts: [{ text: posts.join('\n\n') }]
            }
        } else {
            platforms[platform] = defaultConfig
        }
    }

    return platforms
}

export function renderDraftCreatePage(
    container: HTMLElement,
    _app: App,
    client: TypefullyApiClient,
    socialSetId: string,
    settings: PluginSettings,
    scheduledAt: string | undefined,
    navigate: (page: ViewPage) => void,
    goBack: () => void
) {
    const posts: string[] = ['']
    let publishAt: string | undefined = scheduledAt

    // Thread container
    const threadGroup = container.createDiv({ cls: 'typefully-field-group' })
    threadGroup.createEl('label', { text: 'Thread', cls: 'typefully-field-label' })
    const threadContainer = threadGroup.createDiv({ cls: 'typefully-thread' })

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

            const textarea = postEl.createEl('textarea', {
                cls: 'typefully-field-textarea typefully-field-textarea-large',
                attr: { placeholder: i === 0 ? 'Write your post...' : 'Continue thread...' }
            })
            textarea.value = postText
            textarea.addEventListener('input', () => {
                posts[i] = textarea.value
                updateCharCount(counter, textarea.value.length)
            })

            if (i === 0 && posts.length === 1) {
                textarea.focus()
            }

            if (i > 0) {
                const removeBtn = headerEl.createEl('button', {
                    text: 'Remove',
                    cls: 'typefully-thread-remove-btn'
                })
                removeBtn.addEventListener('click', () => {
                    posts.splice(i, 1)
                    renderThread()
                })
            }
        }

        const addBtn = threadContainer.createEl('button', {
            text: '+ Add post',
            cls: 'typefully-thread-add-btn'
        })
        addBtn.addEventListener('click', () => {
            posts.push('')
            renderThread()
        })
    }

    renderThread()

    // Schedule – when coming from the Queue (scheduledAt is set), hide scheduling
    // options since the time slot is already chosen
    if (!scheduledAt) {
        const scheduleGroup = container.createDiv({ cls: 'typefully-field-group' })
        scheduleGroup.createEl('label', { text: 'Schedule', cls: 'typefully-field-label' })
        const scheduleBtns = scheduleGroup.createDiv({ cls: 'typefully-schedule-buttons' })

        const nowBtn = scheduleBtns.createEl('button', { text: 'Publish now', cls: 'mod-cta' })
        const slotBtn = scheduleBtns.createEl('button', { text: 'Next free slot' })
        const atBtn = scheduleBtns.createEl('button', { text: 'Schedule at...' })

        const datetimeRow = scheduleGroup.createDiv({
            cls: 'typefully-schedule-datetime typefully-hidden'
        })
        renderCalendarPicker(datetimeRow, null, (date) => {
            publishAt = formatISO(date)
            setActiveSchedule(atBtn)
        })

        function setActiveSchedule(active: HTMLElement) {
            nowBtn.removeClass('typefully-schedule-btn-active')
            slotBtn.removeClass('typefully-schedule-btn-active')
            atBtn.removeClass('typefully-schedule-btn-active')
            active.addClass('typefully-schedule-btn-active')
        }

        nowBtn.addEventListener('click', () => {
            publishAt = 'now'
            datetimeRow.addClass('typefully-hidden')
            setActiveSchedule(nowBtn)
        })

        slotBtn.addEventListener('click', () => {
            publishAt = 'next-free-slot'
            datetimeRow.addClass('typefully-hidden')
            setActiveSchedule(slotBtn)
        })

        atBtn.addEventListener('click', () => {
            datetimeRow.removeClass('typefully-hidden')
            setActiveSchedule(atBtn)
        })
    }

    // Actions
    const actionsEl = container.createDiv({ cls: 'typefully-view-actions' })

    const cancelBtn = actionsEl.createEl('button', { text: 'Cancel' })
    cancelBtn.addEventListener('click', () => goBack())

    const createBtnText = scheduledAt ? 'Schedule' : 'Create Draft'
    const loadingText = scheduledAt ? 'Scheduling...' : 'Creating...'
    const createBtn = actionsEl.createEl('button', { text: createBtnText, cls: 'mod-cta' })
    createBtn.addEventListener('click', () => {
        if (!posts.some((p) => p.trim())) {
            new Notice('Post text cannot be empty', NOTICE_TIMEOUT)
            return
        }

        void (async () => {
            try {
                createBtn.disabled = true
                createBtn.setText(loadingText)

                const content: TypefullyDraftContents = {
                    platforms: buildPlatforms(settings, posts)
                }
                if (publishAt) {
                    content.publish_at = publishAt
                }

                const draft = await client.createDraft(socialSetId, content)
                new Notice('Draft created', NOTICE_TIMEOUT)
                navigate({ type: 'draft-edit', draftId: draft.id, draft })
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Failed to create draft'
                log('Failed to create draft', 'error', error)
                new Notice(msg, NOTICE_TIMEOUT)
                createBtn.disabled = false
                createBtn.setText(createBtnText)
            }
        })()
    })
}
