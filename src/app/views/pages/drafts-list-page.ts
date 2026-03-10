import { Notice, Setting } from 'obsidian'
import type { App } from 'obsidian'
import type { TypefullyApiClient } from '../../api/typefully-api-client'
import type {
    TypefullyDraft,
    TypefullyDraftPlatformDetail,
    TypefullyDraftStatus,
    TypefullyDraftListParams
} from '../../types/typefully-api.intf'
import { ConfirmModal } from '../../modals/confirm-modal'
import { NOTICE_TIMEOUT, DRAFT_ACTION_REFRESH_DELAY_MS } from '../../constants'
import { log } from '../../../utils/log'
import type { ViewPage } from '../typefully-view-state'
import { format, parseISO } from 'date-fns'

interface DraftsListState {
    drafts: TypefullyDraft[]
    statusFilter: TypefullyDraftStatus | 'all'
    sortOrder:
        | 'created_at'
        | '-created_at'
        | 'updated_at'
        | '-updated_at'
        | 'scheduled_date'
        | '-scheduled_date'
        | 'published_at'
        | '-published_at'
    offset: number
    hasMore: boolean
    listContainer: HTMLElement | null
}

function getDraftPreviewText(draft: TypefullyDraft): string {
    if (draft.preview) return draft.preview
    const platforms = draft.platforms ?? {}
    for (const config of Object.values(platforms) as (TypefullyDraftPlatformDetail | undefined)[]) {
        const text = config?.posts?.[0]?.text?.trim()
        if (text) {
            const firstLine = text.split('\n')[0] ?? ''
            return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine
        }
    }
    return 'Untitled draft'
}

function renderDraftItem(
    container: HTMLElement,
    draft: TypefullyDraft,
    app: App,
    client: TypefullyApiClient,
    socialSetId: string,
    state: DraftsListState,
    navigate: (page: ViewPage) => void,
    loadDrafts: () => void
) {
    const item = container.createDiv({ cls: 'typefully-draft-item' })

    const preview = item.createDiv({ cls: 'typefully-draft-preview' })

    preview.createDiv({
        cls: 'typefully-draft-preview-text',
        text: draft.draft_title || getDraftPreviewText(draft)
    })

    const meta = preview.createDiv({ cls: 'typefully-draft-meta' })

    const platformNames = Object.keys(draft.platforms || {}).join(', ')
    if (platformNames) {
        meta.createSpan({ text: platformNames })
    }

    const date = draft.publish_at || draft.created_at
    if (date) {
        meta.createSpan({ text: format(parseISO(date), 'PP') })
    }

    const actions = item.createDiv({ cls: 'typefully-draft-actions' })

    if (draft.status === 'draft' || draft.status === 'scheduled') {
        const publishNowBtn = actions.createEl('button', { text: 'Publish now', cls: 'mod-cta' })
        publishNowBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            new ConfirmModal(
                app,
                `Publish "${draft.draft_title || getDraftPreviewText(draft)}" now?`,
                () => {
                    void (async () => {
                        try {
                            await client.updateDraft(socialSetId, draft.id, { publish_at: 'now' })
                            new Notice('Draft published', NOTICE_TIMEOUT)
                            state.drafts = []
                            state.offset = 0
                            setTimeout(() => loadDrafts(), DRAFT_ACTION_REFRESH_DELAY_MS)
                        } catch (error) {
                            log('Failed to publish draft', 'error', error)
                            new Notice('Failed to publish draft', NOTICE_TIMEOUT)
                        }
                    })()
                }
            ).open()
        })

        const nextSlotBtn = actions.createEl('button', { text: 'Next free slot' })
        nextSlotBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            void (async () => {
                try {
                    await client.updateDraft(socialSetId, draft.id, {
                        publish_at: 'next-free-slot'
                    })
                    new Notice('Draft scheduled for next free slot', NOTICE_TIMEOUT)
                    state.drafts = []
                    state.offset = 0
                    setTimeout(() => loadDrafts(), DRAFT_ACTION_REFRESH_DELAY_MS)
                } catch (error) {
                    log('Failed to schedule draft', 'error', error)
                    new Notice('Failed to schedule draft', NOTICE_TIMEOUT)
                }
            })()
        })

        const deleteBtn = actions.createEl('button', { text: 'Delete', cls: 'mod-muted' })
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            new ConfirmModal(
                app,
                `Delete draft "${draft.draft_title || getDraftPreviewText(draft)}"? This cannot be undone.`,
                () => {
                    void (async () => {
                        try {
                            await client.deleteDraft(socialSetId, draft.id)
                            new Notice('Draft deleted', NOTICE_TIMEOUT)
                            state.drafts = []
                            state.offset = 0
                            setTimeout(() => loadDrafts(), DRAFT_ACTION_REFRESH_DELAY_MS)
                        } catch (error) {
                            log('Failed to delete draft', 'error', error)
                            new Notice('Failed to delete draft', NOTICE_TIMEOUT)
                        }
                    })()
                }
            ).open()
        })
    }

    item.addEventListener('click', () => {
        navigate({ type: 'draft-edit', draftId: draft.id, draft })
    })
}

