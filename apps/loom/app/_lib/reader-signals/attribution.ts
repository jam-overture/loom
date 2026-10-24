import { err, ok, type Result } from "@jam-overture/loom"
import type { Application, ApplicationId } from "@jam-overture/loom/store"

import { INGEST_KEY_PARAMETER, ingestKeySchema, type IngestKey } from "./keys"

/**
 * Whose readers a delivery is, or why it is nobody's.
 *
 * This is the clause 0260 left as a unit of work — *a signal is filed against a
 * project or it is refused* — and the reason it is its own pull request: it is
 * the one change in the portal's build order that can put two customers'
 * readers under one name, and that mixing cannot be undone once the rows are
 * folded ([0298](../../../../../decisions/0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md)).
 *
 * A function of the request and one lookup, so every answer below is a test
 * with no database, no network and no running Next.
 *
 * ## What it can and cannot tell
 *
 * The key is public and the `Origin` header is written by whoever sends the
 * request, so nothing here can stop somebody with `curl` filing a batch under a
 * project whose page they have read. What it does stop is everything that is
 * not deliberate: a page that names no project, a key that was replaced, a
 * project that was closed, and **another site's browsers** — a snippet copied
 * onto a page it was not issued for, or a staging deployment still carrying
 * production's key — because a browser always says where it is, and cannot be
 * made to lie about it by the page it is running.
 */

/** An application a key names, as the store holds it — open or closed — or `null`. */
export type Senders = {
  readonly applicationWithKey: (
    key: IngestKey
  ) => Promise<Result<Application | null, { readonly detail: string }>>
}

export type AttributionRefusal =
  /** No key at all. Every delivery names its project, this deployment's own pages included. */
  | { readonly code: "no-key" }
  /** A key this deployment did not issue, or has since replaced. Malformed is the same answer. */
  | { readonly code: "unknown-key" }
  /**
   * The project was closed (0289): a closed project takes no signals. This and
   * the next carry the application the key named, because the key was right
   * and the refusal can be counted against its project (0311).
   */
  | { readonly code: "closed"; readonly application: ApplicationId }
  /** The project names its site and this delivery came from somewhere else, or did not say. */
  | {
      readonly code: "wrong-origin"
      readonly origin: string | null
      readonly application: ApplicationId
    }
  | { readonly code: "unavailable"; readonly detail: string }

/**
 * The host an `Origin` header names, or `null` for one that names none.
 *
 * `"null"` is what a browser sends from a sandboxed frame or a `file:` page,
 * and it is no host at all rather than a host called *null*.
 */
const hostOf = (origin: string | null): string | null => {
  if (origin === null || origin === "null") return null

  try {
    return new URL(origin).host.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Which application a delivery is filed under.
 *
 * The order is the order of what each answer costs: whether a key was given at
 * all is a lookup in the URL, and everything after it is one read.
 */
export const attributeDelivery = async (
  request: Request,
  senders: Senders
): Promise<Result<ApplicationId, AttributionRefusal>> => {
  const given = new URL(request.url).searchParams.get(INGEST_KEY_PARAMETER)

  /**
   * **No key is no project, from anywhere.** This deployment's own pages post
   * with the key of the project they belong to, like any customer's
   * (`(marketing)/_lib/readers/key.ts`). A same-origin exception was priced
   * and refused (0298 clause 4): it would have made *which project is this*
   * depend on a header, for the one sender whose key this deployment can
   * hand over itself.
   */
  if (given === null) return err({ code: "no-key" })

  const key = ingestKeySchema.safeParse(given)

  if (!key.success) return err({ code: "unknown-key" })

  const found = await senders.applicationWithKey(key.data)

  if (!found.ok) return err({ code: "unavailable", detail: found.error.detail })

  const application = found.value

  if (application === null) return err({ code: "unknown-key" })

  /**
   * The check `Application.closedAt` deferred to *where ingest learns which
   * application is posting* — which is here.
   */
  if (application.closedAt !== undefined) {
    return err({ code: "closed", application: application.applicationId })
  }

  /**
   * **Checked when the project names its site, and only then.** A project
   * registered without a host has said nothing an origin could be held
   * against, and a delivery from `curl` — no origin at all — is how somebody
   * proves their key works before they have a page to paste it into. A project
   * that names its host is held to it exactly: no subdomains, no scheme, no
   * second spelling, because *close enough* is how a staging site files into
   * production.
   */
  if (application.host !== undefined) {
    const origin = request.headers.get("origin")

    if (hostOf(origin) !== application.host.toLowerCase()) {
      return err({ code: "wrong-origin", origin, application: application.applicationId })
    }
  }

  return ok(application.applicationId)
}
