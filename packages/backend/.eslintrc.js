// Backend ESLint Configuration - NestJS specific rules
module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'dist',
    'node_modules',
    '**/*.spec.ts',
    '**/*.integration.spec.ts',
  ],
  rules: {
    // NestJS-specific overrides
    '@typescript-eslint/interface-name-prefix': 'off',
    // Allow explicit any in decorators and dependency injection (temporarily warn during migration)
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow empty constructors for DI
    '@typescript-eslint/no-empty-function': [
      'error',
      {
        allow: ['constructors'],
      },
    ],
  },
};
