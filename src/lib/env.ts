import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().min(1).default("/api"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: unknown): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");

    throw new Error(`Invalid environment variables — ${details}`);
  }

  return result.data;
}

export const env = parseEnv(import.meta.env);
