// Frontend Admin ESLint Configuration - React specific rules
module.exports = {
  extends: [
    '../../.eslintrc.js',
    'plugin:react-hooks/recommended',
  ],
  env: {
    browser: true,
    es2020: true,
  },
  ignorePatterns: ['dist', '.eslintrc.cjs', 'e2e', 'node_modules', 'coverage'],
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // React-specific overrides (warn during migration)
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow non-null assertion in React components
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
};
