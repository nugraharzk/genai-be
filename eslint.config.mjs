// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Convenience-focused setup: lighter, faster rules without type-checking
export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist', 'coverage'],
  },
  // Base JS recommendations
  eslint.configs.recommended,
  // TS recommendations (no type-checked rules for faster, quieter linting)
  ...tseslint.configs.recommended,
  // Keep Prettier formatting integration
  eslintPluginPrettierRecommended,
  // Project language options and globals
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      // No projectService/type-aware config for speed and fewer false positives
    },
  },
  // Softer, convenience-oriented rules
  {
    rules: {
      // Common noise reducers
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
);
