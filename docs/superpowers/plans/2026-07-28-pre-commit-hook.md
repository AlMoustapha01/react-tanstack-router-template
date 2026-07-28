# Hook pre-commit avec lefthook — Plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> utilisent la syntaxe case à cocher (`- [ ]`).

**Objectif :** refuser tout commit dont le code n'est pas conforme au lint ou au formatage, en
lançant `bun run lint` et `bun run format:check` via lefthook avant chaque commit.

**Approche :** deux tâches. La tâche 1 installe lefthook, le configure, et prouve qu'il bloque un
commit fautif tout en laissant passer un commit conforme. La tâche 2 valide ce qui justifie toute
cette conception — l'installation automatique sur un clone frais — ce qui **exige** que la tâche 1
soit commitée puisqu'on clone le dépôt pour la tester ; elle ajoute ensuite la documentation.

**Stack :** Bun 1.2, lefthook 2.1, oxlint, oxfmt.

**Spec de référence :** `docs/superpowers/specs/2026-07-28-pre-commit-hook-design.md`

## Mesures préalables

Relevées sur des dépôts jetables avec les binaires réels, avant rédaction. Elles servent de valeurs
attendues — un écart signale une régression, pas une approximation.

| Mesure | Valeur relevée |
|---|---|
| `bun run lint` + `bun run format:check` enchaînés | **0,7 s** sur les 41 fichiers |
| Premier `bun add -d lefthook` | **~20 s** (téléchargement d'un binaire natif) |
| `bun install` exécute le script `prepare` du paquet racine | **oui**, vérifié |
| Clone frais + `bun install` | crée `.git/hooks/pre-commit` sans intervention |
| `lefthook install` hors dépôt git | échoue en **exit 128**, et fait échouer `bun install` entier |
| `LEFTHOOK=0` protège de ce cas | **non**, l'échec est identique |
| `lefthook install \|\| true` hors dépôt git | `bun install` se termine normalement |
| `git merge` sur branches divergentes | déclenche `pre-merge-commit`, **pas** `pre-commit` |

## Contraintes globales

- **Version :** `lefthook@^2.1.10`.
- **Gestionnaire de paquets : Bun.** Toujours `bun add`, `bun run` — jamais `npm` ni `pnpm`.
- **Le script `prepare` s'écrit `lefthook install || true`.** Le `|| true` n'est pas décoratif : sans
  lui, un `bun install` hors dépôt git (build Docker, CI qui copie les sources sans le `.git`)
  échoue entièrement et rend le template inconstruisible en conteneur.
- **Vérification du dépôt entier, pas des fichiers indexés.** Ne pas introduire `{staged_files}` ni
  `glob` : les scripts `lint` et `format:check` doivent rester la source unique de vérité sur le
  périmètre.
- **Vérification sans correction.** Le hook appelle `format:check`, qui ne réécrit rien. Ne pas
  utiliser `stage_fixed` ni `oxlint --fix`.
- **`bun run test`, jamais `bun test`.** Le script du dépôt est `vitest run` ; `bun test` invoque le
  runner de Bun, qui échoue sur ce projet pour des raisons sans rapport (incompatibilité MSW).
- **Hors périmètre**, à ne pas ajouter en passant : `typecheck` et tests dans le hook, hook
  `pre-push`, correction automatique, hook `commit-msg`, intégration CI.

## Structure des fichiers

| Fichier | Sort | Responsabilité |
|---|---|---|
| `lefthook.yml` | créé (tâche 1) | définition du hook : jobs, parallélisme |
| `package.json` | modifié (tâche 1) | dépendance `lefthook` + script `prepare` |
| `README.md` | modifié (tâche 2) | documenter l'installation automatique et le contournement |

---

### Tâche 1 : Installer et configurer lefthook

**Fichiers :**
- Créer : `lefthook.yml`
- Modifier : `package.json` (devDependencies + scripts)

**Interfaces :**
- Consomme : les scripts `lint` et `format:check` existants de `package.json`
- Produit : un hook `pre-commit` opérationnel dans ce clone, et un dépôt dont le `prepare` installe
  ce hook. La tâche 2 clonera le résultat commité pour valider l'installation automatique.

- [ ] **Étape 1.1 : Vérifier l'état de départ**

Le dépôt ne doit avoir aucune infrastructure de hooks préexistante qui entrerait en conflit :

```bash
ls .git/hooks | grep -v sample || echo "aucun hook"
git config --get core.hooksPath || echo "core.hooksPath non défini"
```

Attendu : `aucun hook` et `core.hooksPath non défini`.

Si `core.hooksPath` est défini, lefthook ne prendra pas la main : le désactiver
(`git config --unset core.hooksPath`) avant de continuer.

- [ ] **Étape 1.2 : Installer lefthook**

```bash
bun add -d lefthook@^2.1.10
```

Compter **une vingtaine de secondes** : le paquet npm télécharge un binaire natif. Les installations
suivantes prennent moins d'une seconde.

- [ ] **Étape 1.3 : Vérifier que le binaire répond**

```bash
./node_modules/.bin/lefthook version
```

Attendu : `2.1.10` (ou un patch supérieur en 2.1.x).

Utiliser le chemin direct plutôt que `bunx lefthook` : `bunx` peut passer par une résolution réseau
lente au premier appel. Le chemin direct est immédiat et sans ambiguïté.

- [ ] **Étape 1.4 : Écrire la configuration**

Créer `lefthook.yml` à la racine avec exactement ce contenu :

```yaml
# Hook de pré-commit : refuse un commit dont le code n'est pas conforme.
# Installé automatiquement par le script `prepare` de package.json, donc
# actif dès `bun install` sur un clone frais.
#
# Contournement ponctuel : git commit --no-verify
pre-commit:
  parallel: true
  jobs:
    - name: lint
      run: bun run lint
    - name: format
      run: bun run format:check
```

Les deux jobs vérifient le dépôt entier et n'écrivent aucun fichier : les paralléliser est sans
risque. Ne pas ajouter de clé `glob` ni `{staged_files}` — voir les contraintes globales.

- [ ] **Étape 1.5 : Ajouter le script `prepare`**

Dans `package.json`, ajouter à l'objet `scripts` :

```json
    "prepare": "lefthook install || true",
```

Le placer après `"preview"`, en fin d'objet, pour ne pas disperser les scripts de développement.

Ne pas omettre `|| true` : hors dépôt git, `lefthook install` sort en 128 et fait échouer
`bun install` entier.

- [ ] **Étape 1.6 : Installer le hook dans ce clone**

```bash
./node_modules/.bin/lefthook install
```

Attendu : `sync hooks: ✔️(pre-commit)`.

```bash
ls .git/hooks | grep -v sample
```

Attendu : `pre-commit` figure dans la liste.

- [ ] **Étape 1.7 : Prouver que le hook bloque (le « test qui échoue »)**

Un hook qui ne bloque rien est un hook inutile. On introduit volontairement un défaut de formatage,
on tente de commiter, et on vérifie le refus.

```bash
cp src/lib/utils.ts /tmp/utils.bak
printf '\n\nconst   MAL_FORMATE   =    {a:1,b:2}\nexport { MAL_FORMATE }\n' >> src/lib/utils.ts
git add src/lib/utils.ts
git commit -m "test: ce commit doit être refusé"
```

Attendu : le commit est **refusé**. La sortie de lefthook nomme le job fautif, avec un récapitulatif
de la forme :

```
summary: (done in 0.xx seconds)
✔️ lint
🥊 format
```

et, dans le détail du job `format` :

```
Format issues found in above 1 files. Run without `--check` to fix.
```

Vérifier qu'aucun commit n'a été créé :

```bash
git log --oneline -1
```

Attendu : le dernier commit est celui d'avant cette étape, **pas** `test: ce commit doit être
refusé`.

Si le commit passe, le hook n'est pas actif : reprendre l'étape 1.6.

- [ ] **Étape 1.8 : Restaurer le fichier**

```bash
git restore --staged src/lib/utils.ts
cp /tmp/utils.bak src/lib/utils.ts
rm -f /tmp/utils.bak
git status --short src/lib/utils.ts
```

Attendu : sortie vide — le fichier est revenu à son état d'origine.

- [ ] **Étape 1.9 : Prouver que le hook laisse passer un commit conforme**

Le pendant du test précédent : le hook ne doit pas devenir un obstacle permanent.

```bash
git add package.json bun.lock lefthook.yml
git commit -m "feat: ajouter un hook pre-commit lefthook

lint et format:check sont lancés en parallèle avant chaque commit, sur
tout le dépôt plutôt que sur les fichiers indexés : 0,7 s mesurées, et
les scripts npm restent la source unique de vérité sur le périmètre.

Le script prepare s'écrit \`lefthook install || true\` : hors dépôt git
(Docker, CI), lefthook install sort en 128 et ferait échouer bun install
entier. LEFTHOOK=0 ne protège pas de ce cas."
```

Attendu : le commit **passe**, précédé du récapitulatif de lefthook avec les deux jobs au vert :

```
✔️ lint
✔️ format
```

C'est à la fois la vérification et le commit de la tâche : le hook s'est appliqué à son propre
commit d'introduction.

---

### Tâche 2 : Valider l'installation automatique et documenter

**Fichiers :**
- Modifier : `README.md`

**Interfaces :**
- Consomme : le commit de la tâche 1 — cette tâche clone le dépôt, donc la configuration doit y être
  committée
- Produit : l'état final

C'est ici que se joue la raison d'être de la conception. Un hook qui ne s'installe que chez son
auteur ne protège personne dans un dépôt template. Cette tâche le vérifie sur un vrai clone.

- [ ] **Étape 2.1 : Cloner le dépôt dans un répertoire jetable**

Les étapes 2.1 à 2.6 utilisent des **chemins fixes** plutôt que des variables shell : chaque étape
peut être lancée dans un shell distinct, ce qui est le cas lors d'une exécution pas à pas. Une
variable `$CLONE` définie à l'étape 2.1 serait vide à l'étape 2.4.

```bash
rm -rf /tmp/hook-clone
git clone -q "$(git rev-parse --show-toplevel)" /tmp/hook-clone
ls /tmp/hook-clone/.git/hooks | grep -v sample || echo "aucun hook — attendu à ce stade"
```

Attendu : `aucun hook — attendu à ce stade`. Un clone ne transporte pas les hooks : c'est
précisément le problème que le script `prepare` résout.

- [ ] **Étape 2.2 : Installer les dépendances dans le clone**

```bash
(cd /tmp/hook-clone && bun install 2>&1 | tail -5)
```

Attendu : la sortie contient `lefthook install` puis `sync hooks: ✔️(pre-commit)`.

- [ ] **Étape 2.3 : Vérifier que le hook s'est installé tout seul**

```bash
ls /tmp/hook-clone/.git/hooks | grep -v sample
```

Attendu : `pre-commit`.

C'est le critère central du spec. Si le hook est absent, vérifier que `prepare` figure bien dans les
scripts du `package.json` commité (`git show HEAD:package.json | grep prepare`).

- [ ] **Étape 2.4 : Vérifier que le hook du clone bloque réellement**

L'installation ne suffit pas : le hook doit fonctionner dans le clone, pas seulement exister.

```bash
cd /tmp/hook-clone && \
printf '\n\nconst   X   =    {a:1}\nexport { X }\n' >> src/lib/utils.ts && \
git add src/lib/utils.ts && \
git -c user.email=t@t -c user.name=t commit -m "doit échouer"; \
echo "--- dernier commit ---"; git log --oneline -1
```

Attendu : le commit est refusé, et `git log --oneline -1` montre le dernier commit du dépôt d'origine
— pas `doit échouer`.

- [ ] **Étape 2.5 : Vérifier que `--no-verify` contourne le hook**

Le spec fait du contournement un comportement attendu, documenté au README : il doit donc être
vérifié, pas supposé. On réutilise le fichier volontairement cassé de l'étape 2.4.

```bash
cd /tmp/hook-clone && \
git -c user.email=t@t -c user.name=t commit --no-verify -m "contournement"; \
echo "--- dernier commit ---"; git log --oneline -1
```

Attendu : le commit **passe** malgré le fichier mal formaté, et `git log --oneline -1` affiche
`contournement`. Aucune sortie de lefthook n'apparaît — le hook n'a pas été exécuté du tout.

- [ ] **Étape 2.6 : Vérifier que `bun install` survit hors dépôt git**

C'est le cas que le `|| true` protège. On reproduit un build de type Docker : les sources sans le
`.git`.

```bash
rm -rf /tmp/hook-nogit && mkdir -p /tmp/hook-nogit
cp /tmp/hook-clone/package.json /tmp/hook-clone/bun.lock \
   /tmp/hook-clone/lefthook.yml /tmp/hook-nogit/
(cd /tmp/hook-nogit && bun install 2>&1 | tail -4; echo "bun exit=$?")
ls /tmp/hook-nogit/node_modules/.bin | head -3
```

Attendu : `bun exit=0`, et `node_modules/.bin` peuplé. Une ligne `exit status 128` peut apparaître
dans la sortie — c'est le message de lefthook absorbé par `|| true`, sans conséquence.

Si `bun install` échoue, le `|| true` manque dans le script `prepare` : le corriger et recommencer.

- [ ] **Étape 2.7 : Nettoyer les répertoires jetables**

```bash
rm -rf /tmp/hook-clone /tmp/hook-nogit
```

Vérifier au passage qu'on est bien revenu dans le dépôt de travail, les étapes précédentes ayant
utilisé `cd` :

```bash
git rev-parse --show-toplevel
```

Attendu : le chemin du dépôt du template, pas `/tmp/...`.

- [ ] **Étape 2.8 : Documenter dans le README**

Le tableau des scripts se trouve autour des lignes 31 à 42 de `README.md`, suivi d'une note sur
`bun run test`. Ajouter après cette note :

```markdown
> Un hook de pré-commit lance `bun run lint` et `bun run format:check`
> avant chaque commit (~1 s). Il s'installe seul au premier `bun install`,
> via lefthook. Pour passer outre ponctuellement : `git commit --no-verify`.
```

Reprendre la forme des notes existantes du fichier (blockquote `>`), pour rester homogène.

- [ ] **Étape 2.9 : Vérifier que le dépôt reste sain**

```bash
bun run lint && echo "✓ lint"
bun run format:check >/dev/null 2>&1 && echo "✓ format:check"
bun run typecheck && echo "✓ typecheck"
bun run test 2>&1 | tail -4
```

Attendu : les trois `✓`, puis `Test Files 10 passed (10)` et `Tests 37 passed (37)`.

Le README étant en Markdown, il sort du glob `**/*.{ts,tsx}` : `format:check` ne le voit pas. Cette
étape vérifie surtout qu'aucune manipulation des tâches précédentes n'a laissé de trace dans les
sources.

- [ ] **Étape 2.10 : Commit**

```bash
git add README.md
git commit -m "docs: documenter le hook pre-commit

Installation automatique au premier bun install, périmètre vérifié et
contournement par --no-verify."
```

Attendu : le hook s'exécute et passe au vert avant que le commit n'aboutisse.

---

## Vérification finale

Sur un clone frais du dépôt :

```bash
bun install
ls .git/hooks | grep pre-commit
bun run lint && bun run format:check && bun run typecheck && bun run test
```

Le hook doit être présent après le seul `bun install`, et les quatre commandes passer. C'est le
critère de réussite énoncé au spec.

## En cas de repli

Si lefthook s'avère problématique — binaire natif indisponible sur une plateforme, installation
instable en CI — la conception a une alternative sans dépendance, écartée au profit du choix
explicite de lefthook :

1. Retirer lefthook : `bun remove lefthook`, supprimer `lefthook.yml`.
2. Créer `.githooks/pre-commit` (mode `755`, versionné) contenant `#!/bin/sh`, `bun run lint`,
   `bun run format:check`.
3. Remplacer le script `prepare` par `git config core.hooksPath .githooks || true`.
4. Le bit exécutable est conservé par git (mode `100755` dans l'index), donc le hook survit au
   clone — mécanisme vérifié lors de la conception.
