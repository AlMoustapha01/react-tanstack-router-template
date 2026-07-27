import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderRoute, testUser } from "@/test/utils"

describe("authenticated layout", () => {
  it("redirects an anonymous visitor to the login page", async () => {
    const { router } = renderRoute({ initialEntries: ["/dashboard"] })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login")
    })

    expect(router.state.location.search).toEqual({ redirect: "/dashboard" })
  })

  it("lets a signed-in user reach the dashboard", async () => {
    const { router } = renderRoute({
      initialEntries: ["/dashboard"],
      user: testUser,
    })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Dashboard" })
      ).toBeInTheDocument()
    })

    expect(router.state.location.pathname).toBe("/dashboard")
  })

  it("renders the login form for an anonymous visitor", async () => {
    renderRoute({ initialEntries: ["/login"] })

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument()
    })

    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })
})
