import {
  createEndpointRegistry,
  defineEndpoint,
  describeEndpointRegistryError,
  err,
  ok,
  type EndpointEntry,
  type EndpointRegistry,
  type SubmissionFailure,
  type SubmissionTarget,
} from "@loom/runtime"

/**
 * The deployment behind *What a form posts to*.
 *
 * This is the documentation site playing the part of a host: a handful of real
 * endpoints, declared through the same `defineEndpoint` a reader would call,
 * assembled into the same registry. Nothing here is a fake, a stub or a shape
 * that resembles one — the page's produced blocks ask these endpoints and print
 * what comes back, so an endpoint that stopped behaving takes the page red.
 *
 * **Everything is deterministic**, and that is the one thing a real deployment
 * does differently. A live contact form mints a CSRF token per request, against
 * a store, which is exactly why the seam is allowed to be slow and exactly why
 * resolution happens before the walk. A token that changed per build would make
 * the page's own HTML differ between the server render and the browser's, so the
 * token here is a fixed string and the page says so in as many words.
 */

/** The one endpoint the site's own contact form posts to. */
export const CONTACT_ENDPOINT = "contact.enquiry"

/**
 * A second registration, because the interesting questions about this seam are
 * all about there being more than one: what a model may choose between, what
 * happens when it names something outside the list, and what it takes to move a
 * form from one to the other.
 */
export const NEWSLETTER_ENDPOINT = "newsletter.subscribe"

/**
 * A token that does not move, standing in for one minted per request.
 *
 * Named rather than inlined so the page can point at it and say what it is
 * pretending to be. A real one comes back from the host's session store, which
 * is the IO this whole seam is arranged around.
 */
export const DOCS_TOKEN = "a-token-minted-for-this-request"

const contactTarget: SubmissionTarget = {
  action: "/contact",
  method: "post",
  fields: [{ name: "csrf", value: DOCS_TOKEN }],
}

const contact = defineEndpoint({
  id: CONTACT_ENDPOINT,
  description: "Sends an enquiry to the team's shared inbox.",
  endpoint: { target: () => Promise.resolve(ok(contactTarget)) },
})

const newsletterTarget: SubmissionTarget = {
  action: "https://lists.example.com/subscribe",
  method: "post",
  fields: [{ name: "list", value: "monthly" }],
}

const newsletter = defineEndpoint({
  id: NEWSLETTER_ENDPOINT,
  description: "Adds an address to the monthly list.",
  endpoint: { target: () => Promise.resolve(ok(newsletterTarget)) },
})

const build = (entries: readonly EndpointEntry[]): EndpointRegistry => {
  const built = createEndpointRegistry(entries)

  if (!built.ok) {
    throw new Error(
      `loom: the documented endpoint registry was refused — ${describeEndpointRegistryError(built.error)}`
    )
  }

  return built.value
}

/** What this site would register if it were the deployment serving its own form. */
export const docsEndpoints = (): EndpointRegistry => build([contact, newsletter])

/**
 * One endpoint per named way of having no target, each reached by an endpoint
 * that really behaves that way.
 *
 * The five reasons are the seam's own list, and they arrive by four different
 * routes: two are the host saying no in the two words it has for it, one is the
 * host throwing, and one is the host answering with a target the seam will not
 * carry. The fifth — `no-such-endpoint` — has no endpoint at all, which is the
 * point of it, so it is reached by naming an id this registry does not hold.
 */
export const TROUBLE = {
  refused: "trouble.refused",
  unavailable: "trouble.unavailable",
  threw: "trouble.threw",
  offOrigin: "trouble.off-origin",
  /** Registered nowhere. A tree may still name it, which is the whole case. */
  missing: "trouble.never-registered",
} as const

/**
 * A path-shaped action that is not a path. `new URL("//forms.example.net/collect",
 * "https://loom.example")` is `https://forms.example.net/collect`, so this is a
 * different origin wearing a leading slash — and it is a perfectly ordinary
 * `SubmissionTarget` as far as the *type* is concerned, which is the reason the
 * schema exists.
 */
const OFF_ORIGIN_TARGET: SubmissionTarget = {
  action: "//forms.example.net/collect",
  method: "post",
  fields: [],
}

/**
 * A registry in which four of the five things that can go wrong actually do.
 *
 * `trouble.off-origin` is the one worth reading twice. It is not a broken
 * endpoint: it answers successfully, with a string that starts with a slash and
 * looks like a path. The seam refuses it after the host has already said yes,
 * which is the only place that mistake can still be caught.
 */
export const troubleEndpoints = (): EndpointRegistry =>
  build([
    defineEndpoint({
      id: TROUBLE.refused,
      description: "A form this audience may not submit.",
      endpoint: {
        target: () =>
          Promise.resolve(
            err<SubmissionFailure>({
              code: "refused",
              detail: "this form is closed to signed-out visitors",
            })
          ),
      },
    }),
    defineEndpoint({
      id: TROUBLE.unavailable,
      description: "A form whose token store is having a bad afternoon.",
      endpoint: {
        target: () =>
          Promise.resolve(
            err<SubmissionFailure>({
              code: "unavailable",
              detail: "the token store did not answer",
            })
          ),
      },
    }),
    defineEndpoint({
      id: TROUBLE.threw,
      description: "A form whose endpoint has a bug in it.",
      endpoint: {
        target: () => {
          throw new Error("Cannot read properties of undefined (reading 'secret')")
        },
      },
    }),
    defineEndpoint({
      id: TROUBLE.offOrigin,
      description: "A form whose endpoint composed its own action and got it wrong.",
      endpoint: {
        target: () => Promise.resolve(ok(OFF_ORIGIN_TARGET)),
      },
    }),
  ])
