import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll } from "vitest"

import { resetMockPosts } from "@/mocks/handlers"
import { server } from "@/mocks/node"

// jsdom n'implémente pas `scrollTo`, que le router appelle à chaque
// navigation (scrollRestoration) : sans ce stub, chaque test de route
// affiche un avertissement "Not implemented" qui noie le signal utile.
window.scrollTo = () => {}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetMockPosts()
})

afterAll(() => {
  server.close()
})
