import { createFileRoute, Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"

function HomePage() {
  return (
    <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
      <div>
        <h1 className="font-medium">Project ready!</h1>
        <p>
          Typed routing, a query cache, mocked API handlers and tests are all
          wired up. Sign in to reach the protected routes.
        </p>
        <Link to="/login" className={buttonVariants({ className: "mt-2" })}>
          Sign in
        </Link>
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        (Press <kbd>d</kbd> to toggle dark mode)
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({
  component: HomePage,
})
