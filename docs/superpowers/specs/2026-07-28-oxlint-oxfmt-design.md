# Migration ESLint + Prettier → oxlint + oxfmt — Design

Date : 2026-07-28
Statut : validé, prêt pour le plan d'implémentation

## Objectif

Remplacer intégralement la chaîne de qualité JavaScript du template — ESLint 10 et Prettier 3 — par
les outils Oxc écrits en Rust : `oxlint` pour le lint, `oxfmt` pour le formatage. Le remplacement
est total : les deux anciens outils et leurs plugins disparaissent du `package.json`.

C'est une migration d'outillage, pas un changement de règles ni de style. Le périmètre de lint reste
celui d'aujourd'hui et les conventions de formatage sont reportées à l'identique.

Critère de réussite : sur un clone frais, `bun run lint` et `bun run format:check` passent sans
erreur, `bun run typecheck` et `bun test` restent au vert, et le diff de reformatage sur les 41
fichiers TS/TSX du dépôt est vide ou négligeable.

## Existant

| Élément | Détail |
|---|---|
| Linter | ESLint 10, flat config dans `eslint.config.js` |
| Presets ESLint | `js.configs.recommended`, `tseslint.configs.recommended`, `reactHooks.configs.flat.recommended`, `reactRefresh.configs.vite` |
| Overrides ESLint | 3, tous pour désactiver `react-refresh/only-export-components` |
| Formateur | Prettier 3 + `prettier-plugin-tailwindcss`, config dans `.prettierrc` |
| Style | pas de point-virgule, guillemets doubles, `printWidth` 80, `tabWidth` 2, `trailingComma` es5, `endOfLine` lf |
| Exclusions | `dist`, `public/mockServiceWorker.js`, `src/routeTree.gen.ts` (déclarées deux fois : `globalIgnores` + `.prettierignore`) |
| Portée du formatage | `**/*.{ts,tsx}` — 41 fichiers |
| Scripts | `lint: eslint .`, `format: prettier --write "**/*.{ts,tsx}"` |
| Gestionnaire de paquets | Bun |

Les tests importent explicitement `describe` / `it` / `expect` depuis `vitest` : aucun global de
test à déclarer au linter.

## Décisions

Trois choix ont été arbitrés avant la conception.

**Remplacement complet plutôt que coexistence.** La config ESLint actuelle n'active que des règles
couvertes nativement par oxlint, et aucune règle *type-aware*. Rien ne justifie de conserver ESLint
en second rideau ni d'ajouter `eslint-plugin-oxlint` pour arbitrer les doublons.

**Style de formatage reporté à l'identique.** Chaque option de `.prettierrc` a un équivalent exact
chez oxfmt (vérifié dans son schéma de configuration, y compris `trailingComma: "es5"`). Adopter les
défauts d'oxfmt aurait reformaté les 41 fichiers — ajout des points-virgules, `printWidth` 100 — et
noyé la migration d'outillage sous un diff cosmétique.

**Sévérité alignée sur l'existant.** Catégorie `correctness` uniquement, pas de `suspicious` ni de
`pedantic`, pas de lint *type-aware* via `oxlint-tsgolint`. Durcir les règles est un travail
distinct, à mener une fois la migration acquise.

## Risque assumé

`oxfmt` est en **beta** (0.61.0, publiée le 2026-07-27), pas en 1.0. Il passe 100 % des tests de
conformité JavaScript et TypeScript de Prettier, mais l'équipe Oxc documente « quelques
incohérences de formatage résiduelles ». `oxlint`, lui, est stable en 1.76.0.

Ce risque est contenu par l'étape de vérification 1 (voir plus bas) : le diff de reformatage est
inspecté avant d'être accepté. S'il est important ou incohérent, la migration du formateur est
suspendue et seul oxlint est retenu — la suppression de Prettier est alors annulée.

## Dépendances

Ajoutées en développement :

| Paquet | Version | Rôle |
|---|---|---|
| `oxlint` | ^1.76 | linter |
| `oxfmt` | ^0.61 | formateur |

