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
