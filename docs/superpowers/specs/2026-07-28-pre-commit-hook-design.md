# Hook pre-commit avec lefthook — Design

Date : 2026-07-28
Statut : validé, prêt pour le plan d'implémentation

## Objectif

Empêcher qu'un commit introduise du code non conforme au lint ou au formatage, en lançant
`bun run lint` et `bun run format:check` avant chaque commit.

Le dépôt étant un **template** destiné à être cloné, la contrainte structurante n'est pas le hook
lui-même mais son installation : elle doit être automatique au clone. Un hook qui demande une étape
manuelle sera sauté par la majorité des personnes qui démarrent un projet à partir de ce template,
et ne protégera donc personne.

Critère de réussite : sur un clone frais, `bun install` suffit à activer le hook, et un commit
introduisant une violation de lint ou de formatage est refusé.

## Existant

Le dépôt n'a aujourd'hui **aucune infrastructure de hooks** : pas de fichier dans `.git/hooks`
(hors `.sample`), pas de `core.hooksPath`, pas de script `prepare` ni `postinstall`, ni husky ni
lefthook installés.

La chaîne de qualité vient d'être migrée vers oxlint et oxfmt
(`docs/superpowers/specs/2026-07-28-oxlint-oxfmt-design.md`). Les deux scripts que le hook doit
appeler existent déjà :

| Script | Commande | Portée |
|---|---|---|
| `lint` | `oxlint` | 40 fichiers |
| `format:check` | `oxfmt --check "**/*.{ts,tsx}"` | 41 fichiers |

Le spec de cette migration listait explicitement le hook de pré-commit comme hors périmètre. Le
présent document lève cette exclusion.

## Décisions

**lefthook comme gestionnaire de hooks.** Choix explicite de l'utilisateur, retenu tel quel. Les
alternatives envisagées — `core.hooksPath` avec un script versionné, ou husky — offraient le même
résultat fonctionnel ; lefthook apporte en plus l'exécution parallèle des jobs et un récapitulatif
lisible par job.

**Vérification du dépôt entier, pas des fichiers indexés.** C'est un écart volontaire à l'idiome
lefthook (`{staged_files}` associé à un `glob`). Deux raisons. D'abord la mesure : les deux
vérifications prennent **0,7 s** au total sur les 41 fichiers, donc restreindre au périmètre indexé
n'achèterait aucun gain perceptible. Ensuite et surtout, les scripts `lint` et `format:check`
restent la source unique de vérité sur le périmètre — ce qu'une personne lance à la main et ce que
le hook lance sont alors strictement identiques. Passer par `{staged_files}` créerait deux
définitions de périmètre à maintenir synchronisées, pour un bénéfice nul.

**Vérification sans correction.** Le hook appelle `format:check`, qui contrôle sans écrire. Il
refuse le commit plutôt que de réécrire les fichiers de la personne pendant qu'elle commite.
`stage_fixed` de lefthook n'est pas utilisé.

**Installation via le script `prepare`.** Vérifié empiriquement : `bun install` exécute le script
`prepare` du paquet racine. Un clone frais suivi de `bun install` installe donc le hook sans
intervention.

## Robustesse hors dépôt git

Point vérifié qui conditionne la forme exacte du script `prepare`.

Lancé hors d'un dépôt git — build Docker, CI qui copie les sources sans le `.git` — `lefthook
install` échoue avec `fatal: not a git repository` et un code de sortie 128. Bun propage cet échec :
`error: prepare script exited with 1`, et **l'installation des dépendances entière échoue**. Le
template deviendrait inconstruisible en conteneur.

La variable d'environnement `LEFTHOOK=0` ne protège pas de ce cas : testée, elle laisse la commande
échouer de la même façon.

Le script `prepare` s'écrit donc `lefthook install || true`. Vérifié : l'installation se termine
normalement hors dépôt git, `node_modules` est correctement peuplé, et seule une ligne
`exit status 128` reste affichée — bruit sans conséquence.

## Dépendances

| Paquet | Version | Rôle |
|---|---|---|
| `lefthook` | ^2.1.10 | gestionnaire de hooks git |

Le paquet npm télécharge un binaire natif à l'installation : compter une vingtaine de secondes au
premier `bun add`, contre une seconde aux installations suivantes.

## Fichiers

Créé : `lefthook.yml`.
Modifiés : `package.json` (dépendance + script `prepare`), `README.md`.

## Configuration

`lefthook.yml` à la racine :

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: lint
      run: bun run lint
    - name: format
      run: bun run format:check
```

`parallel: true` fait tourner les deux jobs simultanément. Les deux étant indépendants et sans effet
de bord — aucun n'écrit de fichier — leur parallélisation est sans risque.

Dans `package.json`, ajout du script :

```json
"prepare": "lefthook install || true"
```

## Comportement attendu

| Situation | Résultat |
|---|---|
| Commit avec lint et formatage conformes | passe, ~0,7 s ajoutées |
| Commit avec une violation de lint | refusé, job `lint` en échec |
| Commit avec un fichier mal formaté | refusé, job `format` en échec |
| `git commit --no-verify` | contourne le hook, comportement git standard |
| Fusion sans conflit (`git merge`) | non vérifiée : git déclenche `pre-merge-commit`, pas `pre-commit`, et ce hook n'est pas configuré |
| Fusion avec conflits, résolue puis `git commit` | vérifiée : c'est un `git commit` ordinaire, le hook s'applique |

Le comportement des fusions a été vérifié sur un dépôt jetable : sur des branches divergentes,
`git merge` appelle bien `pre-merge-commit` et laisse `pre-commit` de côté. Ce n'est pas une lacune
à combler — une fusion ne produit pas de code nouveau, elle combine du code déjà passé par le hook
sur chacune des branches.

## Documentation

`README.md` : ajouter une note indiquant que le hook s'installe seul à `bun install`, ce qu'il
vérifie, et que `--no-verify` permet de le contourner ponctuellement. La placer près du tableau des
scripts, qui est l'endroit où la personne cherche déjà comment lint et format se lancent.

## Vérification

1. **Installation automatique.** Sur un clone frais du dépôt, `bun install` crée
   `.git/hooks/pre-commit`. C'est le critère central : sans cela le hook ne protège que son auteur.
2. **Blocage effectif.** Un commit contenant une violation de formatage est refusé, et le
   récapitulatif de lefthook nomme le job fautif.
3. **Passage nominal.** Un commit sur un arbre conforme passe sans obstacle.
4. **Non-régression de l'installation.** `bun install` reste fonctionnel hors dépôt git.
5. **Contournement.** `git commit --no-verify` passe outre.

## Hors périmètre

- `typecheck` et les tests dans le hook : chacun prend environ 3 s, contre 0,7 s pour les deux
  vérifications retenues. Les inclure changerait la nature du hook, d'un garde-fou imperceptible à
  une attente à chaque commit. Arbitrage distinct.
- Hook `pre-push`, plus adapté aux vérifications longues, si le besoin apparaît.
- Correction automatique et réindexation (`lefthook stage_fixed`, `oxlint --fix`).
- Intégration CI — le dépôt n'en a aucune aujourd'hui.
- Vérification du message de commit (`commit-msg`, conventions de nommage).