Supprimées (8) : `@eslint/js`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`,
`globals`, `typescript-eslint`, `prettier`, `prettier-plugin-tailwindcss`.

`prettier-plugin-tailwindcss` est retiré sans remplacement : oxfmt embarque l'algorithme de tri des
classes Tailwind en natif et ne déclare aucune peer dependency vers ce plugin. Le tri s'appuie sur
la feuille de style Tailwind v4 du projet, pas sur un `tailwind.config.js` (absent, Tailwind v4).

## Fichiers

Supprimés : `eslint.config.js`, `.prettierrc`, `.prettierignore`.
Créés : `.oxlintrc.jsonc` (JSONC, pour conserver les commentaires justifiant les overrides),
`.oxfmtrc.json`.

## Configuration du linter

`.oxlintrc.jsonc` reproduit le périmètre de `eslint.config.js`.

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["eslint", "typescript", "react"],
  "categories": { "correctness": "error" },
  "env": { "browser": true },
  "rules": {
    "react/only-export-components": ["error", { "allowConstantExport": true }]
  },
  "ignorePatterns": [
    "dist",
    "public/mockServiceWorker.js",
    "src/routeTree.gen.ts"
  ],
  "overrides": [
    {
      "files": ["src/components/ui/**/*.tsx"],
      "rules": { "react/only-export-components": "off" }
    },
    {
      "files": ["src/routes/**/*.tsx"],
      "rules": { "react/only-export-components": "off" }
    },
    {
      "files": ["src/main.tsx"],
      "rules": { "react/only-export-components": "off" }
    }
  ]
}
```

Le format est `.oxlintrc.jsonc` et non `.oxlintrc.json` : les justifications des trois overrides,
aujourd'hui portées par des commentaires dans `eslint.config.js`, ne survivraient pas à du JSON
strict. Elles expliquent *pourquoi* chaque override existe ; les perdre transformerait une
configuration motivée en configuration arbitraire. oxlint découvre `.oxlintrc.jsonc` au même titre
que `.oxlintrc.json`.

Correspondance avec les presets ESLint remplacés :

| Preset ESLint | Équivalent oxlint |
|---|---|
| `js.configs.recommended` | plugin `eslint` + catégorie `correctness` |
| `tseslint.configs.recommended` | plugin `typescript` |
| `reactHooks.configs.flat.recommended` | plugin `react` (il inclut react-hooks ; `react/exhaustive-deps` est en `correctness`, donc actif d'office) |
| `reactRefresh.configs.vite` | règle `react/only-export-components` déclarée explicitement |
| `languageOptions.globals: globals.browser` | `env: { browser: true }` |

Le point non évident : chez oxlint, `react/only-export-components` appartient à la catégorie
**`restriction`** et n'est donc **pas** activée par la catégorie `correctness`. Sans déclaration
explicite dans `rules`, la règle serait silencieusement absente — et les trois overrides qui la
désactivent deviendraient du bruit sans effet. L'option `allowConstantExport: true` reproduit ce que
le preset `vite` d'`eslint-plugin-react-refresh` active par défaut.

Les trois overrides sont transposés tels quels, avec les commentaires qui les justifient :

| Portée | Motif conservé |
|---|---|
| `src/components/ui/**/*.tsx` | les composants shadcn exportent leurs variantes cva : convention du registre |
| `src/routes/**/*.tsx` | `export const Route = createFileRoute(...)` déclencherait la règle sur chaque route |
| `src/main.tsx` | module d'entrée sans export, jamais rechargé à chaud |

## Configuration du formateur

`.oxfmtrc.json` reporte `.prettierrc` et absorbe `.prettierignore`.

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "semi": false,
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "trailingComma": "es5",
  "sortTailwindcss": {
    "stylesheet": "./src/index.css",
    "functions": ["cn", "cva"]
  },
  "ignorePatterns": [
    "dist",
    "public/mockServiceWorker.js",
    "src/routeTree.gen.ts"
  ]
}
```

Correspondance des options :

| Prettier | oxfmt |
|---|---|
| `semi`, `singleQuote`, `tabWidth`, `printWidth`, `trailingComma` | clés identiques |
| `endOfLine: "lf"` | option `endOfLine` disponible ; omise car `lf` est le défaut |
| `plugins: ["prettier-plugin-tailwindcss"]` | intégré, activé par la présence de `sortTailwindcss` |
| `tailwindStylesheet: "src/index.css"` | `sortTailwindcss.stylesheet` (chemin résolu depuis le fichier de config) |
| `tailwindFunctions: ["cn", "cva"]` | `sortTailwindcss.functions` |

`sortTailwindcss` est désactivé par défaut chez oxfmt : sa seule présence dans le fichier l'active.

## Portée du formatage

Le formatage reste limité à `**/*.{ts,tsx}`, comme le script Prettier actuel.

oxfmt sait aussi formater CSS, JSON, Markdown et YAML. Étendre la portée maintenant reformaterait
`src/index.css`, `README.md`, `package.json` et les `tsconfig.*.json` — un diff sans rapport avec la
migration, qui masquerait le seul diff qui compte : celui du reformatage TS/TSX. L'extension est un
changement d'une ligne, à décider plus tard.

## Scripts

| Script | Avant | Après |
|---|---|---|
| `lint` | `eslint .` | `oxlint` |
| `lint:fix` | — | `oxlint --fix` |
| `format` | `prettier --write "**/*.{ts,tsx}"` | `oxfmt` (mode écriture) |
| `format:check` | — | `oxfmt --check` |

