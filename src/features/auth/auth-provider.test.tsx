import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { AUTH_STORAGE_KEY } from "./auth-context";
import { AuthProvider } from "./auth-provider";
import { useAuth } from "./use-auth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts anonymous", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("signs a user in and persists them", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: "ada@example.com",
        password: "password",
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("ada@example.com");
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toContain("ada@example.com");
  });

  it("rejects a wrong password", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      result.current.login({ email: "ada@example.com", password: "nope" }),
    ).rejects.toThrow(/Invalid email or password/);

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("restores a user stored in localStorage", () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        id: "user-1",
        email: "grace@example.com",
        name: "grace",
      }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user?.name).toBe("grace");
  });

  it("discards a corrupted stored user", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "not json");

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("signs the user out", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: "ada@example.com",
        password: "password",
      });
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("throws when useAuth is used outside the provider", () => {
    function Orphan() {
      useAuth();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(/useAuth must be used within an AuthProvider/);
  });
});
