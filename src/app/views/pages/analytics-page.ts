import { Notice } from 'obsidian'
import type { TypefullyApiClient } from '../../api/typefully-api-client'
import type { TypefullyAnalyticsPost } from '../../types/typefully-api.intf'
import { NOTICE_TIMEOUT } from '../../constants'
import { log } from '../../../utils/log'
import { format, subDays } from 'date-fns'

const ANALYTICS_PAGE_SIZE = 100
const TOP_POSTS_COUNT = 10
const PLATFORM = 'x'

interface AnalyticsState {
    posts: TypefullyAnalyticsPost[]
    startDate: string
    endDate: string
    loading: boolean
    sortField: 'impressions' | 'created_at'
    sortDesc: boolean
}

const ENGAGEMENT_KEYS = [
    { key: 'likes', label: 'Likes', color: 'var(--color-red)' },
    { key: 'comments', label: 'Comments', color: 'var(--color-blue)' },
    { key: 'shares', label: 'Shares', color: 'var(--color-green)' },
    { key: 'quotes', label: 'Quotes', color: 'var(--color-orange)' },
    { key: 'saves', label: 'Saves', color: 'var(--color-yellow)' },
    { key: 'profile_clicks', label: 'Profile clicks', color: 'var(--color-purple)' },
    { key: 'link_clicks', label: 'Link clicks', color: 'var(--color-cyan)' }
] as const

function computeTotals(posts: TypefullyAnalyticsPost[]) {
    let impressions = 0
    const engagement = {
        total: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        quotes: 0,
        saves: 0,
        profile_clicks: 0,
        link_clicks: 0
    }

    for (const post of posts) {
        impressions += post.metrics.impressions
        engagement.total += post.metrics.engagement.total
        engagement.likes += post.metrics.engagement.likes
        engagement.comments += post.metrics.engagement.comments
        engagement.shares += post.metrics.engagement.shares
        engagement.quotes += post.metrics.engagement.quotes
        engagement.saves += post.metrics.engagement.saves
        engagement.profile_clicks += post.metrics.engagement.profile_clicks
        engagement.link_clicks += post.metrics.engagement.link_clicks
    }

    return { impressions, engagement }
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toString()
}

function renderSummaryCards(container: HTMLElement, posts: TypefullyAnalyticsPost[]) {
    const totals = computeTotals(posts)
    const summary = container.createDiv({ cls: 'typefully-analytics-summary' })

    const cards: { label: string; value: string }[] = [
        { label: 'Impressions', value: formatNumber(totals.impressions) },
        { label: 'Engagement', value: formatNumber(totals.engagement.total) },
        { label: 'Posts', value: posts.length.toString() }
    ]

    for (const card of cards) {
        const el = summary.createDiv({ cls: 'typefully-analytics-card' })
        el.createDiv({ cls: 'typefully-analytics-card-value', text: card.value })
        el.createDiv({ cls: 'typefully-analytics-card-label', text: card.label })
    }
}

function renderTopPostsChart(container: HTMLElement, posts: TypefullyAnalyticsPost[]) {
    if (posts.length === 0) return

    const sorted = [...posts].sort((a, b) => b.metrics.impressions - a.metrics.impressions)
    const top = sorted.slice(0, TOP_POSTS_COUNT)
    const maxImpressions = top[0]?.metrics.impressions ?? 1

    const section = container.createDiv({ cls: 'typefully-analytics-chart' })
    section.createEl('h3', { text: 'Top posts by impressions' })

    for (const post of top) {
        const row = section.createDiv({ cls: 'typefully-analytics-bar-row' })

        const label = row.createDiv({ cls: 'typefully-analytics-bar-label' })
        const link = label.createEl('a', {
            text:
                post.preview_text.length > 60
                    ? post.preview_text.slice(0, 60) + '...'
                    : post.preview_text,
            href: post.url
        })
        link.setAttr('target', '_blank')
        link.setAttr('rel', 'noopener')

        const barContainer = row.createDiv({ cls: 'typefully-analytics-bar-container' })
        const pct = maxImpressions > 0 ? (post.metrics.impressions / maxImpressions) * 100 : 0
        const bar = barContainer.createDiv({ cls: 'typefully-analytics-bar' })
        bar.style.width = `${pct}%`

        row.createDiv({
            cls: 'typefully-analytics-bar-value',
            text: formatNumber(post.metrics.impressions)
        })
    }
}

