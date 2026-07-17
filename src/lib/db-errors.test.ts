import { describe, expect, it } from "vitest";
import { getPostgresErrorCode } from "./db-errors";

describe("getPostgresErrorCode", () => {
  it("extrae el code de error.cause en un DrizzleQueryError-like", () => {
    const error = new Error("query failed");
    (error as { cause?: unknown }).cause = { code: "23505" };
    expect(getPostgresErrorCode(error)).toBe("23505");
  });

  it("devuelve undefined si no hay cause", () => {
    expect(getPostgresErrorCode(new Error("plain error"))).toBeUndefined();
  });

  it("devuelve undefined si el valor no es un Error", () => {
    expect(getPostgresErrorCode("not an error")).toBeUndefined();
  });

  it("devuelve undefined si cause no tiene code", () => {
    const error = new Error("query failed");
    (error as { cause?: unknown }).cause = { message: "something else" };
    expect(getPostgresErrorCode(error)).toBeUndefined();
  });
});
