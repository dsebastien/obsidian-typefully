import { describe, expect, test, mock } from 'bun:test'
import { TypefullySettingTab } from './settings-tab'
import { DEFAULT_SETTINGS } from '../types/plugin-settings.intf'
import type { PluginSettings } from '../types/plugin-settings.intf'
import TypefullyPlugin from '../../main'

/**
 * Behavioral coverage for the settings write path.
 *
 * Nothing in CI renders a settings pane, so these tests exercise the
 * properties no UI test can reach: writes are serialized, memory is committed
 * only after persistence succeeds, a rejected value never reaches the store,
 * and the derived platform flags stay consistent under overlapping writes.
 */

async function expectRejection(promise: Promise<unknown>, contains: string): Promise<void> {
    let caught: unknown
    await promise.catch((error: unknown) => {
        caught = error
    })
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toContain(contains)
}

interface Harness {
    plugin: TypefullyPlugin
    tab: TypefullySettingTab
    saveData: ReturnType<typeof mock>
    updates: number
}

function createHarness(options?: {
    saveData?: () => Promise<void>
    settings?: Partial<PluginSettings>
}): Harness {
    const saveData = mock(async () => {
        if (options?.saveData) {
            await options.saveData()
        }
    })

    const plugin = Object.create(TypefullyPlugin.prototype) as TypefullyPlugin
    const internals = plugin as unknown as Record<string, unknown>
    internals['settings'] = structuredClone({ ...DEFAULT_SETTINGS, ...options?.settings })
    internals['settingsWriteChain'] = Promise.resolve()
    internals['saveData'] = saveData

    const tab = Object.create(TypefullySettingTab.prototype) as TypefullySettingTab
    const harness: Harness = { plugin, tab, saveData, updates: 0 }
    const tabInternals = tab as unknown as Record<string, unknown>
    tabInternals['plugin'] = plugin
    tabInternals['socialSets'] = []
    tabInternals['update'] = (): void => {
        harness.updates += 1
    }

    return harness
}

describe('updateSettings', () => {
    test('commits to memory only after the write is persisted', async () => {
        let release = (): void => {}
        const gate = new Promise<void>((resolve) => {
            release = resolve
        })
        const { plugin, saveData } = createHarness({ saveData: () => gate })

        const pending = plugin.updateSettings((draft) => {
            draft.socialSetId = 'committed'
        })

        // Let the queued write start and reach its save await; a bare
        // synchronous assertion would pass even with the ordering reversed,
        // because the chain defers the work to a microtask.
        await Promise.resolve()
        await Promise.resolve()
        expect(saveData).toHaveBeenCalledTimes(1)
        expect(plugin.settings.socialSetId).toBe(DEFAULT_SETTINGS.socialSetId)

        release()
        await pending
        expect(plugin.settings.socialSetId).toBe('committed')
    })

    test('leaves memory untouched and rejects when persistence fails', async () => {
        const { plugin } = createHarness({
            saveData: () => Promise.reject(new Error('disk full'))
        })

        await expectRejection(
            plugin.updateSettings((draft) => {
                draft.autoPlug = !DEFAULT_SETTINGS.autoPlug
            }),
            'disk full'
        )
        expect(plugin.settings.autoPlug).toBe(DEFAULT_SETTINGS.autoPlug)
    })

    test('serializes overlapping writes so both land', async () => {
        let release = (): void => {}
        const gate = new Promise<void>((resolve) => {
            release = resolve
        })
        let first = true
        const { plugin } = createHarness({
            saveData: () => {
                if (first) {
                    first = false
                    return gate
                }
                return Promise.resolve()
            }
        })

        const a = plugin.updateSettings((draft) => {
            draft.socialSetId = 'first'
        })
        const b = plugin.updateSettings((draft) => {
            draft.threadify = !DEFAULT_SETTINGS.threadify
        })
        release()
        await Promise.all([a, b])
        expect(plugin.settings.socialSetId).toBe('first')
        expect(plugin.settings.threadify).toBe(!DEFAULT_SETTINGS.threadify)
    })
})

