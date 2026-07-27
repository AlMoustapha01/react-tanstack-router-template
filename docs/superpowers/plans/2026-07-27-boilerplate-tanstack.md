# Boilerplate React + Vite + TanStack Router — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer ce starter Vite/React/Tailwind en template réutilisable démontrant routage typé, chargement de données loader-first, garde d'authentification, formulaires validés, mock d'API et tests.

**Architecture:** TanStack Router en file-based routing avec un contexte typé `{ queryClient, auth }` disponible dans chaque `loader` et `beforeLoad`. Chaque feature expose des *query options factories* consommées deux fois — `ensureQueryData` dans le loader de la route, `useSuspenseQuery` dans le composant — ce qui garantit une clé de cache unique et une navigation sans spinner grâce au preload au survol. MSW sert de backend, partagé entre le dev et les tests.

**Tech Stack:** React 19.2, Vite 8, TypeScript 6, TanStack Router 1.170, TanStack Query 5.101, TanStack Form 1.33, Zod 4.4, MSW 2.15, Vitest 4.1, Testing Library 16.3, Tailwind v4, shadcn (Base UI).

**Spec:** `docs/superpowers/specs/2026-07-27-boilerplate-tanstack-design.md`

## Global Constraints

Ces contraintes s'appliquent à **toutes** les tâches.

- **Gestionnaire de paquets : Bun.** Toujours `bun add` / `bun run` / `bunx`. Ne jamais générer `package-lock.json` ni `yarn.lock`.
- **Style Prettier imposé par `.prettierrc`** : pas de point-virgule (`semi: false`), guillemets **doubles** (`singleQuote: false`), indentation 2 espaces, `printWidth` 80, `trailingComma: "es5"`. Tout le code de ce plan respecte déjà ce style — le recopier tel quel.
- **`verbatimModuleSyntax: true`** dans `tsconfig.app.json` : tout import de type DOIT utiliser `import type { X }` ou `import { type X }`. Un import de type sans le mot-clé `type` casse le build.
- **`erasableSyntaxOnly: true`** : interdit `enum`, `namespace` et les paramètres de propriété de constructeur. Utiliser des unions de littéraux ou `as const`.
- **`noUnusedLocals` et `noUnusedParameters`** sont actifs : aucune variable ni aucun paramètre inutilisé ne compile.
- **Alias `@/` → `src/`**, déjà configuré dans `vite.config.ts` et `tsconfig.app.json`. Utiliser `@/...` pour les imports inter-dossiers, les chemins relatifs uniquement à l'intérieur d'une même feature.
- **React 19** : écrire `<Context value={...}>` et non `<Context.Provider value={...}>`.
- **Langue** : les identifiants et le texte d'interface sont en **anglais**, comme le code existant. Les commentaires explicatifs et les messages de commit sont en **français**.
- **Les liens sont typés** : `<Link to="/x">` ne compile que si la route `/x` existe déjà dans `routeTree.gen.ts`. C'est pourquoi la navigation du shell est construite par étapes, tâche après tâche, au fur et à mesure que les routes apparaissent. Ne pas anticiper un lien vers une route d'une tâche ultérieure.
- **Pas de `globals: true` dans Vitest** : importer explicitement `describe`, `it`, `expect`, `vi`, `beforeEach` depuis `"vitest"`. Cela évite de modifier `tsconfig.app.json`.
- **Commandes de vérification** : `bun run typecheck`, `bun run lint`, `bun run test`.
- **Ne jamais lancer `bun test`** (sans `run`) : cette forme invoque le runner de test natif de Bun, qui ignore `vite.config.ts` — donc ni `environment: "jsdom"` ni `setupFiles`. Tout test touchant au DOM, à React ou à MSW passerait à côté de son environnement. Utiliser `bun run test` pour la suite complète et `bunx vitest run <fichier>` pour un fichier ciblé.

## File Structure

Fichiers **créés** :

