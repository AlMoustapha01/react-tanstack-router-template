# Migration ESLint + Prettier → oxlint + oxfmt — Plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> utilisent la syntaxe case à cocher (`- [ ]`).

**Objectif :** remplacer intégralement ESLint 10 et Prettier 3 par oxlint 1.76 et oxfmt 0.61, en
adoptant les configurations par défaut des deux outils — à l'exception du tri des classes Tailwind,
conservé parce que c'est une fonctionnalité et non un réglage de style.

**Approche :** quatre tâches séquentielles, découpées par risque. Les tâches 1 et 2 installent et
configurent les deux outils **sans rien supprimer ni reformater** : l'ancien outillage reste en
place comme filet. La tâche 3 applique le reformatage des 41 fichiers dans un commit isolé, validé
par le typage et les tests. La tâche 4 seulement coupe le cordon. Un relecteur peut ainsi approuver
la configuration tout en examinant séparément le diff de 41 fichiers.

**Stack :** Bun (gestionnaire de paquets), TypeScript 6, React 19.2, Vite 8, Tailwind v4, Vitest 4.

**Spec de référence :** `docs/superpowers/specs/2026-07-28-oxlint-oxfmt-design.md`

## Mesures préalables

Ces chiffres ont été relevés sur le dépôt avant rédaction du plan, avec les binaires réels et la
configuration finale. Le reformatage a été appliqué puis annulé pour mesurer son effet. Ils servent
de valeurs attendues aux étapes de vérification — un écart signale une régression, pas une
approximation.

| Mesure | Valeur relevée |
|---|---|
| Fichiers TS/TSX dans `src/` | **41** |
| Fichiers **lintés** par oxlint | **40** — les 41 de `src/` moins `routeTree.gen.ts`, exclu |
| Fichiers **formatés** par oxfmt via `**/*.{ts,tsx}` | **41** — les 40 ci-dessus plus `vite.config.ts` à la racine |
| Ampleur du reformatage | **41 fichiers, 683 insertions, 775 suppressions** |
| `tsc --noEmit` après reformatage | silencieux, code de sortie 0 |
| `vitest run` après reformatage | **37 tests au vert sur 10 fichiers** |
| Diagnostics oxlint après reformatage (`unicorn` + `oxc` inclus) | **0** |
| Violations `react/only-export-components` sans les overrides | **12**, réparties sur 9 fichiers |
| `bun run routes:generate` | idempotent — n'altère pas `routeTree.gen.ts` sur un arbre à jour |

Les deux comptes **40** et **41** sont attendus et ne se contredisent pas : le linter ignore le
fichier généré `src/routeTree.gen.ts` mais ne voit pas la racine, tandis que le formateur ignore ce
même fichier généré et couvre en plus `vite.config.ts`. Confondre les deux ferait échouer à tort une
étape de vérification.

Répartition des 12 violations, à reproduire à l'étape 1.4. Elle est donnée ici par ordre
alphabétique pour la lisibilité ; la commande de l'étape 1.4 trie par nombre décroissant, donc
l'ordre des lignes diffère — seuls les fichiers et leurs comptes doivent correspondre.

```
  1  src/components/ui/button.tsx                 → override components/ui
  1  src/main.tsx                                 → override main.tsx
  4  src/routes/__root.tsx                        → override routes
  1  src/routes/_authenticated.tsx                → override routes
  1  src/routes/_authenticated/dashboard.tsx      → override routes
  1  src/routes/_authenticated/posts.$postId.tsx  → override routes
  1  src/routes/_authenticated/posts.index.tsx    → override routes
  1  src/routes/index.tsx                         → override routes
  1  src/routes/login.tsx                         → override routes
```

## Contraintes globales

- **Versions exactes :** `oxlint@^1.76.0`, `oxfmt@^0.61.0`. oxfmt est en beta (pré-1.0) : c'est
  assumé, et couvert par la validation typage + tests de la tâche 3.
