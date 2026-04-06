import { Notice } from 'obsidian'
import type { TypefullyApiClient } from '../../api/typefully-api-client'
import type { TypefullyAnalyticsPost } from '../../types/typefully-api.intf'
import { NOTICE_TIMEOUT } from '../../constants'
import { log } from '../../../utils/log'
import { addDays, differenceInDays, format, parseISO, subDays } from 'date-fns'

const ANALYTICS_PAGE_SIZE = 100
const TOP_POSTS_COUNT = 10
const PLATFORM = 'x'
const MAX_API_RANGE_DAYS = 365

interface DateRangePreset {
    label: string
    days: number | null // null = all time
}

const DATE_RANGE_PRESETS: DateRangePreset[] = [
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'Last year', days: 365 },
    { label: 'All time', days: null }
]

const DEFAULT_PRESET_INDEX = 0 // Last 30 days

interface AnalyticsState {
    posts: TypefullyAnalyticsPost[]
    startDate: string
    endDate: string
    activePresetIndex: number
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

function splitDateRange(
    startDate: string,
    endDate: string
): { startDate: string; endDate: string }[] {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const totalDays = differenceInDays(end, start)

    if (totalDays <= MAX_API_RANGE_DAYS) {
        return [{ startDate, endDate }]
    }

    const chunks: { startDate: string; endDate: string }[] = []
    let chunkStart = start
    while (differenceInDays(end, chunkStart) > MAX_API_RANGE_DAYS) {
        const chunkEnd = addDays(chunkStart, MAX_API_RANGE_DAYS)
        chunks.push({
            startDate: format(chunkStart, 'yyyy-MM-dd'),
            endDate: format(chunkEnd, 'yyyy-MM-dd')
        })
        chunkStart = addDays(chunkEnd, 1)
    }
    chunks.push({ startDate: format(chunkStart, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') })
    return chunks
}

function datesFromPreset(preset: DateRangePreset): { startDate: string; endDate: string } {
    const today = new Date()
    const endDate = format(today, 'yyyy-MM-dd')
    const startDate =
        preset.days !== null ? format(subDays(today, preset.days), 'yyyy-MM-dd') : '2020-01-01'
    return { startDate, endDate }
}

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
    const defaultPreset = DATE_RANGE_PRESETS[DEFAULT_PRESET_INDEX]!
    const defaultDates = datesFromPreset(defaultPreset)

    const state: AnalyticsState = {
        posts: [],
        startDate: defaultDates.startDate,
        endDate: defaultDates.endDate,
        activePresetIndex: DEFAULT_PRESET_INDEX,
        loading: false,
        sortField: 'impressions',
        sortDesc: true
    }

    // Date range preset buttons
    const filters = container.createDiv({ cls: 'typefully-analytics-filters' })
    const presetButtons: HTMLButtonElement[] = []

    for (let i = 0; i < DATE_RANGE_PRESETS.length; i++) {
        const preset = DATE_RANGE_PRESETS[i]!
        const btn = filters.createEl('button', {
            text: preset.label,
            cls: `typefully-analytics-range-btn${i === state.activePresetIndex ? ' typefully-analytics-range-active' : ''}`
        })
        btn.addEventListener('click', () => {
            const dates = datesFromPreset(preset)
            state.startDate = dates.startDate
            state.endDate = dates.endDate
            state.activePresetIndex = i
            for (let j = 0; j < presetButtons.length; j++) {
                presetButtons[j]!.toggleClass('typefully-analytics-range-active', j === i)
            }
            state.posts = []
            void loadAllPosts()
        })
        presetButtons.push(btn)
    }

    // Note about platform limitation
    filters.createEl('span', {
        text: 'X (Twitter) only',
        cls: 'typefully-analytics-platform-note'
    })

    // Results container
    const resultsEl = container.createDiv()

    let currentLoadId = 0

    void loadAllPosts()

    async function loadAllPosts() {
        const loadId = ++currentLoadId
        state.loading = true
        state.posts = []
        renderResults()

        try {
            const chunks = splitDateRange(state.startDate, state.endDate)

            for (const chunk of chunks) {
                let offset = 0
                let hasMore = true

                while (hasMore) {
                    const response = await client.listAnalyticsPosts(socialSetId, PLATFORM, {
                        start_date: chunk.startDate,
                        end_date: chunk.endDate,
                        limit: ANALYTICS_PAGE_SIZE,
                        offset
                    })

                    // A newer load was started — discard these results
                    if (loadId !== currentLoadId) return

                    state.posts.push(...response.results)
                    hasMore = response.next !== null
                    offset += ANALYTICS_PAGE_SIZE

                    // Render incrementally so the user sees progress
                    renderResults()
                }
            }
        } catch (error) {
            if (loadId !== currentLoadId) return
            log('Failed to load analytics', 'error', error)
            new Notice('Failed to load analytics', NOTICE_TIMEOUT)
        } finally {
            if (loadId === currentLoadId) {
                state.loading = false
                renderResults()
            }
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
