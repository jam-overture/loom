import { z } from "zod"

import { nodeIdSchema, treeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { err, ok, type Result } from "../result.js"

import { READER_SIGNAL_KINDS } from "./kinds.js"
import { viewKeyPattern } from "./view.js"

/**
 * What a published page may say about how it is being read.
 *
 * A reader signal is an observation about one node of one revision of one tree:
 * it came into view, it stayed there this long, a reader activated a target in
 * it, a reader opened or closed it. Nothing more, and deliberately so.
 *
 * **The vocabulary is closed.** Five kinds, for the same reason the operations
 * on a tree are four and the schemes a URL may use are a list (0053): an
 * adaptation is proposed from these, and a stream that may carry anything is a
 * stream nothing can reason about. A kind is added here or it does not exist.
 *
 * **A signal carries no content.** No text a node shows, no URL a link goes to,
 * no value a reader typed, nothing that identifies the reader. The tree already
 * holds the content at the revision the signal names, and a record of what a
 * person read is a record of that person — the rule telemetry already keeps for
 * utterances (0023).
 *
 * **The revision is on every batch.** A signal about "the fourth section" means
 * nothing once a proposal has moved it; a signal about node `n_42` at revision 3
 * means exactly one thing forever (0136).
 */

export { DELEGATED_READER_SIGNAL_KINDS, READER_SIGNAL_KINDS } from "./kinds.js"

export const readerSignalKindSchema = z.enum(READER_SIGNAL_KINDS)

export type ReaderSignalKind = z.infer<typeof readerSignalKindSchema>

const instantSchema = z.number().int().nonnegative()

/**
 * The key that says two batches came from the same page view, and says nothing
 * else (0146).
 *
 * Branded like an id, but deliberately not one: it is minted by a browser
 * rather than an id factory, it is not stable, nothing may be addressed by it,
 * and it is dropped when the raw window expires. `view.ts` holds the pattern
 * and the minting, because the broadcaster needs both and cannot load this
 * module.
 */
export const viewKeySchema = z.string().regex(viewKeyPattern).brand<"ViewKey">()

export type ViewKey = z.infer<typeof viewKeySchema>

const addressSchema = {
  nodeId: nodeIdSchema,
  type: primitiveTypeSchema,
}

/**
 * One addressed node, as a signal names it.
 *
 * The same pair `addressSchema` spreads, as a schema of its own, because an
 * ancestry is a list of them.
 */
export const signalAddressSchema = z.object(addressSchema).strict()

/**
 * The addressed nodes a delegated signal happened inside, nearest first.
 *
 * A reader presses a button, and the button is an addressed node — so the node
 * an `activated` is filed against is the control, never the band the control is
 * in. Without this a deployment can report *which button was pressed* and can
 * never report *how many readers used something in the pricing section*, because
 * no signal a browser sends carries the section.
 *
 * **It is ancestry, not content.** Node ids and primitive types, which the tree
 * at this revision already holds. A signal still says nothing about the reader
 * and nothing about what the page shows.
 *
 * **Optional, and absent is not empty.** A batch synthesised on a server, one
 * replayed from a fixture, and one from a sender that was asked not to walk all
 * have nothing to say here; a signal against a node at the root of the page has
 * an empty ancestry and says so. A consumer that treats the two the same is
 * treating *we did not look* as *there was nothing above it*.
 */
const withinSchema = z.array(signalAddressSchema).readonly()

/**
 * The five kinds.
 *
 * `viewed` fires once per node for the life of the page. `dwelled` is time on
 * screen accumulated since the previous batch, so summing a node's `dwelled` over
 * every batch is its total. `activated` is a reader using a link, button or field
 * inside the node — the node named is the nearest addressed one, which in the
 * starter library is usually the control itself. `disclosed` is a region opened
 * or closed. `completed` is a form inside the node submitted with its
 * constraints satisfied and nothing on the page cancelling it.
 *
 * **`completed` is what a page can see, and not a word more.** It does not say
 * a server accepted anything: the broadcaster watches the page and never the
 * reply, so what it can attest is that the browser fired `submit` — which it
 * does only once constraint validation has passed — and that no handler called
 * `preventDefault`. A page that posts with `fetch` and cancels the native
 * submit reports nothing here, which is the honest answer, because from the
 * page's side a cancelled submit and a failed one look identical (0211).
 *
 * The last three are `DELEGATED_READER_SIGNAL_KINDS`: what a reader aimed at is
 * a control or a form, and the region it sits in is a question nothing else can
 * answer afterwards, so they carry `within` and the other two do not.
 */
export const readerSignalSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("viewed"), ...addressSchema, at: instantSchema }).strict(),
  z.object({ kind: z.literal("dwelled"), ...addressSchema, ms: z.number().int().positive() }).strict(),
  z
    .object({ kind: z.literal("activated"), ...addressSchema, at: instantSchema, within: withinSchema.optional() })
    .strict(),
  z
    .object({
      kind: z.literal("disclosed"),
      ...addressSchema,
      open: z.boolean(),
      at: instantSchema,
      within: withinSchema.optional(),
    })
    .strict(),
  z
    .object({ kind: z.literal("completed"), ...addressSchema, at: instantSchema, within: withinSchema.optional() })
    .strict(),
])