- **Gestionnaire de paquets : Bun.** Toujours `bun add`, `bun remove`, `bun run` — jamais `npm` ni
  `pnpm`, sous peine de générer un lockfile concurrent.
- **`bun run test`, jamais `bun test`.** Le script du dépôt est `vitest run`. `bun test` invoque le
  runner intégré de Bun, qui échoue sur ce projet avec
  `SyntaxError: Export named 'HTTPParser' not found in module 'http'` — une incompatibilité MSW sans
  aucun rapport avec la migration. Confondre les deux ferait conclure à tort à une régression.
- **`plugins` remplace les défauts d'oxlint, il ne s'y ajoute pas.** Vérifié empiriquement : avec
  `"plugins": ["react"]`, les règles `typescript/*` cessent de s'appliquer. La liste doit donc
  énumérer `unicorn`, `oxc` et `typescript` même s'ils sont actifs par défaut sans cette clé.
- **`react/only-export-components` est en catégorie `restriction`**, pas `correctness` : elle n'est
  pas activée par `"categories": { "correctness": "error" }` et doit être déclarée dans `rules`.
- **Aucune option de style dans `.oxfmtrc.json`.** Les défauts d'oxfmt s'appliquent : `semi` true,
  `printWidth` 100, `trailingComma` "all". Seuls `sortTailwindcss` et `ignorePatterns` sont
  déclarés. Ajouter une option de style contredirait la décision du spec.
- **Le reformatage occupe un commit isolé**, sans aucun autre changement, pour rester relisible et
  pouvoir être ignoré par `git blame`.
- **Hors périmètre**, à ne pas ajouter en passant : catégories `suspicious`/`pedantic`, plugin
  `vitest`, lint type-aware (`oxlint-tsgolint`), formatage CSS/JSON/Markdown/YAML, `sortImports`,
  `sortPackageJson`, hook pre-commit, CI.

## Structure des fichiers

| Fichier | Sort | Responsabilité |
|---|---|---|
| `.oxlintrc.jsonc` | créé (tâche 1) | périmètre de lint : plugins, catégories, règle `only-export-components`, 3 overrides commentés, exclusions |
| `.oxfmtrc.json` | créé (tâche 2) | tri Tailwind + exclusions, et rien d'autre |
| 41 fichiers TS/TSX | reformatés (tâche 3) | commit isolé |
| `.git-blame-ignore-revs` | créé (tâche 3) | soustrait le commit de reformatage à `git blame` |
| `eslint.config.js` | supprimé (tâche 4) | remplacé par `.oxlintrc.jsonc` |
| `.prettierrc` | supprimé (tâche 4) | remplacé par `.oxfmtrc.json` |
| `.prettierignore` | supprimé (tâche 4) | absorbé dans `ignorePatterns` de `.oxfmtrc.json` |
| `package.json` | modifié (tâches 1, 2, 4) | dépendances et scripts |
| `README.md:38-39` | modifié (tâche 4) | tableau des scripts |

---

### Tâche 1 : oxlint

**Fichiers :**
- Créer : `.oxlintrc.jsonc`
- Modifier : `package.json` (devDependencies uniquement — les scripts restent sur ESLint)

**Interfaces :**
- Consomme : rien (première tâche)
- Produit : `.oxlintrc.jsonc` opérationnel, `bunx oxlint` rendant 0 diagnostic. La tâche 4 s'appuiera
  dessus pour brancher le script `lint`.

