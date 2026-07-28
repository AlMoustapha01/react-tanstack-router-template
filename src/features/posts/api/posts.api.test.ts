import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { env } from "@/lib/env";
import { server } from "@/mocks/node";

import { createPost, fetchPost, fetchPosts } from "./posts.api";

describe("posts api", () => {
  it("returns the first page of posts", async () => {
    const result = await fetchPosts({ page: 1 });

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(5);
    expect(result.items[0].title).toBe("Typed routing end to end");
  });

  it("filters posts by query", async () => {
    const result = await fetchPosts({ page: 1, q: "loaders" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("2");
  });

  it("returns a single post by id", async () => {
    const post = await fetchPost("3");

    expect(post.author).toBe("Alan");
  });

  it("throws when a post does not exist", async () => {
    await expect(fetchPost("does-not-exist")).rejects.toThrow(/404/);
  });

  it("creates a post and returns it", async () => {
    const post = await createPost({
      title: "A brand new post",
      body: "Long enough body to pass validation.",
    });

    expect(post.title).toBe("A brand new post");
    expect(post.author).toBe("You");
  });

  it("rejects a response that breaks the schema", async () => {
    server.use(
      http.get(`${env.VITE_API_URL}/posts/:postId`, () =>
        HttpResponse.json({ id: "1", title: "Missing fields" }),
      ),
    );

    await expect(fetchPost("1")).rejects.toThrow();
  });
});
