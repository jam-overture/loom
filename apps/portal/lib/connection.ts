const KEYS = ["DATABASE_URL", "POSTGRES_URL"] as const

export type ConnectionStringProblem =
  /** The commonest .env paste error: the value still carries its own key name. */
  | { readonly code: "carries-its-own-name"; readonly key: string }
  | { readonly code: "not-a-url" }

/**
 * What is wrong with a connection string, or `null` if nothing is.
 *
 * Pure, so the two callers that need it — the store and the `db:push` script —
 * share one answer, and so the messages can be tested without a database.
 */
export const inspectConnectionString = (value: string): ConnectionStringProblem | null => {
  const carried = KEYS.find((key) => value.startsWith(`${key}=`))

  if (carried !== undefined) return { code: "carries-its-own-name", key: carried }

  return URL.canParse(value) ? null : { code: "not-a-url" }
}

export const describeConnectionProblem = (problem: ConnectionStringProblem): string =>
  problem.code === "carries-its-own-name"
    ? `${problem.key} contains its own name. An environment entry is KEY=value, so the ` +
      `value must be the bare URL: postgresql://user:password@host:6543/postgres`
    : "The connection string is not a valid URL. Expected the Supabase transaction pooler " +
      "string: postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres"

/**
 * The configured connection string, or `undefined` when there is none.
 *
 * A malformed string throws rather than falling back to memory. Silently running
 * on memory when a database was configured would be the lie about persistence
 * this whole section exists to avoid — better to stop the deployment with a
 * message that names the mistake than to serve a portal that quietly forgets.
 */
export const resolveConnectionString = (
  env: Record<string, string | undefined> = process.env
): string | undefined => {
  const value = env["DATABASE_URL"] ?? env["POSTGRES_URL"]

  if (value === undefined) return undefined

  const problem = inspectConnectionString(value)

  if (problem !== null) throw new Error(`loom: ${describeConnectionProblem(problem)}`)

  return value
}
