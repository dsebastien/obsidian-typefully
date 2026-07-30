import { afterEach, describe, expect, it } from 'bun:test'
import {
    captureElementScreenshot,
    computeCaptureRect,
    getElectronApi
} from './capture-element-screenshot.fn'
import type { ElectronApi } from './capture-element-screenshot.fn'

interface GlobalWithWindow {
    window?: unknown
}

const globalRef = globalThis as GlobalWithWindow
const originalWindow = globalRef.window

const setWindowElectron = (electron: ElectronApi | undefined) => {
    globalRef.window = {
        electron,
        innerWidth: 1000,
        setTimeout: (fn: () => void) => setTimeout(fn, 0)
    }
}

const makeElement = (rect: Partial<DOMRect>): Pick<HTMLElement, 'getBoundingClientRect'> => ({
    getBoundingClientRect: () =>
        ({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            ...rect
        }) as DOMRect
})

afterEach(() => {
    if (originalWindow === undefined) {
        delete globalRef.window
    } else {
        globalRef.window = originalWindow
    }
})

describe('getElectronApi', () => {
    it('should return undefined when window is not available', () => {
        delete globalRef.window
        expect(getElectronApi()).toBeUndefined()
    })

    it('should return the electron API exposed on window', () => {
        const electron: ElectronApi = {}
        setWindowElectron(electron)
        expect(getElectronApi()).toBe(electron)
    })
})

describe('computeCaptureRect', () => {
    it('should keep the rect unchanged at zoom 1', () => {
        const rect = computeCaptureRect({ x: 10, y: 20, width: 100, height: 50 }, 1)
        expect(rect).toEqual({ x: 10, y: 20, width: 100, height: 50 })
    })

    it('should scale the rect by the zoom factor', () => {
        const rect = computeCaptureRect({ x: 10, y: 20, width: 100, height: 50 }, 1.5)
        expect(rect).toEqual({ x: 15, y: 30, width: 150, height: 75 })
    })

    it('should round fractional coordinates', () => {
        const rect = computeCaptureRect({ x: 10.4, y: 20.6, width: 100.2, height: 50.5 }, 1)
        expect(rect).toEqual({ x: 10, y: 21, width: 100, height: 51 })
    })
})

describe('captureElementScreenshot', () => {
    it('should return null when the Electron API is unavailable', async () => {
        setWindowElectron(undefined)
        const result = await captureElementScreenshot(
            makeElement({ x: 0, y: 0, width: 100, height: 100 })
        )
        expect(result).toBeNull()
    })

    it('should return null when the element has no visible area', async () => {
        setWindowElectron({
            remote: {
                getCurrentWindow: () => ({
                    webContents: {
                        capturePage: async () => ({ toPNG: () => new Uint8Array([1]) })
                    }
                })
            }
        })

        const result = await captureElementScreenshot(
            makeElement({ x: 10, y: 10, width: 0, height: 0 })
        )

        expect(result).toBeNull()
    })

    it('should return null when capturePage fails', async () => {
        setWindowElectron({
            remote: {
                getCurrentWindow: () => ({
                    webContents: {
                        capturePage: async () => {
                            throw new Error('capture failed')
                        }
                    }
                })
            }
        })

        const result = await captureElementScreenshot(
            makeElement({ x: 0, y: 0, width: 100, height: 100 })
        )

        expect(result).toBeNull()
    })
})
