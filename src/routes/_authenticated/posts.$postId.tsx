import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { postQueryOptions } from "@/features/posts/api/posts.queries";

function PostDetailPage() {
  const { postId } = Route.useParams();
  const { data: post } = useSuspenseQuery(postQueryOptions(postId));

  return (
    <div className="flex max-w-2xl flex-col gap-3 text-sm">
      <Link
        to="/posts"
        search={{ page: 1 }}
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        Back to posts
      </Link>
      <h1 className="font-medium">{post.title}</h1>
      <p className="text-xs text-muted-foreground">
        {post.author} — {new Date(post.createdAt).toLocaleDateString("en-GB")}
      </p>
      <p>{post.body}</p>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/posts/$postId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(postQueryOptions(params.postId)),
  component: PostDetailPage,
});
