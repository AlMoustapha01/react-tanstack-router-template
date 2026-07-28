# Migration ESLint + Prettier → oxlint + oxfmt — Plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> utilisent la syntaxe case à cocher (`- [ ]`).

**Objectif :** remplacer intégralement ESLint 10 et Prettier 3 par oxlint 1.76 et oxfmt 0.61, en
conservant à l'identique le périmètre de règles et le style de formatage.

**Approche :** trois tâches séquentielles, une par risque distinct. La tâche 1 installe et prouve
oxlint, la tâche 2 installe et prouve oxfmt — toutes deux **sans rien supprimer**, l'ancien
outillage reste en place comme filet. La tâche 3 ne coupe le cordon qu'une fois les deux nouveaux
outils démontrés au vert. Un relecteur peut rejeter la migration du formateur en acceptant celle du
linter, et inversement.

**Stack :** Bun (gestionnaire de paquets), TypeScript 6, React 19.2, Vite 8, Tailwind v4.

**Spec de référence :** `docs/superpowers/specs/2026-07-28-oxlint-oxfmt-design.md`

## Mesures préalables

Ces chiffres ont été relevés sur le dépôt avant rédaction du plan, avec les binaires réels installés
dans un répertoire jetable. Ils servent de valeurs attendues aux étapes de vérification — un écart
signale une régression, pas une approximation.

| Mesure | Valeur relevée |
|---|---|
| Fichiers TS/TSX dans `src/` | **41** |
| Fichiers **linté**s par oxlint | **40** — les 41 de `src/` moins `routeTree.gen.ts`, exclu |
| Fichiers **formatés** par oxfmt via `**/*.{ts,tsx}` | **41** — les 40 ci-dessus plus `vite.config.ts` à la racine |
| Diff de formatage oxfmt avec le style Prettier reporté | **0** — « All matched files use the correct format. » |
| Diagnostics oxlint avec la configuration finale | **0** |
| Violations `react/only-export-components` sans les overrides | **12**, réparties sur 9 fichiers |
| Périmètres couvrant ces 12 violations | exactement les 3 overrides prévus |
| `bun run routes:generate` | idempotent — n'altère pas `routeTree.gen.ts` sur un arbre à jour |

Les deux comptes **40** et **41** sont attendus et ne se contredisent pas : le linter ignore le
fichier généré `src/routeTree.gen.ts` mais ne voit pas la racine, tandis que le formateur ignore ce
même fichier généré et couvre en plus `vite.config.ts`. Confondre les deux ferait échouer à tort une
étape de vérification.

Répartition des 12 violations, à reproduire à l'étape 1.4. Elle est donnée ici par ordre
alphabétique pour la lisibilité ; la commande de l'étape 1.4 trie par nombre décroissant, donc
l'ordre des lignes diffère — seuls les fichiers et leurs comptes doivent correspondre.

```
  1  src/components/ui/button.tsx              → override components/ui
  1  src/main.tsx                              → override main.tsx
  4  src/routes/__root.tsx                     → override routes
  1  src/routes/_authenticated.tsx             → override routes
  1  src/routes/_authenticated/dashboard.tsx   → override routes
  1  src/routes/_authenticated/posts.$postId.tsx → override routes
  1  src/routes/_authenticated/posts.index.tsx → override routes
  1  src/routes/index.tsx                      → override routes
  1  src/routes/login.tsx                      → override routes
```

## Contraintes globales

- **Versions exactes :** `oxlint@^1.76.0`, `oxfmt@^0.61.0`. oxfmt est en beta (pré-1.0) : c'est
  assumé, et couvert par la vérification de diff nul de la tâche 2.
- **Gestionnaire de paquets : Bun.** Toujours `bun add`, `bun remove`, `bun run` — jamais `npm` ni
  `pnpm`, sous peine de générer un lockfile concurrent.
- **`plugins` remplace les défauts d'oxlint, il ne s'y ajoute pas.** Vérifié empiriquement : avec
  `"plugins": ["react"]`, les règles `typescript/*` cessent de s'appliquer. La liste doit donc être
  exhaustive.
- **`react/only-export-components` est en catégorie `restriction`**, pas `correctness` : elle n'est
  pas activée par `"categories": { "correctness": "error" }` et doit être déclarée dans `rules`.
- **Aucun fichier source TS/TSX ne doit être modifié** par cette migration. Le seul diff attendu sur
  `src/` est zéro. Si du reformatage apparaît, arrêter et remonter le diff.
