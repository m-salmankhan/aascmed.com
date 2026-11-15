import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      'dist*/**',
      'node_modules/**',
      '.astro/**',
      'src/server/content/generated/**',
      'src/components/header/generated-navigation-metrics.mts',
    ],
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      // Existing broad content types and legacy declarations are outside WEB-74.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-duplicate-enum-values': 'warn',
      'prefer-const': 'warn',
      // Preserve existing inline tracking and animation behavior in this tooling PR.
      'prefer-rest-params': 'warn',
      'prefer-spread': 'warn',
      'no-var': 'warn',
    },
  },
  {
    files: ['src/**/*.{tsx,jsx}'],
    plugins: { 'react-hooks': hooks, 'jsx-a11y': a11y },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Existing accessibility work remains in WEB-63, WEB-64 and WEB-65.
      ...Object.fromEntries(
        Object.keys(a11y.configs.recommended.rules).map((rule) => [
          rule,
          'warn',
        ]),
      ),
    },
  },
);