À la fin de cette tâche, ESLint est **toujours installé et toujours branché** sur `bun run lint`.
Les deux linters coexistent le temps de quelques commits, volontairement.

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
  // `plugins` REMPLACE les plugins par défaut d'oxlint, il ne s'y ajoute
  // pas : la liste doit être exhaustive. `unicorn`, `oxc` et `typescript`
  // sont actifs par défaut et doivent donc être répétés ici ; `react` est
  // désactivé par défaut et doit être ajouté.
  "plugins": ["eslint", "typescript", "react", "unicorn", "oxc"],
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
bunx oxlint; echo "exit=$?"
```

Attendu : **aucune sortie, `exit=0`.** oxlint reste silencieux quand il ne trouve rien.

- [ ] **Étape 1.6 : Vérifier le volume réellement analysé**

Une configuration trop restrictive, qui n'analyserait aucun fichier, passerait elle aussi
silencieusement l'étape 1.5. On contrôle donc le volume :

```bash
bunx oxlint --debug=files src | grep -c "^src/"
```

Attendu : `40` — les 41 fichiers TS/TSX de `src/` moins `src/routeTree.gen.ts`, exclu par
`ignorePatterns`. Ne pas confondre avec le `41` attendu côté oxfmt, qui compte un périmètre
différent (voir « Mesures préalables »).

Pour confirmer que l'écart vient bien du seul fichier généré :

```bash
bunx oxlint --debug=files src | grep -c "routeTree.gen.ts"
```

Attendu : `0`.

- [ ] **Étape 1.7 : Vérifier qu'ESLint est toujours fonctionnel**

Le filet doit tenir jusqu'à la tâche 4 :

```bash
bun run lint
```

Attendu : passe sans erreur, comme avant.

- [ ] **Étape 1.8 : Commit**

```bash
git add package.json bun.lock .oxlintrc.jsonc
git commit -m "feat: ajouter oxlint en parallèle d'ESLint

Jeu de plugins complet — eslint, typescript, react, unicorn, oxc — en
catégorie correctness. La clé plugins remplaçant les défauts d'oxlint,
unicorn et oxc doivent y figurer explicitement ; mesuré à 0 diagnostic
sur le code existant.

react/only-export-components est déclarée explicitement car elle est en
catégorie restriction chez oxlint. Les 3 overrides de eslint.config.js
sont transposés ; sans eux la règle remonte 12 violations sur 9 fichiers.

ESLint reste branché sur \`bun run lint\` jusqu'à la tâche 4."
```

---

### Tâche 2 : Configuration d'oxfmt

**Fichiers :**
- Créer : `.oxfmtrc.json`
- Modifier : `package.json` (devDependencies uniquement — les scripts restent sur Prettier)

**Interfaces :**
- Consomme : rien de la tâche 1 (les deux outils sont indépendants)
- Produit : `.oxfmtrc.json` opérationnel. La tâche 3 l'utilisera pour reformater, la tâche 4 pour
  brancher les scripts `format` et `format:check`.

Cette tâche **n'écrit dans aucun fichier source**. Elle installe l'outil, pose sa configuration, et
constate — en lecture seule — l'ampleur du reformatage à venir. L'écriture est le sujet de la
tâche 3.

- [ ] **Étape 2.1 : Installer oxfmt**

```bash
bun add -d oxfmt@^0.61.0
```

- [ ] **Étape 2.2 : Vérifier que le binaire répond**

```bash
bunx oxfmt --version
```

Attendu : `0.61.0` (ou un patch supérieur en 0.61.x).

- [ ] **Étape 2.3 : Écrire la configuration**

Ne **pas** utiliser `oxfmt --migrate=prettier` : ce migrateur transpose le style Prettier, ce que le
spec a précisément décidé d'abandonner au profit des défauts d'oxfmt.

Créer `.oxfmtrc.json` avec exactement ce contenu :

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

Aucune option de style ne doit y figurer. Les défauts d'oxfmt s'appliquent : `semi` true,
`printWidth` 100, `trailingComma` "all", `singleQuote` false, `tabWidth` 2, `endOfLine` lf.

`sortTailwindcss` est la seule entorse aux défauts, et elle est délibérée : le tri des classes
Tailwind est désactivé par défaut chez oxfmt. Sans cette clé, le projet perdrait une capacité que
`prettier-plugin-tailwindcss` assurait — une régression fonctionnelle, pas un retour à un défaut.

- [ ] **Étape 2.4 : Constater l'ampleur du reformatage, en lecture seule**

```bash
bunx oxfmt --list-different "**/*.{ts,tsx}" | grep -c '\.tsx\?$'
```