describe('platform toggles', () => {
    test('enabling all platforms turns each individual platform on', async () => {
        const { tab, plugin } = createHarness({
            settings: {
                enableAllPlatforms: false,
                platforms: {
                    x: true,
                    linkedin: false,
                    threads: false,
                    bluesky: false,
                    mastodon: false
                }
            }
        })
        await tab.setControlValue('enableAllPlatforms', true)
        expect(plugin.settings.platforms).toEqual({
            x: true,
            linkedin: true,
            threads: true,
            bluesky: true,
            mastodon: true
        })
    })

    test('disabling one platform clears the all-platforms flag', async () => {
        const { tab, plugin } = createHarness({
            settings: {
                enableAllPlatforms: true,
                platforms: { x: true, linkedin: true, threads: true, bluesky: true, mastodon: true }
            }
        })
        await tab.setControlValue('platform:linkedin', false)
        expect(plugin.settings.platforms.linkedin).toBe(false)
        expect(plugin.settings.enableAllPlatforms).toBe(false)
    })

    test('enabling the last missing platform sets the all-platforms flag', async () => {
        const { tab, plugin } = createHarness({
            settings: {
                enableAllPlatforms: false,
                platforms: {
                    x: true,
                    linkedin: true,
                    threads: true,
                    bluesky: true,
                    mastodon: false
                }
            }
        })
        await tab.setControlValue('platform:mastodon', true)
        expect(plugin.settings.enableAllPlatforms).toBe(true)
    })

    test('concurrently enabling the last two platforms sets the derived flag', async () => {
        // The derived flag MUST be computed inside the mutator, against the
        // state the write is applied to. Computing it from a snapshot taken
        // before the await makes each of these two writes see the other
        // platform as still disabled, so the flag would stay false even
        // though every platform ends up enabled.
        const { tab, plugin } = createHarness({
            settings: {
                enableAllPlatforms: false,
                platforms: {
                    x: true,
                    linkedin: true,
                    threads: false,
                    bluesky: true,
                    mastodon: false
                }
            }
        })
        await Promise.all([
            tab.setControlValue('platform:threads', true),
            tab.setControlValue('platform:mastodon', true)
        ])
        expect(plugin.settings.platforms.threads).toBe(true)
        expect(plugin.settings.platforms.mastodon).toBe(true)
        expect(plugin.settings.enableAllPlatforms).toBe(true)
    })

    test('rejects an unknown platform key', async () => {
        const { tab, saveData } = createHarness()
        await expectRejection(
            tab.setControlValue('platform:pinterest', true),
            'does not address a known platform'
        )
        expect(saveData).not.toHaveBeenCalled()
    })
})

describe('the migration save shares the write queue', () => {
    test('a migration write cannot land after a later user edit', async () => {
        let release = (): void => {}
        const gate = new Promise<void>((resolve) => {
            release = resolve
        })
        let first = true
        const { plugin } = createHarness({
            saveData: () => {
                if (first) {
                    first = false
                    return gate
                }
                return Promise.resolve()
            }
        })

        // Stand-in for loadSettings' post-migration persist: it must go
        // through the same chain, or its slow save can finish last and put
        // the pre-edit state back on disk.
        const migration = plugin.updateSettings(() => {
            // persists the already-migrated in-memory state
        })
        const userEdit = plugin.updateSettings((draft) => {
            draft.socialSetId = 'typed-by-the-user'
        })
        release()
        await Promise.all([migration, userEdit])

        const lastWrite = (
            plugin as unknown as { saveData: ReturnType<typeof mock> }
        ).saveData.mock.calls.at(-1)?.[0] as PluginSettings
        expect(lastWrite.socialSetId).toBe('typed-by-the-user')
        expect(plugin.settings.socialSetId).toBe('typed-by-the-user')
    })
})

describe('setControlValue', () => {
    test('parses the excluded-tags textarea into the stored list', async () => {
        const { tab, plugin } = createHarness()
        await tab.setControlValue('excludedTags', 'permanent_notes, literature_notes')
        expect(plugin.settings.excludedTags).toEqual(['permanent_notes', 'literature_notes'])
        // Round-trips back through the resolver the control reads from.
        expect(tab.getControlValue('excludedTags')).toContain('permanent_notes')
    })

    test('writes nested screenshot fields through their prefixed keys', async () => {
        const { tab, plugin } = createHarness()
        await tab.setControlValue('screenshot:watermarkText', 'dSebastien')
        await tab.setControlValue('screenshot:showTitle', false)
        expect(plugin.settings.screenshot.watermarkText).toBe('dSebastien')
        expect(plugin.settings.screenshot.showTitle).toBe(false)
        expect(tab.getControlValue('screenshot:watermarkText')).toBe('dSebastien')
    })

    test('rejects dropdown values outside the declared options', async () => {
        const { tab, plugin, saveData } = createHarness()
        await expectRejection(
            tab.setControlValue('screenshot:aspectRatio', 'ultrawide'),
            'expects one of the declared options'
        )
        await expectRejection(
            tab.setControlValue('screenshot:cardTheme', 'sepia'),
            'expects one of the declared options'
        )
        expect(saveData).not.toHaveBeenCalled()
        expect(plugin.settings.screenshot.aspectRatio).toBe(DEFAULT_SETTINGS.screenshot.aspectRatio)
    })

    test('rejects type-mismatched values without writing', async () => {
        const { tab, plugin, saveData } = createHarness()
        await expectRejection(tab.setControlValue('threadify', 'yes'), 'expects a boolean')
        await expectRejection(tab.setControlValue('screenshot:customFont', 42), 'expects a string')
        expect(saveData).not.toHaveBeenCalled()
        expect(plugin.settings.threadify).toBe(DEFAULT_SETTINGS.threadify)
    })

    test('rejects unknown keys, including prototype-ish ones', async () => {
        const { tab, saveData } = createHarness()
        await expectRejection(
            tab.setControlValue('__proto__', 'x'),
            'does not address a known field'
        )
        await expectRejection(
            tab.setControlValue('screenshot:__proto__', 'x'),
            'does not address a known field'
        )
        expect(saveData).not.toHaveBeenCalled()
    })
})
