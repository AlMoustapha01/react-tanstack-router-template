import { HttpResponse, delay, http } from "msw"

import { env } from "@/lib/env"

export type MockPost = {
  id: string
  title: string
  body: string
  author: string
  createdAt: string
}

export const PAGE_SIZE = 3

const seedPosts: Array<MockPost> = [
  {
    id: "1",
    title: "Typed routing end to end",
    body: "Route paths, params and search params are all checked at compile time.",
    author: "Ada",
    createdAt: "2026-01-12T09:00:00.000Z",
  },
  {
    id: "2",
    title: "Loaders meet the query cache",
    body: "The route loader warms the exact cache entry the component reads.",
    author: "Grace",
    createdAt: "2026-02-03T14:30:00.000Z",
  },
  {
    id: "3",
    title: "Guarding routes with context",
    body: "beforeLoad reads the auth context and redirects anonymous visitors.",
    author: "Alan",
    createdAt: "2026-03-21T08:15:00.000Z",
  },
  {
    id: "4",
    title: "One mock, two consumers",
    body: "The same handlers back the dev server and the test suite.",
    author: "Barbara",
    createdAt: "2026-04-09T17:45:00.000Z",
  },
  {
    id: "5",
    title: "Schemas at the boundary",
    body: "Every response is parsed before it reaches the cache.",
    author: "Edsger",
    createdAt: "2026-05-30T11:05:00.000Z",
  },
]

let posts: Array<MockPost> = [...seedPosts]

export function resetMockPosts() {
  posts = [...seedPosts]
}

export const handlers = [
  http.get(`${env.VITE_API_URL}/posts`, async ({ request }) => {
    await delay(50)

    const url = new URL(request.url, "http://localhost")
    const query = url.searchParams.get("q") ?? ""

    // Trappe utilisée par l'interface de démo pour exercer le composant d'erreur.
    if (query === "boom") {
      return new HttpResponse(null, { status: 500 })
    }

    const page = Number(url.searchParams.get("page") ?? "1")
    const matching = posts.filter((post) =>
      post.title.toLowerCase().includes(query.toLowerCase())
    )
    const start = (page - 1) * PAGE_SIZE

    return HttpResponse.json({
      items: matching.slice(start, start + PAGE_SIZE),
      total: matching.length,
      page,
      pageSize: PAGE_SIZE,
    })
  }),

  http.get(`${env.VITE_API_URL}/posts/:postId`, async ({ params }) => {
    await delay(50)

    const post = posts.find((item) => item.id === params.postId)

    if (!post) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(post)
  }),

  http.post(`${env.VITE_API_URL}/posts`, async ({ request }) => {
    await delay(50)

    const input = (await request.json()) as { title: string; body: string }
    const post: MockPost = {
      id: crypto.randomUUID(),
      title: input.title,
      body: input.body,
      author: "You",
      createdAt: new Date().toISOString(),
    }

    posts = [post, ...posts]

    return HttpResponse.json(post, { status: 201 })
  }),
]
