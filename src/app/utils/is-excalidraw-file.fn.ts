import type { TFile } from 'obsidian'

// Define the ExcalidrawAutomate type for the global context
declare const ExcalidrawAutomate:
    | {
          isExcalidrawFile: (file: TFile) => boolean
      }
    | undefined

/**
 * Check if the given TFile is an Excalidraw file
 * Taken from https://github.com/beaussan/update-time-on-edit-obsidian
 * @param file
 */
export const isExcalidrawFile = (file: TFile): boolean => {
    // ExcalidrawAutomate is injected into global context by the Excalidraw plugin
    const ea = typeof ExcalidrawAutomate === 'undefined' ? undefined : ExcalidrawAutomate
    return ea ? ea.isExcalidrawFile(file) : false
}