| Fichier | Responsabilité |
|---|---|
| `src/lib/env.ts` | Parse et type `import.meta.env` via Zod |
| `src/lib/query-client.ts` | Fabrique et singleton `QueryClient` |
| `src/lib/router-context.ts` | Type `RouterContext` seul (évite un cycle d'imports) |
| `src/router.ts` | Instance du router + augmentation de module |
| `src/routeTree.gen.ts` | Généré par le plugin — jamais édité à la main |
| `src/routes/__root.tsx` | Shell applicatif, error/notFound/pending components |
| `src/routes/index.tsx` | Page d'accueil publique |
| `src/routes/login.tsx` | Formulaire de connexion |
| `src/routes/_authenticated.tsx` | Layout pathless portant la garde |
| `src/routes/_authenticated/dashboard.tsx` | Page protégée simple |
| `src/routes/_authenticated/posts.index.tsx` | Liste + search params validés |
| `src/routes/_authenticated/posts.$postId.tsx` | Détail d'un post |
| `src/features/auth/auth-context.ts` | Contexte React + types (sans JSX) |
| `src/features/auth/auth-provider.tsx` | `AuthProvider` |
| `src/features/auth/use-auth.ts` | Hook `useAuth` |
| `src/features/posts/schemas/post.schema.ts` | Schémas Zod + types inférés |
| `src/features/posts/api/posts.api.ts` | Appels `fetch` + parsing Zod |
| `src/features/posts/api/posts.queries.ts` | Query keys, query options, mutation |
| `src/features/posts/components/post-card.tsx` | Carte d'un post |
| `src/features/posts/components/post-form.tsx` | Formulaire de création |
| `src/mocks/handlers.ts` | Handlers MSW — source unique dev + test |
| `src/mocks/browser.ts` | `setupWorker` (dev) |
| `src/mocks/node.ts` | `setupServer` (test) |
| `src/test/setup.ts` | Setup global Vitest |
| `src/test/utils.tsx` | Helpers de rendu |
| `tsr.config.json` | Config du générateur de routes (lue par le plugin et le CLI) |
| `.env.example` | Variables d'environnement documentées |

Fichiers **modifiés** : `package.json`, `vite.config.ts`, `eslint.config.js`, `.prettierignore`, `.gitignore`, `src/main.tsx`, `README.md`.

Fichier **supprimé** : `src/App.tsx` (contenu de démo migré vers `src/routes/index.tsx`).

**Écarts assumés par rapport à la spec**, tous justifiés :
- `src/router.ts` et non `.tsx` — le fichier ne contient aucun JSX.
- La feature auth est en trois fichiers (`auth-context.ts` / `auth-provider.tsx` / `use-auth.ts`) et non deux : la règle ESLint `react-refresh/only-export-components` interdit d'exporter un hook et un composant depuis un même fichier.
- Ajout de `src/lib/router-context.ts` : `__root.tsx` et `router.ts` ont tous deux besoin du type `RouterContext`, et le faire vivre dans `router.ts` créerait un cycle d'imports.
- Ajout de la dépendance `@tanstack/router-cli` (non listée dans la spec) : le plugin Vite ne régénère `routeTree.gen.ts` que lorsque Vite tourne, ce qui rend `bun run typecheck` non reproductible sur un clone frais. Le CLI fournit `tsr generate`, appelable à la demande et en CI. Plugin et CLI lisent la même configuration `tsr.config.json`.

---

### Task 1: Socle de test et environnement typé

Installe toutes les dépendances du projet, câble Vitest, et livre le premier module testé (`env`). À la fin de cette tâche, `bun run test` fonctionne.

**Files:**
- Modify: `package.json` (dépendances + scripts)
- Modify: `vite.config.ts` (bloc `test`)
- Create: `src/test/setup.ts`
- Create: `src/lib/env.ts`
- Create: `src/lib/env.test.ts`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `parseEnv(raw: unknown): Env` et `env: Env` où `Env = { VITE_API_URL: string }`, exportés depuis `@/lib/env`.

- [ ] **Step 1: Installer les dépendances**

```bash
bun add @tanstack/react-router @tanstack/react-query @tanstack/react-form zod
bun add -d @tanstack/router-plugin @tanstack/router-cli \
  @tanstack/react-router-devtools @tanstack/react-query-devtools \
  msw vitest jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: Ajouter les scripts de test à `package.json`**

Dans le bloc `"scripts"`, après `"typecheck"` :

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "routes:generate": "tsr generate",
```

- [ ] **Step 3: Configurer Vitest dans `vite.config.ts`**

Remplacer intégralement le fichier par :

```ts
/// <reference types="vitest/config" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
  },
})
```

- [ ] **Step 4: Créer le setup Vitest**

`src/test/setup.ts` — MSW sera branché ici en Task 2 :

```ts
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 5: Écrire le test qui échoue**

`src/lib/env.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { parseEnv } from "./env"

describe("parseEnv", () => {
  it("falls back to /api when VITE_API_URL is absent", () => {
    expect(parseEnv({})).toEqual({ VITE_API_URL: "/api" })
  })

  it("keeps a provided VITE_API_URL", () => {
    expect(parseEnv({ VITE_API_URL: "https://api.example.com" })).toEqual({
      VITE_API_URL: "https://api.example.com",
    })
  })

  it("throws a readable error when VITE_API_URL is empty", () => {
    expect(() => parseEnv({ VITE_API_URL: "" })).toThrow(
      /Invalid environment variables/
    )
  })
})
```

- [ ] **Step 6: Lancer le test et vérifier qu'il échoue**

Run: `bunx vitest run src/lib/env.test.ts`
Expected: FAIL — `Failed to resolve import "./env"`

- [ ] **Step 7: Implémenter `src/lib/env.ts`**

```ts
import { z } from "zod"

const envSchema = z.object({
  VITE_API_URL: z.string().min(1).default("/api"),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(raw: unknown): Env {
  const result = envSchema.safeParse(raw)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ")

    throw new Error(`Invalid environment variables — ${details}`)
  }

  return result.data
}

export const env = parseEnv(import.meta.env)
```

- [ ] **Step 8: Lancer le test et vérifier qu'il passe**

Run: `bunx vitest run src/lib/env.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 9: Documenter la variable d'environnement**

`.env.example` :

```
# Base URL de l'API. En développement, MSW intercepte les requêtes sur ce préfixe.
VITE_API_URL=/api
```

- [ ] **Step 10: Ignorer les fichiers d'environnement locaux**

Ajouter à la fin de `.gitignore` :

```
# Env
.env
.env.local
.env.*.local
```

- [ ] **Step 11: Vérifier le typage et le lint**

Run: `bun run typecheck && bun run lint`
Expected: aucune erreur

- [ ] **Step 12: Commit**

```bash
git add package.json bun.lock vite.config.ts .gitignore .env.example src/test src/lib
git commit -m "feat: socle de test Vitest et environnement typé par Zod"
```

---

### Task 2: Schémas, mock d'API MSW et client HTTP des posts

Livre la couche de données brute : les schémas Zod, le faux backend MSW, et les fonctions `fetch` qui valident les réponses.

**Files:**
- Create: `src/features/posts/schemas/post.schema.ts`
- Create: `src/mocks/handlers.ts`
- Create: `src/mocks/node.ts`
- Create: `src/mocks/browser.ts`
- Create: `src/features/posts/api/posts.api.ts`
- Create: `src/features/posts/api/posts.api.test.ts`
- Modify: `src/test/setup.ts`
- Modify: `.gitignore`, `.prettierignore`

**Interfaces:**
- Consumes: `env` depuis `@/lib/env` (Task 1).
- Produces, depuis `@/features/posts/schemas/post.schema` : `postSchema`, `postListSchema`, `createPostSchema`, `postsSearchSchema`, et les types `Post`, `PostList`, `CreatePostInput`, `PostsSearch` où
  `Post = { id: string; title: string; body: string; author: string; createdAt: string }`,
  `PostList = { items: Array<Post>; total: number; page: number; pageSize: number }`,
  `CreatePostInput = { title: string; body: string }`,
  `PostsSearch = { page: number; q?: string }`.
- Produces, depuis `@/features/posts/api/posts.api` : `fetchPosts(search: PostsSearch): Promise<PostList>`, `fetchPost(postId: string): Promise<Post>`, `createPost(input: CreatePostInput): Promise<Post>`.
- Produces, depuis `@/mocks/handlers` : `handlers`, `resetMockPosts()`, `PAGE_SIZE`.

- [ ] **Step 1: Écrire les schémas Zod**

`src/features/posts/schemas/post.schema.ts` :

```ts
import { z } from "zod"

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
  createdAt: z.iso.datetime(),
})

export type Post = z.infer<typeof postSchema>

export const postListSchema = z.object({
  items: z.array(postSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export type PostList = z.infer<typeof postListSchema>

export const createPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  body: z.string().min(10, "Body must be at least 10 characters"),
})

export type CreatePostInput = z.infer<typeof createPostSchema>

export const postsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().optional(),
})

export type PostsSearch = z.infer<typeof postsSearchSchema>
```

- [ ] **Step 2: Écrire les handlers MSW**

`src/mocks/handlers.ts` :

```ts
import { HttpResponse, delay, http } from "msw"

import { env } from "@/lib/env"

export type MockPost = {
  id: string
  title: string
  body: string
  author: string
  createdAt: string
}

export const PAGE_SIZE = 3

const seedPosts: Array<MockPost> = [
  {
    id: "1",
    title: "Typed routing end to end",
    body: "Route paths, params and search params are all checked at compile time.",
    author: "Ada",
    createdAt: "2026-01-12T09:00:00.000Z",
  },
  {
    id: "2",
    title: "Loaders meet the query cache",
    body: "The route loader warms the exact cache entry the component reads.",
    author: "Grace",
    createdAt: "2026-02-03T14:30:00.000Z",
  },
  {
    id: "3",
    title: "Guarding routes with context",
    body: "beforeLoad reads the auth context and redirects anonymous visitors.",
    author: "Alan",
    createdAt: "2026-03-21T08:15:00.000Z",
  },
  {
    id: "4",
    title: "One mock, two consumers",
    body: "The same handlers back the dev server and the test suite.",
    author: "Barbara",
    createdAt: "2026-04-09T17:45:00.000Z",
  },
  {
    id: "5",
    title: "Schemas at the boundary",
    body: "Every response is parsed before it reaches the cache.",
    author: "Edsger",
    createdAt: "2026-05-30T11:05:00.000Z",
  },
]

let posts: Array<MockPost> = [...seedPosts]

export function resetMockPosts() {
  posts = [...seedPosts]
}

export const handlers = [
  http.get(`${env.VITE_API_URL}/posts`, async ({ request }) => {
    await delay(50)

    const url = new URL(request.url, "http://localhost")
    const query = url.searchParams.get("q") ?? ""

    // Trappe utilisée par l'interface de démo pour exercer le composant d'erreur.
    if (query === "boom") {
      return new HttpResponse(null, { status: 500 })
    }

    const page = Number(url.searchParams.get("page") ?? "1")
    const matching = posts.filter((post) =>
      post.title.toLowerCase().includes(query.toLowerCase())
    )
    const start = (page - 1) * PAGE_SIZE

    return HttpResponse.json({
      items: matching.slice(start, start + PAGE_SIZE),
      total: matching.length,
      page,
      pageSize: PAGE_SIZE,
    })
  }),

  http.get(`${env.VITE_API_URL}/posts/:postId`, async ({ params }) => {
    await delay(50)

    const post = posts.find((item) => item.id === params.postId)

    if (!post) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(post)
  }),

  http.post(`${env.VITE_API_URL}/posts`, async ({ request }) => {
    await delay(50)

    const input = (await request.json()) as { title: string; body: string }
    const post: MockPost = {
      id: crypto.randomUUID(),
      title: input.title,
      body: input.body,
      author: "You",
      createdAt: new Date().toISOString(),
    }

    posts = [post, ...posts]

    return HttpResponse.json(post, { status: 201 })
  }),
]
```

- [ ] **Step 3: Créer les deux points d'entrée MSW**

`src/mocks/node.ts` :

```ts
import { setupServer } from "msw/node"

import { handlers } from "./handlers"

export const server = setupServer(...handlers)
```

`src/mocks/browser.ts` :

```ts
import { setupWorker } from "msw/browser"

import { handlers } from "./handlers"

export const worker = setupWorker(...handlers)
```

- [ ] **Step 4: Brancher MSW dans le setup des tests**

Remplacer `src/test/setup.ts` par :

```ts
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll } from "vitest"

import { resetMockPosts } from "@/mocks/handlers"
import { server } from "@/mocks/node"

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetMockPosts()
})

afterAll(() => {
  server.close()
})
```

- [ ] **Step 5: Écrire le test qui échoue**

`src/features/posts/api/posts.api.test.ts` :

```ts
import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { env } from "@/lib/env"
import { server } from "@/mocks/node"

import { createPost, fetchPost, fetchPosts } from "./posts.api"

describe("posts api", () => {
  it("returns the first page of posts", async () => {
    const result = await fetchPosts({ page: 1 })

    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(5)
    expect(result.items[0].title).toBe("Typed routing end to end")
  })

  it("filters posts by query", async () => {
    const result = await fetchPosts({ page: 1, q: "loaders" })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe("2")
  })

  it("returns a single post by id", async () => {
    const post = await fetchPost("3")

    expect(post.author).toBe("Alan")
  })

  it("throws when a post does not exist", async () => {
    await expect(fetchPost("does-not-exist")).rejects.toThrow(/404/)
  })

  it("creates a post and returns it", async () => {
    const post = await createPost({
      title: "A brand new post",
      body: "Long enough body to pass validation.",
    })

    expect(post.title).toBe("A brand new post")
    expect(post.author).toBe("You")
  })

  it("rejects a response that breaks the schema", async () => {
    server.use(
      http.get(`${env.VITE_API_URL}/posts/:postId`, () =>
        HttpResponse.json({ id: "1", title: "Missing fields" })
      )
    )

    await expect(fetchPost("1")).rejects.toThrow()
  })
})
```

- [ ] **Step 6: Lancer le test et vérifier qu'il échoue**

Run: `bunx vitest run src/features/posts/api/posts.api.test.ts`
Expected: FAIL — `Failed to resolve import "./posts.api"`

- [ ] **Step 7: Implémenter le client HTTP**

`src/features/posts/api/posts.api.ts` :

```ts
import { env } from "@/lib/env"

import {
  postListSchema,
  postSchema,
  type CreatePostInput,
  type Post,
  type PostList,
  type PostsSearch,
} from "../schemas/post.schema"

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${env.VITE_API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`)
  }

  return response.json()
}

