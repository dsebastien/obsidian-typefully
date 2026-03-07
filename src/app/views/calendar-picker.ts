import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    format,
    setHours,
    setMinutes
} from 'date-fns'

/**
 * Inline calendar + time picker.
 * Calls `onChange` with the selected Date whenever the user picks a day or changes the time.
 */
export function renderCalendarPicker(
    container: HTMLElement,
    initial: Date | null,
    onChange: (date: Date) => void
) {
    let viewMonth = initial ?? new Date()
    let selected: Date | null = initial ? new Date(initial) : null

    const wrapper = container.createDiv({ cls: 'typefully-cal' })
    const headerEl = wrapper.createDiv({ cls: 'typefully-cal-header' })
    const gridEl = wrapper.createDiv({ cls: 'typefully-cal-grid' })
    const timeRow = wrapper.createDiv({ cls: 'typefully-cal-time' })

    // Time input
    timeRow.createSpan({ text: 'Time', cls: 'typefully-cal-time-label' })
    const timeInput = timeRow.createEl('input', {
        attr: { type: 'time' },
        cls: 'typefully-cal-time-input'
    })
    timeInput.value = selected ? format(selected, 'HH:mm') : '09:00'
    timeInput.addEventListener('change', () => {
        if (!selected) return
        const [h, m] = timeInput.value.split(':').map(Number)
        selected = setMinutes(setHours(selected, h ?? 9), m ?? 0)
        onChange(selected)
    })

    renderHeader()
    renderGrid()

    function renderHeader() {
        headerEl.empty()
        const prevBtn = headerEl.createEl('button', {
            text: '\u2039',
            cls: 'typefully-cal-nav clickable-icon'
        })
        headerEl.createSpan({
            text: format(viewMonth, 'MMMM yyyy'),
            cls: 'typefully-cal-title'
        })
        const nextBtn = headerEl.createEl('button', {
            text: '\u203A',
            cls: 'typefully-cal-nav clickable-icon'
        })

        prevBtn.addEventListener('click', () => {
            viewMonth = subMonths(viewMonth, 1)
            renderHeader()
            renderGrid()
        })
        nextBtn.addEventListener('click', () => {
            viewMonth = addMonths(viewMonth, 1)
            renderHeader()
            renderGrid()
        })
    }

    function renderGrid() {
        gridEl.empty()

        // Day-of-week headers
        for (const d of ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']) {
            gridEl.createSpan({ text: d, cls: 'typefully-cal-dow' })
        }

        const monthStart = startOfMonth(viewMonth)
        const monthEnd = endOfMonth(viewMonth)
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

        let cursor = gridStart
        while (cursor <= gridEnd) {
            const day = new Date(cursor)
            const inMonth = isSameMonth(day, viewMonth)
            const isSelected = selected !== null && isSameDay(day, selected)

            let cls = 'typefully-cal-day'
            if (!inMonth) cls += ' typefully-cal-day-outside'
            if (isSelected) cls += ' typefully-cal-day-selected'

            const cell = gridEl.createSpan({ text: String(day.getDate()), cls })
            cell.addEventListener('click', () => {
                const [h, m] = timeInput.value.split(':').map(Number)
                selected = setMinutes(setHours(day, h ?? 9), m ?? 0)
                onChange(selected)
                renderGrid()
            })

            cursor = addDays(cursor, 1)
        }
    }
}