- **Style de formatage inchangé :** `semi` false, `singleQuote` false, `printWidth` 80, `tabWidth`
  2, `trailingComma` es5, `endOfLine` lf.
- **Hors périmètre**, à ne pas ajouter en passant : catégories `suspicious`/`pedantic`, plugin
  `vitest`, lint type-aware (`oxlint-tsgolint`), formatage CSS/JSON/Markdown/YAML, `sortImports`,
  `sortPackageJson`, hook pre-commit, CI.

## Structure des fichiers

| Fichier | Sort | Responsabilité |
|---|---|---|
| `.oxlintrc.jsonc` | créé (tâche 1) | périmètre de lint : plugins, catégories, règle `only-export-components`, 3 overrides commentés, exclusions |
| `.oxfmtrc.json` | créé (tâche 2) | style de formatage + tri Tailwind + exclusions |
| `eslint.config.js` | supprimé (tâche 3) | remplacé par `.oxlintrc.jsonc` |
| `.prettierrc` | supprimé (tâche 3) | remplacé par `.oxfmtrc.json` |
| `.prettierignore` | supprimé (tâche 3) | absorbé dans `ignorePatterns` de `.oxfmtrc.json` |
| `package.json` | modifié (tâches 1, 2, 3) | dépendances et scripts |
| `README.md:38-39` | modifié (tâche 3) | tableau des scripts |

---

### Tâche 1 : oxlint

**Fichiers :**
- Créer : `.oxlintrc.jsonc`
- Modifier : `package.json` (devDependencies uniquement — les scripts restent sur ESLint)

**Interfaces :**
- Consomme : rien (première tâche)
- Produit : `.oxlintrc.jsonc` opérationnel, commande `bunx oxlint` rendant 0 diagnostic. La tâche 3
  s'appuiera dessus pour brancher le script `lint`.

À la fin de cette tâche, ESLint est **toujours installé et toujours branché** sur `bun run lint`.
Les deux linters coexistent le temps d'un commit, volontairement.

- [ ] **Étape 1.1 : Installer oxlint**

```bash
bun add -d oxlint@^1.76.0
```

- [ ] **Étape 1.2 : Vérifier que le binaire répond**

```bash
bunx oxlint --version
```

Attendu : `oxlint 1.76.0` (ou un patch supérieur en 1.76.x).

- [ ] **Étape 1.3 : Écrire la configuration**

Créer `.oxlintrc.jsonc` avec exactement ce contenu :

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  // `plugins` REMPLACE les plugins par défaut d'oxlint (unicorn, oxc,
  // typescript), il ne s'y ajoute pas : la liste doit être exhaustive.
  // Elle reproduit le périmètre de l'ancien eslint.config.js —
  // js.configs.recommended, tseslint.configs.recommended,
  // reactHooks.configs.flat.recommended, reactRefresh.configs.vite.
  "plugins": ["eslint", "typescript", "react"],
  "categories": { "correctness": "error" },
  "env": { "browser": true },
  "rules": {
    // Équivalent de react-refresh/only-export-components. Chez oxlint cette
    // règle est en catégorie `restriction` : elle n'est PAS activée par
    // `correctness` et doit être déclarée ici, sinon les trois overrides
    // ci-dessous désactiveraient une règle inexistante.
    // `allowConstantExport` reproduit le preset `vite` du plugin ESLint.
    "react/only-export-components": ["error", { "allowConstantExport": true }]
  },
  "ignorePatterns": [
    "dist",
    "public/mockServiceWorker.js",
    "src/routeTree.gen.ts"
  ],
  "overrides": [
    {
      // Les composants shadcn exportent leurs variantes (cva) à côté du
      // composant : c'est la convention du registre, pas un défaut.
      "files": ["src/components/ui/**/*.tsx"],
      "rules": { "react/only-export-components": "off" }
    },
    {
      // `export const Route = createFileRoute(...)` n'est pas un export
      // constant au sens de la règle : elle se déclencherait sur chaque route.
      "files": ["src/routes/**/*.tsx"],
      "rules": { "react/only-export-components": "off" }
    },
    {
      // `main.tsx` ne fait aucun export : c'est le module d'entrée, jamais
      // rechargé à chaud, donc la règle Fast Refresh n'y a aucune valeur.
      "files": ["src/main.tsx"],
      "rules": { "react/only-export-components": "off" }
    }
  ]
}
```

- [ ] **Étape 1.4 : Prouver que les overrides sont porteurs (le « test qui échoue »)**

Cette configuration n'a d'intérêt que si les overrides suppriment réellement des violations. On le
vérifie en réactivant la règle partout, sans les overrides.

Attention au piège : `.oxlintrc.jsonc` vient d'être créé à l'étape 1.3 et oxlint le **découvre
automatiquement**. Un simple `-D react/only-export-components` en ligne de commande ne suffit donc
pas — les overrides du fichier gagnent et la commande rend `0`, ce qui ressemble à un succès alors
que la preuve n'a rien prouvé. Il faut explicitement pointer `-c` vers une configuration vide :

```bash
echo '{}' > /tmp/oxlint-empty.json
bunx oxlint -c /tmp/oxlint-empty.json --react-plugin \
  -D react/only-export-components src 2>&1 \
  | grep -oE 'src/[A-Za-z0-9_./$-]+\.tsx?' | sort | uniq -c | sort -rn
