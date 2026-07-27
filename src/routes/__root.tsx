import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/use-auth"
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
  const auth = useAuth()
  const navigate = useNavigate()

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
          <Link to="/posts" search={{ page: 1 }} className={navLinkClass}>
            Posts
          </Link>
        </nav>
        {auth.isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {auth.user?.email}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                auth.logout()
                // `auth.logout()` ne fait que `setUser(null)` : React ne
                // l'applique qu'au rendu suivant, donc un `router.invalidate()`
                // synchrone ici lirait encore l'ancien contexte authentifié
                // et la garde `_authenticated` ne redirigerait pas. On navigue
                // donc explicitement vers une route publique pour démonter la
                // route protégée, sans dépendre de cet ordonnancement.
                void navigate({ to: "/" })
              }}
            >
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

function PendingComponent() {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      Loading…
    </p>
  )
}

function NotFoundComponent() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="font-medium">Page not found</h1>
      <p className="text-sm text-muted-foreground">
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
      <p className="text-sm text-destructive">{error.message}</p>
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
