import { describe, expect, test } from 'bun:test'
import {
    DEFAULT_API_KEY_SECRET_NAME,
    LEGACY_API_KEY_GRACE_PERIOD_MS,
    isLegacyApiKeyExpired,
    isValidSecretName,
    migrateLegacyApiKey,
    readSecret
} from './api-key-secret.fn'
import type { SecretStore } from './api-key-secret.fn'

class MemorySecretStore implements SecretStore {
    readonly secrets = new Map<string, string>()
    writes = 0

    getSecret(id: string): string | null {
        return this.secrets.get(id) ?? null
    }

    setSecret(id: string, secret: string): void {
        if (!isValidSecretName(id)) {
            throw new Error('Invalid secret id')
        }
        this.writes += 1
        this.secrets.set(id, secret)
    }
}

describe('isValidSecretName', () => {
    test('accepts lowercase alphanumeric ids with dashes', () => {
        expect(isValidSecretName(DEFAULT_API_KEY_SECRET_NAME)).toBe(true)
        expect(isValidSecretName('abc-123')).toBe(true)
    })

    test('rejects invalid ids', () => {
        expect(isValidSecretName('')).toBe(false)
        expect(isValidSecretName('Upper')).toBe(false)
        expect(isValidSecretName('under_score')).toBe(false)
        expect(isValidSecretName('-leading')).toBe(false)
        expect(isValidSecretName(42)).toBe(false)
    })
})

describe('readSecret', () => {
    test('returns the stored value', () => {
        const store = new MemorySecretStore()
        store.secrets.set('my-key', 'value')
        expect(readSecret(store, 'my-key')).toBe('value')
    })

    test('returns empty string when missing, invalid, or no store', () => {
        const store = new MemorySecretStore()
        expect(readSecret(store, 'missing')).toBe('')
        expect(readSecret(store, '')).toBe('')
        expect(readSecret(undefined, 'my-key')).toBe('')
    })

    test('returns empty string when the store throws', () => {
        const store: SecretStore = {
            getSecret: () => {
                throw new Error('boom')
            },
            setSecret: () => {}
        }
        expect(readSecret(store, 'my-key')).toBe('')
    })
})