function renderEngagementBreakdown(container: HTMLElement, posts: TypefullyAnalyticsPost[]) {
    if (posts.length === 0) return

    const totals = computeTotals(posts)
    const engagementTotal = totals.engagement.total
    if (engagementTotal === 0) return

    const section = container.createDiv({ cls: 'typefully-analytics-chart' })
    section.createEl('h3', { text: 'Engagement breakdown' })

    // Stacked bar
    const stackedBar = section.createDiv({ cls: 'typefully-analytics-stacked-bar' })

    for (const item of ENGAGEMENT_KEYS) {
        const value = totals.engagement[item.key]
        if (value === 0) continue
        const pct = (value / engagementTotal) * 100
        const segment = stackedBar.createDiv({ cls: 'typefully-analytics-stacked-segment' })
        segment.style.width = `${pct}%`
        segment.style.backgroundColor = item.color
        segment.setAttr('aria-label', `${item.label}: ${formatNumber(value)} (${pct.toFixed(1)}%)`)
        segment.setAttr('title', `${item.label}: ${formatNumber(value)} (${pct.toFixed(1)}%)`)
    }

    // Legend
    const legend = section.createDiv({ cls: 'typefully-analytics-legend' })

    for (const item of ENGAGEMENT_KEYS) {
        const value = totals.engagement[item.key]
        if (value === 0) continue
        const entry = legend.createDiv({ cls: 'typefully-analytics-legend-item' })
        const swatch = entry.createDiv({ cls: 'typefully-analytics-legend-swatch' })
        swatch.style.backgroundColor = item.color
        entry.createSpan({ text: `${item.label}: ${formatNumber(value)}` })
    }
}

function renderPostsTable(
    container: HTMLElement,
    posts: TypefullyAnalyticsPost[],
    state: AnalyticsState,
    rerender: () => void
) {
    if (posts.length === 0) {
        container.createEl('p', {
            text: 'No posts found for this date range.',
            cls: 'typefully-empty-state'
        })
        return
    }

    const section = container.createDiv({ cls: 'typefully-analytics-table-section' })
    section.createEl('h3', { text: 'All posts' })

    // Sort controls
    const controls = section.createDiv({ cls: 'typefully-analytics-sort-controls' })

    const sortOptions: { field: AnalyticsState['sortField']; label: string }[] = [
        { field: 'impressions', label: 'Impressions' },
        { field: 'created_at', label: 'Date' }
    ]

    for (const opt of sortOptions) {
        const btn = controls.createEl('button', {
            cls: `typefully-analytics-sort-btn${state.sortField === opt.field ? ' typefully-analytics-sort-active' : ''}`,
            text:
                opt.label +
                (state.sortField === opt.field ? (state.sortDesc ? ' \u2193' : ' \u2191') : '')
        })
        btn.addEventListener('click', () => {
            if (state.sortField === opt.field) {
                state.sortDesc = !state.sortDesc
            } else {
                state.sortField = opt.field
                state.sortDesc = true
            }
            rerender()
        })
    }

    // Sort posts
    const sorted = [...posts].sort((a, b) => {
        let cmp: number
        if (state.sortField === 'impressions') {
            cmp = a.metrics.impressions - b.metrics.impressions
        } else {
            cmp = a.created_at.localeCompare(b.created_at)
        }
        return state.sortDesc ? -cmp : cmp
    })

    // Table
    const table = section.createEl('table', { cls: 'typefully-analytics-table' })
    const thead = table.createEl('thead')
    const headerRow = thead.createEl('tr')
    headerRow.createEl('th', { text: 'Post' })
    headerRow.createEl('th', { text: 'Date' })
    headerRow.createEl('th', { text: 'Impr.' })
    headerRow.createEl('th', { text: 'Likes' })
    headerRow.createEl('th', { text: 'Comments' })
    headerRow.createEl('th', { text: 'Shares' })

    const tbody = table.createEl('tbody')
    for (const post of sorted) {
        const row = tbody.createEl('tr')

        const textCell = row.createEl('td', { cls: 'typefully-analytics-cell-text' })
        const link = textCell.createEl('a', {
            text:
                post.preview_text.length > 50
                    ? post.preview_text.slice(0, 50) + '...'
                    : post.preview_text,
            href: post.url
        })
        link.setAttr('target', '_blank')
        link.setAttr('rel', 'noopener')

        row.createEl('td', { text: format(new Date(post.created_at), 'PP') })
        row.createEl('td', { text: formatNumber(post.metrics.impressions) })
        row.createEl('td', { text: formatNumber(post.metrics.engagement.likes) })
        row.createEl('td', { text: formatNumber(post.metrics.engagement.comments) })
        row.createEl('td', { text: formatNumber(post.metrics.engagement.shares) })
    }
}

