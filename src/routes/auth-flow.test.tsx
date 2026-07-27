import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderApp } from "@/test/utils"

/**
 * Ces tests montent l'application avec le vrai `AuthProvider` et le contexte
 * injecté par la prop `context` du `RouterProvider`, exactement comme
 * `main.tsx`. Ils couvrent les deux transitions d'authentification, dont
 * chacune a un piège d'ordonnancement : la connexion dépend de
 * `router.invalidate()` rejouant les gardes avec le contexte rafraîchi, et la
 * déconnexion doit naviguer explicitement, car `beforeLoad` s'exécute de façon
 * synchrone et lirait sinon un contexte que React n'a pas encore mis à jour.
 */
describe("auth flow", () => {
  it("signs in and lands on the originally requested page", async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ initialEntries: ["/dashboard"] })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login")
    })

    await user.type(await screen.findByLabelText("Email"), "ada@example.com")
    await user.type(screen.getByLabelText("Password"), "password")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(
      await screen.findByRole("heading", { name: "Dashboard" })
    ).toBeVisible()
    expect(router.state.location.pathname).toBe("/dashboard")
  })

  it("rejects a wrong password without navigating", async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ initialEntries: ["/login"] })

    await user.type(await screen.findByLabelText("Email"), "ada@example.com")
    await user.type(screen.getByLabelText("Password"), "wrong")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password"
    )
    expect(router.state.location.pathname).toBe("/login")
  })

  it("signs out and leaves the protected page", async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ initialEntries: ["/login"] })

    await user.type(await screen.findByLabelText("Email"), "ada@example.com")
    await user.type(screen.getByLabelText("Password"), "password")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await screen.findByRole("heading", { name: "Dashboard" })

    await user.click(screen.getByRole("button", { name: "Sign out" }))

    // La page protégée doit céder la place, et pas seulement perdre son
    // en-tête : c'était le symptôme du bug d'origine.
    expect(
      await screen.findByRole("heading", { name: "Project ready!" })
    ).toBeVisible()
    expect(
      screen.queryByRole("heading", { name: "Dashboard" })
    ).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/")
  })
})
