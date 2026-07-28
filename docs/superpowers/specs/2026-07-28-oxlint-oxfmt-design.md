# Migration ESLint + Prettier → oxlint + oxfmt — Design

Date : 2026-07-28
Statut : validé, prêt pour le plan d'implémentation

## Objectif

Remplacer intégralement la chaîne de qualité JavaScript du template — ESLint 10 et Prettier 3 — par
les outils Oxc écrits en Rust : `oxlint` pour le lint, `oxfmt` pour le formatage. Le remplacement
est total : les deux anciens outils et leurs plugins disparaissent du `package.json`.

Le parti pris est d'**adopter les configurations par défaut des deux outils** plutôt que de
transposer les réglages hérités d'ESLint et Prettier. Une seule exception, justifiée plus bas : le
tri des classes Tailwind, qui est une fonctionnalité et non une préférence de style.

Critère de réussite : sur un clone frais, `bun run lint`, `bun run format:check`,
`bun run typecheck`, `bun run test` et `bun run routes:generate` passent tous, et le dépôt ne
contient plus aucune dépendance directe à ESLint ou Prettier.

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
| Scripts | `lint: eslint .`, `format: prettier --write "**/*.{ts,tsx}"`, `test: vitest run` |
| Gestionnaire de paquets | Bun |

Les tests importent explicitement `describe` / `it` / `expect` depuis `vitest` : aucun global de
test à déclarer au linter.

## Décisions

**Remplacement complet plutôt que coexistence.** La config ESLint actuelle n'active que des règles
couvertes nativement par oxlint, et aucune règle *type-aware*. Rien ne justifie de conserver ESLint
en second rideau ni d'ajouter `eslint-plugin-oxlint` pour arbitrer les doublons.

**Configurations par défaut plutôt que transposition.** Les deux outils sont adoptés tels qu'ils
sortent de la boîte. Côté oxfmt cela signifie points-virgules, `printWidth` 100 et
`trailingComma: "all"` — soit un reformatage complet des 41 fichiers TS/TSX. Le coût est un diff
large et unique ; le bénéfice est une configuration minimale, sans réglage à justifier ni à
maintenir, et alignée sur ce que tout autre projet Oxc produira.

**Le tri des classes Tailwind est conservé, contre le défaut d'oxfmt.** `sortTailwindcss` est
désactivé par défaut. Le laisser désactivé ferait perdre une capacité que
`prettier-plugin-tailwindcss` assurait aujourd'hui — c'est une régression fonctionnelle, pas un
retour à un défaut. Il est donc réactivé explicitement, avec la feuille de style Tailwind v4 du
projet et les fonctions `cn` et `cva`.

**Jeu de plugins oxlint complet.** Les plugins actifs par défaut chez oxlint — `unicorn`, `oxc`,
`typescript` — sont conservés, et `react` (désactivé par défaut) est ajouté. Mesuré sur le dépôt :
`unicorn` et `oxc` ne produisent aucun diagnostic sur le code existant, leur inclusion est donc
gratuite tout en élargissant la couverture.

**Sévérité limitée à `correctness`.** Pas de `suspicious` ni de `pedantic`, pas de lint *type-aware*
via `oxlint-tsgolint`. Mesuré : activer `pedantic` déclencherait notamment `react/react-in-jsx-scope`
sur `login.tsx`, un faux positif sous React 19 avec la transformation JSX moderne. Durcir les règles
demanderait donc un travail de réglage distinct de cette migration.

## Risque assumé

`oxfmt` est en **beta** (0.61.0, publiée le 2026-07-27), pas en 1.0. Il passe 100 % des tests de
conformité JavaScript et TypeScript de Prettier, mais l'équipe Oxc documente « quelques
incohérences de formatage résiduelles ». `oxlint`, lui, est stable en 1.76.0.

Le choix d'adopter les défauts d'oxfmt déplace la nature de ce risque. Il ne s'agit plus de vérifier
que le formateur reproduit Prettier à l'octet près — le diff attendu n'est plus nul, mais complet.
La question devient : **le reformatage préserve-t-il la sémantique du code ?**

