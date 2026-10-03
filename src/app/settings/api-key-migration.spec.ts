import { describe, expect, test, mock } from 'bun:test'
import { produce } from 'immer'
import { createDefaultSettings } from '../types/plugin-settings.intf'
import { DEFAULT_API_KEY_SECRET_NAME } from '../utils/api-key-secret.fn'
import type { SecretStore } from '../utils/api-key-secret.fn'
import TypefullyPlugin from '../../main'

/**
 * End-to-end coverage of the plaintext API key → SecretStorage migration as
 * the plugin runs it: per-device bootstrap from the synced plaintext copy,
 * rotation, clearing, and both ways the plaintext copy goes away.
 */

class MemorySecretStore implements SecretStore {
    readonly secrets = new Map<string, string>()
    writes = 0

    getSecret(id: string): string | null {
        return this.secrets.get(id) ?? null
    }

    setSecret(id: string, secret: string): void {
        this.writes += 1
        this.secrets.set(id, secret)
    }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** One synced data.json shared by several devices, each with its own store. */
class SyncedDisk {
    data: unknown

    constructor(data: unknown) {
        this.data = structuredClone(data)
    }

    get record(): Record<string, unknown> {
        return this.data as Record<string, unknown>
    }
}

interface Device {
    plugin: TypefullyPlugin
    store: MemorySecretStore
    load: () => Promise<void>
}

function createDevice(disk: SyncedDisk, store = new MemorySecretStore()): Device {
    const plugin = Object.create(TypefullyPlugin.prototype) as TypefullyPlugin
    const set = (key: string, value: unknown): void => {
        Reflect.set(plugin, key, value)
    }
    set('app', { secretStorage: store })
    set('loadData', (): Promise<unknown> => Promise.resolve(structuredClone(disk.data)))
    set(
        'saveData',
        mock((data: unknown): Promise<void> => {
            disk.data = structuredClone(data)
            return Promise.resolve()
        })
    )

    const load = async (): Promise<void> => {
        set(
            'settings',
            produce(createDefaultSettings(), () => {})
        )
        set('settingsWriteChain', Promise.resolve())
        set('legacyApiKey', '')
        await plugin.loadSettings()
        await flush(plugin)
    }

    return { plugin, store, load }
}

/** loadSettings and getApiKey persist through the write queue without awaiting it. */
async function flush(plugin: TypefullyPlugin): Promise<void> {
    await (Reflect.get(plugin, 'settingsWriteChain') as Promise<void>)
}

describe('API key migration across synced devices', () => {
    test('device A migrates and keeps the plaintext copy for the other devices', async () => {
        const disk = new SyncedDisk({ apiKey: 'legacy-key', socialSetId: '42' })
        const a = createDevice(disk)
        await a.load()

        expect(a.store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('legacy-key')
        expect(a.plugin.getApiKey()).toBe('legacy-key')
        expect(a.plugin.settings.socialSetId).toBe('42')
        expect(disk.record['apiKey']).toBe('legacy-key')
        expect(disk.record['apiKeySecretName']).toBe(DEFAULT_API_KEY_SECRET_NAME)
        expect(typeof disk.record['legacySecretMigratedAt']).toBe('string')
        expect(disk.record['legacySecretMigratedAt']).not.toBe('')
    })

    test('device B with empty SecretStorage bootstraps from the plaintext copy', async () => {
        const disk = new SyncedDisk({ apiKey: 'legacy-key' })
        const a = createDevice(disk)
        await a.load()

        const b = createDevice(disk)
        await b.load()

        expect(b.store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('legacy-key')
        expect(b.plugin.getApiKey()).toBe('legacy-key')
        expect(b.plugin.hasLegacyApiKey()).toBe(true)
    })

    test('a reload is a no-op', async () => {
        const disk = new SyncedDisk({ apiKey: 'legacy-key' })
        const a = createDevice(disk)
        await a.load()
        const writes = a.store.writes
        const snapshot = structuredClone(disk.data)

        await a.load()

        expect(a.store.writes).toBe(writes)
        expect(disk.data).toEqual(snapshot)
    })

    test('rotating the secret removes the stale plaintext copy', async () => {
        const disk = new SyncedDisk({ apiKey: 'legacy-key' })
        const a = createDevice(disk)
        await a.load()

        a.store.secrets.set(DEFAULT_API_KEY_SECRET_NAME, 'rotated-key')
        expect(a.plugin.getApiKey()).toBe('rotated-key')
        await flush(a.plugin)

        expect(disk.record['apiKey']).toBeUndefined()
        expect(a.plugin.hasLegacyApiKey()).toBe(false)
    })

    test('picking another secret removes the plaintext copy', async () => {
        const disk = new SyncedDisk({ apiKey: 'legacy-key' })
        const a = createDevice(disk)
        await a.load()

        await a.plugin.setApiKeySecretName('my-other-secret')

        expect(disk.record['apiKey']).toBeUndefined()
        expect(disk.record['apiKeySecretName']).toBe('my-other-secret')
    })

    test('clearing the key clears both the secret and the plaintext copy', async () => {
        const disk = new SyncedDisk({ apiKey: 'legacy-key' })
        const a = createDevice(disk)
        await a.load()

        await a.plugin.clearApiKey()

        expect(a.store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('')
        expect(disk.record['apiKey']).toBeUndefined()
        expect(a.plugin.getApiKey()).toBe('')

        // Another device does not bootstrap it back
        const b = createDevice(disk)
        await b.load()
        expect(b.plugin.getApiKey()).toBe('')
    })

    test('the plaintext copy is purged 60 days after the first migration', async () => {
        const migratedAt = new Date(Date.now() - 61 * DAY_MS).toISOString()
        const disk = new SyncedDisk({
            apiKey: 'legacy-key',
            apiKeySecretName: DEFAULT_API_KEY_SECRET_NAME,
            legacySecretMigratedAt: migratedAt
        })
        const b = createDevice(disk)
        await b.load()

        expect(disk.record['apiKey']).toBeUndefined()
        // This device still bootstrapped before the purge
        expect(b.plugin.getApiKey()).toBe('legacy-key')
    })

    test('the plaintext copy is kept within the grace period', async () => {
        const migratedAt = new Date(Date.now() - 59 * DAY_MS).toISOString()
        const disk = new SyncedDisk({
            apiKey: 'legacy-key',
            apiKeySecretName: DEFAULT_API_KEY_SECRET_NAME,
            legacySecretMigratedAt: migratedAt
        })
        await createDevice(disk).load()

        expect(disk.record['apiKey']).toBe('legacy-key')
    })

    test('"Remove plain-text copy now" purges it immediately', async () => {
        const disk = new SyncedDisk({ apiKey: 'legacy-key' })
        const a = createDevice(disk)
        await a.load()

        await a.plugin.removeLegacyApiKey()

        expect(disk.record['apiKey']).toBeUndefined()
        expect(a.plugin.hasLegacyApiKey()).toBe(false)
        expect(a.plugin.getApiKey()).toBe('legacy-key')
    })

    test('a synced data.json with no plaintext and no local secret yields no key', async () => {
        const disk = new SyncedDisk({ apiKeySecretName: DEFAULT_API_KEY_SECRET_NAME })
        const b = createDevice(disk)
        await b.load()

        expect(b.plugin.getApiKey()).toBe('')
        expect(b.store.writes).toBe(0)
    })

    test('reading falls back to the plaintext copy and migrates at that moment', async () => {
        const disk = new SyncedDisk({ apiKey: 'legacy-key' })
        const a = createDevice(disk)
        await a.load()

        a.store.secrets.delete(DEFAULT_API_KEY_SECRET_NAME)
        expect(a.plugin.getApiKey()).toBe('legacy-key')
        expect(a.store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('legacy-key')
    })

    test('keeps the plaintext key on disk when SecretStorage rejects it', async () => {
        const store = new MemorySecretStore()
        store.setSecret = (): void => {
            throw new Error('unavailable')
        }
        const disk = new SyncedDisk({ apiKey: 'legacy-key' })
        const a = createDevice(disk, store)
        await a.load()

        expect(a.plugin.getApiKey()).toBe('legacy-key')
        await a.plugin.updateSettings((draft) => {
            draft.socialSetId = '7'
        })
        expect(disk.record['apiKey']).toBe('legacy-key')
    })
})