rm -f /tmp/oxlint-empty.json
```

Le motif `grep` doit être entre **apostrophes simples**. Entre guillemets doubles, le shell développe
le `$-` de la classe de caractères en options du shell : `posts.$postId.tsx` disparaît alors du
résultat et le total tombe à 11, ce qui ferait échouer cette vérification pour une mauvaise raison.

Attendu, exactement :

```
   4 src/routes/__root.tsx
   1 src/routes/login.tsx
   1 src/routes/index.tsx
   1 src/routes/_authenticated/posts.index.tsx
   1 src/routes/_authenticated/posts.$postId.tsx
   1 src/routes/_authenticated/dashboard.tsx
   1 src/routes/_authenticated.tsx
   1 src/main.tsx
   1 src/components/ui/button.tsx
```

Soit **12 violations sur 9 fichiers**. Chaque fichier listé tombe dans l'un des trois périmètres
d'override : `button.tsx` → override `components/ui`, `main.tsx` → override `main.tsx`, les sept
autres → override `routes`.

Si le total est `0`, la configuration vide n'a pas été prise en compte : vérifier le chemin passé à
`-c`. S'il vaut `11`, c'est le piège des guillemets décrit ci-dessus. S'il diffère de 12 pour une
autre raison, soit le code a changé depuis la conception, soit `allowConstantExport` ne se comporte
pas comme prévu — remonter l'écart avant de poursuivre.

- [ ] **Étape 1.5 : Lancer oxlint avec la configuration**

```bash
bunx oxlint
```

Attendu : **aucune sortie, code de sortie 0.** oxlint reste silencieux quand il ne trouve rien.

Vérifier le code de sortie explicitement :

```bash
bunx oxlint; echo "exit=$?"
```

Attendu : `exit=0`.

- [ ] **Étape 1.6 : Vérifier le volume réellement analysé**

Une configuration trop restrictive, qui n'analyserait aucun fichier, passerait elle aussi
silencieusement l'étape 1.5. On contrôle donc le volume :

```bash
bunx oxlint --debug=files src | grep -c "^src/"
```

Attendu : `40` — les 41 fichiers TS/TSX de `src/` moins `src/routeTree.gen.ts`, exclu par
`ignorePatterns`. Ne pas confondre avec le `41` attendu côté oxfmt à l'étape 2.6, qui compte un
périmètre différent (voir « Mesures préalables »).

Pour confirmer que l'écart vient bien du seul fichier généré :

```bash
bunx oxlint --debug=files src | grep -c "routeTree.gen.ts"
```

Attendu : `0`.

- [ ] **Étape 1.7 : Vérifier qu'ESLint est toujours fonctionnel**

Le filet doit tenir jusqu'à la tâche 3 :

```bash
bun run lint
```

Attendu : passe sans erreur, comme avant.

- [ ] **Étape 1.8 : Commit**

```bash
git add package.json bun.lock .oxlintrc.jsonc
git commit -m "feat: ajouter oxlint en parallèle d'ESLint

Configuration à périmètre identique : plugins eslint/typescript/react,
catégorie correctness, et react/only-export-components déclarée
explicitement car elle est en catégorie restriction chez oxlint.

Les 3 overrides de eslint.config.js sont transposés ; sans eux la règle
remonte 12 violations sur 9 fichiers. ESLint reste branché sur \`bun run
lint\` jusqu'à validation d'oxfmt."
```