Attendu : `41`. Les 41 fichiers du périmètre changeront — c'est la conséquence assumée de l'adoption
des défauts d'oxfmt, pas une anomalie.

Ne pas remplacer ce `grep -c` par `wc -l` : oxfmt n'émet **pas** de retour à la ligne après le
dernier fichier, et `wc -l` rendrait `40`. L'écart d'une unité ressemblerait à un fichier manquant
et enverrait sur une fausse piste.

Si le nombre est `0`, la configuration n'est pas prise en compte ou le code a déjà été reformaté.
S'il est inférieur à 41, vérifier que `ignorePatterns` n'exclut pas plus que les trois entrées
prévues.

- [ ] **Étape 2.5 : Prévisualiser le style produit**

Avant d'écrire quoi que ce soit, regarder à quoi ressemble le résultat sur un fichier court :

```bash
bunx oxfmt --stdin-filepath src/lib/utils.ts < src/lib/utils.ts | diff -u src/lib/utils.ts -
```

Attendu : un diff ne contenant que l'ajout de points-virgules, du type

```diff
-import { clsx, type ClassValue } from "clsx"
-import { twMerge } from "tailwind-merge"
+import { clsx, type ClassValue } from "clsx";
+import { twMerge } from "tailwind-merge";
```

Si le diff contient autre chose que des points-virgules, des retours à la ligne ou des virgules
finales — par exemple un identifiant renommé ou une expression réécrite — **arrêter immédiatement**
et remonter le cas : ce serait un bug du formateur, pas un choix de style.

- [ ] **Étape 2.6 : Vérifier qu'aucune source n'a été touchée**

```bash
git status --short
```

Attendu : seuls `package.json`, `bun.lock` et `.oxfmtrc.json` apparaissent. **Aucun fichier sous
`src/` ni `vite.config.ts`** — le reformatage n'a pas encore eu lieu.

- [ ] **Étape 2.7 : Commit**

```bash
git add package.json bun.lock .oxfmtrc.json
git commit -m "feat: ajouter oxfmt avec sa configuration par défaut

Configuration minimale : seuls sortTailwindcss et ignorePatterns sont
déclarés, tout le style vient des défauts d'oxfmt (semi, printWidth 100,
trailingComma all).

sortTailwindcss est la seule entorse volontaire aux défauts : le tri des
classes Tailwind est désactivé d'origine, et le laisser ainsi ferait
perdre une capacité assurée jusqu'ici par prettier-plugin-tailwindcss.

Aucun fichier source n'est reformaté par ce commit."
```

---

### Tâche 3 : Application du reformatage

**Fichiers :**
- Modifier : les 41 fichiers TS/TSX du périmètre `**/*.{ts,tsx}`
- Créer : `.git-blame-ignore-revs`

**Interfaces :**
- Consomme : `.oxfmtrc.json` de la tâche 2
- Produit : un dépôt dont tout le code TS/TSX est au format oxfmt, et un commit isolé référencé dans
  `.git-blame-ignore-revs`

C'est la seule tâche qui touche au code source, et elle ne fait que cela. Prettier reste installé et
`bun run format` reste branché sur lui : c'est la tâche 4 qui les retirera.

- [ ] **Étape 3.1 : Vérifier que l'arbre est propre avant de commencer**

Le commit de reformatage doit être isolé. S'il reste des modifications en cours, elles s'y
mélangeraient :

```bash
git status --porcelain
```

Attendu : **sortie vide.** Sinon, commiter ou remiser avant de continuer.

- [ ] **Étape 3.2 : Appliquer le reformatage**

Le mode écriture est le défaut d'oxfmt, `--write` est implicite :

```bash
bunx oxfmt "**/*.{ts,tsx}"
```

Attendu, en fin de sortie : `Finished in <N>ms on 41 files using <N> threads.`

Les guillemets autour du glob sont obligatoires — sans eux le shell développe le motif avant de le
passer à oxfmt, et la portée devient imprévisible.

