/* eslint-disable obsidianmd/no-tfile-tfolder-cast */
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { isExcalidrawFile } from './is-excalidraw-file.fn'
import type { TFile } from 'obsidian'

describe('isExcalidrawFile', () => {
    // Store original global state
    let originalExcalidrawAutomate: unknown

    beforeEach(() => {
        // Save any existing global
        originalExcalidrawAutomate = (globalThis as Record<string, unknown>)['ExcalidrawAutomate']
    })

    afterEach(() => {
        // Restore original state
        if (originalExcalidrawAutomate !== undefined) {
            ;(globalThis as Record<string, unknown>)['ExcalidrawAutomate'] =
                originalExcalidrawAutomate
        } else {
            delete (globalThis as Record<string, unknown>)['ExcalidrawAutomate']
        }
    })

    test('returns false when ExcalidrawAutomate is undefined', () => {
        delete (globalThis as Record<string, unknown>)['ExcalidrawAutomate']
        const mockFile = { path: 'test.md' } as TFile
        expect(isExcalidrawFile(mockFile)).toBe(false)
    })

    test('returns true when ExcalidrawAutomate.isExcalidrawFile returns true', () => {
        ;(globalThis as Record<string, unknown>)['ExcalidrawAutomate'] = {
            isExcalidrawFile: () => true
        }
        const mockFile = { path: 'drawing.excalidraw.md' } as TFile
        expect(isExcalidrawFile(mockFile)).toBe(true)
    })

    test('returns false when ExcalidrawAutomate.isExcalidrawFile returns false', () => {
        ;(globalThis as Record<string, unknown>)['ExcalidrawAutomate'] = {
            isExcalidrawFile: () => false
        }
        const mockFile = { path: 'regular.md' } as TFile
        expect(isExcalidrawFile(mockFile)).toBe(false)
    })

    test('passes file to ExcalidrawAutomate.isExcalidrawFile', () => {
        let receivedFile: unknown = null
        ;(globalThis as Record<string, unknown>)['ExcalidrawAutomate'] = {
            isExcalidrawFile: (file: TFile) => {
                receivedFile = file
                return false
            }
        }
        const mockFile = { path: 'test.md', name: 'test.md' } as TFile
        isExcalidrawFile(mockFile)
        expect(receivedFile).toBe(mockFile)
    })
})
