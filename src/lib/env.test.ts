import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("falls back to /api when VITE_API_URL is absent", () => {
    expect(parseEnv({})).toEqual({ VITE_API_URL: "/api" });
  });

  it("keeps a provided VITE_API_URL", () => {
    expect(parseEnv({ VITE_API_URL: "https://api.example.com" })).toEqual({
      VITE_API_URL: "https://api.example.com",
    });
  });

  it("throws a readable error when VITE_API_URL is empty", () => {
    expect(() => parseEnv({ VITE_API_URL: "" })).toThrow(/Invalid environment variables/);
  });
});
