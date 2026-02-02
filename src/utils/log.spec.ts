import { describe, expect, test, spyOn, beforeEach, afterEach } from 'bun:test'
import { log, LOG_PREFIX, LOG_SEPARATOR } from './log'

describe('log', () => {
    let debugSpy: ReturnType<typeof spyOn>
    let warnSpy: ReturnType<typeof spyOn>
    let errorSpy: ReturnType<typeof spyOn>

    beforeEach(() => {
        debugSpy = spyOn(console, 'debug').mockImplementation(() => {})
        warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
        errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        debugSpy.mockRestore()
        warnSpy.mockRestore()
        errorSpy.mockRestore()
    })

    test('LOG_PREFIX contains plugin name', () => {
        expect(LOG_PREFIX).toBe('Typefully:')
    })

    test('LOG_SEPARATOR is a line of dashes', () => {
        expect(LOG_SEPARATOR).toBe('--------------------------------------------------------')
    })

    test('logs debug level to console.debug', () => {
        log('test message', 'debug')
        expect(debugSpy).toHaveBeenCalledWith('Typefully: test message', [])
    })

    test('logs info level to console.debug (Obsidian restriction)', () => {
        log('info message', 'info')
        expect(debugSpy).toHaveBeenCalledWith('Typefully: info message', [])
    })

    test('logs warn level to console.warn', () => {
        log('warning message', 'warn')
        expect(warnSpy).toHaveBeenCalledWith('Typefully: warning message', [])
    })

    test('logs error level to console.error', () => {
        log('error message', 'error')
        expect(errorSpy).toHaveBeenCalledWith('Typefully: error message', [])
    })

    test('logs to console.debug when no level specified', () => {
        log('default message')
        expect(debugSpy).toHaveBeenCalledWith('Typefully: default message', [])
    })

    test('passes additional data arguments', () => {
        const data = { key: 'value' }
        log('with data', 'debug', data)
        expect(debugSpy).toHaveBeenCalledWith('Typefully: with data', [data])
    })

    test('passes multiple data arguments', () => {
        log('multiple data', 'debug', 'arg1', 'arg2', 123)
        expect(debugSpy).toHaveBeenCalledWith('Typefully: multiple data', ['arg1', 'arg2', 123])
    })

    test('handles empty message', () => {
        log('', 'debug')
        expect(debugSpy).toHaveBeenCalledWith('Typefully: ', [])
    })

    test('handles message with special characters', () => {
        log('Special: "quotes" & <brackets>', 'debug')
        expect(debugSpy).toHaveBeenCalledWith('Typefully: Special: "quotes" & <brackets>', [])
    })

    test('handles undefined data gracefully', () => {
        log('with undefined', 'debug', undefined)
        expect(debugSpy).toHaveBeenCalledWith('Typefully: with undefined', [undefined])
    })

    test('handles null data gracefully', () => {
        log('with null', 'debug', null)
        expect(debugSpy).toHaveBeenCalledWith('Typefully: with null', [null])
    })
})
