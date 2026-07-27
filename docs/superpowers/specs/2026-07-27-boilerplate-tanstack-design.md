# Boilerplate React + Vite + TanStack Router — Design

Date : 2026-07-27
Statut : validé, prêt pour le plan d'implémentation

## Objectif

Transformer ce dépôt — aujourd'hui un starter Vite + React + Tailwind + shadcn sans routage — en
template réutilisable « batteries incluses » pour démarrer une application front. Le template doit
démontrer une fois, correctement, chaque pattern qu'un projet dérivé reproduira ensuite : routage
typé, chargement de données, garde d'authentification, formulaire validé, mock d'API, test.

Critère de réussite : sur un clone frais, `bun install && bun dev` sert l'application avec ses
routes de démonstration sans configuration ni service externe, et `bun test` + `bun typecheck` +
`bun lint` passent.

## Existant

Déjà en place, conservé sans modification de fond :

- Vite 8, React 19.2, TypeScript 6, `@vitejs/plugin-react` 6
- Tailwind v4 via `@tailwindcss/vite`, shadcn configuré sur Base UI (`components.json`), `ui/button`
- `ThemeProvider` maison (bascule clair/sombre au clavier)
- ESLint 10 (flat config) + Prettier avec `prettier-plugin-tailwindcss`
- Alias `@/` → `./src` déclaré dans `vite.config.ts` et `tsconfig.app.json`
- Gestionnaire de paquets : Bun (`bun.lock` présent)

Absent : tout le routage, le chargement de données, les formulaires, les tests.

`src/App.tsx` est du contenu de démonstration ; il est supprimé et son contenu migre vers
`src/routes/index.tsx`.

## Dépendances ajoutées

Versions vérifiées compatibles avec Vite 8 / React 19 / TS 6 le 2026-07-27.

Runtime :

| Paquet | Version | Rôle |
|---|---|---|
| `@tanstack/react-router` | ^1.170 | routage typé |
| `@tanstack/react-query` | ^5.101 | état serveur, cache, mutations |
| `@tanstack/react-form` | ^1.33 | formulaires typés |
| `zod` | ^4.4 | validation (API, env, search params, formulaires) |

Développement :

| Paquet | Version | Rôle |
|---|---|---|
| `@tanstack/router-plugin` | ^1.168 | génération de l'arbre de routes (peer `vite >=8` ✅) |
| `@tanstack/react-router-devtools` | ^1.167 | devtools routeur |
| `@tanstack/react-query-devtools` | ^5.101 | devtools query |
| `msw` | ^2.15 | mock d'API partagé dev/test |
| `vitest` | ^4.1 | runner de test (peer `vite ^8` ✅) |
| `@testing-library/react` | ^16.3 | rendu de composants en test |
| `@testing-library/user-event` | ^14.6 | interactions utilisateur |
| `@testing-library/jest-dom` | ^7.0 | matchers DOM |
| `jsdom` | ^30 | environnement DOM |

Zod 4 implémente Standard Schema : les schémas sont passés directement à TanStack Router
(`validateSearch`) et TanStack Form, sans paquet adaptateur.

## Arborescence cible

```
src/
  main.tsx                    # bootstrap : MSW → providers → RouterProvider
  router.tsx                  # createRouter, contexte typé, augmentation de module
  routeTree.gen.ts            # généré par le plugin (commité, exclu de lint/format)
  routes/
    __root.tsx                # shell applicatif + composants error/notFound/pending
    index.tsx                 # landing publique
    login.tsx                 # formulaire de connexion
    _authenticated.tsx        # layout pathless portant la garde
    _authenticated/
      dashboard.tsx
      posts.index.tsx         # liste, search params validés
      posts.$postId.tsx       # détail, param typé
  features/
    auth/
      auth-context.tsx        # AuthProvider + contexte React
      use-auth.ts             # hook de consommation
    posts/
      api/posts.queries.ts    # query options factories + mutations
      components/post-card.tsx
      components/post-form.tsx
      schemas/post.schema.ts  # schémas Zod + types inférés
  components/
    theme-provider.tsx        # existant
    ui/                       # shadcn, existant
  lib/
    utils.ts                  # existant
    env.ts                    # import.meta.env parsé par Zod
    query-client.ts           # instance QueryClient
  mocks/
    handlers.ts               # source unique des handlers
    browser.ts                # setupWorker (dev)
    node.ts                   # setupServer (test)
  test/
    setup.ts                  # MSW + jest-dom + cleanup
    utils.tsx                 # helpers de rendu (providers, router mémoire)
```

