import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { isExcalidrawFile } from './is-excalidraw-file.fn'
import { TFile } from 'obsidian'

// `self` rather than `globalThis`: obsidianmd/no-global-this bans the
// global/globalThis names, and Bun defines `self` as the global object.
const globalRef = self as unknown as Record<string, unknown>

describe('isExcalidrawFile', () => {
    // Store original global state
    let originalExcalidrawAutomate: unknown

    beforeEach(() => {
        // Save any existing global
        originalExcalidrawAutomate = globalRef['ExcalidrawAutomate']
    })

    afterEach(() => {
        // Restore original state
        if (originalExcalidrawAutomate !== undefined) {
            globalRef['ExcalidrawAutomate'] = originalExcalidrawAutomate
        } else {
            delete globalRef['ExcalidrawAutomate']
        }
    })

    test('returns false when ExcalidrawAutomate is undefined', () => {
        delete globalRef['ExcalidrawAutomate']
        const mockFile = Object.assign(new TFile(), { path: 'test.md' })
        expect(isExcalidrawFile(mockFile)).toBe(false)
    })

    test('returns true when ExcalidrawAutomate.isExcalidrawFile returns true', () => {
        globalRef['ExcalidrawAutomate'] = {
            isExcalidrawFile: () => true
        }
        const mockFile = Object.assign(new TFile(), { path: 'drawing.excalidraw.md' })
        expect(isExcalidrawFile(mockFile)).toBe(true)
    })

    test('returns false when ExcalidrawAutomate.isExcalidrawFile returns false', () => {
        globalRef['ExcalidrawAutomate'] = {
            isExcalidrawFile: () => false
        }
        const mockFile = Object.assign(new TFile(), { path: 'regular.md' })
        expect(isExcalidrawFile(mockFile)).toBe(false)
    })

    test('passes file to ExcalidrawAutomate.isExcalidrawFile', () => {
        let receivedFile: unknown = null
        globalRef['ExcalidrawAutomate'] = {
            isExcalidrawFile: (file: TFile) => {
                receivedFile = file
                return false
            }
        }
        const mockFile = Object.assign(new TFile(), { path: 'test.md', name: 'test.md' })
        isExcalidrawFile(mockFile)
        expect(receivedFile).toBe(mockFile)
    })
})