`lint:fix` et `format:check` sont nouveaux : oxlint sait corriger une partie des violations, et un
mode vérification non destructif est ce qu'une CI appellera. Les autres scripts (`dev`, `build`,
`typecheck`, `test`, `routes:generate`, `preview`) sont inchangés.

Les drapeaux exacts de la CLI oxfmt sont confirmés via `oxfmt --help` après installation, avant
d'être inscrits dans `package.json` ; la table ci-dessus fixe l'intention, pas la syntaxe.

## Documentation

`README.md` lignes 38-39 : le tableau des scripts nomme « ESLint » et « Prettier ». Les deux entrées
sont mises à jour et les deux nouveaux scripts y sont ajoutés.

## Vérification

Dans cet ordre, avant tout commit.

1. **Diff de reformatage.** Lancer oxfmt sur les 41 fichiers TS/TSX et inspecter `git diff`. Il doit
   être vide ou négligeable. Tout diff est présenté et justifié avant d'être accepté ; un diff
   important ou incohérent déclenche le repli décrit dans « Risque assumé ».
2. **Lint.** `bun run lint` doit rendre 0 erreur. Les violations que oxlint remonte et qu'ESLint ne
   voyait pas sont listées et arbitrées, jamais corrigées silencieusement — elles signaleraient un
   écart de périmètre entre les deux configurations.
3. **Non-régression.** `bun run typecheck` et `bun test` restent au vert. Ni l'un ni l'autre ne
   dépend de la chaîne de lint, mais ils constituent le filet contre un reformatage destructeur.
4. **Propreté.** Aucune référence résiduelle à `eslint` ou `prettier` dans le dépôt hors historique
   git : `package.json`, `bun.lock`, `README.md`, fichiers de configuration.

## Hors périmètre

Explicitement non traité, à décider séparément :

- durcissement des règles (`suspicious`, `pedantic`, plugin `vitest`) ;
- lint *type-aware* via `oxlint-tsgolint` ;
- extension du formatage à CSS, JSON, Markdown et YAML ;
- tri des imports (`sortImports`) et de `package.json` (`sortPackageJson`), tous deux proposés par
  oxfmt mais absents de la configuration Prettier actuelle ;
- hook de pré-commit et intégration CI — le dépôt n'en a aucun aujourd'hui ;
- recommandation d'extension éditeur (`.vscode/extensions.json`, absent du dépôt).
