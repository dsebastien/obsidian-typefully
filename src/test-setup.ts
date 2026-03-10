/**
 * Test setup file that mocks the 'obsidian' module.
 * The obsidian package is types-only and has no runtime code,
 * so we need to provide mock implementations for tests.
 *
 * IMPORTANT: Do NOT re-mock 'obsidian' in individual spec files via mock.module().
 * Re-mocking replaces the entire module, which removes exports that other
 * test files depend on (e.g. removing getAllTags breaks get-file-tags tests).
 * Instead, import the mock functions from 'obsidian' and cast them as Mock<...>.
 */
import { mock } from 'bun:test'

// Mock the obsidian module (fire-and-forget, no need to await)
void mock.module('obsidian', () => ({
    Notice: class Notice {
        constructor(_message: string, _timeout?: number) {
            // No-op for tests
        }
    },
    // These are only used as types, but we provide empty implementations
    // in case they're ever accessed at runtime
    App: class App {},
    TFile: class TFile {},
    Plugin: class Plugin {},
    PluginSettingTab: class PluginSettingTab {},
    Setting: class Setting {},
    MarkdownView: class MarkdownView {},
    TAbstractFile: class TAbstractFile {},
    TFolder: class TFolder {},
    AbstractInputSuggest: class AbstractInputSuggest {},
    SearchComponent: class SearchComponent {},
    debounce: (fn: (...args: unknown[]) => unknown) => fn,
    setIcon: () => {},
    requestUrl: mock(async () => ({ status: 200, json: {} })),
    getAllTags: mock(() => [] as string[] | null)
}))
