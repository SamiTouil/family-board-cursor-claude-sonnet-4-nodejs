module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2020: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  globals: {
    JSX: 'readonly',
    React: 'readonly',
  },
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off', // Turn off base rule to avoid conflicts
    'no-redeclare': 'off', // Allow test imports to override globals
  },
} 