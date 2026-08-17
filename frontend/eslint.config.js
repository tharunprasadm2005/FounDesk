import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // tailwind.config.js is CJS and runs in Node — allow require there
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The codebase intentionally mixes constant/component files; fast-refresh
      // only matters during dev HMR and is too noisy here.
      'react-refresh/only-export-components': 'off',
      // Data fetching inside useEffect is the established pattern across all
      // pages. This new rule flags it as noise; keep the signal on other hooks rules.
      'react-hooks/set-state-in-effect': 'off',
      // Keep unused imports/vars visible for incremental cleanup without blocking CI.
      'no-unused-vars': 'warn',
      // templates/globals handling for analytics providers
      'no-undef': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
])