---

### Tâche 2 : oxfmt

**Fichiers :**
- Créer : `.oxfmtrc.json`
- Modifier : `package.json` (devDependencies uniquement — les scripts restent sur Prettier)

**Interfaces :**
- Consomme : rien de la tâche 1 (les deux outils sont indépendants)
- Produit : `.oxfmtrc.json` opérationnel, `bunx oxfmt --check "**/*.{ts,tsx}"` rendant « All matched
  files use the correct format. » sur 41 fichiers. La tâche 3 s'appuiera dessus pour brancher les
  scripts `format` et `format:check`.

C'est la tâche à risque : oxfmt est en beta. Elle est construite pour que le risque se manifeste en
lecture seule, avant toute écriture.

- [ ] **Étape 2.1 : Installer oxfmt**

```bash
bun add -d oxfmt@^0.61.0
```

- [ ] **Étape 2.2 : Vérifier que le binaire répond**

```bash
bunx oxfmt --version
```

Attendu : `0.61.0` (ou un patch supérieur en 0.61.x).

- [ ] **Étape 2.3 : Générer la configuration depuis Prettier**

oxfmt sait traduire `.prettierrc` et `.prettierignore` tout seul. On utilise le migrateur plutôt
qu'une transcription manuelle — il traduit aussi les options du plugin Tailwind, qui sont la partie
la plus facile à se tromper :

```bash
bunx oxfmt --migrate=prettier
```

Attendu, sur la sortie standard :

```
Found Prettier configuration at: <chemin>/.prettierrc
Migrated prettier-plugin-tailwindcss options to sortTailwindcss
Migrated ignore patterns from `.prettierignore`
Created `.oxfmtrc.json`.
```

`.prettierrc` et `.prettierignore` ne sont pas supprimés par cette commande — ils partiront en
tâche 3.

- [ ] **Étape 2.4 : Nettoyer la configuration générée**

Le migrateur reporte fidèlement `.prettierignore`, y compris ses scories : `pnpm-lock.yaml` y figure
en double, et les lockfiles npm/pnpm/yarn n'ont aucun sens dans un dépôt Bun. `node_modules/` et
`coverage/` sont déjà couverts — oxfmt saute `node_modules` par défaut et lit `.gitignore`.

Remplacer le contenu de `.oxfmtrc.json` par exactement ceci :

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "endOfLine": "lf",
  "semi": false,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
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

`sortPackageJson: false` généré par le migrateur est retiré : c'est déjà la valeur par défaut.

- [ ] **Étape 2.5 : Vérifier le diff de formatage EN LECTURE SEULE (le test décisif)**

Ne rien écrire tant que le diff n'est pas connu. `--list-different` liste les fichiers qui
changeraient, sans y toucher :

```bash
bunx oxfmt --list-different "**/*.{ts,tsx}"
```

Attendu : **sortie vide.**

Toute ligne affichée est un fichier qu'oxfmt formaterait autrement que Prettier. Dans ce cas :
arrêter, inspecter le fichier concerné (`bunx oxfmt --stdin-filepath <f> < <f> | diff <f> -`), et
remonter le diff avant de poursuivre. Un désaccord large ou incohérent déclenche le repli prévu au
spec : on garde Prettier et on n'applique que la tâche 1.

- [ ] **Étape 2.6 : Confirmer la couverture**

Une sortie vide à l'étape 2.5 signifierait aussi « aucun fichier analysé ». On contrôle le volume :

```bash
bunx oxfmt --check "**/*.{ts,tsx}"
```

Attendu, littéralement :

```
Checking formatting...

All matched files use the correct format.
Finished in <N>ms on 41 files using <N> threads.
```

Les deux points à vérifier : la phrase « All matched files use the correct format. » et le compte de
**41 fichiers**. Ce 41 couvre les 40 fichiers de `src/` hors `routeTree.gen.ts`, plus
`vite.config.ts` à la racine — soit exactement le périmètre de l'ancien script Prettier.

- [ ] **Étape 2.7 : Vérifier que rien n'a été écrit**

```bash
git status --short
```

Attendu : seuls `package.json`, `bun.lock` et `.oxfmtrc.json` apparaissent. **Aucun fichier sous
`src/` ni `vite.config.ts`.**

- [ ] **Étape 2.8 : Commit**

