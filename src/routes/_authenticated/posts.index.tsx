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

  // Resynchronise le champ quand l'URL change sans passer par le clavier
  // (retour arrière, lien partagé) : c'est une synchronisation avec une
  // source externe (l'URL), pas un état dérivé — l'exception documentée de
  // la règle `set-state-in-effect`.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(postsQueryOptions(deps)),
  component: PostsPage,
})
