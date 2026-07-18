import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminSession } = vi.hoisted(() => ({
  requireAdminSession: vi.fn().mockResolvedValue({ user: { id: "admin-1" } }),
}));
vi.mock("@/lib/require-admin-session", () => ({ requireAdminSession }));

const { apiSignRequest } = vi.hoisted(() => ({
  apiSignRequest: vi.fn().mockReturnValue("fake-signature"),
}));
vi.mock("@/lib/cloudinary", () => ({
  cloudinary: { utils: { api_sign_request: apiSignRequest } },
  CLOUDINARY_UPLOAD_FOLDER: "kode/products",
}));

const { createUploadSignature } = await import("./cloudinary");

describe("createUploadSignature", () => {
  beforeEach(() => {
    requireAdminSession.mockClear();
    apiSignRequest.mockClear();
    process.env.CLOUDINARY_API_KEY = "test-api-key";
    process.env.CLOUDINARY_API_SECRET = "test-api-secret";
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  it("requiere sesión de admin antes de firmar nada", async () => {
    await createUploadSignature();
    expect(requireAdminSession).toHaveBeenCalledOnce();
  });

  it("firma con la carpeta de productos, nunca expone el api_secret en el resultado", async () => {
    const result = await createUploadSignature();

    expect(apiSignRequest).toHaveBeenCalledWith(
      expect.objectContaining({ folder: "kode/products" }),
      "test-api-secret",
    );
    expect(result).toEqual(
      expect.objectContaining({
        signature: "fake-signature",
        apiKey: "test-api-key",
        cloudName: "test-cloud",
        folder: "kode/products",
      }),
    );
    expect(JSON.stringify(result)).not.toContain("test-api-secret");
  });
});
