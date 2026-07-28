import { z } from "zod";

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
  createdAt: z.iso.datetime(),
});

export type Post = z.infer<typeof postSchema>;

export const postListSchema = z.object({
  items: z.array(postSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type PostList = z.infer<typeof postListSchema>;

export const createPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  body: z.string().min(10, "Body must be at least 10 characters"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const postsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().optional(),
});

export type PostsSearch = z.infer<typeof postsSearchSchema>;
