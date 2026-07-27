import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'public/mockServiceWorker.js',
    'src/routeTree.gen.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Les composants shadcn exportent leurs variantes (cva) à côté du
    // composant : c'est la convention du registre, pas un défaut.
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // `export const Route = createFileRoute(...)` n'est pas un export
    // constant au sens du plugin : il déclencherait un avertissement sur
    // chaque route.
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // `main.tsx` ne fait aucun export : c'est le module d'entrée, jamais
    // rechargé à chaud, donc la règle Fast Refresh n'y a aucune valeur.
    // (`InnerApp` pourrait techniquement être extrait dans un fichier
    // exporté — l'ordre `useAuth()` sous `AuthProvider` vient de
    // l'imbrication JSX, pas de l'emplacement du fichier — mais on garde ce
    // fichier fidèle au bootstrap tel que spécifié.)
    files: ['src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