La réponse est apportée par le typage et les tests, exécutés sur le code reformaté. Un formateur qui
altérerait le sens d'un programme le ferait échouer. Ce contrôle a été exécuté avant rédaction du
plan : reformatage appliqué aux 41 fichiers, puis `tsc --noEmit` silencieux et 37 tests au vert sur
10 fichiers.

Le reformatage occupe un commit isolé, sans autre changement, pour rester relisible et pour pouvoir
être ignoré par `git blame`.

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

`prettier` restera néanmoins présent dans `node_modules` en dépendance transitive :
`@tanstack/router-generator` le déclare en dépendance d'exécution et l'importe pour formater
`routeTree.gen.ts`. Ce n'est pas un échec de la migration — la cible est de ne plus en dépendre
*directement* — mais cela implique de vérifier que `bun run routes:generate` fonctionne toujours
après désinstallation.

## Fichiers

Supprimés : `eslint.config.js`, `.prettierrc`, `.prettierignore`.
Créés : `.oxlintrc.jsonc` (JSONC, pour conserver les commentaires justifiant les overrides),
`.oxfmtrc.json`, `.git-blame-ignore-revs`.

## Configuration du linter

`.oxlintrc.jsonc` reproduit le périmètre de `eslint.config.js`, élargi au jeu de plugins par défaut
d'oxlint.

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["eslint", "typescript", "react", "unicorn", "oxc"],
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
  "overrides": [ /* les 3 overrides, détaillés dans le plan d'implémentation */ ]
}
```

Correspondance avec les presets ESLint remplacés :

| Preset ESLint | Équivalent oxlint |
|---|---|
| `js.configs.recommended` | plugin `eslint` + catégorie `correctness` |
| `tseslint.configs.recommended` | plugin `typescript` |
| `reactHooks.configs.flat.recommended` | plugin `react` (il inclut react-hooks ; `react/exhaustive-deps` est en `correctness`, donc actif d'office) |
| `reactRefresh.configs.vite` | règle `react/only-export-components` déclarée explicitement |
| `languageOptions.globals: globals.browser` | `env: { browser: true }` |
| — | `unicorn` et `oxc` : couverture ajoutée, sans équivalent ESLint ici |

Deux pièges vérifiés empiriquement conditionnent cette configuration.

**La clé `plugins` remplace les plugins par défaut, elle ne s'y ajoute pas.** Avec
`"plugins": ["react"]`, les règles `typescript/*` cessent silencieusement de s'appliquer. La liste
doit donc énumérer `unicorn`, `oxc` et `typescript` même s'ils sont actifs par défaut en l'absence
de cette clé.

**`react/only-export-components` appartient à la catégorie `restriction`**, pas `correctness` : elle
n'est pas activée par `"categories": { "correctness": "error" }` et doit être déclarée dans `rules`.
Sans cela la règle serait silencieusement absente, et les trois overrides qui la désactivent
deviendraient du bruit sans effet. L'option `allowConstantExport: true` reproduit ce que le preset
`vite` d'`eslint-plugin-react-refresh` active par défaut.

Les trois overrides sont transposés tels quels, avec les commentaires qui les justifient :

| Portée | Motif conservé |
|---|---|
| `src/components/ui/**/*.tsx` | les composants shadcn exportent leurs variantes cva : convention du registre |
| `src/routes/**/*.tsx` | `export const Route = createFileRoute(...)` déclencherait la règle sur chaque route |
| `src/main.tsx` | module d'entrée sans export, jamais rechargé à chaud |

Le format est `.oxlintrc.jsonc` et non `.oxlintrc.json` : les justifications de ces overrides ne
survivraient pas à du JSON strict. Elles expliquent *pourquoi* chaque override existe ; les perdre
transformerait une configuration motivée en configuration arbitraire. oxlint découvre
`.oxlintrc.jsonc` au même titre que `.oxlintrc.json`.

## Configuration du formateur

`.oxfmtrc.json` ne déclare que ce qui s'écarte des défauts : le tri Tailwind et les exclusions.

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "sortTailwindcss": {
    "stylesheet": "src/index.css",
    "functions": ["cn", "cva"]
  },
  "ignorePatterns": [
    "dist",
    "public/mockServiceWorker.js",
    "src/routeTree.gen.ts"
  ]
}
```