export async function fetchPosts(search: PostsSearch): Promise<PostList> {
  const params = new URLSearchParams({ page: String(search.page) })

  if (search.q) {
    params.set("q", search.q)
  }

  return postListSchema.parse(await request(`/posts?${params.toString()}`))
}

export async function fetchPost(postId: string): Promise<Post> {
  return postSchema.parse(await request(`/posts/${postId}`))
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  return postSchema.parse(
    await request("/posts", {
      method: "POST",
      body: JSON.stringify(input),
    })
  )
}
```

- [ ] **Step 8: Lancer le test et vérifier qu'il passe**

Run: `bunx vitest run src/features/posts/api/posts.api.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 9: Générer le service worker MSW pour le navigateur**

Run: `bunx msw init public/ --save`

Ce fichier est **commité** (il doit exister sur un clone frais) mais exclu du lint et du formatage. Ajouter à `.prettierignore` :

```
public/mockServiceWorker.js
```

Et dans `eslint.config.js`, remplacer la ligne `globalIgnores(['dist'])` par :

```js
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
```

- [ ] **Step 10: Vérifier l'ensemble**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: tous les tests passent, aucune erreur

- [ ] **Step 11: Commit**

```bash
git add src/features/posts src/mocks src/test/setup.ts public/mockServiceWorker.js .prettierignore eslint.config.js
git commit -m "feat: schémas Zod, mock MSW et client HTTP des posts"
```

---

### Task 3: QueryClient et query options des posts

Livre la couche cache : la fabrique de `QueryClient`, les query options réutilisées par les loaders et les composants, et le premier helper de test React.

**Files:**
- Create: `src/lib/query-client.ts`
- Create: `src/features/posts/api/posts.queries.ts`
- Create: `src/features/posts/api/posts.queries.test.tsx`
- Create: `src/test/utils.tsx`

**Interfaces:**
- Consumes: `fetchPosts`, `fetchPost`, `createPost` depuis `../posts.api` (Task 2) ; les types depuis `../schemas/post.schema`.
- Produces, depuis `@/lib/query-client` : `createQueryClient(): QueryClient` et le singleton `queryClient`.
- Produces, depuis `@/features/posts/api/posts.queries` : `postKeys`, `postsQueryOptions(search: PostsSearch)`, `postQueryOptions(postId: string)`.
- Produces, depuis `@/test/utils` : `renderWithProviders(ui: ReactNode)` qui retourne `{ queryClient, ...RenderResult }`.

- [ ] **Step 1: Créer la fabrique de QueryClient**

`src/lib/query-client.ts` :

```ts
import { QueryClient } from "@tanstack/react-query"

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Les tests doivent échouer vite : pas de nouvelle tentative hors prod.
        retry: import.meta.env.PROD ? 3 : false,
      },
    },
  })
}

export const queryClient = createQueryClient()
```

- [ ] **Step 2: Créer le helper de rendu**

`src/test/utils.tsx` :

```tsx
import { QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"

import { createQueryClient } from "@/lib/query-client"

export function renderWithProviders(ui: ReactNode) {
  const queryClient = createQueryClient()

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
  }
}
```

- [ ] **Step 3: Écrire le test qui échoue**

`src/features/posts/api/posts.queries.test.tsx` :

```tsx
import { QueryClientProvider, useQuery } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { createQueryClient } from "@/lib/query-client"

import { postKeys, postQueryOptions, postsQueryOptions } from "./posts.queries"

function createWrapper() {
  const queryClient = createQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("posts queries", () => {
  it("builds a stable list key from the search params", () => {
    expect(postKeys.list({ page: 2, q: "loaders" })).toEqual([
      "posts",
      "list",
      { page: 2, q: "loaders" },
    ])
  })

  it("loads the post list through the query cache", async () => {
    const { result } = renderHook(
      () => useQuery(postsQueryOptions({ page: 1 })),
      { wrapper: createWrapper() }
    )

    expect(result.current.isPending).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.items).toHaveLength(3)
  })

  it("loads a single post through the query cache", async () => {
    const { result } = renderHook(() => useQuery(postQueryOptions("2")), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.author).toBe("Grace")
  })
})
```

- [ ] **Step 4: Lancer le test et vérifier qu'il échoue**

Run: `bunx vitest run src/features/posts/api/posts.queries.test.tsx`
Expected: FAIL — `Failed to resolve import "./posts.queries"`

