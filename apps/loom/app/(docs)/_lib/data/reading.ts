import {
  buildElement,
  buildSlot,
  buildText,
  createTree,
  DATA_PROP_KEY,
  sequentialIdFactory,
  type IdFactory,
  type JsonObject,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { describeRenderDiagnostic, renderLoomTree, THEME_PROP_KEY } from "@jam-overture/loom/react"

import { docsRegistry, docsThemes } from "../loom/registry"

import { answersFor, uncarryAnswers, type CarriedAnswers } from "./carry"
import { CLASSES_DRAWABLE, CLASSES_HELD, shopRegistry } from "./shop"

/**
 * The reading half of the data seam, produced rather than described.
 *
 * *Where the content comes from* spent most of its length on the asking half —
 * what a tree asks, who answers, what comes back when nobody can. The half it
 * described without showing is the one a reader actually has to write: a
 * primitive that **reads** an answer and draws a page out of it.
 *
 * Everything on that part of the page is built here: the tree the live example
 * renders, and the three ways a binding goes wrong that are nothing to do with
 * whether the data arrived. Each of those three is a real `renderLoomTree` of a
 * real tree against a real resolution, and the sentence printed beside it is
 * `describeRenderDiagnostic`'s rather than this lane's.
 */

/** The theme every example on this site wears. */
const MINIMAL: JsonObject = {
  palette: "minimal",
  fontPack: "minimal-sans",
  stylePreset: "precise",
}

/**
 * How many classes the live example asks for: every row the shop has named.
 *
 * Deliberately not all of them. The shop holds one more that it never got round
 * to naming, and a feed handed that row draws what it can and reports the rest —
 * which is the subject of the third fault below and would be a diagnostic strip
 * under the example if it were asked for here.
 */
export const LIVE_LIMIT = CLASSES_DRAWABLE

/** The name the tree gives its answer, and the name the feed is told to read. */
const BINDING = "classes"

/** The same name, misspelled the way a person misspells one. */
const MISSPELLED = "clases"

const bound = (declared: JsonObject): JsonObject => ({ [DATA_PROP_KEY]: declared })

/**
 * The classes band: a section, a heading nobody will change, and a feed that
 * draws whatever the shop answered.
 *
 * The two slots are filled rather than left out, and that is the part worth
 * looking at in *show the tree*: `empty` and `unavailable` are regions
 * `loom.feed` places, so the sentences a reader sees when there are no classes
 * and when the shop's database is down are **in the tree**, authored, weighable
 * and translatable — not strings inside a component. Neither one draws while the
 * answer is a list with rows in it.
 */
const classesBand = (ids: IdFactory, declaredName: string, limit: number): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "readable", tone: "surface", eyebrow: "Coming up" },
    children: [
      /**
       * `level: 3` and a tight feed, which is one step down the ramp from every
       * other example on this site and is deliberate.
       *
       * The point of this frame is the *list*, and the list is the one thing in
       * it that is not in the tree. At `level: 2` and `density: "loose"` the
       * heading and the first entry filled the frame on their own and the
       * second class was below its fold — a reader could see a feed with one
       * row in it, which is the least convincing possible picture of a feed.
       */
      buildSlot(ids, "heading", [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 3 },
          children: [buildText(ids, "Classes at the bakery")],
        }),
      ]),
      buildElement(ids, {
        type: "loom.feed",
        props: {
          binding: BINDING,
          density: "tight",
          meta: "above",
          separators: "rule",
          ...bound({ [declaredName]: { source: "catalogue.classes", params: { limit } } }),
        },
        children: [
          buildSlot(ids, "empty", [
            buildElement(ids, {
              type: "loom.prose",
              props: { tone: "muted" },
              children: [buildText(ids, "Nothing in the diary just yet. Ask us when you are next in.")],
            }),
          ]),
          buildSlot(ids, "unavailable", [
            buildElement(ids, {
              type: "loom.prose",
              props: { tone: "muted" },
              children: [buildText(ids, "We cannot reach the diary. Give us a ring and we will read it out.")],
            }),
          ]),
        ],
      }),
    ],
  })

/**
 * The tree the live example renders, and the one the faults below are variations
 * of.
 *
 * One builder with two knobs, because the three faults are *the same page* with
 * one thing different about it — which is the claim the page makes, and a second
 * builder per fault would let it stop being true.
 */
export const classesPage = (
  { limit = LIVE_LIMIT, declaredName = BINDING }: { readonly limit?: number; readonly declaredName?: string } = {}
): LoomTree => {
  const ids = sequentialIdFactory("classes")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { fills: true, width: "readable", [THEME_PROP_KEY]: MINIMAL },
      children: [classesBand(ids, declaredName, limit)],
    }),
    ids
  )
}

/** The live example's answers, asked of the shop the way a loader would. */
export const classesAnswers = (): Promise<CarriedAnswers> => answersFor(classesPage(), shopRegistry())