export function renderDraftsListPage(
    container: HTMLElement,
    app: App,
    client: TypefullyApiClient,
    socialSetId: string,
    navigate: (page: ViewPage) => void
) {
    const PAGE_SIZE = 20

    const state: DraftsListState = {
        drafts: [],
        statusFilter: 'draft',
        sortOrder: '-updated_at',
        offset: 0,
        hasMore: false,
        listContainer: null
    }

    const filtersEl = container.createDiv({ cls: 'typefully-draft-filters' })

    new Setting(filtersEl).setName('Status').addDropdown((dropdown) => {
        dropdown.addOption('draft', 'Draft')
        dropdown.addOption('error', 'Error')
        dropdown.setValue('draft')
        dropdown.onChange((value) => {
            state.statusFilter = value as TypefullyDraftStatus | 'all'
            state.offset = 0
            state.drafts = []
            void loadDrafts()
        })
    })

    new Setting(filtersEl).setName('Sort').addDropdown((dropdown) => {
        dropdown.addOption('-updated_at', 'Recently updated')
        dropdown.addOption('-created_at', 'Newest first')
        dropdown.addOption('created_at', 'Oldest first')
        dropdown.onChange((value) => {
            state.sortOrder = value as typeof state.sortOrder
            state.offset = 0
            state.drafts = []
            void loadDrafts()
        })
    })

    state.listContainer = container.createDiv()
    void loadDrafts()

    async function loadDrafts() {
        if (!state.listContainer) return

        try {
            const params: TypefullyDraftListParams = {
                order_by: state.sortOrder,
                limit: PAGE_SIZE,
                offset: state.offset
            }
            if (state.statusFilter !== 'all') {
                params.status = state.statusFilter
            }

            const response = await client.listDrafts(socialSetId, params)
            state.drafts.push(...response.results)
            state.hasMore = response.next !== null

            renderList()
        } catch (error) {
            log('Failed to load drafts', 'error', error)
            new Notice('Failed to load drafts', NOTICE_TIMEOUT)
        }
    }

    function renderList() {
        if (!state.listContainer) return
        state.listContainer.empty()

        if (state.drafts.length === 0) {
            state.listContainer.createEl('p', {
                text: 'No drafts found.',
                cls: 'typefully-empty-state'
            })
            return
        }

        for (const draft of state.drafts) {
            renderDraftItem(
                state.listContainer,
                draft,
                app,
                client,
                socialSetId,
                state,
                navigate,
                () => void loadDrafts()
            )
        }

        if (state.hasMore) {
            const loadMoreBtn = state.listContainer.createEl('button', {
                text: 'Load more...',
                cls: 'typefully-load-more'
            })
            loadMoreBtn.addEventListener('click', () => {
                state.offset += PAGE_SIZE
                void loadDrafts()
            })
        }
    }
}
