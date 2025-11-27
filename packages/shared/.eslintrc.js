// Shared Package ESLint Configuration
module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  rules: {
    // Shared code should be strict
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
