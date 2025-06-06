module.exports = {
  globals: {
    window: true,
    document: true,
    origin: true,
    worker: true,
  },
  env: {
    es2021: true,
    node: true,
    browser: true,
  },
  plugins: [
  ],
  extends: 'airbnb-base',
  overrides: [
    {
      files: ["public/j/worker.js"],
      rules: {
        'no-restricted-globals': ['error', 'isFinite', 'isNaN'].concat(restrictedGlobals), 
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    semi: ['error', 'never'],
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    'max-len': ['error', {"code": 100}],
    'new-cap': 'off',
  },
}
