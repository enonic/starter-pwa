module.exports = {
    extends: ['airbnb-base/legacy', 'prettier'],
    plugins: ['prettier'],
    rules: {
        'prefer-const': ['error'],
        'comma-dangle': ['error', 'never'],
        'no-underscore-dangle': ['off'],
        'func-names': ['off'],
        'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
        'vars-on-top': 'off',
        'global-require': 'off',
        'no-use-before-define': ['error', { functions: false }],
        'linebreak-style': ['off'],
        'prettier/prettier': [
            'error', 
            {
                printWidth: 80,
                singleQuote: true,
                tabWidth: 4
            }
        ]
    },
    overrides: [
        {
            'files': ['src/main/resources/assets/js/push.js'],
            'rules': {
                'no-console': 'off'
            }
        }, 
        {
            'files': ['src/main/resources/assets/js/bs.js'],
            'rules': {
                'no-use-before-define': 'off', 
                'no-undef': 'off', 
                'no-restricted-syntax': 'off',
                'no-loop-func': 'off'
            }
        },
        {
            'files': ['src/main/resources/assets/js/libs/background-sync/sync-helper.js'],
            'rules': {
                'no-undef': 'off'
            }
        }
    ], 
    env: {
        node: true,
        es6: true
    },
    globals: {
        Java: false,
        resolve: false,
        log: true,
        env: true,
        app: true
    }, 
    parserOptions: {
        sourceType: "module",
    }
};