- [ ] **Step 5: Implémenter les query options**

`src/features/posts/api/posts.queries.ts` :

```ts
import { queryOptions } from "@tanstack/react-query"

import type { PostsSearch } from "../schemas/post.schema"
import { fetchPost, fetchPosts } from "./posts.api"

export const postKeys = {
  all: ["posts"] as const,
  list: (search: PostsSearch) => ["posts", "list", search] as const,
  detail: (postId: string) => ["posts", "detail", postId] as const,
}

export function postsQueryOptions(search: PostsSearch) {
  return queryOptions({
    queryKey: postKeys.list(search),
    queryFn: () => fetchPosts(search),
  })
}

export function postQueryOptions(postId: string) {
  return queryOptions({
    queryKey: postKeys.detail(postId),
    queryFn: () => fetchPost(postId),
  })
}
```

- [ ] **Step 6: Lancer le test et vérifier qu'il passe**

Run: `bunx vitest run src/features/posts/api/posts.queries.test.tsx`
Expected: PASS — 3 tests

- [ ] **Step 7: Vérifier l'ensemble**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: aucune erreur

- [ ] **Step 8: Commit**

```bash
git add src/lib/query-client.ts src/features/posts/api src/test/utils.tsx
git commit -m "feat: QueryClient et query options réutilisables des posts"
```

---

### Task 4: Contexte d'authentification simulée

Livre l'état d'authentification, indépendant du router. Découpé en trois fichiers pour satisfaire `react-refresh/only-export-components`.

**Files:**
- Create: `src/features/auth/auth-context.ts`
- Create: `src/features/auth/auth-provider.tsx`
- Create: `src/features/auth/use-auth.ts`
- Create: `src/features/auth/auth-provider.test.tsx`

**Interfaces:**
- Produces, depuis `@/features/auth/auth-context` : `AuthContext`, `AUTH_STORAGE_KEY`, `DEMO_PASSWORD`, et les types
  `User = { id: string; email: string; name: string }`,
  `Credentials = { email: string; password: string }`,
  `AuthContextValue = { user: User | null; isAuthenticated: boolean; login: (credentials: Credentials) => Promise<void>; logout: () => void }`.
- Produces : `AuthProvider` depuis `@/features/auth/auth-provider`, `useAuth(): AuthContextValue` depuis `@/features/auth/use-auth`.

- [ ] **Step 1: Écrire le test qui échoue**

`src/features/auth/auth-provider.test.tsx` :

```tsx
import { act, render, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it } from "vitest"

import { AUTH_STORAGE_KEY } from "./auth-context"
import { AuthProvider } from "./auth-provider"
import { useAuth } from "./use-auth"

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("starts anonymous", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("signs a user in and persists them", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        email: "ada@example.com",
        password: "password",
      })
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe("ada@example.com")
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toContain("ada@example.com")
  })

  it("rejects a wrong password", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      result.current.login({ email: "ada@example.com", password: "nope" })
    ).rejects.toThrow(/Invalid email or password/)

    expect(result.current.isAuthenticated).toBe(false)
  })

  it("restores a user stored in localStorage", () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ id: "user-1", email: "grace@example.com", name: "grace" })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user?.name).toBe("grace")
  })

  it("discards a corrupted stored user", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "not json")

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it("signs the user out", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        email: "ada@example.com",
        password: "password",
      })
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it("throws when useAuth is used outside the provider", () => {
    function Orphan() {
      useAuth()
      return null
    }

    expect(() => render(<Orphan />)).toThrow(
      /useAuth must be used within an AuthProvider/
    )
  })
})
```

Ce dernier test rend volontairement un composant qui lève : React écrit la trace d'erreur dans la console pendant l'exécution. C'est attendu, le test passe quand même.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `bunx vitest run src/features/auth/auth-provider.test.tsx`
Expected: FAIL — `Failed to resolve import "./auth-context"`

- [ ] **Step 3: Créer le contexte et les types**

`src/features/auth/auth-context.ts` :

```ts
import { createContext } from "react"

export type User = {
  id: string
  email: string
  name: string
}

export type Credentials = {
  email: string
  password: string
}

export type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

export const AUTH_STORAGE_KEY = "template.auth.user"

/** Mot de passe accepté par l'auth de démonstration. */
export const DEMO_PASSWORD = "password"

export const AuthContext = createContext<AuthContextValue | null>(null)
```

- [ ] **Step 4: Créer le provider**

`src/features/auth/auth-provider.tsx` :

```tsx
import { useCallback, useMemo, useState, type ReactNode } from "react"

import {
  AUTH_STORAGE_KEY,
  AuthContext,
  DEMO_PASSWORD,
  type Credentials,
  type User,
} from "./auth-context"

function readStoredUser(): User | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)

  const login = useCallback(async (credentials: Credentials) => {
    if (credentials.password !== DEMO_PASSWORD) {
      throw new Error("Invalid email or password")
    }

    const nextUser: User = {
      id: "user-1",
      email: credentials.email,
      name: credentials.email.split("@")[0],
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
```

- [ ] **Step 5: Créer le hook**

`src/features/auth/use-auth.ts` :

```ts
import { useContext } from "react"

import { AuthContext } from "./auth-context"

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
```

- [ ] **Step 6: Lancer le test et vérifier qu'il passe**

Run: `bunx vitest run src/features/auth/auth-provider.test.tsx`
Expected: PASS — 7 tests

- [ ] **Step 7: Vérifier l'ensemble**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: aucune erreur

- [ ] **Step 8: Commit**

```bash
git add src/features/auth
git commit -m "feat: contexte d'authentification simulée persistée"
```

---

### Task 5: Router — plugin, route racine, page d'accueil et bootstrap

Câble TanStack Router : génération de l'arbre de routes, contexte typé, shell applicatif, et remplacement de `App.tsx` par la route `/`.

**Files:**
- Create: `tsr.config.json`
- Modify: `vite.config.ts` (ajout du plugin)
- Create: `src/lib/router-context.ts`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Create: `src/router.ts`
- Modify: `src/main.tsx`
- Delete: `src/App.tsx`
- Modify: `src/test/utils.tsx` (ajout de `renderRoute`)
- Create: `src/routes/index.test.tsx`
- Modify: `eslint.config.js`, `.prettierignore`

**Interfaces:**
- Consumes: `queryClient` (Task 3), `AuthProvider` / `useAuth` / `AuthContext` / `AuthContextValue` / `User` (Task 4).
- Produces: `type RouterContext = { queryClient: QueryClient; auth: AuthContextValue }` depuis `@/lib/router-context` ; `router` depuis `@/router` ; `renderRoute({ initialEntries, user })` depuis `@/test/utils` retournant `{ router, queryClient, ...RenderResult }`.

- [ ] **Step 1: Déclarer la config du générateur de routes**

`tsr.config.json` — source unique lue à la fois par le plugin Vite et par `tsr generate` :

```json
{
  "target": "react",
  "routesDirectory": "./src/routes",
  "generatedRouteTree": "./src/routeTree.gen.ts",
  "quoteStyle": "double",
  "semicolons": false
}
```

- [ ] **Step 2: Ajouter le plugin au `vite.config.ts`**

Le plugin doit être placé **avant** `react()`, sinon la génération ne se déclenche pas. Modifier les imports et le tableau `plugins` :

```ts
/// <reference types="vitest/config" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
  },
})
```

- [ ] **Step 3: Créer le type de contexte du router**

`src/lib/router-context.ts` — fichier isolé pour que `__root.tsx` et `router.ts` puissent tous deux l'importer sans cycle :

```ts
import type { QueryClient } from "@tanstack/react-query"

import type { AuthContextValue } from "@/features/auth/auth-context"

export type RouterContext = {
  queryClient: QueryClient
  auth: AuthContextValue
}
```

