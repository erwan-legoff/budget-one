// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const isStrictLint = process.env.ESLINT_STRICT === 'true';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': isStrictLint ? 'error' : 'warn',
      '@typescript-eslint/no-unused-vars': isStrictLint ? 'error' : 'off',
      '@typescript-eslint/no-unsafe-argument': isStrictLint ? 'error' : 'warn',
      'no-empty': isStrictLint ? 'warn' : 'off',
      'prettier/prettier': 'off',
    },
  },
);
