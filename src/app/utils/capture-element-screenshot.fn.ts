import { log } from '../../utils/log'

/**
 * How long to wait for the forced repaint before capturing.
 * Shorter delays capture a stale frame when the window is not focused.
 */
const REPAINT_DELAY_MS = 600

/**
 * Minimal typings for the Electron APIs exposed by the Obsidian desktop app.
 * Only the members needed to capture a region of the window are declared.
 */
interface ElectronNativeImage {
    toPNG(): Uint8Array
}

export interface ElectronCaptureRect {
    x: number
    y: number
    width: number
    height: number
}

interface ElectronWebContents {
    /**
     * The rect is required: a full-page capturePage() returns a stale,
     * pre-repaint frame.
     */
    capturePage(rect: ElectronCaptureRect): Promise<ElectronNativeImage>
    setBackgroundThrottling?(allowed: boolean): void
    invalidate?(): void
}

interface ElectronBrowserWindow {
    webContents: ElectronWebContents
}

interface ElectronRemote {
    getCurrentWindow(): ElectronBrowserWindow
}

interface ElectronWebFrame {
    getZoomFactor(): number
}

export interface ElectronApi {
    remote?: ElectronRemote
    webFrame?: ElectronWebFrame
}

/**
 * Get the Electron API exposed by the Obsidian desktop app, if available.
 * Returns undefined on mobile or when the API shape is unexpected.
 */
export const getElectronApi = (): ElectronApi | undefined => {
    if (typeof window === 'undefined') {
        return undefined
    }
    return (window as Window & { electron?: ElectronApi }).electron
}

/**
 * Convert an element rect (CSS pixels) to the coordinate space capturePage
 * expects, which is scaled by the window's zoom factor.
 */
export const computeCaptureRect = (
    elementRect: ElectronCaptureRect,
    zoomFactor: number
): ElectronCaptureRect => ({
    x: Math.round(elementRect.x * zoomFactor),
    y: Math.round(elementRect.y * zoomFactor),
    width: Math.round(elementRect.width * zoomFactor),
    height: Math.round(elementRect.height * zoomFactor)
})

/**
 * Capture a screenshot of the given element as a PNG using Electron's
 * capturePage API. Returns the PNG data as an ArrayBuffer, or null when
 * capturing is not possible (mobile, hidden element, or Electron API
 * unavailable).
 */
export const captureElementScreenshot = async (
    element: Pick<HTMLElement, 'getBoundingClientRect'>
): Promise<ArrayBuffer | null> => {
    const electronApi = getElectronApi()
    const webContents = electronApi?.remote?.getCurrentWindow().webContents
    if (!webContents) {
        log('Electron API unavailable, cannot capture a screenshot', 'warn')
        return null
    }

    const rect = element.getBoundingClientRect()
    const captureRect = computeCaptureRect(
        { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        electronApi?.webFrame?.getZoomFactor() ?? 1
    )

    if (captureRect.width <= 0 || captureRect.height <= 0) {
        log('Cannot capture a screenshot of an element with no visible area', 'warn')
        return null
    }

    try {
        // When the window is not focused, rendering is throttled and the
        // capture would return a frame from before the card was painted.
        // Disable throttling and force a repaint before capturing.
        webContents.setBackgroundThrottling?.(false)
        webContents.invalidate?.()
        await new Promise((resolve) => window.setTimeout(resolve, REPAINT_DELAY_MS))

        const image = await webContents.capturePage(captureRect)
        const png = image.toPNG()
        const data = new ArrayBuffer(png.byteLength)
        new Uint8Array(data).set(png)
        return data
    } catch (error) {
        log('Failed to capture a screenshot', 'warn', error)
        return null
    } finally {
        webContents.setBackgroundThrottling?.(true)
    }
}