```bash
git add package.json bun.lock .oxfmtrc.json
git commit -m "feat: ajouter oxfmt en parallèle de Prettier

Configuration générée par \`oxfmt --migrate=prettier\` puis nettoyée des
scories de .prettierignore (lockfiles npm/pnpm/yarn, dépôt sous Bun).

Vérifié en lecture seule : oxfmt ne modifie aucun des 41 fichiers TS/TSX,
le style Prettier est reproduit à l'octet près. Le tri des classes
Tailwind est natif, prettier-plugin-tailwindcss n'est plus nécessaire."
```

---

### Tâche 3 : Coupure d'ESLint et Prettier

**Fichiers :**
- Supprimer : `eslint.config.js`, `.prettierrc`, `.prettierignore`
- Modifier : `package.json` (devDependencies + scripts), `README.md:38-39`

**Interfaces :**
- Consomme : `.oxlintrc.jsonc` (tâche 1) et `.oxfmtrc.json` (tâche 2), tous deux vérifiés au vert
- Produit : l'état final du dépôt

Ne commencer cette tâche que si les tâches 1 et 2 sont passées sans écart. C'est ici, et seulement
ici, que le filet est retiré.

- [ ] **Étape 3.1 : Basculer les scripts**

Dans `package.json`, remplacer les deux lignes :

```json
    "lint": "eslint .",
    "format": "prettier --write \"**/*.{ts,tsx}\"",
```

par :

```json
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "format": "oxfmt \"**/*.{ts,tsx}\"",
    "format:check": "oxfmt --check \"**/*.{ts,tsx}\"",
```

Le mode écriture est le défaut d'oxfmt : `--write` est implicite et inutile. Les guillemets autour
du glob sont obligatoires — sans eux le shell développe le motif avant de le passer à oxfmt.

Les autres scripts (`dev`, `build`, `typecheck`, `test`, `test:watch`, `routes:generate`,
`preview`) sont inchangés.

- [ ] **Étape 3.2 : Désinstaller les 8 paquets**

```bash
bun remove @eslint/js eslint eslint-plugin-react-hooks eslint-plugin-react-refresh \
  globals typescript-eslint prettier prettier-plugin-tailwindcss
```

**`prettier` restera présent dans `node_modules` après cette commande — c'est normal, pas un
échec.** `@tanstack/router-generator` le déclare en dépendance d'exécution (`prettier: ^3.5.0`) et
l'importe dans son `dist` pour formater `routeTree.gen.ts`. Il reste donc installé en transitif, et
`bun.lock` continuera de le mentionner.

Ce qui compte est qu'il ne soit plus une dépendance **directe** du projet, ce que vérifie
l'étape 3.8 sur `package.json`. Le corollaire à ne pas manquer : `bun run routes:generate` dépend de
ce prettier transitif, d'où sa vérification explicite à l'étape 3.7.

- [ ] **Étape 3.3 : Supprimer les fichiers de configuration morts**

```bash
git rm eslint.config.js .prettierrc .prettierignore
```

- [ ] **Étape 3.4 : Mettre à jour le README**

Dans `README.md`, le tableau des scripts contient aux lignes 38-39 :

```markdown
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
```

Remplacer par :

```markdown
| `bun run lint` | oxlint |
| `bun run lint:fix` | oxlint, corrections automatiques |
| `bun run format` | oxfmt |
| `bun run format:check` | oxfmt, vérification sans écriture |
```

Vérifier au passage que l'alignement des colonnes du tableau reste cohérent avec les lignes voisines.

- [ ] **Étape 3.5 : Vérifier le lint**

```bash
bun run lint; echo "exit=$?"
```

Attendu : aucune sortie, `exit=0`.

- [ ] **Étape 3.6 : Vérifier le formatage**

```bash
bun run format:check
```

Attendu : « All matched files use the correct format. » sur **41 fichiers**.

- [ ] **Étape 3.7 : Vérifier la non-régression**

Ni le typage ni les tests ne dépendent de la chaîne de lint, mais ce sont eux qui détecteraient un
reformatage destructeur :

```bash
bun run typecheck && bun test
```

Attendu : typecheck silencieux, et la suite de tests intégralement au vert.

Puis la génération de routes, seul script du dépôt qui dépende réellement de Prettier — via la
dépendance transitive de `@tanstack/router-generator` décrite à l'étape 3.2. C'est la régression que
la désinstallation pourrait provoquer, et rien d'autre ne la détecterait :