/**
 * A render that could not honour something, with the reason it could not.
 *
 * `sentence` is the runtime's. The page prints it as-is, so a diagnostic whose
 * wording changes shows up here rather than being paraphrased into something
 * that was true once.
 */
export type ReadingFault = {
  readonly code: string
  /** What the author did, in a few words. */
  readonly cause: string
  /** Which of the three it is: the resolving, the reading, or the drawing. */
  readonly stage: "resolving" | "reading" | "drawing"
  readonly sentence: string
}

const diagnosticsOf = (tree: LoomTree, carried: CarriedAnswers | undefined) =>
  renderLoomTree(tree, {
    resolver: docsRegistry,
    validator: docsRegistry,
    themes: docsThemes,
    ...(carried === undefined ? {} : { data: uncarryAnswers(carried) }),
  }).diagnostics

/**
 * The one diagnostic of a render, or a loud failure.
 *
 * A fault row that quietly printed the first of several would be a table making
 * a claim about which fault a mistake causes while hiding the rest. Every case
 * below is arranged to cause exactly one thing, and this is what holds it to
 * that: a case that starts causing two stops the build instead of printing half
 * the truth.
 */
const theOneDiagnostic = async (
  code: string,
  tree: LoomTree,
  answers: Promise<CarriedAnswers> | undefined
): Promise<string> => {
  const diagnostics = diagnosticsOf(tree, answers === undefined ? undefined : await answers)

  if (diagnostics.length !== 1) {
    throw new Error(
      `loom: the reading section's "${code}" case produced ${diagnostics.length} diagnostics rather than one — ${diagnostics.map(describeRenderDiagnostic).join(" / ") || "none"}`
    )
  }

  const [diagnostic] = diagnostics

  if (diagnostic === undefined || diagnostic.code !== code) {
    throw new Error(
      `loom: the reading section's "${code}" case reported "${diagnostic === undefined ? "nothing" : diagnostic.code}" instead`
    )
  }

  /**
   * Matched on the code and printed as the sentence, because the two are
   * different things and only one of them is the runtime's wording. A sentence
   * matched on its own text would have to be kept in step with a string in
   * `diagnostics.ts` by somebody remembering to.
   */
  return describeRenderDiagnostic(diagnostic)
}

/**
 * Three mistakes an author makes with a binding, each made.
 *
 * None of them is about the data. The shop answered correctly every time, and
 * all three pages are still wrong — which is the argument for the three
 * declarations the section is about.
 */
export const readingFaults = async (): Promise<readonly ReadingFault[]> => {
  const answered = classesPage()
  const misspelled = classesPage({ declaredName: MISSPELLED })
  const everyRow = classesPage({ limit: CLASSES_HELD })

  return [
    {
      code: "data-unresolved",
      stage: "resolving",
      cause: "the page was rendered without asking the shop anything",
      sentence: await theOneDiagnostic("data-unresolved", answered, undefined),
    },
    {
      code: "data-unread",
      stage: "reading",
      cause: `the tree declared its answer under "${MISSPELLED}" and told the feed to read "${BINDING}"`,
      sentence: await theOneDiagnostic("data-unread", misspelled, answersFor(misspelled, shopRegistry())),
    },
    {
      code: "data-unshown",
      stage: "drawing",
      cause: `it asked for all ${CLASSES_HELD} rows, and one of them has no title`,
      sentence: await theOneDiagnostic("data-unshown", everyRow, answersFor(everyRow, shopRegistry())),
    },
  ]
}

/**
 * A primitive in the starter library that reads an answer, as the registry holds
 * it.
 *
 * Read rather than written, which is the only way this table is worth having:
 * the page used to say the library had no such primitive, that was true when it
 * was written, and it stopped being true without the sentence changing. A table
 * built from `docsRegistry.primitives` cannot be wrong about how many there are.
 */
export type LibraryReader = {
  readonly type: string
  /** The name it looks an answer up under, however its author declared it. */
  readonly reads: readonly string[]
  /** The regions it places for the two answers that are not a list of rows. */
  readonly regions: readonly string[]
  /** How many sentences its author declared for a reader to meet. */
  readonly sentences: number
  /** Whether it says what it was handed and could not draw. */
  readonly reportsWhatItDropped: boolean
}

const declarationRead = (declaration: string | { readonly fromProp: string; readonly default: string }): string =>
  typeof declaration === "string"
    ? declaration
    : `whatever its ${declaration.fromProp} prop says, or ${declaration.default}`

/** Every primitive the site's own registry says reads a binding. */
export const libraryReaders = (): readonly LibraryReader[] =>
  docsRegistry.primitives
    .filter((primitive) => primitive.reads !== undefined && primitive.reads.length > 0)
    .map((primitive) => ({
      type: primitive.type,
      reads: (primitive.reads ?? []).map(declarationRead),
      regions: primitive.slots,
      sentences: Object.keys(primitive.text).length,
      reportsWhatItDropped: primitive.unshown !== undefined,
    }))