- [ ] **Step 4: Créer la route racine**

`src/routes/__root.tsx`. La barre de navigation ne contient pour l'instant que le lien `Home` : les autres routes n'existent pas encore et `<Link to="/dashboard">` ne compilerait pas. Les tâches 6 et 7 l'enrichissent.

```tsx
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import type { RouterContext } from "@/lib/router-context"

const RouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-router-devtools").then((mod) => ({
        default: mod.TanStackRouterDevtools,
      }))
    )

const QueryDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-query-devtools").then((mod) => ({
        default: mod.ReactQueryDevtools,
      }))
    )

const navLinkClass =
  "text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-foreground data-[status=active]:font-medium"

function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-4 border-b px-6 py-3 text-sm">
        <nav className="flex flex-1 items-center gap-4">
          <Link to="/" className={navLinkClass}>
            Home
          </Link>
        </nav>
      </header>

      <main className="flex-1 p-6">
        <Outlet />
      </main>

      <Suspense>
        <RouterDevtools position="bottom-right" />
        <QueryDevtools buttonPosition="bottom-left" />
      </Suspense>
    </div>
  )
}

function PendingComponent() {
  return (
    <p className="text-muted-foreground text-sm" role="status">
      Loading…
    </p>
  )
}

function NotFoundComponent() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="font-medium">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Back home
      </Link>
    </div>
  )
}

function RootErrorComponent({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="font-medium">Something went wrong</h1>
      <p className="text-destructive text-sm">{error.message}</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Back home
      </Link>
    </div>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  pendingComponent: PendingComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RootErrorComponent,
})
```

- [ ] **Step 5: Créer la page d'accueil**

`src/routes/index.tsx` — reprend le contenu de `App.tsx`. Le lien vers `/login` sera ajouté en Task 6, quand cette route existera.

```tsx
import { createFileRoute } from "@tanstack/react-router"

function HomePage() {
  return (
    <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
      <div>
        <h1 className="font-medium">Project ready!</h1>
        <p>
          Typed routing, a query cache, mocked API handlers and tests are all
          wired up.
        </p>
      </div>
      <div className="text-muted-foreground font-mono text-xs">
        (Press <kbd>d</kbd> to toggle dark mode)
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({
  component: HomePage,
})
```

- [ ] **Step 6: Générer l'arbre de routes**

Run: `bun run routes:generate`
Expected: `src/routeTree.gen.ts` est créé et référence `__root` et la route `/`

- [ ] **Step 7: Créer l'instance du router**

`src/router.ts` :

```ts
import { createRouter } from "@tanstack/react-router"

import { queryClient } from "@/lib/query-client"

import { routeTree } from "./routeTree.gen"

export const router = createRouter({
  routeTree,
  // `auth` est fourni au rendu par le RouterProvider : il doit refléter
  // l'état courant du AuthProvider, pas un instantané figé au démarrage.
  context: { queryClient, auth: undefined! },
  defaultPreload: "intent",
  // La fraîcheur est arbitrée par TanStack Query, pas par le cache du router.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
```

- [ ] **Step 8: Réécrire le bootstrap**

`src/main.tsx` :

```tsx
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/features/auth/auth-provider"
import { useAuth } from "@/features/auth/use-auth"
import { queryClient } from "@/lib/query-client"
import { router } from "@/router"

function InnerApp() {
  const auth = useAuth()

  return <RouterProvider router={router} context={{ auth }} />
}

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return
  }

  const { worker } = await import("./mocks/browser")
  await worker.start({ onUnhandledRequest: "bypass" })
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <InnerApp />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>
  )
})
```

- [ ] **Step 9: Supprimer l'ancien composant racine**

```bash
git rm src/App.tsx
```

- [ ] **Step 10: Exclure le fichier généré du lint et du formatage**

Dans `eslint.config.js`, la ligne d'ignores devient :

```js
  globalIgnores([
    'dist',
    'public/mockServiceWorker.js',
    'src/routeTree.gen.ts',
  ]),
```

Ajouter une override à la fin du tableau `defineConfig([...])`, après le bloc principal, pour les fichiers de route : `export const Route = createFileRoute(...)` n'est pas un export constant au sens du plugin, ce qui ferait remonter un avertissement sur chaque route.

```js
  {
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
```

Ajouter à `.prettierignore` :

```
src/routeTree.gen.ts
```

- [ ] **Step 11: Ajouter le helper de rendu de route**

Ajouter à `src/test/utils.tsx` (conserver `renderWithProviders`) :

```tsx
import { QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"

import {
  AuthContext,
  type AuthContextValue,
  type User,
} from "@/features/auth/auth-context"
import { createQueryClient } from "@/lib/query-client"
import { routeTree } from "@/routeTree.gen"

export function renderWithProviders(ui: ReactNode) {
  const queryClient = createQueryClient()

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
  }
}

export function createAuthValue(user: User | null): AuthContextValue {
  return {
    user,
    isAuthenticated: user !== null,
    login: async () => {},
    logout: () => {},
  }
}

export const testUser: User = {
  id: "user-1",
  email: "ada@example.com",
  name: "ada",
}

export function renderRoute({
  initialEntries,
  user = null,
}: {
  initialEntries: Array<string>
  user?: User | null
}) {
  const queryClient = createQueryClient()
  const auth = createAuthValue(user)
  const router = createRouter({
    routeTree,
    context: { queryClient, auth },
    history: createMemoryHistory({ initialEntries }),
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext value={auth}>
        <RouterProvider router={router} />
      </AuthContext>
    </QueryClientProvider>
  )

  return { router, queryClient, ...utils }
}
```

- [ ] **Step 12: Écrire le test de la page d'accueil**

`src/routes/index.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderRoute } from "@/test/utils"

describe("home route", () => {
  it("renders the landing page for an anonymous visitor", async () => {
    renderRoute({ initialEntries: ["/"] })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Project ready!" })
      ).toBeInTheDocument()
    })

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument()
  })

  it("renders the not-found component for an unknown path", async () => {
    renderRoute({ initialEntries: ["/nope"] })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Page not found" })
      ).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 13: Lancer le test et vérifier qu'il passe**

Run: `bunx vitest run src/routes/index.test.tsx`
Expected: PASS — 2 tests

Si le test échoue sur un import de `routeTree.gen.ts` manquant, relancer `bun run routes:generate`.

- [ ] **Step 14: Vérifier l'application dans le navigateur**

Lancer `bun dev` **en arrière-plan** (il ne rend pas la main), ouvrir `http://localhost:5173`, puis arrêter le serveur.
Attendu : la page d'accueil s'affiche, le lien `Home` est présent, les deux panneaux de devtools apparaissent en bas de page, la console ne montre aucune erreur.

- [ ] **Step 15: Vérifier l'ensemble**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: aucune erreur

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "feat: TanStack Router avec contexte typé, shell applicatif et page d'accueil"
```

---

### Task 6: Connexion et garde des routes protégées

Livre le formulaire de connexion (premier usage de TanStack Form) et la garde `beforeLoad` avec redirection aller-retour.

**Files:**
- Create: `src/routes/login.tsx`
- Create: `src/routes/_authenticated.tsx`
- Create: `src/routes/_authenticated/dashboard.tsx`
- Create: `src/routes/_authenticated.test.tsx`
- Add: composants shadcn `input` et `label`

**Interfaces:**
- Consumes: `useAuth` (Task 4), `renderRoute` / `testUser` (Task 5), `DEMO_PASSWORD` (Task 4).
- Produces: la route `/login` acceptant le search param `redirect?: string` ; le layout `/_authenticated` qui redirige les visiteurs anonymes.

- [ ] **Step 1: Ajouter les composants de formulaire shadcn**

Run: `bunx shadcn@latest add input label`
Expected: `src/components/ui/input.tsx` et `src/components/ui/label.tsx` sont créés

- [ ] **Step 2: Écrire le test qui échoue**

`src/routes/_authenticated.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderRoute, testUser } from "@/test/utils"

