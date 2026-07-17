// Drizzle envuelve el error real del driver en un DrizzleQueryError; el
// código SQLSTATE de Postgres vive en error.cause.code, no en error.code
// directamente (verificado contra Postgres real, ver *.integration.test.ts).
export function getPostgresErrorCode(error: unknown): string | undefined {
  const cause = error instanceof Error ? error.cause : undefined;
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    return (cause as { code?: string }).code;
  }
  return undefined;
}
