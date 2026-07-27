import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/features/auth/auth-provider"
import { useAuth } from "@/features/auth/use-auth"
import { queryClient } from "@/lib/query-client"
import { router } from "@/router"

function InnerApp() {
  const auth = useAuth()

  return <RouterProvider router={router} context={{ auth }} />
}

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return
  }

  const { worker } = await import("./mocks/browser")
  await worker.start({ onUnhandledRequest: "bypass" })
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <InnerApp />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>
  )
})
