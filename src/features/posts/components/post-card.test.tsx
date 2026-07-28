import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Post } from "../schemas/post.schema";
import { PostCard } from "./post-card";

const post: Post = {
  id: "42",
  title: "A test post",
  body: "The body of the test post.",
  author: "Ada",
  createdAt: "2026-01-12T09:00:00.000Z",
};

describe("PostCard", () => {
  it("shows the title, author and body", () => {
    render(<PostCard post={post} />);

    expect(screen.getByText("A test post")).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByText("The body of the test post.")).toBeInTheDocument();
  });
});
