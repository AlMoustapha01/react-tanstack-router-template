# React + Vite + TanStack Router template

Template de démarrage pour une SPA React : routage typé, cache de données,
formulaires validés, mock d'API et tests, déjà câblés ensemble.

## Stack

- React 19 + Vite 8 + TypeScript 6
- TanStack Router (file-based routing, contexte typé)
- TanStack Query (état serveur, invalidation)
- TanStack Form + Zod (formulaires, search params, variables d'environnement)
- MSW (faux backend partagé entre le dev et les tests)
- Vitest + Testing Library
- Tailwind v4 + shadcn/ui (Base UI)

## Démarrage

```bash
bun install
bun dev
```

L'application démarre sur http://localhost:5173. En développement, MSW intercepte
les appels à `/api` — aucun backend n'est nécessaire.

Connexion de démonstration : n'importe quelle adresse email, mot de passe
`password`.

## Scripts

| Commande | Effet |
|---|---|
| `bun dev` | Serveur de développement (régénère l'arbre de routes en watch) |
| `bun run build` | Vérification de types puis build de production |
| `bun run test` | Suite de tests |
| `bun run test:watch` | Tests en watch |
| `bun run typecheck` | Vérification de types seule |
| `bun run lint` | oxlint |
| `bun run lint:fix` | oxlint, corrections automatiques |
| `bun run format` | oxfmt |
| `bun run format:check` | oxfmt, vérification sans écriture |
| `bun run routes:generate` | Régénère `src/routeTree.gen.ts` à la demande |

> Lancez les tests avec `bun run test`, pas `bun test`. Cette seconde forme
> invoque le lanceur de tests intégré à Bun, qui ignore `vite.config.ts` : ni
> environnement jsdom, ni `setupFiles` — donc pas de serveur MSW. Pour un seul
> fichier : `bunx vitest run <chemin>`.

> Un hook de pré-commit lance `bun run lint` et `bun run format:check` avant
> chaque commit (moins d'une seconde). Il s'installe seul au premier
> `bun install`, via lefthook — rien à faire après un clone. Pour passer
> outre ponctuellement : `git commit --no-verify`.

## Organisation

```
src/
  routes/      arbre de routes file-based — fichiers fins
  features/    un dossier par domaine (api, components, schemas)
  components/  UI partagée (shadcn dans ui/)
  lib/         env, queryClient, contexte du router, utils
  mocks/       handlers MSW (dev + test)
  test/        setup et helpers de test
```

Les fichiers de `routes/` déclarent `loader`, `beforeLoad` et `validateSearch`,
puis composent des éléments venant de `features/`. La logique métier vit dans
`features/`.

## Les patterns démontrés

**Chargement de données loader-first.** Chaque feature expose des *query options
factories* utilisées à deux endroits : `ensureQueryData` dans le loader de la
route, `useSuspenseQuery` dans le composant. Une seule clé de cache, et avec
`defaultPreload: "intent"` les données arrivent avant le clic. Sur la liste,
`loaderDeps` fait rejouer le loader quand les search params changent.

**Routes protégées.** `src/routes/_authenticated.tsx` est une route de layout
pathless dont le `beforeLoad` lit `context.auth` et redirige vers `/login` en
conservant l'URL demandée. Après connexion, `router.invalidate()` rejoue les
gardes. La déconnexion navigue explicitement vers `/` : invalider le router ne
suffirait pas, car `beforeLoad` s'exécute de façon synchrone et lirait un
contexte d'authentification que React n'a pas encore rafraîchi.

**Validation par Zod partout.** Réponses d'API, search params (`/posts?page=2`),
formulaires et variables d'environnement passent par un schéma. Le `redirect` de
la page de connexion est contraint aux chemins internes : sans cela, une URL
absolue transformerait la redirection post-connexion en open redirect.

**Recherche par validation explicite.** Le champ de recherche écrit dans l'URL à
la validation (Entrée), pas à chaque frappe. Naviguer à chaque caractère crée une
course perdue d'avance : `navigate()` est asynchrone, l'URL reste en retard sur
la saisie, et les rendus déclenchés par la navigation précédente réécrivent le
champ avec une valeur périmée.

## Adapter le template à votre projet

1. **Brancher le vrai backend** : renseigner `VITE_API_URL` dans `.env` et
   supprimer l'appel à `enableMocking()` dans `src/main.tsx` (ou garder MSW en
   développement). Les fonctions de `features/*/api/*.api.ts` utilisent `fetch`
   sans autre dépendance.
2. **Remplacer l'authentification de démonstration** : seul
   `src/features/auth/auth-provider.tsx` est à réécrire. Les routes et la garde
   restent inchangées.
3. **Ajouter une feature** : créer `src/features/<nom>/` sur le modèle de
   `posts`, puis un fichier dans `src/routes/`.
4. **Supprimer la démo** : retirer `src/features/posts`, les routes `posts.*`,
   et les handlers correspondants dans `src/mocks/handlers.ts`.
