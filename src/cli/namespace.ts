/**
 * The one namespace the CLI will not write into, and the one it writes instead.
 *
 * `loom.` is the framework's. Every primitive `@loom/runtime/primitives`
 * registers is named under it, and a registry refuses two definitions with one
 * type — so a host primitive called `loom.page` is not a shadow or an override,
 * it is a registry that cannot be built at all. The failure lands on whoever
 * combines the two, which is the host, at the moment they follow the
 * documentation as written.
 *
 * The scaffold used to write `loom.page`, so that host was every host.
 *
 * Refusing the whole namespace rather than the types the library happens to hold
 * today is deliberate. A list of taken names would have to be maintained against
 * a library that grows every week, and the run that added the seventy-sixth
 * primitive would break a scaffold written months earlier. A namespace cannot go
 * stale: a name under `loom.` is the framework's whether or not anything answers
 * to it yet, and a name outside it is the host's forever. `starter-collision.test.ts`
 * is what holds the two halves of that promise together.
 */

/** Reserved in full: `loom` itself, and everything beneath it. */
export const FRAMEWORK_NAMESPACE = "loom"

/**
 * What the CLI names things instead — `app.page`, `app.card`.
 *
 * It reads as *yours*, which is the lesson the scaffolded file exists to teach:
 * the primitive in it is a component the host owns and edits, not a piece of the
 * framework that happens to live in their repository.
 */
export const HOST_NAMESPACE = "app"

export const isFrameworkNamespaced = (type: string): boolean =>
  type === FRAMEWORK_NAMESPACE || type.startsWith(`${FRAMEWORK_NAMESPACE}.`)

/**
 * The same name under the host's namespace, offered in the refusal.
 *
 * `loom.card` → `app.card`, and a bare `loom` → `app`. Somebody who typed
 * `loom.card` wanted a card; telling them the namespace is taken and leaving
 * them to invent a replacement is a worse answer than handing them one.
 */
export const hostAlternativeFor = (type: string): string =>
  [HOST_NAMESPACE, ...type.split(".").slice(1)].join(".")
