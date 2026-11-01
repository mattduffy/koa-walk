import globals from 'globals'
import restrictedGlobals from 'eslint-restricted-globals'
import { configs, plugins } from 'eslint-config-airbnb-extended'

export default [
  {
    name: 'koa-walk/ignores',
    ignores: [
      'node_modules/',
      'archive/',
      'cached_models/',
      'cached_pages/',
      'private/',
      'keys/',
    ],
  },
  // Register the plugins used by the airbnb-extended modern configs.
  plugins.stylistic,
  plugins.importX,
  plugins.node,
  // Airbnb base rules (formatting via @stylistic, imports via import-x).
  ...configs.base.recommended,
  {
    name: 'koa-walk/project',
    linterOptions: {
      // ESLint 8 did not report unused eslint-disable comments by default.
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // airbnb-extended sets parserOptions.ecmaVersion to 2018, which takes
      // precedence over languageOptions.ecmaVersion, so override it here too.
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.es2021,
        ...globals.node,
        ...globals.browser,
        ...globals.worker,
        window: true,
        document: true,
        origin: true,
        worker: true,
      },
    },
    settings: {
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.mjs'],
        },
      },
    },
    rules: {
      // Node rules that eslint-config-airbnb-base enforced, now provided by eslint-plugin-n.
      'n/global-require': 'error',
      'n/no-deprecated-api': 'error',
      'n/no-new-require': 'error',
      'n/no-path-concat': 'error',
      // Restore eslint-config-airbnb-base@15 behavior where airbnb-extended
      // (or ESLint 9 defaults) changed it.
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/max-statements-per-line': 'off',
      '@stylistic/indent': ['error', 2, {
        SwitchCase: 1,
        VariableDeclarator: 1,
        outerIIFEBody: 1,
        FunctionDeclaration: { parameters: 1, body: 1 },
        FunctionExpression: { parameters: 1, body: 1 },
        CallExpression: { arguments: 1 },
        ArrayExpression: 1,
        ObjectExpression: 1,
        ImportDeclaration: 1,
        flatTernaryExpressions: false,
        // core indent never checked expressions inside template literals
        ignoredNodes: ['TemplateLiteral *'],
        ignoreComments: false,
        offsetTernaryExpressions: false,
      }],
      'no-unused-vars': ['error', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        caughtErrors: 'none', // ESLint 9 changed the default to 'all'
      }],
      'no-redeclare': 'error',
      'no-object-constructor': 'error', // replacement for deprecated no-new-object
      'import-x/namespace': 'off',
      // Project overrides carried over from .eslintrc.cjs.
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/max-len': ['error', { code: 100 }],
      'no-console': 'off',
      'no-underscore-dangle': 'off',
      'import-x/extensions': 'off',
      'import-x/no-unresolved': 'off',
      'import-x/prefer-default-export': 'off',
      'new-cap': 'off',
    },
  },
  {
    name: 'koa-walk/worker',
    files: ['public/j/worker.js'],
    rules: {
      'no-restricted-globals': ['error', 'isFinite', 'isNaN', ...restrictedGlobals],
    },
  },
]