- [ ] **Étape 3.3 : Mesurer le diff**

```bash
git diff --shortstat
```

Attendu : `41 files changed, 683 insertions(+), 775 deletions(-)`.

Le nombre de suppressions dépasse celui des insertions parce que `printWidth` 100 recompacte des
expressions que `printWidth` 80 étalait sur plusieurs lignes. Un écart de quelques unités sur les
insertions et suppressions est acceptable si le code a évolué depuis la mesure ; un écart sur le
**nombre de fichiers** ne l'est pas.

- [ ] **Étape 3.4 : Vérifier qu'aucun fichier hors périmètre n'a bougé**

```bash
git diff --name-only | grep -vE '\.tsx?$' || echo "périmètre respecté"
```

Attendu : `périmètre respecté`.

```bash
git diff --name-only | grep -c "routeTree.gen.ts"
```

Attendu : `0` — le fichier généré est exclu par `ignorePatterns`.

- [ ] **Étape 3.5 : Valider la sûreté du reformatage par le typage**

C'est le contrôle central de cette migration : un formateur qui altérerait la sémantique du code
ferait échouer le compilateur.

```bash
bun run typecheck; echo "exit=$?"
```

Attendu : aucune erreur, `exit=0`.

- [ ] **Étape 3.6 : Valider la sûreté du reformatage par les tests**

**Utiliser `bun run test`, surtout pas `bun test`.** Le premier exécute `vitest run`, le script du
dépôt. Le second lance le runner intégré de Bun, qui échoue sur ce projet avec
`SyntaxError: Export named 'HTTPParser' not found in module 'http'` — une incompatibilité entre MSW
et le runner de Bun, sans aucun rapport avec le reformatage. S'y tromper ferait conclure à une
régression inexistante.

```bash
bun run test
```

Attendu :

```
 Test Files  10 passed (10)
      Tests  37 passed (37)
```

- [ ] **Étape 3.7 : Vérifier que le lint reste propre après reformatage**

```bash
bunx oxlint; echo "exit=$?"
```

Attendu : aucune sortie, `exit=0`.

- [ ] **Étape 3.8 : Commit du reformatage, seul**

Ce commit ne doit contenir que le reformatage — aucun changement de configuration, de dépendance ou
de documentation :

```bash
git add -A
git status --short
```

Vérifier que la liste ne contient que des fichiers `.ts` et `.tsx`, puis :

```bash
git commit -m "style: reformater le code TS/TSX avec les défauts d'oxfmt

Application des défauts d'oxfmt : points-virgules, printWidth 100,
trailingComma all. 41 fichiers, aucun changement de sémantique.

Validé par tsc --noEmit silencieux et 37 tests au vert sur 10 fichiers.

Commit isolé et référencé dans .git-blame-ignore-revs pour ne pas
polluer l'historique de blâme."
```

- [ ] **Étape 3.9 : Soustraire ce commit à `git blame`**

Un reformatage de 41 fichiers réattribue chaque ligne touchée à ce commit dans `git blame`, ce qui
efface l'information utile. Git sait ignorer des révisions précises.

Récupérer le SHA du commit qui vient d'être créé et l'inscrire dans un fichier dédié :

```bash
REFORMAT_SHA=$(git rev-parse HEAD)
cat > .git-blame-ignore-revs <<EOF
# Révisions à ignorer dans \`git blame\` : reformatages de masse, sans
# changement de sémantique.
#
# Activer localement une fois :
#   git config blame.ignoreRevsFile .git-blame-ignore-revs

# style: reformater le code TS/TSX avec les défauts d'oxfmt
$REFORMAT_SHA
EOF
cat .git-blame-ignore-revs
```

Attendu : un fichier contenant les commentaires et une ligne de 40 caractères hexadécimaux.

- [ ] **Étape 3.10 : Activer le fichier localement et vérifier son effet**

D'abord constater le problème, sans le fichier d'exclusion. `--line-porcelain` est nécessaire :
`git blame` seul n'affiche que des SHA abrégés, qu'un `grep` sur le SHA complet ne trouverait pas.

