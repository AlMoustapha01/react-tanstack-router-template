import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/utils";

import { PostForm } from "./post-form";

describe("PostForm", () => {
  it("rejects a title that is too short", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostForm />);

    await user.type(screen.getByLabelText("Title"), "ab");

    expect(await screen.findByText("Title must be at least 3 characters")).toBeInTheDocument();
  });

  it("creates a post and notifies the caller", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(<PostForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Title"), "A fresh post");
    await user.type(screen.getByLabelText("Body"), "This body is definitely long enough.");
    await user.click(screen.getByRole("button", { name: "Create post" }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledOnce();
    });

    expect(screen.getByLabelText("Title")).toHaveValue("");
  });
});
