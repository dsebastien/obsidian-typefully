import { describe, expect, it } from 'bun:test'
import { sanitizeMediaFilename } from './sanitize-media-filename.fn'

describe('sanitizeMediaFilename', () => {
    it('should keep already valid filenames unchanged', () => {
        expect(sanitizeMediaFilename('profile-photo.jpg')).toBe('profile-photo.jpg')
        expect(sanitizeMediaFilename('my_note(1).png')).toBe('my_note(1).png')
    })

    it('should replace spaces with hyphens', () => {
        expect(sanitizeMediaFilename('My Note-screenshot.png')).toBe('My-Note-screenshot.png')
    })

    it('should replace accented and special characters', () => {
        expect(sanitizeMediaFilename('résumé & notes.png')).toBe('r-sum-notes.png')
    })

    it('should collapse consecutive hyphens', () => {
        expect(sanitizeMediaFilename('a - b.png')).toBe('a-b.png')
    })

    it('should strip leading hyphens and dots', () => {
        expect(sanitizeMediaFilename('--file.png')).toBe('file.png')
        expect(sanitizeMediaFilename('.hidden.png')).toBe('hidden.png')
    })

    it('should fall back to a default name when nothing remains', () => {
        expect(sanitizeMediaFilename('')).toBe('media')
        expect(sanitizeMediaFilename('éé àà')).toBe('media')
    })
})