```bash
REFORMAT_SHA=$(git log -1 --format=%H --grep="reformater le code TS/TSX")
git blame --line-porcelain -- src/lib/utils.ts | grep -c "^$REFORMAT_SHA"
```

Attendu : un nombre **supérieur à 0** — le commit de reformatage s'est bien approprié des lignes.

Puis activer l'exclusion et refaire la même mesure :

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
git blame --line-porcelain -- src/lib/utils.ts | grep -c "^$REFORMAT_SHA"
```

Attendu : **`0`** — plus aucune ligne n'est attribuée au reformatage, chacune revient au commit qui
l'a réellement écrite.

Si le second compte n'est pas nul, vérifier que `.git-blame-ignore-revs` contient bien le SHA
complet sur 40 caractères et que `git config blame.ignoreRevsFile` a été enregistré
(`git config --get blame.ignoreRevsFile`).

Cette configuration est locale au clone : chaque personne qui clone le dépôt doit la rejouer. Le
fichier porte la commande en commentaire, c'est suffisant — le README n'a pas à la documenter.

- [ ] **Étape 3.11 : Commit du fichier de blâme**

```bash
git add .git-blame-ignore-revs
git commit -m "chore: ignorer le commit de reformatage dans git blame"
```

---

### Tâche 4 : Coupure d'ESLint et Prettier

**Fichiers :**
- Supprimer : `eslint.config.js`, `.prettierrc`, `.prettierignore`
- Modifier : `package.json` (devDependencies + scripts), `README.md:38-39`

**Interfaces :**
- Consomme : `.oxlintrc.jsonc` (tâche 1), `.oxfmtrc.json` (tâche 2), le code reformaté (tâche 3)
- Produit : l'état final du dépôt

Ne commencer cette tâche que si les tâches 1 à 3 sont passées sans écart. C'est ici, et seulement
ici, que le filet est retiré.

- [ ] **Étape 4.1 : Basculer les scripts**

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

- [ ] **Étape 4.2 : Désinstaller les 8 paquets**

```bash
bun remove @eslint/js eslint eslint-plugin-react-hooks eslint-plugin-react-refresh \
  globals typescript-eslint prettier prettier-plugin-tailwindcss
