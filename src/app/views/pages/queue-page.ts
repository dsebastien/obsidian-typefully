import { Notice } from 'obsidian'
import type { App } from 'obsidian'
import type { TypefullyApiClient } from '../../api/typefully-api-client'
import type { TypefullyQueueDay } from '../../types/typefully-api.intf'
import { NOTICE_TIMEOUT } from '../../constants'
import { log } from '../../../utils/log'
import type { ViewPage } from '../typefully-view-state'
import { format, parseISO, addDays, isPast } from 'date-fns'

function renderDay(
    container: HTMLElement,
    day: TypefullyQueueDay,
    navigate: (page: ViewPage) => void
) {
    const dayEl = container.createDiv({ cls: 'typefully-queue-day' })

    const dateStr = format(parseISO(day.date), 'EEEE, MMM d')
    dayEl.createDiv({ cls: 'typefully-queue-day-header', text: dateStr })

    const futureItems = (day.items || []).filter((item) => !isPast(parseISO(item.at)))

    if (futureItems.length === 0) {
        dayEl.createDiv({
            cls: 'typefully-queue-slot',
            text: 'No slots'
        })
        return
    }

    for (const item of futureItems) {
        const slotEl = dayEl.createDiv({ cls: 'typefully-queue-slot' })

        const time = format(parseISO(item.at), 'HH:mm')
        slotEl.createSpan({ cls: 'typefully-queue-slot-time', text: time })

        if (item.draft) {
            const draftPreview = slotEl.createSpan({
                cls: 'typefully-queue-slot-draft'
            })

            draftPreview.setText(item.draft.draft_title || item.draft.preview || 'Untitled draft')

            const draft = item.draft
            draftPreview.addEventListener('click', () => {
                navigate({ type: 'draft-edit', draftId: draft.id, draft, sourceTab: 'queue' })
            })
        } else {
            const availableLink = slotEl.createSpan({
                cls: 'typefully-queue-slot-available typefully-queue-slot-clickable',
                text: '+ New draft'
            })
            const slotTime = item.at
            availableLink.addEventListener('click', () => {
                navigate({ type: 'draft-create', scheduledAt: slotTime })
            })
        }
    }
}

function formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd')
}

export function renderQueuePage(
    container: HTMLElement,
    _app: App,
    client: TypefullyApiClient,
    socialSetId: string,
    navigate: (page: ViewPage) => void
) {
    void loadQueue()

    async function loadQueue() {
        try {
            const today = new Date()
            const startDate = formatDate(today)
            const endDate = formatDate(addDays(today, 14))

            const days = await client.getQueue(socialSetId, startDate, endDate)

            if (!days || days.length === 0) {
                container.createEl('p', { text: 'No scheduled slots found.' })
                return
            }

            for (const day of days) {
                renderDay(container, day, navigate)
            }
        } catch (error) {
            log('Failed to load queue', 'error', error)
            new Notice('Failed to load queue', NOTICE_TIMEOUT)
        }
    }
}
