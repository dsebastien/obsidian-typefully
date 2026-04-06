import { ItemView, setIcon } from 'obsidian'
import type { WorkspaceLeaf } from 'obsidian'
import { VIEW_TYPE_TYPEFULLY } from './typefully-view-state'
import type { ViewPage } from './typefully-view-state'
import type { TypefullyPlugin } from '../plugin'
import { renderDraftsListPage } from './pages/drafts-list-page'
import { renderDraftEditPage } from './pages/draft-edit-page'
import { renderDraftCreatePage } from './pages/draft-create-page'
import { renderQueuePage } from './pages/queue-page'
import { renderQueueSchedulePage } from './pages/queue-schedule-page'
import { renderPostedListPage } from './pages/posted-list-page'
import { renderAnalyticsPage } from './pages/analytics-page'

type TabId = 'drafts' | 'queue' | 'schedule' | 'posted' | 'analytics'

function getTabForPage(page: ViewPage): TabId {
    switch (page.type) {
        case 'drafts-list':
            return 'drafts'
        case 'draft-edit':
        case 'draft-create':
            return (page.sourceTab as TabId) ?? 'drafts'
        case 'queue':
            return 'queue'
        case 'queue-schedule':
            return 'schedule'
        case 'posted-list':
            return 'posted'
        case 'analytics':
            return 'analytics'
    }
}

export class TypefullyView extends ItemView {
    private plugin: TypefullyPlugin
    private current: ViewPage = { type: 'drafts-list' }
    private history: ViewPage[] = []

    constructor(leaf: WorkspaceLeaf, plugin: TypefullyPlugin) {
        super(leaf)
        this.plugin = plugin
    }

    override getViewType(): string {
        return VIEW_TYPE_TYPEFULLY
    }

    override getDisplayText(): string {
        return 'Typefully'
    }

    override getIcon(): string {
        return 'arrows-up-from-line'
    }

    navigateTo(page: ViewPage) {
        this.history.push(this.current)
        this.current = page
        this.render()
    }

    goBack() {
        const prev = this.history.pop()
        if (prev) {
            this.current = prev
            this.render()
        }
    }

    setPage(page: ViewPage) {
        this.history = []
        this.current = page
        this.render()
    }

    refresh() {
        this.render()
    }

    override async onOpen() {
        this.render()
    }

    override async onClose() {
        this.contentEl.empty()
    }

    render() {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('typefully-view')

        // Check prerequisites
        const client = this.plugin.getApiClient()
        if (!client || !this.plugin.settings.socialSetId) {
            contentEl.createEl('p', {
                text: 'Please configure your Typefully API key and Social Set ID in settings.'
            })
            return
        }

        const socialSetId = this.plugin.settings.socialSetId

        // Header
        const header = contentEl.createDiv({ cls: 'typefully-view-header' })

        // Back button
        if (this.history.length > 0) {
            const backBtn = header.createEl('button', {
                cls: 'typefully-view-back-btn clickable-icon',
                attr: { 'aria-label': 'Back' }
            })
            setIcon(backBtn, 'arrow-left')
            backBtn.addEventListener('click', () => this.goBack())
        }

        // Tabs
        const activeTab = getTabForPage(this.current)
        const tabs = header.createDiv({ cls: 'typefully-view-tabs' })

        const tabDefs: { id: TabId; label: string; page: ViewPage }[] = [
            { id: 'drafts', label: 'Drafts', page: { type: 'drafts-list' } },
            { id: 'queue', label: 'Queue', page: { type: 'queue' } },
            { id: 'posted', label: 'Posted', page: { type: 'posted-list' } },
            { id: 'schedule', label: 'Schedule', page: { type: 'queue-schedule' } },
            { id: 'analytics', label: 'Analytics', page: { type: 'analytics' } }
        ]

        for (const tab of tabDefs) {
            const btn = tabs.createEl('button', {
                text: tab.label,
                cls: `typefully-view-tab${tab.id === activeTab ? ' typefully-tab-active' : ''}`
            })
            btn.addEventListener('click', () => {
                this.setPage(tab.page)
            })
        }

        // Refresh button for list pages
        const refreshablePages: ViewPage['type'][] = [
            'drafts-list',
            'queue',
            'posted-list',
            'analytics'
        ]
        if (refreshablePages.includes(this.current.type)) {
            const refreshBtn = header.createEl('button', {
                cls: 'typefully-view-refresh-btn clickable-icon',
                attr: { 'aria-label': 'Refresh' }
            })
            setIcon(refreshBtn, 'refresh-cw')
            refreshBtn.addEventListener('click', () => this.refresh())
        }

        // Content
        const content = contentEl.createDiv({ cls: 'typefully-view-content' })

        const nav = (page: ViewPage) => this.navigateTo(page)
        const back = () => this.goBack()
        const set = (page: ViewPage) => this.setPage(page)

        switch (this.current.type) {
            case 'drafts-list':
                renderDraftsListPage(content, this.app, client, socialSetId, nav)
                break
            case 'draft-edit':
                void renderDraftEditPage(
                    content,
                    this.app,
                    client,
                    socialSetId,
                    this.current.draftId,
                    this.current.draft,
                    nav,
                    back,
                    set
                )
                break
            case 'draft-create':
                renderDraftCreatePage(
                    content,
                    this.app,
                    client,
                    socialSetId,
                    this.plugin.settings,
                    this.current.scheduledAt,
                    nav,
                    back
                )
                break
            case 'queue':
                renderQueuePage(content, this.app, client, socialSetId, nav)
                break
            case 'queue-schedule':
                renderQueueSchedulePage(content, client, socialSetId, back)
                break
            case 'posted-list':
                renderPostedListPage(content, client, socialSetId)
                break
            case 'analytics':
                renderAnalyticsPage(content, client, socialSetId)
                break
        }
    }
}