```

**`prettier` restera présent dans `node_modules` après cette commande — c'est normal, pas un
échec.** `@tanstack/router-generator` le déclare en dépendance d'exécution (`prettier: ^3.5.0`) et
l'importe dans son `dist` pour formater `routeTree.gen.ts`. Il reste donc installé en transitif, et
`bun.lock` continuera de le mentionner.

Ce qui compte est qu'il ne soit plus une dépendance **directe** du projet, ce que vérifie
l'étape 4.7. Le corollaire à ne pas manquer : `bun run routes:generate` dépend de ce prettier
transitif, d'où sa vérification explicite à l'étape 4.6.

- [ ] **Étape 4.3 : Supprimer les fichiers de configuration morts**

```bash
git rm eslint.config.js .prettierrc .prettierignore
```

- [ ] **Étape 4.4 : Mettre à jour le README**

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

- [ ] **Étape 4.5 : Vérifier lint et formatage via les nouveaux scripts**

```bash
bun run lint; echo "lint exit=$?"
bun run format:check
```

Attendu : `lint exit=0` sans sortie, puis « All matched files use the correct format. » sur
**41 fichiers**. Ce 41 est le périmètre du formateur, à ne pas confondre avec le 40 du linter.

- [ ] **Étape 4.6 : Vérifier la non-régression**

```bash
bun run typecheck && bun run test
```

Attendu : typecheck silencieux, puis `Test Files 10 passed (10)` et `Tests 37 passed (37)`.
Rappel : `bun run test`, jamais `bun test`.

Puis la génération de routes, seul script du dépôt qui dépende réellement de Prettier — via la
dépendance transitive décrite à l'étape 4.2. C'est la régression que la désinstallation pourrait
provoquer, et rien d'autre ne la détecterait :

```bash
bun run routes:generate
git status --short
```

Attendu : la commande passe sans erreur, et `src/routeTree.gen.ts` n'apparaît **pas** comme modifié
— la génération est idempotente sur un arbre à jour.

Si la commande échoue avec une erreur de résolution de module `prettier`, c'est que
`@tanstack/router-generator` ne l'a pas conservé en transitif. Le correctif est alors de réinstaller
prettier en dépendance de développement explicite (`bun add -d prettier`), en le documentant comme
dépendance de la génération de routes et non de la chaîne de formatage — et en laissant `.prettierrc`
supprimé, puisque plus aucun script du dépôt ne l'utilise.

- [ ] **Étape 4.7 : Vérifier l'absence de résidus**

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

| Occurrence | Pourquoi elle reste |
|---|---|
| `.oxlintrc.jsonc` → `"plugins": ["eslint", ...]` | `eslint` est le nom du plugin de règles de base **d'oxlint**, pas une référence à ESLint. Le commentaire du fichier cite aussi `eslint.config.js` pour expliquer la filiation. |
| `public/mockServiceWorker.js` → `/* eslint-disable */` | Fichier généré par MSW, déjà exclu du lint et du formatage. Il est régénéré par MSW, pas édité à la main : ne pas y toucher. |

`docs/` est exclu du balayage : le spec et ce plan mentionnent légitimement les outils remplacés.
`bun.lock` l'est aussi, car il conserve `prettier` en transitif comme expliqué à l'étape 4.2.

- [ ] **Étape 4.8 : Vérifier que le diff ne touche aucune source**

```bash
git status --short
git diff --stat
```

Attendu : les seuls fichiers modifiés ou supprimés sont `package.json`, `bun.lock`, `README.md`,
`eslint.config.js`, `.prettierrc`, `.prettierignore`. **Aucun fichier sous `src/`** — le
reformatage appartient au commit de la tâche 3, pas à celui-ci.

- [ ] **Étape 4.9 : Commit**

```bash
git add -A
git commit -m "feat!: remplacer ESLint et Prettier par oxlint et oxfmt

Suppression des 8 paquets de l'ancienne chaîne et de leurs trois fichiers
de configuration. Les scripts basculent sur oxlint et oxfmt, et gagnent
lint:fix et format:check.

prettier subsiste en dépendance transitive de @tanstack/router-generator,
qui l'utilise pour formater routeTree.gen.ts : routes:generate est
vérifié au vert.

Lint à 0 diagnostic sur 40 fichiers, formatage conforme sur 41,
typecheck et 37 tests au vert."
```

---

## Vérification finale

Après la tâche 4, sur un clone frais :

```bash
bun install
bun run lint && bun run format:check && bun run typecheck && bun run test && bun run routes:generate
git status --short
```

Les cinq commandes doivent passer et `git status` rester vide. C'est le critère de réussite énoncé
au spec.

## En cas de repli

Si l'étape 2.5 ou 3.5/3.6 révèle qu'oxfmt altère la sémantique du code — diff contenant autre chose
que du formatage, typage cassé, tests en échec — la migration du formateur est suspendue :

1. Annuler le reformatage : `git checkout -- .` avant commit, ou `git revert` du commit de la
   tâche 3 s'il est déjà passé.
2. Conserver Prettier : ne pas exécuter la tâche 4 telle quelle. Ne pas supprimer `prettier`,
   `prettier-plugin-tailwindcss`, `.prettierrc`, `.prettierignore`, ni le script `format`.
3. N'appliquer de la tâche 4 que la partie linter : scripts `lint`/`lint:fix`, suppression des 6
   paquets ESLint, suppression d'`eslint.config.js`, mise à jour du README pour le seul lint.
4. Supprimer `.oxfmtrc.json` et désinstaller `oxfmt`.
5. Remonter le cas en amont (issue oxc) avec le fichier et le diff fautifs, et réévaluer à la sortie
   d'oxfmt 1.0.