Aucune option de style n'est déclarée. Les valeurs qui s'appliquent sont donc celles d'oxfmt :
`semi` true, `singleQuote` false, `printWidth` 100, `tabWidth` 2, `trailingComma` "all",
`endOfLine` lf, `insertFinalNewline` true.

Correspondance avec l'ancienne configuration Prettier :

| Prettier | Devient |
|---|---|
| `semi: false` | `semi` true — points-virgules réintroduits |
| `printWidth: 80` | `printWidth` 100 — lignes recompactées |
| `trailingComma: "es5"` | `trailingComma` "all" |
| `singleQuote: false`, `tabWidth: 2`, `endOfLine: "lf"` | identiques par défaut |
| `plugins: ["prettier-plugin-tailwindcss"]` | intégré, activé par `sortTailwindcss` |
| `tailwindStylesheet: "src/index.css"` | `sortTailwindcss.stylesheet` (chemin résolu depuis le fichier de config) |
| `tailwindFunctions: ["cn", "cva"]` | `sortTailwindcss.functions` |

## Portée du formatage

Le formatage reste limité à `**/*.{ts,tsx}`, comme le script Prettier actuel. Ce glob couvre 41
fichiers : les 40 fichiers TS/TSX de `src/` hors `routeTree.gen.ts`, plus `vite.config.ts`.

oxfmt sait aussi formater CSS, JSON, Markdown et YAML. Étendre la portée reformaterait
`src/index.css`, `README.md`, `package.json` et les `tsconfig.*.json` — un diff supplémentaire sans
rapport avec la migration, au moment précis où le diff TS/TSX est déjà maximal. L'extension est un
changement d'une ligne, à décider séparément.

## Scripts

| Script | Avant | Après |
|---|---|---|
| `lint` | `eslint .` | `oxlint` |
| `lint:fix` | — | `oxlint --fix` |
| `format` | `prettier --write "**/*.{ts,tsx}"` | `oxfmt "**/*.{ts,tsx}"` |
| `format:check` | — | `oxfmt --check "**/*.{ts,tsx}"` |

Le mode écriture est le défaut d'oxfmt : `--write` est implicite. `lint:fix` et `format:check` sont
nouveaux — oxlint sait corriger une partie des violations, et un mode vérification non destructif
est ce qu'une CI appellera. Les autres scripts (`dev`, `build`, `typecheck`, `test`, `test:watch`,
`routes:generate`, `preview`) sont inchangés.

## Documentation

`README.md` lignes 38-39 : le tableau des scripts nomme « ESLint » et « Prettier ». Les deux entrées
sont mises à jour et les deux nouveaux scripts y sont ajoutés.

## Vérification

1. **Sûreté du reformatage.** `bun run typecheck` silencieux et `bun run test` intégralement au vert
   sur le code reformaté. C'est le contrôle central : un formateur qui altérerait la sémantique les
   ferait échouer. Attention à `bun run test` (qui exécute `vitest run`) et non `bun test`, qui
   invoque le runner de Bun et échoue sur des incompatibilités MSW sans rapport avec la migration.
2. **Nature du diff.** Le reformatage occupe un commit isolé ne contenant aucun autre changement, et
   ne touche aucun fichier hors du glob `**/*.{ts,tsx}`.
3. **Lint.** `bun run lint` rend 0 diagnostic. Les violations que oxlint remonterait et qu'ESLint ne
   voyait pas sont listées et arbitrées, jamais corrigées silencieusement.
4. **Génération de routes.** `bun run routes:generate` fonctionne toujours après la désinstallation
   de Prettier, et reste idempotent.
5. **Propreté.** Aucune dépendance directe à `eslint` ou `prettier` dans `package.json`, et aucun
   fichier de configuration résiduel.

## Hors périmètre

Explicitement non traité, à décider séparément :

- durcissement des règles (`suspicious`, `pedantic`, plugin `vitest`) ;
- lint *type-aware* via `oxlint-tsgolint` ;
- extension du formatage à CSS, JSON, Markdown et YAML ;
- tri des imports (`sortImports`) et de `package.json` (`sortPackageJson`), tous deux proposés par
  oxfmt mais non activés ici ;
- hook de pré-commit et intégration CI — le dépôt n'en a aucun aujourd'hui ;
- recommandation d'extension éditeur (`.vscode/extensions.json`, absent du dépôt).
