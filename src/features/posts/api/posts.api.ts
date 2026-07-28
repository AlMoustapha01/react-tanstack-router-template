import { env } from "@/lib/env";

import {
  postListSchema,
  postSchema,
  type CreatePostInput,
  type Post,
  type PostList,
  type PostsSearch,
} from "../schemas/post.schema";

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${env.VITE_API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchPosts(search: PostsSearch): Promise<PostList> {
  const params = new URLSearchParams({ page: String(search.page) });

  if (search.q) {
    params.set("q", search.q);
  }

  return postListSchema.parse(await request(`/posts?${params.toString()}`));
}

export async function fetchPost(postId: string): Promise<Post> {
  return postSchema.parse(await request(`/posts/${postId}`));
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  return postSchema.parse(
    await request("/posts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}
