import { Notice, Setting } from 'obsidian'
import type { TypefullyApiClient } from '../../api/typefully-api-client'
import type {
    TypefullyQueueSchedule,
    TypefullyQueueScheduleRule
} from '../../types/typefully-api.intf'
import { NOTICE_TIMEOUT } from '../../constants'
import { log } from '../../../utils/log'

type DayCode = TypefullyQueueScheduleRule['days'][number]

const DAY_LABELS: Record<DayCode, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday'
}

const DAY_ORDER: DayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/**
 * Group flat rules (each with h, m, days[]) into a per-day view
 * showing which times are scheduled for each day.
 */
function groupRulesByDay(rules: TypefullyQueueScheduleRule[]): Map<DayCode, string[]> {
    const map = new Map<DayCode, string[]>()
    for (const day of DAY_ORDER) {
        map.set(day, [])
    }
    for (const rule of rules) {
        const time = `${String(rule.h).padStart(2, '0')}:${String(rule.m).padStart(2, '0')}`
        for (const day of rule.days) {
            map.get(day)?.push(time)
        }
    }
    // Sort times within each day
    for (const times of map.values()) {
        times.sort()
    }
    return map
}

export function renderQueueSchedulePage(
    container: HTMLElement,
    client: TypefullyApiClient,
    socialSetId: string,
    goBack: () => void
) {
    const loadingEl = container.createEl('p', { text: 'Loading schedule...' })

    void loadSchedule()

    async function loadSchedule() {
        try {
            const schedule = await client.getQueueSchedule(socialSetId)
            loadingEl.remove()
            renderSchedule(container, schedule, client, socialSetId, goBack)
        } catch (error) {
            loadingEl.remove()
            log('Failed to load queue schedule', 'error', error)
            new Notice('Failed to load queue schedule', NOTICE_TIMEOUT)
            container.createEl('p', { text: 'Failed to load schedule.' })
        }
    }
}

function renderSchedule(
    container: HTMLElement,
    schedule: TypefullyQueueSchedule,
    client: TypefullyApiClient,
    socialSetId: string,
    goBack: () => void
) {
    const byDay = groupRulesByDay(schedule.rules)
    const timezone = schedule.timezone

    container.createEl('div', {
        cls: 'typefully-schedule-timezone',
        text: `Timezone: ${timezone}`
    })

    const daysContainer = container.createDiv({ cls: 'typefully-schedule-days' })

    for (const day of DAY_ORDER) {
        const times = byDay.get(day) ?? []
        renderDayRow(daysContainer, day, times)
    }

    // Save button
    const actionsEl = container.createDiv({ cls: 'typefully-view-actions' })

    const cancelBtn = actionsEl.createEl('button', { text: 'Cancel' })
    cancelBtn.addEventListener('click', () => goBack())

    const saveBtn = actionsEl.createEl('button', { text: 'Save schedule', cls: 'mod-cta' })
    saveBtn.addEventListener('click', () => {
        void (async () => {
            try {
                // Convert per-day view back to flat rules
                const rules = dayMapToRules(byDay)
                await client.updateQueueSchedule(socialSetId, { rules })
                new Notice('Queue schedule updated', NOTICE_TIMEOUT)
                goBack()
            } catch (error) {
                log('Failed to update queue schedule', 'error', error)
                new Notice('Failed to update queue schedule', NOTICE_TIMEOUT)
            }
        })()
    })
}

/**
 * Convert per-day time map back to flat rules for the API.
 * Groups times that share the same h:m into a single rule with multiple days.
 */
function dayMapToRules(byDay: Map<DayCode, string[]>): TypefullyQueueScheduleRule[] {
    const timeMap = new Map<string, DayCode[]>()
    for (const [day, times] of byDay) {
        for (const time of times) {
            const existing = timeMap.get(time)
            if (existing) {
                existing.push(day)
            } else {
                timeMap.set(time, [day])
            }
        }
    }
    const rules: TypefullyQueueScheduleRule[] = []
    for (const [time, days] of timeMap) {
        const [hStr, mStr] = time.split(':')
        rules.push({ h: Number(hStr), m: Number(mStr), days })
    }
    rules.sort((a, b) => a.h - b.h || a.m - b.m)
    return rules
}

function renderDayRow(container: HTMLElement, day: DayCode, times: string[]) {
    const dayEl = container.createDiv({ cls: 'typefully-schedule-day' })

    new Setting(dayEl).setName(DAY_LABELS[day])

    const timesEl = dayEl.createDiv({ cls: 'typefully-schedule-times' })

    function rerenderTimes() {
        timesEl.empty()

        for (let i = 0; i < times.length; i++) {
            const timeSlot = timesEl.createDiv({ cls: 'typefully-schedule-time-slot' })

            const input = timeSlot.createEl('input', {
                type: 'time',
                value: times[i],
                cls: 'typefully-schedule-time-input'
            })
            input.addEventListener('change', () => {
                times[i] = input.value
            })

            const removeBtn = timeSlot.createEl('button', {
                text: 'Remove',
                cls: 'typefully-schedule-remove-btn'
            })
            removeBtn.addEventListener('click', () => {
                times.splice(i, 1)
                rerenderTimes()
            })
        }

        const addBtn = timesEl.createEl('button', {
            text: '+ Add time',
            cls: 'typefully-schedule-add-btn'
        })
        addBtn.addEventListener('click', () => {
            times.push('09:00')
            rerenderTimes()
        })
    }

    if (times.length === 0) {
        timesEl.createSpan({ text: 'No times set', cls: 'typefully-empty-state' })
        const addBtn = timesEl.createEl('button', {
            text: '+ Add time',
            cls: 'typefully-schedule-add-btn'
        })
        addBtn.addEventListener('click', () => {
            times.push('09:00')
            rerenderTimes()
        })
    } else {
        rerenderTimes()
    }
}
