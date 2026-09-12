import {
  buildElement,
  buildText,
  createDataRegistry,
  createTree,
  DATA_PROP_KEY,
  defineSource,
  describeDataRegistryError,
  sequentialIdFactory,
  type DataRegistry,
  type JsonObject,
  type LoomNode,
  type LoomTree,
  type NodeId,
  type SourceEntry,
} from "@loom/runtime"
import { z } from "zod"

/**
 * One small deployment, so that *Where the content comes from* can show a page
 * asking questions instead of describing one.
 *
 * Everything the page prints about this seam — which questions a tree produced,
 * which of them were asked once, what came back, what came back instead when
 * nothing could — is this shop being planned and resolved as the page builds.
 * The alternative is a table of plausible rows, and a table of plausible rows is
 * the thing this site keeps saying it will not ship.
 *
 * It is a shop rather than an abstraction because the seam only makes sense with
 * a deployment on the other side of it: a source is somebody's query against
 * somebody's database, and `source-a` answering `value-1` teaches nothing about
 * why the answer might not arrive.
 *
 * Nothing here reaches a network or a clock. The adapters close over literals,
 * which is what makes the page identical on every build and what lets it be
 * produced in a test with no fixture of its own.
 */

/** What the shop sells. The rows a real deployment would have in a table. */
const SERVICES: readonly { readonly name: string; readonly price: string }[] = [
  { name: "Wedding cakes", price: "from £220" },
  { name: "Birthday cakes", price: "from £45" },
  { name: "Cupcakes, by the dozen", price: "from £18" },
  { name: "Decorating classes", price: "£60 a session" },
]

const serviceSchema = z.object({ name: z.string(), price: z.string() })

/**
 * The catalogue source, and the one with params worth declaring.
 *
 * `limit` is capped in the schema rather than in the adapter, because the params
 * in a tree are AI-authored: a plan asking for nine hundred services is refused
 * at the seam and never reaches the query. The cap is the whole reason a source
 * declares what it accepts.
 */
const services = defineSource({
  id: "catalogue.services",
  description: "What this shop offers, most popular first.",
  params: z.object({
    tag: z.string().min(1).max(40),
    limit: z.number().int().min(1).max(12),
  }),
  answers: z.array(serviceSchema),
  adapter: {
    fetch: async ({ params }) => ({ ok: true, value: SERVICES.slice(0, params.limit) }),
  },
})

/**
 * One field of the shop's profile — the shape Hermes' `about` block had, and the
 * reason the planner deduplicates at all.
 */
const profileField = defineSource({
  id: "profile.field",
  description: "One field of the shop's own profile, by name.",
  params: z.object({ field: z.enum(["bio", "phone", "address"]) }),
  answers: z.string(),
  adapter: {
    fetch: async ({ params }) => ({
      ok: true,
      value: {
        bio: "Baking out of the same kitchen on Mill Street since 2011.",
        phone: "01722 000 000",
        address: "14 Mill Street",
      }[params.field],
    }),
  },
})

/**
 * The source with nothing to say, and the reason it is in the story.
 *
 * A shop that has not filled in its opening hours has **no opening hours**, which
 * is not the same fact as a database that could not be reached — and a seam that
 * could not tell those apart would eventually show a reader the wrong one. This
 * source answers `ready` with an empty list, which is the only honest way to say
 * nothing.
 */
const openingHours = defineSource({
  id: "shop.opening-hours",
  description: "When the shop is open, a line per day.",
  params: z.object({}),
  answers: z.array(z.string()),
  adapter: {
    fetch: async () => ({ ok: true, value: [] }),
  },
})

const registryOf = (entries: readonly SourceEntry[]): DataRegistry => {
  const built = createDataRegistry(entries)

  if (!built.ok) {
    throw new Error(`loom: the documented data registry was refused — ${describeDataRegistryError(built.error)}`)
  }

  return built.value
}

/** What this deployment can be asked about. The allowlist, and the page's subject. */
export const shopRegistry = (): DataRegistry => registryOf([services, profileField, openingHours])

/**
 * The page, with its content taken out and questions left in its place.
 *
 * It is the grid from *Children and slots* with one difference that matters: the
 * three items are no longer written into the tree. The band asks for them, the
 * profile line asks for one field, and the opening hours ask for something the
 * shop never filled in.
 *
 * **The two bindings on `catalogue.services` are the same question written twice**,
 * once by whoever built the band and once by whatever later put a grid inside it,
 * with the keys in the order each happened to write them. A tree that asked twice
 * would cost this page two round trips forever.
 */
export type BoundPage = {
  readonly tree: LoomTree
  /** What to call each bound node in a table, since a reader has no use for an id. */
  readonly labels: ReadonlyMap<NodeId, string>
}

const bindings = (declared: JsonObject): JsonObject => ({ [DATA_PROP_KEY]: declared })