describe("authenticated layout", () => {
  it("redirects an anonymous visitor to the login page", async () => {
    const { router } = renderRoute({ initialEntries: ["/dashboard"] })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login")
    })

    expect(router.state.location.search).toEqual({ redirect: "/dashboard" })
  })

  it("lets a signed-in user reach the dashboard", async () => {
    const { router } = renderRoute({
      initialEntries: ["/dashboard"],
      user: testUser,
    })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Dashboard" })
      ).toBeInTheDocument()
    })

    expect(router.state.location.pathname).toBe("/dashboard")
  })

  it("renders the login form for an anonymous visitor", async () => {
    renderRoute({ initialEntries: ["/login"] })

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument()
    })

    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `bunx vitest run src/routes/_authenticated.test.tsx`
Expected: FAIL — les routes `/dashboard` et `/login` n'existent pas

- [ ] **Step 4: Créer le layout protégé**

`src/routes/_authenticated.tsx` — route de layout *pathless* : le préfixe `_` la fait grouper des enfants sans ajouter de segment d'URL.

```tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

function AuthenticatedLayout() {
  return <Outlet />
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
```

- [ ] **Step 5: Créer la page du tableau de bord**

`src/routes/_authenticated/dashboard.tsx`. Pas de lien vers `/posts` ici : cette route n'existe qu'en Task 7, et un lien typé vers elle ne compilerait pas. La Task 7 l'ajoute.

```tsx
import { createFileRoute } from "@tanstack/react-router"

import { useAuth } from "@/features/auth/use-auth"

function DashboardPage() {
  const auth = useAuth()

  return (
    <div className="flex max-w-md flex-col gap-3 text-sm">
      <h1 className="font-medium">Dashboard</h1>
      <p className="text-muted-foreground">
        Signed in as {auth.user?.email}. This route is behind the
        <code className="mx-1">_authenticated</code> layout guard.
      </p>
    </div>
  )
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
})
```

- [ ] **Step 6: Créer la page de connexion**

`src/routes/login.tsx` :

```tsx
import { useForm } from "@tanstack/react-form"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEMO_PASSWORD } from "@/features/auth/auth-context"
import { useAuth } from "@/features/auth/use-auth"

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

const loginFormSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

function LoginPage() {
  const auth = useAuth()
  const router = useRouter()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onChange: loginFormSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        await auth.login(value)
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to sign in"
        )
        return
      }

      // Rejoue les `beforeLoad` avec le nouveau contexte d'authentification.
      await router.invalidate()
      await navigate({ to: search.redirect ?? "/dashboard" })
    },
  })

  return (
    <form
      className="flex max-w-sm flex-col gap-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div>
        <h1 className="font-medium">Sign in</h1>
        <p className="text-muted-foreground">
          Any email works. The demo password is
          <code className="mx-1">{DEMO_PASSWORD}</code>.
        </p>
      </div>

      <form.Field name="email">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Email</Label>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-destructive text-xs">
                {field.state.meta.errors[0]?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Password</Label>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-destructive text-xs">
                {field.state.meta.errors[0]?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {formError && (
        <p role="alert" className="text-destructive text-xs">
          {formError}
        </p>
      )}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  component: LoginPage,
})
```

- [ ] **Step 7: Régénérer l'arbre de routes**

Run: `bun run routes:generate`
Expected: `routeTree.gen.ts` référence `/login`, `/_authenticated` et `/_authenticated/dashboard`

- [ ] **Step 8: Enrichir la navigation du shell**

Ces routes existent désormais : `__root.tsx` peut y renvoyer. Dans `src/routes/__root.tsx`, ajouter les deux imports :

```tsx
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/use-auth"
```

et remplacer la fonction `RootLayout` par :

```tsx
function RootLayout() {
  const auth = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-4 border-b px-6 py-3 text-sm">
        <nav className="flex flex-1 items-center gap-4">
          <Link to="/" className={navLinkClass}>
            Home
          </Link>
          <Link to="/dashboard" className={navLinkClass}>
            Dashboard
          </Link>
        </nav>
        {auth.isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">
              {auth.user?.email}
            </span>
            <Button size="sm" variant="outline" onClick={auth.logout}>
              Sign out
            </Button>
          </div>
        ) : (
          <Link to="/login" className={navLinkClass}>
            Sign in
          </Link>
        )}
      </header>

      <main className="flex-1 p-6">
        <Outlet />
      </main>

      <Suspense>
        <RouterDevtools position="bottom-right" />
        <QueryDevtools buttonPosition="bottom-left" />
      </Suspense>
    </div>
  )
}
```

Dans `src/routes/index.tsx`, ajouter le bouton de connexion — les imports deviennent :

```tsx
import { createFileRoute, Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"
```

et le paragraphe d'accueil devient :

```tsx
        <p>
          Typed routing, a query cache, mocked API handlers and tests are all
          wired up. Sign in to reach the protected routes.
        </p>
        <Link to="/login" className={buttonVariants({ className: "mt-2" })}>
          Sign in
        </Link>
```

- [ ] **Step 9: Adapter le test de la page d'accueil**

`__root.tsx` rend maintenant deux liens `Sign in` possibles selon l'état. Dans `src/routes/index.test.tsx`, remplacer l'assertion sur le lien `Home` par :

```tsx
    expect(screen.getAllByRole("link", { name: "Sign in" })).toHaveLength(2)
```

Run: `bunx vitest run src/routes/index.test.tsx`
Expected: PASS — 2 tests

- [ ] **Step 10: Lancer le test de la garde et vérifier qu'il passe**

Run: `bunx vitest run src/routes/_authenticated.test.tsx`
Expected: PASS — 3 tests

Le troisième test (`renders the login form`) trouve deux éléments nommés « Sign in » : le lien de la barre de navigation et le bouton du formulaire. `getByRole("button", { name: "Sign in" })` ne remonte que le bouton — c'est bien ce que le test interroge.

- [ ] **Step 11: Vérifier le parcours réel dans le navigateur**

Lancer `bun dev` **en arrière-plan**, dérouler le parcours, puis arrêter le serveur.
Attendu : `/dashboard` en anonyme redirige vers `/login?redirect=%2Fdashboard` ; se connecter avec n'importe quel email et le mot de passe `password` ramène sur `/dashboard` ; « Sign out » revient à l'état anonyme.

- [ ] **Step 12: Vérifier l'ensemble**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: aucune erreur

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: connexion avec TanStack Form et garde des routes protégées"
```

---

### Task 7: Liste et détail des posts

Livre le pattern loader-first complet : `ensureQueryData` dans le loader, `useSuspenseQuery` dans le composant, search params validés par Zod.

**Files:**
- Create: `src/features/posts/components/post-card.tsx`
- Create: `src/features/posts/components/post-card.test.tsx`
- Create: `src/routes/_authenticated/posts.index.tsx`
- Create: `src/routes/_authenticated/posts.$postId.tsx`
- Create: `src/routes/_authenticated/posts.test.tsx`

**Interfaces:**
- Consumes: `postsQueryOptions`, `postQueryOptions` (Task 3), `postsSearchSchema` et le type `Post` (Task 2), `renderRoute` / `testUser` (Task 5).
- Produces: `PostCard({ post }: { post: Post })` depuis `@/features/posts/components/post-card`.

- [ ] **Step 1: Écrire le test du composant**

`src/features/posts/components/post-card.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Post } from "../schemas/post.schema"
import { PostCard } from "./post-card"

