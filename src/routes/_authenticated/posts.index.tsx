import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { postsQueryOptions } from "@/features/posts/api/posts.queries"
import { PostCard } from "@/features/posts/components/post-card"
import { postsSearchSchema } from "@/features/posts/schemas/post.schema"

function PostsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(postsQueryOptions(search))
  // Le champ vit sur son propre état, initialisé depuis l'URL, et n'écrit dans
  // l'URL qu'à la validation. Naviguer à chaque frappe paraît plus vif mais
  // crée une course : `navigate()` est asynchrone, donc l'URL reste en retard
  // sur la saisie, et chaque rendu déclenché par la navigation précédente
  // réécrit le champ avec une valeur périmée. La validation explicite supprime
  // la course, et l'URL reste la source de vérité des données affichées.
  const [query, setQuery] = useState(search.q ?? "")
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize))

  return (
    <div className="flex max-w-2xl flex-col gap-4 text-sm">
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()

          void navigate({
            search: { page: 1, q: query === "" ? undefined : query },
          })
        }}
      >
        <Label htmlFor="posts-search">Search posts</Label>
        <Input
          id="posts-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

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

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
  // TEMP contre-épreuve : deps constant, insensible à `search` — équivalent
  // fonctionnel de "loaderDeps absent" sans casser le typage de `deps`.
  loaderDeps: () => ({ page: 1 }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(postsQueryOptions(deps)),
  component: PostsPage,
})