Règle d'organisation : les fichiers de `routes/` restent fins — ils déclarent `loader`,
`validateSearch`, `beforeLoad` et composent des éléments venant de `features/`. La logique métier
et les composants de domaine vivent dans `features/<domaine>/`. Ne remonte dans `components/` que
ce qui est réellement partagé entre features.

## Routage

Le plugin Vite (`tanstackRouter({ target: 'react', autoCodeSplitting: true })`) est placé **avant**
`react()` dans `vite.config.ts` et régénère `src/routeTree.gen.ts` en watch.

`src/router.tsx` :

- crée le router avec `routeTree`, `context: { queryClient, auth: undefined! }` (l'auth réelle est
  injectée au rendu), `defaultPreload: 'intent'`, `defaultPreloadStaleTime: 0` — la fraîcheur est
  arbitrée par TanStack Query, pas par le cache du routeur ;
- déclare `declare module '@tanstack/react-router' { interface Register { router: typeof router } }`.
  C'est cette augmentation qui rend `<Link to="…">`, les params et les search params autocomplétés
  et vérifiés à la compilation.

`src/routes/__root.tsx` utilise `createRootRouteWithContext<{ queryClient: QueryClient; auth: AuthContextValue }>()`
et rend la navigation, `<Outlet />` et les deux devtools (chargées uniquement en dev). Il définit
aussi, une seule fois pour toute l'application, `errorComponent`, `notFoundComponent` et
`pendingComponent`.

Routes de démonstration :

| Route | Accès | Ce qu'elle démontre |
|---|---|---|
| `/` | public | page statique, liens typés |
| `/login` | public | TanStack Form + Zod, redirection retour |
| `/dashboard` | protégé | route protégée simple |
| `/posts` | protégé | loader + liste + search params validés (`page`, `q`) |
| `/posts/$postId` | protégé | param typé, loader paramétré, 404 métier |

## Chargement de données

`lib/query-client.ts` exporte une instance unique : `staleTime` 60 s, `retry` désactivé hors
production pour que les tests échouent vite.

Chaque feature expose des *query options factories* (`postsQueryOptions(search)`,
`postQueryOptions(id)`) consommées à deux endroits :

- dans le `loader` de la route : `context.queryClient.ensureQueryData(postsQueryOptions(search))` ;
- dans le composant : `useSuspenseQuery(postsQueryOptions(search))`.

Une seule définition d'options, donc une seule clé de cache — aucune divergence possible entre le
préchargement et la lecture. Combiné à `defaultPreload: 'intent'`, la navigation depuis un lien
survolé se fait sans état de chargement visible.

Les mutations passent par `useMutation` et invalident avec `queryClient.invalidateQueries({ queryKey })`.

Les réponses HTTP sont parsées par les schémas Zod de la feature avant d'entrer dans le cache : un
contrat rompu se manifeste au point de fetch, avec un message utile, plutôt qu'en `undefined` dans
un composant.

## Authentification simulée

`features/auth/auth-context.tsx` fournit `{ user, login, logout, isAuthenticated }`, avec un état
React persisté dans `localStorage` (aucun backend requis).

Le contexte du router doit refléter l'état d'auth courant. `main.tsx` rend donc un composant interne
qui lit `useAuth()` et le passe au provider :

