import { Notice, Setting } from 'obsidian'
import type { TypefullyApiClient } from '../../api/typefully-api-client'
import type {
    TypefullyDraft,
    TypefullyDraftPlatformDetail,
    TypefullyDraftListParams
} from '../../types/typefully-api.intf'
import { NOTICE_TIMEOUT } from '../../constants'
import { log } from '../../../utils/log'
import { format, parseISO } from 'date-fns'

interface PostedListState {
    drafts: TypefullyDraft[]
    sortOrder: '-published_at' | 'published_at'
    offset: number
    hasMore: boolean
    listContainer: HTMLElement | null
}

function getPostPreviewText(draft: TypefullyDraft): string {
    if (draft.preview) return draft.preview
    const platforms = draft.platforms ?? {}
    for (const config of Object.values(platforms) as (TypefullyDraftPlatformDetail | undefined)[]) {
        const text = config?.posts?.[0]?.text?.trim()
        if (text) {
            const firstLine = text.split('\n')[0] ?? ''
            return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine
        }
    }
    return 'Untitled post'
}

function renderPostedItem(container: HTMLElement, draft: TypefullyDraft) {
    const item = container.createDiv({ cls: 'typefully-draft-item typefully-draft-item-static' })

    const preview = item.createDiv({ cls: 'typefully-draft-preview' })

    preview.createDiv({
        cls: 'typefully-draft-preview-text',
        text: draft.draft_title || getPostPreviewText(draft)
    })

    const meta = preview.createDiv({ cls: 'typefully-draft-meta' })

    const platformNames = Object.keys(draft.platforms || {}).join(', ')
    if (platformNames) {
        meta.createSpan({ text: platformNames })
    }

    const date = draft.published_at || draft.publish_at || draft.created_at
    if (date) {
        meta.createSpan({ text: format(parseISO(date), 'PP') })
    }
}

export function renderPostedListPage(
    container: HTMLElement,
    client: TypefullyApiClient,
    socialSetId: string
) {
    const PAGE_SIZE = 20

    const state: PostedListState = {
        drafts: [],
        sortOrder: '-published_at',
        offset: 0,
        hasMore: false,
        listContainer: null
    }

    const filtersEl = container.createDiv({ cls: 'typefully-draft-filters' })

    new Setting(filtersEl).setName('Sort').addDropdown((dropdown) => {
        dropdown.addOption('-published_at', 'Recently published')
        dropdown.addOption('published_at', 'Oldest first')
        dropdown.onChange((value) => {
            state.sortOrder = value as PostedListState['sortOrder']
            state.offset = 0
            state.drafts = []
            void loadPosts()
        })
    })

    state.listContainer = container.createDiv()
    void loadPosts()

    async function loadPosts() {
        if (!state.listContainer) return

        try {
            const params: TypefullyDraftListParams = {
                status: 'published',
                order_by: state.sortOrder,
                limit: PAGE_SIZE,
                offset: state.offset
            }

            const response = await client.listDrafts(socialSetId, params)
            state.drafts.push(...response.results)
            state.hasMore = response.next !== null

            renderList()
        } catch (error) {
            log('Failed to load published posts', 'error', error)
            new Notice('Failed to load published posts', NOTICE_TIMEOUT)
        }
    }

    function renderList() {
        if (!state.listContainer) return
        state.listContainer.empty()

        if (state.drafts.length === 0) {
            state.listContainer.createEl('p', {
                text: 'No published posts found.',
                cls: 'typefully-empty-state'
            })
            return
        }

        for (const draft of state.drafts) {
            renderPostedItem(state.listContainer, draft)
        }

        if (state.hasMore) {
            const loadMoreBtn = state.listContainer.createEl('button', {
                text: 'Load more...',
                cls: 'typefully-load-more'
            })
            loadMoreBtn.addEventListener('click', () => {
                state.offset += PAGE_SIZE
                void loadPosts()
            })
        }
    }
}
