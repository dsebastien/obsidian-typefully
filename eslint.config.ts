import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'
import obsidianmd from 'eslint-plugin-obsidianmd'
import { defineConfig } from 'eslint/config'

export default defineConfig([
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    // eslint-plugin-obsidianmd 0.4.x ships complete config types, so the
    // `@ts-expect-error` this line used to carry is no longer needed.
    ...obsidianmd.configs['recommended'],
    eslintConfigPrettier,
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            'scripts/**',
            '.cz-config.cjs',
            'prettier.config.cjs',
            'package.json'
        ]
    },
    {
        files: ['**/*.{js,mjs,cjs,ts}'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                // Obsidian global functions
                createDiv: 'readonly',
                createEl: 'readonly',
                createSpan: 'readonly',
                createFragment: 'readonly',
                // Obsidian popout-window-aware globals
                activeWindow: 'readonly',
                activeDocument: 'readonly'
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
            ],
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-deprecated': 'off',
            // These are too strict for dynamic plugin APIs
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            // Obsidian methods are dynamically added to prototypes
            '@typescript-eslint/no-unsafe-enum-comparison': 'off',
            'no-prototype-builtins': 'off',
            // Allow confirm for delete confirmations
            'no-alert': 'off',
            // Sentence case is a community-review requirement, so the rule is an
            // ERROR here rather than off. The catalog reviewer runs its OWN
            // ruleset against the source archive, so switching it off locally
            // suppresses nothing on their side. `brands` REPLACES the plugin's
            // default list; `ignoreRegex` entries are anchored to the exact
            // literals they exempt.
            'obsidianmd/ui/sentence-case': [
                'error',
                {
                    enforceCamelCaseLower: true,
                    brands: [
                        // Defaults this codebase relies on
                        'Obsidian',
                        'iOS',
                        'macOS',
                        'Windows',
                        'Linux',
                        'Android',
                        'GitHub',
                        'GitHub Sponsors',
                        'Git',
                        'YouTube',
                        'Markdown',
                        'JavaScript',
                        'TypeScript',
                        'Node.js',
                        // Platforms this plugin publishes to
                        'X',
                        'Twitter',
                        'Typefully',
                        'LinkedIn',
                        'Mastodon',
                        'Bluesky',
                        'Threads',
                        // Typefully feature names, spelled as their UI does
                        'Threadify',
                        'AutoRT',
                        'AutoPlug',
                        // Community this plugin's support CTAs link to
                        'Knowii'
                    ],
                    ignoreRegex: [
                        // Author credit / handle placeholders — proper nouns
                        '^Sébastien Dubois \\(@dSebastien\\)$',
                        '^@dSebastien$',
                        '^dSebastien$',
                        // References Typefully's own menu names verbatim
                        '^Your Typefully API key\\. Get it from Typefully Settings → API & Integrations\\.$',
                        // "Load" quotes the button label rendered beside it
                        '^Your Typefully social set ID\\. Click "Load" to fetch available sets\\.$',
                        // Tag placeholder — lowercase is the value
                        '^permanent_notes, literature_notes$',
                        // Quotes the command name verbatim
                        '^Appearance of the image card created by the "Publish a screenshot of the current note" command\\.$',
                        // Quotes font names verbatim
                        '^CSS font family, e\\.g\\. "Inter" or "Comic Sans MS"\\. The font must be installed on your system\\.$',
                        // The rule misparses the example after e.g.
                        '^Short text stamped on the image, e\\.g\\. your name or handle\\. Leave empty to disable\\.$',
                        // Button labels with an icon-style + prefix
                        '^\\+ Add post$',
                        '^\\+ Add time$',
                        // Fleet-wide template copy, kept byte-identical
                        '^Obsidian, Personal Knowledge Management and note-taking, straight to your inbox and feed\\.$'
                    ]
                }
            ]
        }
    },
    {
        // Specs and the test harness run under `bun test` and are never
        // bundled into the plugin; the mobile-compatibility and popout-window
        // rules do not apply to them.
        files: ['**/*.spec.ts', 'src/test-setup.ts', 'src/test/**'],
        rules: {
            'obsidianmd/no-nodejs-modules': 'off',
            'obsidianmd/no-global-this': 'off',
            'obsidianmd/prefer-window-timers': 'off',
            'obsidianmd/no-tfile-tfolder-cast': 'off',
            'obsidianmd/no-static-styles-assignment': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off'
        }
    }
])