```bash
bun run routes:generate
git status --short
```

Attendu : la commande passe sans erreur, et `src/routeTree.gen.ts` n'apparaît **pas** comme modifié
— la génération est idempotente sur un arbre à jour (vérifié avant rédaction de ce plan).

Si la commande échoue avec une erreur de résolution de module `prettier`, c'est que
`@tanstack/router-generator` ne l'a pas conservé en transitif. Le correctif est alors de réinstaller
prettier en dépendance de développement explicite (`bun add -d prettier`), en le documentant comme
dépendance de la génération de routes et non de la chaîne de formatage — et en laissant `.prettierrc`
supprimé, puisque plus aucun script du dépôt ne l'utilise.

- [ ] **Étape 3.8 : Vérifier l'absence de résidus**

Le contrôle qui compte porte sur `package.json` :

```bash
grep -nE "eslint|prettier" package.json || echo "package.json propre"
```

Attendu : `package.json propre`.

Puis un balayage large du dépôt. **Deux occurrences sont légitimes et doivent subsister** — les
filtrer aveuglément masquerait un vrai résidu, donc on les nomme :

```bash
grep -rniE "eslint|prettier" --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=dist --exclude-dir=docs --exclude=bun.lock . \
  | grep -vE '^\./\.oxlintrc\.jsonc:|^\./public/mockServiceWorker\.js:' \
  || echo "aucun résidu inattendu"
```

Attendu : `aucun résidu inattendu`.

Les deux exceptions :

| Occurrence | Pourquoi elle reste |
|---|---|
| `.oxlintrc.jsonc` → `"plugins": ["eslint", ...]` | `eslint` est le nom du plugin de règles de base **d'oxlint**, pas une référence à ESLint. Le commentaire du fichier cite aussi `eslint.config.js` pour expliquer la filiation. |
| `public/mockServiceWorker.js` → `/* eslint-disable */` | Fichier généré par MSW, déjà exclu du lint et du formatage. Il est régénéré par MSW, pas édité à la main : ne pas y toucher. |

`docs/` est exclu du balayage : le spec et ce plan mentionnent légitimement les outils remplacés.
`bun.lock` l'est aussi, car il peut conserver des entrées transitives sans rapport avec les
dépendances directes.

- [ ] **Étape 3.9 : Vérifier que le diff ne touche aucune source**

```bash
git status --short
git diff --stat
```

Attendu : les seuls fichiers modifiés ou supprimés sont `package.json`, `bun.lock`, `README.md`,
`eslint.config.js`, `.prettierrc`, `.prettierignore`. **Aucun fichier sous `src/`.**

- [ ] **Étape 3.10 : Commit**

```bash
git add -A
git commit -m "feat!: remplacer ESLint et Prettier par oxlint et oxfmt

Suppression des 8 paquets de l'ancienne chaîne et de leurs trois fichiers
de configuration. Les scripts basculent sur oxlint et oxfmt, et gagnent
lint:fix et format:check.

Périmètre de règles et style de formatage inchangés : lint à 0 diagnostic
sur 40 fichiers, formatage à 0 diff sur 41. typecheck, tests et génération
de routes au vert."
```

---

## Vérification finale

Après la tâche 3, sur un clone frais :

```bash
bun install
bun run lint && bun run format:check && bun run typecheck && bun test && bun run routes:generate
git status --short
```

Les cinq commandes doivent passer et `git status` rester vide. C'est le critère de réussite énoncé
au spec, augmenté de `routes:generate` — le script qui dépend du prettier transitif.

## En cas de repli

Si l'étape 2.5 révèle un diff de formatage important ou incohérent, le spec prévoit de suspendre la
migration du formateur :

1. Ne pas exécuter la tâche 3 telle quelle.
2. Conserver Prettier : ne pas supprimer `prettier`, `prettier-plugin-tailwindcss`, `.prettierrc`,
   `.prettierignore`, ni le script `format`.
3. N'appliquer de la tâche 3 que la partie linter : scripts `lint`/`lint:fix`, suppression des 6
   paquets ESLint, suppression d'`eslint.config.js`, mise à jour du README pour le seul lint.
4. Supprimer `.oxfmtrc.json` et désinstaller `oxfmt`.
5. Remonter le diff observé en amont (issue oxc), et réévaluer à la sortie d'oxfmt 1.0.