export function renderAnalyticsPage(
    container: HTMLElement,
    client: TypefullyApiClient,
    socialSetId: string
) {
    const today = new Date()
    const thirtyDaysAgo = subDays(today, 30)

    const state: AnalyticsState = {
        posts: [],
        startDate: format(thirtyDaysAgo, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
        loading: false,
        sortField: 'impressions',
        sortDesc: true
    }

    // Date range picker
    const filters = container.createDiv({ cls: 'typefully-analytics-filters' })

    const startLabel = filters.createEl('label', { text: 'From ' })
    const startInput = startLabel.createEl('input', { type: 'date' })
    startInput.value = state.startDate
    startInput.addEventListener('change', () => {
        state.startDate = startInput.value
    })

    const endLabel = filters.createEl('label', { text: ' To ' })
    const endInput = endLabel.createEl('input', { type: 'date' })
    endInput.value = state.endDate
    endInput.addEventListener('change', () => {
        state.endDate = endInput.value
    })

    const loadBtn = filters.createEl('button', {
        text: 'Load',
        cls: 'mod-cta'
    })
    loadBtn.addEventListener('click', () => {
        state.posts = []
        void loadAllPosts()
    })

    // Note about platform limitation
    filters.createEl('span', {
        text: 'X (Twitter) only',
        cls: 'typefully-analytics-platform-note'
    })

    // Results container
    const resultsEl = container.createDiv()

    void loadAllPosts()

    async function loadAllPosts() {
        if (state.loading) return
        state.loading = true
        state.posts = []
        renderResults()

        try {
            let offset = 0
            let hasMore = true

            while (hasMore) {
                const response = await client.listAnalyticsPosts(socialSetId, PLATFORM, {
                    start_date: state.startDate,
                    end_date: state.endDate,
                    limit: ANALYTICS_PAGE_SIZE,
                    offset
                })

                state.posts.push(...response.results)
                hasMore = response.next !== null
                offset += ANALYTICS_PAGE_SIZE

                // Render incrementally so the user sees progress
                renderResults()
            }
        } catch (error) {
            log('Failed to load analytics', 'error', error)
            new Notice('Failed to load analytics', NOTICE_TIMEOUT)
        } finally {
            state.loading = false
            renderResults()
        }
    }

    function renderResults() {
        resultsEl.empty()

        if (state.loading && state.posts.length === 0) {
            resultsEl.createEl('p', {
                text: 'Loading analytics...',
                cls: 'typefully-analytics-loading'
            })
            return
        }

        if (state.loading) {
            resultsEl.createEl('p', {
                text: `Loading... (${state.posts.length} posts so far)`,
                cls: 'typefully-analytics-loading'
            })
        }

        renderSummaryCards(resultsEl, state.posts)
        renderTopPostsChart(resultsEl, state.posts)
        renderEngagementBreakdown(resultsEl, state.posts)
        renderPostsTable(resultsEl, state.posts, state, renderResults)
    }
}
