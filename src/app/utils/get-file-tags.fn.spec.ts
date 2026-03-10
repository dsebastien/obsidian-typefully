import { describe, expect, test, beforeEach } from 'bun:test'
import type { Mock } from 'bun:test'
import { getFileTags } from './get-file-tags.fn'
import { getAllTags } from 'obsidian'
import type { App, TFile, CachedMetadata } from 'obsidian'

// getAllTags is already mocked via the preloaded test-setup.ts
const mockGetAllTags = getAllTags as unknown as Mock<() => string[] | null>

describe('getFileTags', () => {
    const createMockApp = (fileCache: CachedMetadata | null): App => {
        return {
            metadataCache: {
                getFileCache: () => fileCache
            }
        } as unknown as App
    }

    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
    const createMockFile = (path: string): TFile => ({ path }) as TFile

    beforeEach(() => {
        mockGetAllTags.mockClear()
    })

    test('returns empty array when file is null', () => {
        const mockApp = createMockApp(null)
        expect(getFileTags(null, mockApp)).toEqual([])
    })

    test('returns empty array when fileCache is null', () => {
        const mockApp = createMockApp(null)
        const mockFile = createMockFile('test.md')
        expect(getFileTags(mockFile, mockApp)).toEqual([])
    })

    test('returns empty array when getAllTags returns null', () => {
        mockGetAllTags.mockReturnValueOnce(null as unknown as string[])
        const mockCache = {} as CachedMetadata
        const mockApp = createMockApp(mockCache)
        const mockFile = createMockFile('test.md')
        expect(getFileTags(mockFile, mockApp)).toEqual([])
    })

    test('returns empty array when getAllTags returns empty array', () => {
        mockGetAllTags.mockReturnValueOnce([])
        const mockCache = {} as CachedMetadata
        const mockApp = createMockApp(mockCache)
        const mockFile = createMockFile('test.md')
        expect(getFileTags(mockFile, mockApp)).toEqual([])
    })

    test('returns tags from getAllTags', () => {
        mockGetAllTags.mockReturnValueOnce(['#tag1', '#tag2', '#tag3'])
        const mockCache = {} as CachedMetadata
        const mockApp = createMockApp(mockCache)
        const mockFile = createMockFile('test.md')
        expect(getFileTags(mockFile, mockApp)).toEqual(['#tag1', '#tag2', '#tag3'])
    })

    test('removes duplicate tags', () => {
        mockGetAllTags.mockReturnValueOnce(['#tag1', '#tag2', '#tag1', '#tag2'])
        const mockCache = {} as CachedMetadata
        const mockApp = createMockApp(mockCache)
        const mockFile = createMockFile('test.md')
        const result = getFileTags(mockFile, mockApp)
        expect(result).toHaveLength(2)
        expect(result).toContain('#tag1')
        expect(result).toContain('#tag2')
    })

    test('preserves tag format with hash', () => {
        mockGetAllTags.mockReturnValueOnce(['#javascript', '#typescript'])
        const mockCache = {} as CachedMetadata
        const mockApp = createMockApp(mockCache)
        const mockFile = createMockFile('test.md')
        const result = getFileTags(mockFile, mockApp)
        expect(result[0]).toBe('#javascript')
        expect(result[1]).toBe('#typescript')
    })

    test('handles nested tags', () => {
        mockGetAllTags.mockReturnValueOnce(['#dev/frontend', '#dev/backend'])
        const mockCache = {} as CachedMetadata
        const mockApp = createMockApp(mockCache)
        const mockFile = createMockFile('test.md')
        expect(getFileTags(mockFile, mockApp)).toEqual(['#dev/frontend', '#dev/backend'])
    })
})