const NOW = new Date('2026-10-03T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

function daysBefore(days: number): string {
    return new Date(NOW.getTime() - days * DAY_MS).toISOString()
}

describe('isLegacyApiKeyExpired', () => {
    test('expires 60 days after the first migration', () => {
        expect(isLegacyApiKeyExpired(daysBefore(59), NOW)).toBe(false)
        expect(isLegacyApiKeyExpired(daysBefore(60), NOW)).toBe(true)
    })

    test('never expires without a valid date', () => {
        expect(isLegacyApiKeyExpired('', NOW)).toBe(false)
        expect(isLegacyApiKeyExpired('not a date', NOW)).toBe(false)
    })

    test('the grace period is 60 days', () => {
        expect(LEGACY_API_KEY_GRACE_PERIOD_MS).toBe(60 * DAY_MS)
    })
})

describe('migrateLegacyApiKey', () => {
    test('first device: copies the key into SecretStorage and keeps the plaintext copy', () => {
        const store = new MemorySecretStore()
        const result = migrateLegacyApiKey({ apiKey: 'legacy-key' }, store, NOW)
        expect(result).toEqual({
            secretName: DEFAULT_API_KEY_SECRET_NAME,
            legacyApiKey: 'legacy-key',
            legacySecretMigratedAt: NOW.toISOString(),
            changed: true
        })
        expect(store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('legacy-key')
    })

    test('other device: bootstraps its own secret from the plaintext copy', () => {
        const deviceB = new MemorySecretStore()
        const synced = {
            apiKey: 'legacy-key',
            apiKeySecretName: DEFAULT_API_KEY_SECRET_NAME,
            legacySecretMigratedAt: daysBefore(3)
        }
        const result = migrateLegacyApiKey(synced, deviceB, NOW)
        expect(deviceB.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('legacy-key')
        expect(result.legacyApiKey).toBe('legacy-key')
        expect(result.legacySecretMigratedAt).toBe(synced.legacySecretMigratedAt)
        expect(result.changed).toBe(false)
    })

    test('is idempotent', () => {
        const store = new MemorySecretStore()
        const first = migrateLegacyApiKey({ apiKey: 'legacy-key' }, store, NOW)
        const second = migrateLegacyApiKey(
            {
                apiKey: first.legacyApiKey,
                apiKeySecretName: first.secretName,
                legacySecretMigratedAt: first.legacySecretMigratedAt
            },
            store,
            NOW
        )
        expect(second).toEqual({ ...first, changed: false })
        expect(store.writes).toBe(1)
    })

    test('first migration never overwrites a different secret: uses a suffixed name', () => {
        const store = new MemorySecretStore()
        store.secrets.set(DEFAULT_API_KEY_SECRET_NAME, 'other-vault-key')
        store.secrets.set(`${DEFAULT_API_KEY_SECRET_NAME}-2`, 'yet-another-key')
        const result = migrateLegacyApiKey({ apiKey: 'legacy-key' }, store, NOW)
        expect(result.secretName).toBe(`${DEFAULT_API_KEY_SECRET_NAME}-3`)
        expect(store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('other-vault-key')
        expect(store.secrets.get(`${DEFAULT_API_KEY_SECRET_NAME}-3`)).toBe('legacy-key')
    })

    test('after a migration, a different value under the name is a rotation: plaintext dropped', () => {
        const store = new MemorySecretStore()
        store.secrets.set(DEFAULT_API_KEY_SECRET_NAME, 'rotated-key')
        const result = migrateLegacyApiKey(
            {
                apiKey: 'legacy-key',
                apiKeySecretName: DEFAULT_API_KEY_SECRET_NAME,
                legacySecretMigratedAt: daysBefore(1)
            },
            store,
            NOW
        )
        expect(result.legacyApiKey).toBe('')
        expect(result.changed).toBe(true)
        expect(store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('rotated-key')
    })

    test('treats a cleared ("") secret as absent', () => {
        const store = new MemorySecretStore()
        store.secrets.set(DEFAULT_API_KEY_SECRET_NAME, '')
        migrateLegacyApiKey({ apiKey: 'legacy-key' }, store, NOW)
        expect(store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('legacy-key')
    })

    test('drops the plaintext copy after 60 days, once this device has its secret', () => {
        const store = new MemorySecretStore()
        const result = migrateLegacyApiKey(
            {
                apiKey: 'legacy-key',
                apiKeySecretName: DEFAULT_API_KEY_SECRET_NAME,
                legacySecretMigratedAt: daysBefore(61)
            },
            store,
            NOW
        )
        expect(result.legacyApiKey).toBe('')
        expect(result.changed).toBe(true)
        expect(store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('legacy-key')
    })

    test('trims the legacy value', () => {
        const store = new MemorySecretStore()
        migrateLegacyApiKey({ apiKey: '  legacy-key \n' }, store, NOW)
        expect(store.secrets.get(DEFAULT_API_KEY_SECRET_NAME)).toBe('legacy-key')
    })

    test('drops an empty legacy field without touching the store', () => {
        const store = new MemorySecretStore()
        const result = migrateLegacyApiKey({ apiKey: '' }, store, NOW)
        expect(result).toEqual({
            secretName: DEFAULT_API_KEY_SECRET_NAME,
            legacyApiKey: '',
            legacySecretMigratedAt: '',
            changed: true
        })
        expect(store.writes).toBe(0)
    })

    test('keeps a valid custom secret name', () => {
        const result = migrateLegacyApiKey(
            { apiKeySecretName: 'my-typefully', legacySecretMigratedAt: '' },
            new MemorySecretStore(),
            NOW
        )
        expect(result.secretName).toBe('my-typefully')
        expect(result.changed).toBe(false)
    })

    test('replaces an invalid secret name with the default', () => {
        const result = migrateLegacyApiKey(
            { apiKeySecretName: 'Not Valid' },
            new MemorySecretStore(),
            NOW
        )
        expect(result.secretName).toBe(DEFAULT_API_KEY_SECRET_NAME)
        expect(result.changed).toBe(true)
    })

    test('keeps everything when the store is unavailable or throws', () => {
        const throwing: SecretStore = {
            getSecret: () => null,
            setSecret: () => {
                throw new Error('boom')
            }
        }
        for (const store of [undefined, throwing]) {
            const result = migrateLegacyApiKey({ apiKey: 'legacy-key' }, store, NOW)
            expect(result.legacyApiKey).toBe('legacy-key')
            expect(result.legacySecretMigratedAt).toBe('')
        }
    })
})
