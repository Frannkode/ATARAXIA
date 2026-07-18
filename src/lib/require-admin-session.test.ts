import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));

const { requireAdminSession } = await import("./require-admin-session");

describe("requireAdminSession", () => {
  beforeEach(() => {
    getSession.mockReset();
    redirectMock.mockClear();
  });

  it("con sesión válida: la devuelve sin redirigir", async () => {
    const fakeSession = { user: { id: "user-1" }, session: { id: "session-1" } };
    getSession.mockResolvedValue(fakeSession);

    const result = await requireAdminSession();

    expect(result).toBe(fakeSession);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("sin sesión: redirige a /admin/login (funciona tanto en paginas como en Server Actions)", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireAdminSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin/login");
  });
});
