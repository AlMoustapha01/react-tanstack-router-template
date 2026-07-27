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
