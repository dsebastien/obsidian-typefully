import { describe, expect, test } from 'bun:test'
import { getMimeType } from './upload-vault-media.fn'

describe('getMimeType', () => {
    test('returns correct MIME for png', () => {
        expect(getMimeType('photo.png')).toBe('image/png')
    })

    test('returns correct MIME for jpg', () => {
        expect(getMimeType('photo.jpg')).toBe('image/jpeg')
    })

    test('returns correct MIME for jpeg', () => {
        expect(getMimeType('photo.jpeg')).toBe('image/jpeg')
    })

    test('returns correct MIME for gif', () => {
        expect(getMimeType('animation.gif')).toBe('image/gif')
    })

    test('returns correct MIME for webp', () => {
        expect(getMimeType('image.webp')).toBe('image/webp')
    })

    test('returns correct MIME for svg', () => {
        expect(getMimeType('icon.svg')).toBe('image/svg+xml')
    })

    test('returns correct MIME for mp4', () => {
        expect(getMimeType('video.mp4')).toBe('video/mp4')
    })

    test('returns correct MIME for pdf', () => {
        expect(getMimeType('document.pdf')).toBe('application/pdf')
    })

    test('handles uppercase extensions', () => {
        expect(getMimeType('photo.PNG')).toBe('image/png')
    })

    test('returns null for unsupported extension', () => {
        expect(getMimeType('file.txt')).toBeNull()
    })

    test('returns null for file with no extension', () => {
        expect(getMimeType('noextension')).toBeNull()
    })

    test('handles path with multiple dots', () => {
        expect(getMimeType('my.photo.final.jpg')).toBe('image/jpeg')
    })
})
