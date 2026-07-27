import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderRoute, testUser } from "@/test/utils"

describe("posts routes", () => {
  it("lists the first page of posts", async () => {
    renderRoute({ initialEntries: ["/posts"], user: testUser })

    await waitFor(() => {
      expect(screen.getByText("Typed routing end to end")).toBeInTheDocument()
    })

    expect(screen.getAllByRole("article")).toHaveLength(3)
  })

  it("filters the list from the search box", async () => {
    const user = userEvent.setup()
    const { router } = renderRoute({
      initialEntries: ["/posts"],
      user: testUser,
    })

    await waitFor(() => {
      expect(screen.getByText("Typed routing end to end")).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText("Search posts"), "loaders")

    await waitFor(() => {
      expect(screen.getAllByRole("article")).toHaveLength(1)
    })

    expect(router.state.location.search).toEqual({ page: 1, q: "loaders" })
  })

  it("opens a post detail page", async () => {
    renderRoute({ initialEntries: ["/posts/3"], user: testUser })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Guarding routes with context" })
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/Alan/)).toBeInTheDocument()
  })
})
