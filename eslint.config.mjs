import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const restrictedImports = [
  {
    name: 'react',
    importNames: ['createContext'],
    message: 'Use createContext from react-global-state-hooks/createContext.',
  },
  {
    name: 'tailwind-variants',
    importNames: ['cn', 'clsx', 'twJoin'],
    message: 'Merge classes with twMerge.',
  },
  {
    name: 'tailwind-merge',
    message: 'Import twMerge from tailwind-variants.',
  },
  {
    name: 'clsx',
    message: 'Merge classes with twMerge from tailwind-variants.',
  },
  {
    name: 'class-variance-authority',
    message: 'Use tv from tailwind-variants.',
  },
  { name: 'lucide-react', message: 'Icons come from react-icons.' },
];

const openaiImport = {
  name: 'openai',
  message: 'Only src/ai/openRouterClient.ts imports openai.',
};

const PURE_MESSAGE =
  'src/engine and src/lib are pure: no React, no Next, no browser globals, nothing from the rest of the app.';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
  ]),
  {
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [...restrictedImports, openaiImport] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='React'][property.name='createContext']",
          message:
            'Use createContext from react-global-state-hooks/createContext.',
        },
      ],
      // Zones match the resolved file, so `@/features/x` and `../../features/x` are both caught.
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/engine',
              from: './src',
              except: ['./engine', './lib'],
              message: PURE_MESSAGE,
            },
            {
              target: './src/lib',
              from: './src',
              except: ['./lib'],
              message: PURE_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['src/features/**', 'src/components/**'],
    rules: {
      // The grid and the lists are built on TanStack Virtual, and the React Compiler is not enabled.
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    files: ['src/engine/**', 'src/lib/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...restrictedImports, openaiImport],
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'next',
                'next/*',
              ],
              message: PURE_MESSAGE,
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'location',
        'localStorage',
        'sessionStorage',
      ],
    },
  },
  {
    files: ['src/ai/openRouterClient.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: restrictedImports }],
    },
  },
]);

export default eslintConfig;