export const boundPage = (): BoundPage => {
  const ids = sequentialIdFactory("dataseam")
  const labels = new Map<NodeId, string>()

  const labelled = (label: string, node: LoomNode): LoomNode => {
    labels.set(node.id, label)

    return node
  }

  const grid = labelled(
    "the grid inside it",
    buildElement(ids, {
      type: "loom.feature-grid",
      props: {
        columns: "three",
        ...bindings({ services: { source: "catalogue.services", params: { limit: 3, tag: "baking" } } }),
      },
    })
  )

  const band = labelled(
    "the services band",
    buildElement(ids, {
      type: "loom.section",
      props: {
        width: "wide",
        eyebrow: "What we make",
        ...bindings({
          services: { source: "catalogue.services", params: { tag: "baking", limit: 3 } },
        }),
      },
      children: [grid],
    })
  )

  const hours = labelled(
    "the opening hours",
    buildElement(ids, {
      type: "loom.prose",
      props: bindings({ hours: { source: "shop.opening-hours", params: {} } }),
      children: [buildText(ids, "We are open:")],
    })
  )

  const about = labelled(
    "the line about the shop",
    buildElement(ids, {
      type: "loom.prose",
      props: bindings({ bio: { source: "profile.field", params: { field: "bio" } } }),
      children: [buildText(ids, "About us")],
    })
  )

  return {
    tree: createTree(
      buildElement(ids, { type: "loom.page", props: { fills: true, width: "wide" }, children: [band, hours, about] }),
      ids
    ),
    labels,
  }
}

/**
 * A tree whose `loom:data` is not a binding map at all.
 *
 * Storage is not a trusted input — a tree comes back from a database and is
 * parsed like anything else that crossed a boundary — so the seam has to have an
 * answer for a declaration it cannot read, and the answer is a reported problem
 * rather than a throw on a page nobody can then see.
 */
export const pageWithAMisdeclaredBinding = (): LoomTree => {
  const ids = sequentialIdFactory("misdeclared")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { fills: true },
      children: [
        buildElement(ids, {
          type: "loom.prose",
          props: bindings({ services: { source: "not a source id", params: {} } }),
          children: [buildText(ids, "What we make")],
        }),
      ],
    }),
    ids
  )
}

/**
 * Four sources that answer badly, each in one of the four ways an adapter can.
 *
 * They are separate sources rather than one source told what to do, because what
 * the page prints is the reason the *seam* reported — and a source that decided
 * its own failure code by reading its params would be the page marking its own
 * homework.
 */
const stock = defineSource({
  id: "shop.stock",
  description: "What is in the case this morning.",
  params: z.object({}),
  answers: z.array(z.string()),
  adapter: {
    fetch: async () => ({ ok: false, error: { code: "unavailable", detail: "the query timed out" } }),
  },
})

const myOrders = defineSource({
  id: "orders.mine",
  description: "This customer's own orders.",
  params: z.object({}),
  answers: z.array(z.string()),
  adapter: {
    fetch: async () => ({ ok: false, error: { code: "refused", detail: "nobody is signed in" } }),
  },
})

const latestReviews = defineSource({
  id: "reviews.latest",
  description: "The most recent reviews.",
  params: z.object({}),
  answers: z.array(z.object({ stars: z.number(), body: z.string() })),
  adapter: {
    /**
     * A deployment that renamed a column from `body` to `text` and did not tell
     * anybody. The cast is the point rather than a shortcut: the adapter's type
     * is a claim about a database, and this is the day the claim stopped being
     * true — which is exactly when the schema at the seam earns its keep.
     */
    fetch: async () => ({ ok: true, value: [{ stars: 5, text: "Lovely" }] as never }),
  },
})

const deliverySlots = defineSource({
  id: "delivery.slots",
  description: "When a cake can be delivered.",
  params: z.object({}),
  adapter: {
    fetch: async () => {
      throw new Error("the courier's API answered 503")
    },
  },
  answers: z.array(z.string()),
})

/** The shop, plus four integrations having a bad afternoon. */
export const troubleRegistry = (): DataRegistry =>
  registryOf([services, profileField, openingHours, stock, myOrders, latestReviews, deliverySlots])

/**
 * One page asking six questions, none of which gets an answer, for six different
 * reasons.
 *
 * `limit: 40` is over `catalogue.services`' declared ceiling of twelve, so it is
 * refused before the adapter is called — the difference between a cap in a schema
 * and a cap in a query. `reviews.recent` is a source this deployment never
 * registered, which is what a plan naming something that does not exist looks
 * like from the inside.
 */
export const pageOfThingsThatGoWrong = (): LoomTree => {
  const ids = sequentialIdFactory("gonewrong")

  const asking = (name: string, source: string, params: JsonObject): LoomNode =>
    buildElement(ids, {
      type: "loom.prose",
      props: bindings({ [name]: { source, params } }),
      children: [buildText(ids, name)],
    })

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { fills: true },
      children: [
        asking("stock", "shop.stock", {}),
        asking("orders", "orders.mine", {}),
        asking("reviews", "reviews.latest", {}),
        asking("slots", "delivery.slots", {}),
        asking("services", "catalogue.services", { tag: "baking", limit: 40 }),
        asking("testimonials", "reviews.recent", { limit: 3 }),
      ],
    }),
    ids
  )
}
