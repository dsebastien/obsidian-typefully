import type { SecretStorage } from 'obsidian'

/**
 * The subset of Obsidian's SecretStorage the plugin relies on. Kept narrow so
 * the migration can be unit-tested against a plain in-memory double.
 */
export type SecretStore = Pick<SecretStorage, 'getSecret' | 'setSecret'>

/**
 * Name of the secret holding the Typefully API key when the user has not
 * picked another one. Secret ids must be lowercase alphanumeric with dashes.
 */
export const DEFAULT_API_KEY_SECRET_NAME = 'typefully-api-key'

/**
 * How long the legacy plaintext `apiKey` stays in data.json after the first
 * device moved it into SecretStorage. SecretStorage is device-local: during
 * this window every other synced device bootstraps its own secret from the
 * plaintext copy on its next start, so nobody has to re-enter the key.
 */
export const LEGACY_API_KEY_GRACE_PERIOD_MS = 60 * 24 * 60 * 60 * 1000

/**
 * Upper bound on the suffixed names tried when the default name is already
 * taken by a different value. Far beyond any realistic collision count; it
 * only exists so a misbehaving store cannot spin the loop forever.
 */
const MAX_SECRET_NAME_SUFFIX = 100

const SECRET_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * True when `name` is a valid SecretStorage id (setSecret throws otherwise).
 */
export function isValidSecretName(name: unknown): name is string {
    return typeof name === 'string' && SECRET_NAME_REGEX.test(name)
}

/**
 * Read a secret value, returning '' when the name is empty or invalid, the
 * secret does not exist on this device (or was cleared: there is no delete
 * API, so '' means absent), or the store throws. Values are read at use time
 * and never copied into the settings.
 */
export function readSecret(store: SecretStore | undefined, name: string): string {
    if (!store || !isValidSecretName(name)) {
        return ''
    }
    try {
        return store.getSecret(name) ?? ''
    } catch {
        return ''
    }
}

/**
 * Write a secret, returning false instead of throwing when the store is
 * unavailable or rejects the write.
 */
export function writeSecret(store: SecretStore | undefined, name: string, value: string): boolean {
    if (!store || !isValidSecretName(name)) {
        return false
    }
    try {
        store.setSecret(name, value)
        return true
    } catch {
        return false
    }
}

/**
 * True once the grace period of a migration recorded at `migratedAt` (ISO
 * date) is over. An empty or unparseable date never expires: the plaintext is
 * then only removed explicitly.
 */
export function isLegacyApiKeyExpired(migratedAt: string, now: Date): boolean {
    const migratedAtMs = Date.parse(migratedAt)
    if (Number.isNaN(migratedAtMs)) {
        return false
    }
    return now.getTime() - migratedAtMs >= LEGACY_API_KEY_GRACE_PERIOD_MS
}

export interface ApiKeyLoadInput {
    /** Legacy plaintext key from data.json (pre-SecretStorage versions). */
    apiKey?: unknown
    apiKeySecretName?: unknown
    legacySecretMigratedAt?: unknown
}

export interface ApiKeyLoadResult {
    /** Secret name to keep in the settings. */
    secretName: string
    /**
     * Plaintext copy to keep in data.json as a bootstrap source for other
     * devices. '' once it is stale, expired, or was never there.
     */
    legacyApiKey: string
    /** ISO date of the first migration, '' if none happened yet. */
    legacySecretMigratedAt: string
    /** True when data.json must be rewritten. */
    changed: boolean
}

/**
 * Per-device migration of the legacy plaintext `apiKey`, run on every load.
 *
 * - The plaintext copy is copied into THIS device's SecretStorage when the
 *   secret is absent here, and left in data.json so other synced devices can
 *   do the same on their next start.
 * - First migration anywhere: a secret already holding a different value
 *   under the target name (e.g. another vault on this device) is never
 *   overwritten; the next free suffixed name is used instead.
 * - Once a migration has been recorded, a different value under the secret's
 *   name means the key was rotated on this device: SecretStorage wins and the
 *   stale plaintext copy is dropped.
 * - The plaintext copy is dropped LEGACY_API_KEY_GRACE_PERIOD_MS after the
 *   first migration (after this device has bootstrapped from it).
 *
 * Idempotent: a second run with the same input and store changes nothing.
 */
export function migrateLegacyApiKey(
    loaded: ApiKeyLoadInput,
    store: SecretStore | undefined,
    now: Date
): ApiKeyLoadResult {
    const loadedName = isValidSecretName(loaded.apiKeySecretName)
        ? loaded.apiKeySecretName
        : DEFAULT_API_KEY_SECRET_NAME
    const loadedMigratedAt =
        typeof loaded.legacySecretMigratedAt === 'string' ? loaded.legacySecretMigratedAt : ''
    const legacyValue = typeof loaded.apiKey === 'string' ? loaded.apiKey.trim() : ''
    const legacyWasStored = 'apiKey' in loaded

    const result: ApiKeyLoadResult = {
        secretName: loadedName,
        legacyApiKey: legacyValue,
        legacySecretMigratedAt: loadedMigratedAt,
        changed: false
    }

    if ('' === legacyValue) {
        // An empty legacy field is simply dropped
        result.changed = legacyWasStored
    } else {
        const secretName = bootstrapSecret(loadedName, legacyValue, loadedMigratedAt, store)
        if (null === secretName) {
            // Rotated on this device: the plaintext copy is stale
            result.legacyApiKey = ''
        } else if ('' !== secretName) {
            result.secretName = secretName
            if ('' === result.legacySecretMigratedAt) {
                result.legacySecretMigratedAt = now.toISOString()
            }
            if (isLegacyApiKeyExpired(result.legacySecretMigratedAt, now)) {
                result.legacyApiKey = ''
            }
        }
        // secretName === '': the store rejected the write. Keep everything
        // as-is so nothing is lost; the next load retries.
    }

    result.changed =
        result.changed ||
        result.secretName !== loaded.apiKeySecretName ||
        result.legacyApiKey !== legacyValue ||
        result.legacySecretMigratedAt !== loadedMigratedAt
    return result
}

/**
 * Make sure this device's SecretStorage holds `legacyValue`.
 *
 * @returns the secret name holding the value, null when the secret holds a
 * newer (rotated) value and the plaintext is stale, or '' when the store
 * could not be written.
 */
function bootstrapSecret(
    name: string,
    legacyValue: string,
    migratedAt: string,
    store: SecretStore | undefined
): string | null {
    const current = readSecret(store, name)
    if (current === legacyValue) {
        return name
    }
    if ('' === current) {
        return writeSecret(store, name, legacyValue) ? name : ''
    }
    if ('' !== migratedAt) {
        return null
    }

    // First migration and the name is taken by another value: never
    // overwrite it, find a free (or matching) suffixed name instead
    for (let suffix = 2; suffix <= MAX_SECRET_NAME_SUFFIX; suffix++) {
        const candidate = `${DEFAULT_API_KEY_SECRET_NAME}-${suffix}`
        const existing = readSecret(store, candidate)
        if (existing === legacyValue) {
            return candidate
        }
        if ('' === existing) {
            return writeSecret(store, candidate, legacyValue) ? candidate : ''
        }
    }
    return ''
}
