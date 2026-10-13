import { z } from "zod"

/**
 * What somebody types about an application — registering one, and renaming one
 * afterwards — and what is wrong with it.
 *
 * The maintainer's own account of what this portal is for: *"the primary purpose
 * of the portal will be to register / hook up their application to the portal
 * and begin processing signals from their web pages"*. Until this, there was no
 * screen for it — a deployment had exactly the one application its seed wrote,
 * and the only way to a second was a SQL client.
 *
 * ## Why the rules are here rather than in the action
 *
 * The action runs on a server, takes a `FormData`, and ends in a redirect. None
 * of those can be asked a question in a test without standing up a request. What
 * a person is allowed to type is a property of the product rather than of the
 * transport, so it is a function from what they typed to what is wrong with it,
 * and the action is the thing that calls it.
 */

/**
 * A host, loosely.
 *
 * Deliberately not a URL: people type `shop.example.com`, and a field that
 * refuses that until they remember `https://` is a field that makes them feel
 * stupid for being right. The scheme and any path are stripped rather than
 * refused, so a pasted address works and comes out as the host it contained.
 */
export const hostFrom = (value: string): string | undefined => {
  const trimmed = value.trim()
  if (trimmed === "") return undefined

  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
  const host = withoutScheme.split("/")[0]?.split("?")[0]?.trim()

  return host === undefined || host === "" ? undefined : host.toLowerCase()
}

/**
 * What is wrong with one of the two fields an application has of its own.
 *
 * Separate from `RegistrationFault` because registering and renaming disagree
 * about exactly one field — a rename cannot be wrong about a project, because
 * it is not asked for one — and a shared type that could report a fault the
 * form has no input for would be a fault nobody could read.
 */
export type NamingFault =
  | { readonly field: "name"; readonly detail: string }
  | { readonly field: "host"; readonly detail: string }

export type RegistrationFault = NamingFault | { readonly field: "project"; readonly detail: string }

export type Registration = {
  readonly name: string
  readonly host: string | undefined
  /** An existing project to join, or `undefined` to make one named after the application. */
  readonly joining: string | undefined
}

const nameSchema = z
  .string()
  .trim()
  .min(1, "Give it a name — it is what you will look for in the list.")
  .max(200, "That name is longer than a list can show. 200 characters at most.")

const hostSchema = z
  .string()
  .max(253, "A host cannot be longer than 253 characters.")
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/,
    "That does not look like a host. Something like shop.example.com."
  )

/**
 * What was typed, or what is wrong with it.
 *
 * Every fault is reported, not the first: a form that refuses one field at a
 * time makes somebody submit three times to learn three things they could have
 * been told at once.
 */
export const readRegistration = (fields: {
  readonly name: unknown
  readonly host: unknown
  readonly project: unknown
}): { readonly ok: true; readonly value: Registration } | { readonly ok: false; readonly faults: readonly RegistrationFault[] } => {
  const faults: RegistrationFault[] = []

  const name = nameSchema.safeParse(typeof fields.name === "string" ? fields.name : "")
  if (!name.success) {
    faults.push({ field: "name", detail: name.error.issues[0]?.message ?? "That name will not do." })
  }

  const host = hostFrom(typeof fields.host === "string" ? fields.host : "")
  if (host !== undefined) {
    const checked = hostSchema.safeParse(host)
    if (!checked.success) {
      faults.push({
        field: "host",
        detail: checked.error.issues[0]?.message ?? "That does not look like a host.",
      })
    }
  }

  const joining =
    typeof fields.project === "string" && fields.project !== "" && fields.project !== "new"
      ? fields.project
      : undefined

  if (faults.length > 0) return { ok: false, faults }

  return {
    ok: true,
    value: { name: name.success ? name.data : "", host, joining },
  }
}

/** A new name, and a new host or the absence of one. */
export type Rename = {
  readonly name: string
  /**
   * `undefined` means **the box was empty**, and nothing more than that.
   *
   * What an empty box *means* is not this function's to decide, and today the
   * answer is awkward: `ApplicationStore.rename` reads an absent host as *leave
   * it alone*, in both of its implementations, so a host cannot be cleared
   * through the contract at all. The action is where that is reported, because
   * it is the part that knows what the host was before.
   */
  readonly host: string | undefined
}

/**
 * What an application may be renamed to, by the same rules it was registered
 * under.
 *
 * The same two schemas rather than a second opinion about what a name is: a
 * rename that accepted what registration refused would let somebody walk an
 * application into a state the form that created it would not have allowed.
 */
export const readRename = (fields: {
  readonly name: unknown
  readonly host: unknown
}): { readonly ok: true; readonly value: Rename } | { readonly ok: false; readonly faults: readonly NamingFault[] } => {
  const faults: NamingFault[] = []

  const name = nameSchema.safeParse(typeof fields.name === "string" ? fields.name : "")
  if (!name.success) {
    faults.push({ field: "name", detail: name.error.issues[0]?.message ?? "That name will not do." })
  }

  const host = hostFrom(typeof fields.host === "string" ? fields.host : "")
  if (host !== undefined) {
    const checked = hostSchema.safeParse(host)
    if (!checked.success) {
      faults.push({
        field: "host",
        detail: checked.error.issues[0]?.message ?? "That does not look like a host.",
      })
    }
  }

  if (faults.length > 0) return { ok: false, faults }

  return { ok: true, value: { name: name.success ? name.data : "", host } }
}

/** The fault for one field, so a form can print it under the input it belongs to. */
export const faultFor = (
  faults: readonly (RegistrationFault | NamingFault)[],
  field: RegistrationFault["field"]
): string | undefined => faults.find((fault) => fault.field === field)?.detail
