/** What a screen's address hands it, as Next gives `searchParams`. */
export type Query = Readonly<Record<string, string | readonly string[] | undefined>>

/** A query value as one string, or `undefined` for none or for a repeated key. */
export const single = (value: string | readonly string[] | undefined): string | undefined =>
  typeof value === "string" ? value : undefined
