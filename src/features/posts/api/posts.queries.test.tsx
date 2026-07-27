import { QueryClientProvider, useQuery } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { createQueryClient } from "@/lib/query-client"

import { postKeys, postQueryOptions, postsQueryOptions } from "./posts.queries"

function createWrapper() {
  const queryClient = createQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("posts queries", () => {
  it("builds a stable list key from the search params", () => {
    expect(postKeys.list({ page: 2, q: "loaders" })).toEqual([
      "posts",
      "list",
      { page: 2, q: "loaders" },
    ])
  })

  it("loads the post list through the query cache", async () => {
    const { result } = renderHook(
      () => useQuery(postsQueryOptions({ page: 1 })),
      { wrapper: createWrapper() }
    )

    expect(result.current.isPending).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.items).toHaveLength(3)
  })

  it("loads a single post through the query cache", async () => {
    const { result } = renderHook(() => useQuery(postQueryOptions("2")), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.author).toBe("Grace")
  })
})
