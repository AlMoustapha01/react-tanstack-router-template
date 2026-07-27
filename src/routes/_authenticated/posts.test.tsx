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

    await user.type(screen.getByLabelText("Search posts"), "loaders{Enter}")

    await waitFor(() => {
      expect(screen.getAllByRole("article")).toHaveLength(1)
    })

    expect(screen.getByText("Loaders meet the query cache")).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ page: 1, q: "loaders" })
  })

  it("shows a freshly created post at the top of the list", async () => {
    const user = userEvent.setup()
    renderRoute({ initialEntries: ["/posts"], user: testUser })

    await waitFor(() => {
      expect(screen.getByText("Typed routing end to end")).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText("Title"), "A brand new post")
    await user.type(
      screen.getByLabelText("Body"),
      "A body long enough to pass validation."
    )
    await user.click(screen.getByRole("button", { name: "Create post" }))

    // La mutation invalide le cache : la liste se recharge sans navigation.
    await waitFor(() => {
      expect(screen.getByText("A brand new post")).toBeInTheDocument()
    })

    expect(screen.getAllByRole("article")[0]).toHaveTextContent(
      "A brand new post"
    )
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