const post: Post = {
  id: "42",
  title: "A test post",
  body: "The body of the test post.",
  author: "Ada",
  createdAt: "2026-01-12T09:00:00.000Z",
}

describe("PostCard", () => {
  it("shows the title, author and body", () => {
    render(<PostCard post={post} />)

    expect(screen.getByText("A test post")).toBeInTheDocument()
    expect(screen.getByText(/Ada/)).toBeInTheDocument()
    expect(screen.getByText("The body of the test post.")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `bunx vitest run src/features/posts/components/post-card.test.tsx`
Expected: FAIL — `Failed to resolve import "./post-card"`

- [ ] **Step 3: Implémenter `PostCard`**

`src/features/posts/components/post-card.tsx` :

```tsx
import type { Post } from "../schemas/post.schema"

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="flex flex-col gap-1 rounded-md border p-3 text-sm">
      <h2 className="font-medium">{post.title}</h2>
      <p className="text-muted-foreground text-xs">
        {post.author} — {new Date(post.createdAt).toLocaleDateString("en-GB")}
      </p>
      <p className="text-muted-foreground">{post.body}</p>
    </article>
  )
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `bunx vitest run src/features/posts/components/post-card.test.tsx`
Expected: PASS — 1 test

- [ ] **Step 5: Écrire le test des routes posts**

`src/routes/_authenticated/posts.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderRoute, testUser } from "@/test/utils"

describe("posts routes", () => {
  it("lists the first page of posts", async () => {
    renderRoute({ initialEntries: ["/posts"], user: testUser })

    await waitFor(() => {
      expect(screen.getByText("Typed routing end to end")).toBeInTheDocument()
    })

    expect(screen.getAllByRole("article")).toHaveLength(3)
  })

  it("filters the list from the search box", async () => {
    const user = userEvent.setup()
    const { router } = renderRoute({
      initialEntries: ["/posts"],
      user: testUser,
    })

    await waitFor(() => {
      expect(screen.getByText("Typed routing end to end")).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText("Search posts"), "loaders")

    await waitFor(() => {
      expect(screen.getAllByRole("article")).toHaveLength(1)
    })

    expect(router.state.location.search).toEqual({ page: 1, q: "loaders" })
  })

  it("opens a post detail page", async () => {
    renderRoute({ initialEntries: ["/posts/3"], user: testUser })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Guarding routes with context" })
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/Alan/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Lancer le test et vérifier qu'il échoue**

Run: `bunx vitest run src/routes/_authenticated/posts.test.tsx`
Expected: FAIL — les routes `/posts` et `/posts/$postId` n'existent pas

- [ ] **Step 7: Créer la route liste**

`src/routes/_authenticated/posts.index.tsx` — `loaderDeps` est obligatoire : sans lui, le loader ne se rejoue pas quand les search params changent.

Le champ de recherche a son propre état local, resynchronisé depuis l'URL. Le lier
directement à `search.q` ne fonctionne pas : `navigate()` est asynchrone, et React
réinitialise la valeur DOM d'un champ contrôlé à la dernière valeur committée après
chaque frappe. Résultat, en frappe rapide, seul le dernier caractère survit. L'état
local rend la saisie immédiate, l'URL reste la source de vérité pour les données,
et l'effet gère les changements d'URL qui ne viennent pas du clavier (retour arrière,
lien partagé).

```tsx
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { postsQueryOptions } from "@/features/posts/api/posts.queries"
import { PostCard } from "@/features/posts/components/post-card"
import { postsSearchSchema } from "@/features/posts/schemas/post.schema"

function PostsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(postsQueryOptions(search))
  const [query, setQuery] = useState(search.q ?? "")
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize))

  // Resynchronise le champ quand l'URL change sans passer par le clavier.
  useEffect(() => {
    setQuery(search.q ?? "")
  }, [search.q])

  return (
    <div className="flex max-w-2xl flex-col gap-4 text-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="posts-search">Search posts</Label>
        <Input
          id="posts-search"
          value={query}
          onChange={(event) => {
            const value = event.target.value

            setQuery(value)
            void navigate({
              search: { page: 1, q: value === "" ? undefined : value },
              replace: true,
            })
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {data.items.map((post) => (
          <Link
            key={post.id}
            to="/posts/$postId"
            params={{ postId: post.id }}
            className="rounded-md focus-visible:outline-2"
          >
            <PostCard post={post} />
          </Link>
        ))}
        {data.items.length === 0 && (
          <p className="text-muted-foreground">No post matches this search.</p>
        )}
      </div>

      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <Link
          to="/posts"
          search={{ page: Math.max(1, search.page - 1), q: search.q }}
          disabled={search.page <= 1}
          className="underline underline-offset-4 aria-disabled:no-underline aria-disabled:opacity-50"
        >
          Previous
        </Link>
        <span>
          Page {search.page} of {pageCount}
        </span>
        <Link
          to="/posts"
          search={{ page: Math.min(pageCount, search.page + 1), q: search.q }}
          disabled={search.page >= pageCount}
          className="underline underline-offset-4 aria-disabled:no-underline aria-disabled:opacity-50"
        >
          Next
        </Link>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/_authenticated/posts/")({
  validateSearch: postsSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(postsQueryOptions(deps)),
  component: PostsPage,
})
```

- [ ] **Step 8: Créer la route détail**

`src/routes/_authenticated/posts.$postId.tsx` :

```tsx
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import { postQueryOptions } from "@/features/posts/api/posts.queries"

function PostDetailPage() {
  const { postId } = Route.useParams()
  const { data: post } = useSuspenseQuery(postQueryOptions(postId))

  return (
    <div className="flex max-w-2xl flex-col gap-3 text-sm">
      <Link
        to="/posts"
        search={{ page: 1 }}
        className="text-muted-foreground text-xs underline underline-offset-4"
      >
        Back to posts
      </Link>
      <h1 className="font-medium">{post.title}</h1>
      <p className="text-muted-foreground text-xs">
        {post.author} — {new Date(post.createdAt).toLocaleDateString("en-GB")}
      </p>
      <p>{post.body}</p>
    </div>
  )
}

export const Route = createFileRoute("/_authenticated/posts/$postId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(postQueryOptions(params.postId)),
  component: PostDetailPage,
})
```

- [ ] **Step 9: Régénérer l'arbre de routes**

Run: `bun run routes:generate`
Expected: `routeTree.gen.ts` référence `/_authenticated/posts/` et `/_authenticated/posts/$postId`

- [ ] **Step 10: Ajouter les liens vers /posts, maintenant que la route existe**

Deux fichiers ont dû omettre ce lien jusqu'ici, faute de route cible : un `<Link to="/posts">` ne compile pas tant que la route n'est pas dans l'arbre généré.

Dans `src/routes/__root.tsx`, ajouter à la fin du `<nav>`, après le lien `Dashboard` :

```tsx
          <Link to="/posts" search={{ page: 1 }} className={navLinkClass}>
            Posts
          </Link>
```

Dans `src/routes/_authenticated/dashboard.tsx`, ajouter `Link` à l'import de `@tanstack/react-router` puis insérer le lien après le paragraphe :

```tsx
      <Link
        to="/posts"
        search={{ page: 1 }}
        className="underline underline-offset-4"
      >
        Browse posts
      </Link>
```

- [ ] **Step 11: Lancer le test et vérifier qu'il passe**

Run: `bunx vitest run src/routes/_authenticated/posts.test.tsx`
Expected: PASS — 3 tests

- [ ] **Step 12: Vérifier dans le navigateur**

Lancer `bun dev` **en arrière-plan**, dérouler le parcours, puis arrêter le serveur.
Attendu : après connexion, `/posts` liste 3 posts, la recherche met à jour l'URL, la pagination fonctionne, un clic ouvre le détail, et taper `boom` dans la recherche affiche le composant d'erreur.

- [ ] **Step 13: Vérifier l'ensemble**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: aucune erreur

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: liste et détail des posts en loader-first avec search params validés"
```

---

### Task 8: Création de post — mutation et invalidation

Complète la boucle en écriture : formulaire validé, mutation, invalidation du cache, rafraîchissement de la liste.

**Files:**
- Modify: `src/features/posts/api/posts.queries.ts` (ajout de `useCreatePost`)
- Create: `src/features/posts/components/post-form.tsx`
- Modify: `src/routes/_authenticated/posts.index.tsx` (montage du formulaire)
- Create: `src/features/posts/components/post-form.test.tsx`

**Interfaces:**
- Consumes: `createPost` (Task 2), `createPostSchema` (Task 2), `postKeys` (Task 3), `renderWithProviders` (Task 3).
- Produces: `useCreatePost()` depuis `@/features/posts/api/posts.queries` ; `PostForm({ onCreated }: { onCreated?: () => void })` depuis `@/features/posts/components/post-form`.

- [ ] **Step 1: Écrire le test qui échoue**

`src/features/posts/components/post-form.test.tsx` :

```tsx
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/utils"

import { PostForm } from "./post-form"

describe("PostForm", () => {
  it("rejects a title that is too short", async () => {
    const user = userEvent.setup()
    renderWithProviders(<PostForm />)

    await user.type(screen.getByLabelText("Title"), "ab")

    expect(
      await screen.findByText("Title must be at least 3 characters")
    ).toBeInTheDocument()
  })

  it("creates a post and notifies the caller", async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    renderWithProviders(<PostForm onCreated={onCreated} />)

    await user.type(screen.getByLabelText("Title"), "A fresh post")
    await user.type(
      screen.getByLabelText("Body"),
      "This body is definitely long enough."
    )
    await user.click(screen.getByRole("button", { name: "Create post" }))

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledOnce()
    })

    expect(screen.getByLabelText("Title")).toHaveValue("")
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `bunx vitest run src/features/posts/components/post-form.test.tsx`
Expected: FAIL — `Failed to resolve import "./post-form"`

- [ ] **Step 3: Ajouter la mutation**

Ajouter à la fin de `src/features/posts/api/posts.queries.ts` (et compléter l'import du haut de fichier) :

```ts
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

import { createPost, fetchPost, fetchPosts } from "./posts.api"
```

```ts
export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      // Toutes les listes deviennent obsolètes : on invalide la racine.
      void queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })
}
```

- [ ] **Step 4: Implémenter le formulaire**

`src/features/posts/components/post-form.tsx` :

```tsx
import { useForm } from "@tanstack/react-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useCreatePost } from "../api/posts.queries"
import { createPostSchema } from "../schemas/post.schema"

export function PostForm({ onCreated }: { onCreated?: () => void }) {
  const createPost = useCreatePost()

  const form = useForm({
    defaultValues: { title: "", body: "" },
    validators: { onChange: createPostSchema },
    onSubmit: async ({ value, formApi }) => {
      await createPost.mutateAsync(value)
      formApi.reset()
      onCreated?.()
    },
  })

  return (
    <form
      className="flex flex-col gap-3 rounded-md border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <h2 className="text-sm font-medium">New post</h2>

      <form.Field name="title">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Title</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-destructive text-xs">
                {field.state.meta.errors[0]?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="body">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Body</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-destructive text-xs">
                {field.state.meta.errors[0]?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {createPost.isError && (
        <p role="alert" className="text-destructive text-xs">
          {createPost.error.message}
        </p>
      )}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Creating…" : "Create post"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `bunx vitest run src/features/posts/components/post-form.test.tsx`
Expected: PASS — 2 tests

- [ ] **Step 6: Monter le formulaire sur la page liste**

Dans `src/routes/_authenticated/posts.index.tsx`, ajouter l'import :

```tsx
import { PostForm } from "@/features/posts/components/post-form"
```

et insérer le formulaire juste après le bloc du champ de recherche, avant la liste :

```tsx
      <PostForm
        onCreated={() => {
          void navigate({ search: { page: 1, q: undefined } })
        }}
      />
```

- [ ] **Step 7: Vérifier que la liste se rafraîchit après création**

Run: `bunx vitest run src/routes/_authenticated/posts.test.tsx`
Expected: PASS — les 3 tests existants passent toujours

- [ ] **Step 8: Vérifier dans le navigateur**

Lancer `bun dev` **en arrière-plan**, vérifier, puis arrêter le serveur.
Attendu : sur `/posts`, créer un post l'affiche en tête de liste sans rechargement de page, et le formulaire se vide.

- [ ] **Step 9: Vérifier l'ensemble**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: aucune erreur

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: création de post avec mutation et invalidation du cache"
```

---

### Task 9: Documentation du template et vérification finale

Rend le template utilisable par quelqu'un qui le découvre, et valide la chaîne complète, build compris.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Réécrire le README**

Remplacer intégralement `README.md` par :

````markdown
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
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
| `bun run routes:generate` | Régénère `src/routeTree.gen.ts` à la demande |

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
`defaultPreload: "intent"` les données arrivent avant le clic.

**Routes protégées.** `src/routes/_authenticated.tsx` est une route de layout
pathless dont le `beforeLoad` lit `context.auth` et redirige vers `/login` en
conservant l'URL demandée. Après connexion, `router.invalidate()` rejoue les
gardes.

**Validation par Zod partout.** Réponses d'API, search params (`/posts?page=2`),
formulaires et variables d'environnement passent par un schéma.

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
4. **Supprimer la démo** : retirer `src/features/posts`, les routes
   `posts.*`, et les handlers correspondants dans `src/mocks/handlers.ts`.
````

- [ ] **Step 2: Vérifier la suite complète**

Run: `bun run typecheck && bun run lint && bun run test && bun run build`
Expected: les quatre commandes réussissent ; `bun run build` produit `dist/`

- [ ] **Step 3: Vérifier le formatage**

Run: `bun run format && git diff --stat`
Expected: aucun fichier modifié (le code du plan est déjà au format Prettier du dépôt)

- [ ] **Step 4: Vérifier le parcours complet une dernière fois**

Lancer `bun dev` **en arrière-plan**, dérouler le parcours, puis arrêter le serveur.
Attendu, dans l'ordre : `/` s'affiche → `/dashboard` redirige vers `/login` → connexion avec `password` → retour automatique sur `/dashboard` → `/posts` liste et pagine → recherche → détail d'un post → création d'un post → « Sign out » → `/posts` redirige de nouveau vers `/login`. Aucune erreur en console.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README du template et vérification de bout en bout"
```

---

## Notes de vérification pour l'implémenteur

Trois pièges connus, chacun couvert par une étape du plan :

1. **Ordre des plugins Vite** — `tanstackRouter()` doit précéder `react()`. Si `routeTree.gen.ts` ne se régénère pas pendant `bun dev`, c'est la première chose à vérifier.
2. **Contexte d'authentification figé** — passer `auth` à `createRouter` en production au lieu du `RouterProvider` casse la garde silencieusement : l'utilisateur reste bloqué sur `/login` après connexion. Le test « lets a signed-in user reach the dashboard » de la Task 6 couvre ce cas.
3. **`loaderDeps` manquant** — sans lui sur `/posts`, changer de page ou de recherche ne relance pas le loader et l'affichage semble figé. Le test de filtrage de la Task 7 couvre ce cas.
