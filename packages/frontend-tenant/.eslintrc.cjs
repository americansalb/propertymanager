// Frontend Tenant Portal ESLint Configuration - Next.js specific rules
module.exports = {
  extends: [
    '../../.eslintrc.js',
    'next/core-web-vitals',
  ],
  env: {
    browser: true,
    node: true,
    es2020: true,
  },
  ignorePatterns: ['.next', 'dist', '.eslintrc.cjs', 'node_modules', 'coverage'],
  rules: {
    // Next.js specific overrides (warn during migration)
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow non-null assertion in React components
    '@typescript-eslint/no-non-null-assertion': 'off',
    // Next.js allows default exports for pages
    'import/no-default-export': 'off',
  },
};
