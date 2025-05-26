import vanillaConfig from '@enonic/eslint-config/vanilla.js';
import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    ...vanillaConfig,
    eslintPluginPrettierRecommended,
    importPlugin.flatConfigs.recommended,
    {
        rules: {
            'prefer-const': ['error'],
            'no-var': 'error',
            'comma-dangle': ['error', 'never'],
            'no-underscore-dangle': ['off'],
            'func-names': ['off'],
            'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
            'vars-on-top': 'off',
            'global-require': 'off',
            'no-param-reassign': 'off',
            'no-use-before-define': ['error', { functions: false }],
            'linebreak-style': ['off'],
            'no-undef': 'off',
            'prettier/prettier': [
                'error',
                {
                    printWidth: 80,
                    singleQuote: true,
                    tabWidth: 4,
                    trailingComma: 'none'
                }
            ]
        },
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module'
        },
        linterOptions: {
            reportUnusedDisableDirectives: true
        }
    },
    {
        files: ['src/main/resources/assets/js/push.js'],
        rules: {
            'no-console': 'off'
        }
    },
    {
        files: ['src/main/resources/assets/js/bs.js'],
        rules: {
            'no-use-before-define': 'off',
            'no-restricted-syntax': 'off',
            'no-loop-func': 'off'
        }
    },
    {
        ignores: [
            'src/main/resources/templates/workbox-sw.js',
            'src/main/resources/assets/js/background-sync/**/*.js',
            'src/main/resources/assets/js/material.min.js',
            'node_modules/',
            'build/'
        ]
    }
];