export type ReaderSignal = z.infer<typeof readerSignalSchema>

/**
 * One delivery: the signals a page gathered since the last one, all about the
 * same tree at the same revision.
 *
 * The tree and revision sit on the batch rather than on each signal because a
 * rendered page is one revision of one tree — they cannot differ inside a batch,
 * and a shape that let them would invite a consumer to wonder whether they had.
 */
export const readerSignalBatchSchema = z
  .object({
    treeId: treeIdSchema,
    revision: z.number().int().nonnegative(),
    sentAt: instantSchema,
    /**
     * Which page view these signals came from, when the sender minted one.
     *
     * Optional because correlation is a capability rather than a requirement: a
     * batch synthesised on a server, replayed from a fixture, or sent by a host
     * that wants totals and no funnel has nothing to correlate, and refusing it
     * would make the funnel mandatory rather than available. Rollup counts the
     * batches it could not correlate instead of quietly treating each as its own
     * view, which would inflate every funnel denominator.
     */
    view: viewKeySchema.optional(),
    /**
     * Whether this is the opening delivery of its page view.
     *
     * One batch of a page view carries it and the rest do not, so a receiver
     * can count page views without remembering anything: *this is a reader
     * arriving* is a fact only the sender has, and the server's alternative is
     * to hold the view keys it has already seen — which is the one value
     * nothing is allowed to keep (0146).
     *
     * It says nothing about the reader and nothing about the page. It is the
     * field that lets an intake count where its readers are, once, per reader,
     * rather than once per delivery — and a counter that moves with how long
     * somebody stayed is a counter that makes one visitor look like a crowd.
     *
     * **Optional, and absent is not false.** A sender that does not mint view
     * keys has no page views to open, and a batch replayed from a fixture is
     * not an arrival.
     */
    first: z.literal(true).optional(),
    signals: z.array(readerSignalSchema).min(1),
  })
  .strict()
  /**
   * An opening with nothing to open is refused rather than ignored. The flag
   * means *this page view began here*, so a batch that names no page view is
   * making a claim it cannot support, and a receiver that quietly dropped it
   * would be undercounting for a reason nobody could see.
   */
  .refine((batch) => batch.first !== true || batch.view !== undefined, {
    message: "says it opened a page view but names none",
    path: ["first"],
  })

export type ReaderSignalBatch = z.infer<typeof readerSignalBatchSchema>

export type ReaderSignalParseError = {
  readonly code: "invalid-batch"
  readonly issues: readonly { readonly path: string; readonly message: string }[]
}

/**
 * Read a batch that arrived from somewhere untrusted — a request body, a queue.
 *
 * A browser is not a trusted author, so anything that receives batches parses
 * them here rather than trusting the shape. Invalid input is a value, never a
 * throw.
 */
export const parseReaderSignalBatch = (
  input: unknown
): Result<ReaderSignalBatch, ReaderSignalParseError> => {
  const parsed = readerSignalBatchSchema.safeParse(input)

  return parsed.success
    ? ok(parsed.data)
    : err({
        code: "invalid-batch",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      })
}