```tsx
function InnerApp() {
  const auth = useAuth()
  return <RouterProvider router={router} context={{ auth }} />
}
```

`routes/_authenticated.tsx` (route de layout pathless — elle groupe sans ajouter de segment d'URL)
porte la garde :

```ts
beforeLoad: ({ context, location }) => {
  if (!context.auth.isAuthenticated) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
}
```

Après une connexion réussie, `login.tsx` appelle `await router.invalidate()` — indispensable pour
que les `beforeLoad` se rejouent avec le nouveau contexte — puis
`navigate({ to: search.redirect ?? '/dashboard' })`.

Le remplacement par une auth réelle se limite à `auth-context.tsx` : ni les routes ni la garde ne
changent.

## Mock d'API (MSW)

`mocks/handlers.ts` est la source unique de vérité, partagée par le dev et les tests. Il expose une
collection de posts en mémoire, une latence artificielle, et un cas d'erreur déclenchable pour
exercer les `errorComponent`.

- Dev : `main.tsx` attend `worker.start()` avant le premier render, uniquement si
  `import.meta.env.DEV`. Le service worker `public/mockServiceWorker.js` est généré par
  `bunx msw init public/ --save`.
- Test : `test/setup.ts` démarre `setupServer(...handlers)` avec `onUnhandledRequest: 'error'`,
  `resetHandlers()` entre les tests.

Le code applicatif n'utilise que `fetch` : passer au vrai backend consiste à ne plus démarrer le
worker, sans toucher aux features.

## Formulaires et validation

TanStack Form, schéma Zod passé directement comme validateur. Deux exemples couvrant l'essentiel :

- `login.tsx` — validation au changement, affichage d'erreur par champ, erreur serveur au submit,
  état `isSubmitting` ;
- `features/posts/components/post-form.tsx` — création de post, mutation, invalidation du cache.

Zod couvre trois autres usages dans le template :

- `lib/env.ts` parse `import.meta.env` et échoue au démarrage si une variable requise manque ;
- `validateSearch` sur `/posts` type les search params (`page: number`, `q?: string`) ;
- les schémas d'API dans `features/*/schemas/`.

## Tests

Vitest 4 configuré dans `vite.config.ts` : `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`,
`globals: true`.

`test/utils.tsx` fournit un helper de rendu qui enveloppe dans `QueryClientProvider` (client neuf
par test, retry désactivé) et, pour les tests de route, un router mémoire.

Trois tests exemplaires, un par pattern à reproduire :

1. composant de feature (`post-card`) — rendu et props ;
2. hook de query — données servies par MSW, états de chargement puis succès ;
3. garde de route — un visiteur anonyme arrivant sur `/dashboard` est redirigé vers `/login`.

## Outillage

Scripts ajoutés à `package.json` : `test` (`vitest run`), `test:watch` (`vitest`).

`src/routeTree.gen.ts` est **commité** (le typage doit exister sans lancer le dev server) mais exclu
d'ESLint et de Prettier. `public/mockServiceWorker.js` est également commité et exclu du lint.

## Hors périmètre

Écartés volontairement, chacun pouvant s'ajouter plus tard sans remettre en cause ces choix :

- SSR / TanStack Start — le template vise une SPA ;
- state manager global — Router (état d'URL) et Query (état serveur) couvrent les besoins ;
- i18n, CI, Playwright, thème design system étendu.

## Risques

- **Ordre des plugins Vite** : `tanstackRouter()` doit précéder `react()`, sinon la génération de
  routes ne se déclenche pas. À vérifier au premier `bun dev`.
- **Contexte d'auth non réactif** : passer `auth` au `createRouter` initial plutôt qu'au
  `RouterProvider` fige l'état et casse silencieusement la garde. Le test de redirection couvre ce
  cas.
- **MSW et le premier render** : ne pas attendre `worker.start()` produit des requêtes non
  interceptées au démarrage, de façon intermittente.
