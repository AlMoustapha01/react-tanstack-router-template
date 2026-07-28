import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import type { PostsSearch } from "../schemas/post.schema";
import { createPost, fetchPost, fetchPosts } from "./posts.api";

export const postKeys = {
  all: ["posts"] as const,
  list: (search: PostsSearch) => ["posts", "list", search] as const,
  detail: (postId: string) => ["posts", "detail", postId] as const,
};

export function postsQueryOptions(search: PostsSearch) {
  return queryOptions({
    queryKey: postKeys.list(search),
    queryFn: () => fetchPosts(search),
  });
}

export function postQueryOptions(postId: string) {
  return queryOptions({
    queryKey: postKeys.detail(postId),
    queryFn: () => fetchPost(postId),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      // Toutes les listes deviennent obsolètes : on invalide la racine.
      void queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}
