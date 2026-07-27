import type { Post } from "../schemas/post.schema"

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="flex flex-col gap-1 rounded-md border p-3 text-sm">
      <h2 className="font-medium">{post.title}</h2>
      <p className="text-xs text-muted-foreground">
        {post.author} — {new Date(post.createdAt).toLocaleDateString("en-GB")}
      </p>
      <p className="text-muted-foreground">{post.body}</p>
    </article>
  )
}
