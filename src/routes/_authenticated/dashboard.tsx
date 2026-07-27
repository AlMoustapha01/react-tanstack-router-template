import { createFileRoute, Link } from "@tanstack/react-router"

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
      <Link
        to="/posts"
        search={{ page: 1 }}
        className="underline underline-offset-4"
      >
        Browse posts
      </Link>
    </div>
  )
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
})
