import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderRoute } from "@/test/utils"

describe("home route", () => {
  it("renders the landing page for an anonymous visitor", async () => {
    renderRoute({ initialEntries: ["/"] })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Project ready!" })
      ).toBeInTheDocument()
    })

    expect(screen.getAllByRole("link", { name: "Sign in" })).toHaveLength(2)
  })

  it("renders the not-found component for an unknown path", async () => {
    renderRoute({ initialEntries: ["/nope"] })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Page not found" })
      ).toBeInTheDocument()
    })
  })
})
