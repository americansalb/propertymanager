// Root ESLint Configuration for PropertyMaster Monorepo
// All packages extend this configuration

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.next',
    'coverage',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
    '.eslintrc.js',
    '.eslintrc.cjs',
  ],
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/no-explicit-any': 'error', // STRICT: No 'any' types allowed
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off', // Allow inferred return types
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': false,
        'ts-nocheck': false,
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      },
    ],

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',
    'prefer-const': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }], // Allow == null for null/undefined checks
    curly: ['error', 'all'],
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'warn',
    'prefer-arrow-callback': 'warn',

    // Import ordering (disabled - can be enabled with eslint-plugin-import)
    // 'import/order': ['error', { 'newlines-between': 'always' }],
  },
  overrides: [
    // Test files can have relaxed rules
    {
      files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    // Configuration files
    {
      files: ['*.config.js', '*.config.ts', '*.config.mjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
