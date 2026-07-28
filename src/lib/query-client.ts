import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Les tests doivent échouer vite : pas de nouvelle tentative hors prod.
        retry: import.meta.env.PROD ? 3 : false,
      },
    },
  });
}

export const queryClient = createQueryClient();
