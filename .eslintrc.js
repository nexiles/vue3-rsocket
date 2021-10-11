module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    // Rules order is important, please avoid shuffling them
    "extends": [
        // Base ESLint recommended rules
        'eslint:recommended',

        // https://github.com/prettier/eslint-config-prettier#installation
        // usage with Prettier, provided by 'eslint-config-prettier'.
        "prettier",
    ],
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "rules": {
        "object-curly-spacing": ["error", "always"],
    },
};
