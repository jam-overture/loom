import {
  ANCHOR_PROP_KEY,
  buildElement,
  buildSlot,
  buildText,
  createDataRegistry,
  createFrameOriginRegistry,
  createTree,
  DATA_PROP_KEY,
  defineSource,
  describeDataRegistryError,
  describeFrameOriginRegistryError,
  nodeIdSchema,
  resolveTreeData,
  resolveTreeSubmissions,
  sequentialIdFactory,
  SUBMIT_PROP_KEY,
  THEME_PROP_KEY,
  type DataRegistry,
  type DataResolution,
  type FrameOriginRegistry,
  type IdFactory,
  type JsonObject,
  type LoomNode,
  type LoomTree,
  type SourceEntry,
} from "@jam-overture/loom"
import {
  describeRenderDiagnostic,
  renderLoomExcerpt,
  renderLoomTree,
  type PropsValidator,
  type RenderDiagnostic,
  type RenderOptions,
} from "@jam-overture/loom/react"
import {
  createPrimitiveRegistry,
  definePrimitive,
  describeRegistryError,
  textResolverFor,
  textDictionarySchema,
  type PrimitiveRegistry,
} from "@jam-overture/loom/sdk"
import { z } from "zod"

import { docsRegistry, docsThemes } from "../loom/registry"
import { TROUBLE, troubleEndpoints } from "../submit/endpoints"

import {
  RENDER_DIAGNOSTIC_ORDER,
  type DiagnosticAudience,
  type RenderDiagnosticCode,
} from "./codes"

/**
 * Every diagnostic a render can leave behind, produced by leaving it behind.
 *
 * The page this feeds answers one question: *the page came back and something
 * on it is not what the tree asked for — what happened, and whose problem is
 * it?* Until this existed the site answered it with four rows typed into
 * *Rendering a tree*, chosen because they were the four somebody thought of.
 * The runtime had twenty-four.
 *
 * A table of twenty-four strings would be right for a week. §4c's rule about
 * the API reference is the same rule here: a list of what the framework can
 * say, typed on a page, drifts the moment the framework says something new, and
 * nothing goes red when it does. So every row below is a **real render** —
 * a tree, a registry, whatever wiring the fault needs — and the sentence beside
 * each one is `describeRenderDiagnostic`'s rather than a paraphrase of it.
 *
 * Two things make it hold, and they are the two `_lib/write/endings.ts`
 * established for the write outcomes:
 *
 * - The recipes are a `Record` keyed by `RenderDiagnostic["code"]`, so a
 *   twenty-fifth diagnostic in the runtime is a **type error in this file**
 *   rather than a row nobody notices is missing.
 * - Every recipe asserts that the render it ran reported the code it claims. A
 *   recipe that stops reaching its fault — because a schema loosened, or a
 *   check moved earlier — fails the build instead of printing a confident lie
 *   under the wrong heading.
 *
 * **Two of the twenty-four need something the starter library does not have**,
 * and both are declared here rather than reached for quietly. `props-undeclared`
 * needs a deployment that wired a resolver and a validator that disagree, so
 * there is a validator here that is blind to one type. `unshown-unreadable` is
 * the one fault in the union that only a component can commit, so there is a
 * component here written to commit it. Neither is registered into
 * `docsRegistry` and neither is an example: `_lib/loom/registry.ts` is right
 * that an example registering a primitive of its own would document a library
 * the reader does not have, and a bench that demonstrates a fault is
 * documenting the fault.
 */

type Recipe = {
  /** The fault in a reader's words, not the runtime's. */
  readonly title: string
  /** The ordinary situation that produces it. */
  readonly story: string
  /** Whose problem it is. */
  readonly audience: DiagnosticAudience
  /** What to do about it. This is the site's half, and a runtime cannot supply it. */
  readonly fix: string
  /** The render that produces it. */
  readonly produce: () => Promise<readonly RenderDiagnostic[]>
}

/* -------------------------------------------------------------------------- */
/* The benches                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The house theme, so a tree that is not about themes looks like the rest of
 * the site's examples. Nothing here is rendered to the screen — the page prints
 * sentences, not pictures — but a tree that named no theme would reach
 * `theme-values-unmounted`'s recipe by accident and make that row prove nothing.
 */
const HOUSE_THEME: JsonObject = {
  palette: "minimal",
  fontPack: "minimal-sans",
  stylePreset: "precise",
}

const pageOf = (ids: IdFactory, props: JsonObject, children: readonly LoomNode[]): LoomTree =>
  createTree(buildElement(ids, { type: "loom.page", props, children }), ids)

/** A themed page, which is the ordinary root every other page on this site builds. */
const themedPage = (namespace: string, children: (ids: IdFactory) => readonly LoomNode[]): LoomTree => {
  const ids = sequentialIdFactory(namespace)

  return pageOf(ids, { [THEME_PROP_KEY]: HOUSE_THEME }, children(ids))
}

const heading = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.heading", props: { level: 2, ...props }, children: [buildText(ids, text)] })

const prose = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.prose", props, children: [buildText(ids, text)] })

/** The wiring a healthy render has: the starter library in both seams. */
const WIRED: RenderOptions = {
  resolver: docsRegistry,
  validator: docsRegistry,
  themes: docsThemes,
}

const render = (tree: LoomTree, options: RenderOptions = WIRED): readonly RenderDiagnostic[] =>
  renderLoomTree(tree, options).diagnostics

/**
 * A deployment that resolves a type it cannot check.
 *
 * The one fault in the union that needs the two seams to disagree, and the
 * reason they are two options rather than one: a host may want the resolver
 * without the validator, and this is what that costs.
 */
const validatorBlindTo = (type: string, registry: PrimitiveRegistry): PropsValidator => ({
  validateProps: (asked, props) =>
    asked === type ? { outcome: "undeclared" } : registry.validateProps(asked, props),
})

/**
 * A source answering a fixed list of rows, for the bindings that need one.
 *
 * The rows are string maps rather than anything richer, because that is all
 * these benches need and an answer's schema has to live inside the JSON value
 * space every seam is restricted to. One of the rows a bench hands over is
 * deliberately not a row `loom.feed` can read, which is the whole of the
 * `data-unshown` recipe.
 */
const sourceOf = (id: string, rows: Record<string, string>[]): SourceEntry =>
  defineSource({
    id,
    description: "A list this bench answers from a literal.",
    params: z.object({}),
    answers: z.array(z.record(z.string(), z.string())),
    adapter: { fetch: async () => ({ ok: true, value: rows }) },
  })

/**
 * A refused registry here means the bench is wrong rather than that anything
 * about the runtime is, so it throws: a build failure, not a diagnostic.
 */
const registryOfSources = (entries: readonly SourceEntry[]): DataRegistry => {
  const built = createDataRegistry(entries)

  if (!built.ok) {
    throw new Error(
      `loom: the diagnostics bench could not register a source — ${describeDataRegistryError(built.error)}`
    )
  }

  return built.value
}

const answered = async (tree: LoomTree, registry: DataRegistry): Promise<DataResolution> =>
  resolveTreeData(tree, { registry })

/**
 * The one component in this file, and it is written to be broken.
 *
 * `unshown-unreadable` is raised when a primitive says what it could not show
 * and the saying cannot be believed. No primitive in the starter library does
 * that — the five that declare a reading all compute it from the answer they
 * were handed — so the only way to produce it is a component whose declaration
 * throws. Which is the point of the row: it is the one diagnostic that is
 * nobody's wiring and nobody's tree.
 */
const brokenReporter = definePrimitive({
  type: "bench.broken-reporter",
  description: "A list whose declaration of what it could not show throws. Written to be wrong.",
  props: z.object({}).strict(),
  reads: ["entries"],
  unshown: () => {
    throw new Error("the reader of this answer is not written yet")
  },
  component: () => null,
})

const brokenRegistry = ((): PrimitiveRegistry => {
  const built = createPrimitiveRegistry([brokenReporter])

  if (!built.ok) {
    throw new Error(
      `loom: the diagnostics bench could not register its broken component — ${describeRegistryError(built.error)}`
    )
  }

  return built.value
})()

const SELF_ORIGIN = "https://loom.example"

const ownOrigin = ((): FrameOriginRegistry => {
  const built = createFrameOriginRegistry([
    { origin: SELF_ORIGIN, description: "This deployment's own origin.", self: true },
  ])

  if (!built.ok) {
    throw new Error(
      `loom: the diagnostics bench could not register an origin — ${describeFrameOriginRegistryError(built.error)}`
    )
  }

  return built.value
})()

/* -------------------------------------------------------------------------- */
/* The recipes                                                                */
/* -------------------------------------------------------------------------- */

const RECIPES: Record<RenderDiagnosticCode, Recipe> = {
  "unknown-primitive": {
    title: "The tree names a primitive you have not registered",
    story:
      "A proposal invented a type, or a deployment rolled the code back and left the tree where it was.",
    audience: "tree",
    fix: "Register it, or change the node. The node and everything under it was left out, so this is the diagnostic most likely to be a visible hole in the page.",
    produce: async () =>
      render(themedPage("unknown", (ids) => [buildElement(ids, { type: "loom.sparkline", props: {} })])),
  },

  "invalid-props": {
    title: "A node's props are not what its primitive declared",
    story: "A heading with a level of eleven. The schema is the allowlist, and this is it refusing.",
    audience: "tree",
    fix: "Read the issues on the diagnostic. Each one names a path and what was wrong with the value at it. The node and its subtree were omitted, the same as an unknown primitive.",
    produce: async () =>
      render(themedPage("invalidprops", (ids) => [heading(ids, "Too deep", { level: 11 })])),
  },

  "props-undeclared": {
    title: "You resolved a primitive you cannot check",
    story:
      "The resolver knows the type and the validator does not, which happens when a deployment wires a registry into one and a plain map into the other.",
    audience: "wiring",
    fix: "Pass the same registry to both options. The node rendered, which is the problem: its props were never checked, so the next invalid one will reach the component instead of being refused.",
    produce: async () =>
      render(
        themedPage("undeclared", (ids) => [prose(ids, "This rendered unchecked.")]),
        { ...WIRED, validator: validatorBlindTo("loom.prose", docsRegistry) }
      ),
  },

  "theme-unresolved": {
    title: "The theme on the root is not one you registered",
    story: "Three ids on the root, and one of them names a palette nobody registered.",
    audience: "tree",
    fix: "The registry is the allowlist, so this is a proposal naming something outside it or a deployment that registered fewer palettes than its trees name. The page rendered unstyled, which looks like a stylesheet that failed to load.",
    produce: async () => {
      const ids = sequentialIdFactory("badtheme")

      return render(
        pageOf(ids, { [THEME_PROP_KEY]: { ...HOUSE_THEME, palette: "sunset" } }, [
          prose(ids, "Unstyled, and it looks like a stylesheet that did not load."),
        ])
      )
    },
  },

  "theme-unregistered": {
    title: "The tree names a theme and you passed no registry",
    story: "The `themes` option was left out, and the root asks for three ids all the same.",
    audience: "wiring",
    fix: "Pass a `ThemeRegistry`. Leaving it out is legal and renders, so this is the diagnostic that tells you why a page a designer signed off on arrives with none of its colours.",
    produce: async () =>
      render(themedPage("notheme", () => []), { resolver: docsRegistry, validator: docsRegistry }),
  },

  "theme-misplaced": {
    title: "A theme below the root, which is not mounted",
    story: "A section half way down the page names its own palette.",
    audience: "tree",
    fix: "Move it to the root or take it off. A theme is mounted once, on the render root, so a selection anywhere else is read by nothing. It is reported rather than dropped because somebody meant it.",
    produce: async () =>
      render(
        themedPage("misplaced", (ids) => [
          buildElement(ids, {
            type: "loom.section",
            props: { tone: "surface", [THEME_PROP_KEY]: HOUSE_THEME },
            children: [prose(ids, "Inside a section that asked for its own theme.")],
          }),
        ])
      ),
  },

  "reserved-prop-unrecognised": {
    title: "A `loom:` prop the runtime does not read",
    story: "A typo in a reserved key, or a key from a version of the runtime this deployment is not running.",
    audience: "tree",
    fix: "The `loom:` namespace is the runtime's own, so a key in it that nothing reads is dropped rather than handed to your component. Check the spelling against the reserved props the runtime publishes.",
    produce: async () =>
      render(themedPage("reserved", (ids) => [prose(ids, "Hello.", { "loom:them": HOUSE_THEME })])),
  },

  "slot-unplaced": {
    title: "A region the primitive places nowhere",
    story:
      "A node fills a region called `sidebar` and its primitive places `meta` and nothing else. The content rendered and was then mounted by nobody.",
    audience: "tree",
    fix: "The expensive one to miss: words somebody wrote are gone and the page still looks finished. Ask the registry which regions the primitive places, with `slotsPlacedBy`, and fill one of those.",
    produce: async () =>
      render(
        themedPage("unplaced", (ids) => [
          buildElement(ids, {
            type: "loom.article",
            props: { title: "A piece with a region nobody places" },
            children: [buildSlot(ids, "sidebar", [prose(ids, "Dropped, with everything under it.")])],
          }),
        ])
      ),
  },

  "data-misdeclared": {
    title: "`loom:data` that is not a map of names to sources",
    story: "A binding written as a string where the seam wants an object naming a source.",
    audience: "tree",
    fix: "The node rendered with no data at all, which is what a primitive's unavailable region is for. The diagnostic carries the parse error, so it says which part of the declaration was wrong.",
    produce: async () => {
      const tree = themedPage("misdeclared", (ids) => [
        buildElement(ids, {
          type: "loom.feed",
          props: { [DATA_PROP_KEY]: "catalogue.services" },
          children: [],
        }),
      ])

      /**
       * Resolved, although nothing in the declaration could be asked. A
       * declaration that does not parse is a *problem the resolution carries*
       * rather than something the walk re-reads, so a render given no
       * resolution at all would report the absent resolution instead and this
       * row would be the wrong one.
       */
      return render(tree, { ...WIRED, data: await answered(tree, registryOfSources([])) })
    },
  },

  "data-unavailable": {
    title: "A question your app could not answer",
    story: "The source is registered and it refused, timed out, or answered with something that fails its own schema.",
    audience: "wiring",
    fix: "This is the ordinary state of an integration being down, and the page is right to still be here. The diagnostic names the binding, the source and the reason, which is the line to log.",
    produce: async () => {
      const tree = themedPage("unavailable", (ids) => [
        buildElement(ids, {
          type: "loom.feed",
          props: { [DATA_PROP_KEY]: { entries: { source: "bench.missing" } } },
          children: [],
        }),
      ])

      return render(tree, { ...WIRED, data: await answered(tree, registryOfSources([])) })
    },
  },

  "data-unresolved": {
    title: "A node asks for data and this render was given none",
    story:
      "`renderLoomTree` was called directly, without resolving the tree's bindings first. Or with a resolution built from a different tree.",
    audience: "wiring",
    fix: "Resolve before you render: `resolveTreeData`, or `renderRequest`, which does it for you. The diagnostic says which of the two happened, because `absent` and `unrelated` are fixed on different lines.",
    produce: async () =>
      render(
        themedPage("unresolved", (ids) => [
          buildElement(ids, {
            type: "loom.feed",
            props: { [DATA_PROP_KEY]: { entries: { source: "bench.entries" } } },
            children: [],
          }),
        ])
      ),
  },

  "data-unread": {
    title: "An answer arrived under a name nothing reads",
    story:
      "The tree binds under `items` and the primitive reads `entries`. The source answered perfectly and the answer was dropped on the floor.",
    audience: "tree",
    fix: "Bind under the name the primitive declared. This is the one that costs a round trip and draws an empty region, so it looks like a source with no rows in it.",
    produce: async () => {
      const tree = themedPage("unread", (ids) => [
        buildElement(ids, {
          type: "loom.feed",
          props: { [DATA_PROP_KEY]: { items: { source: "bench.entries" } } },
          children: [],
        }),
      ])

      const registry = registryOfSources([sourceOf("bench.entries", [{ title: "A post" }])])

      return render(tree, { ...WIRED, data: await answered(tree, registry) })
    },
  },

  "data-unshown": {
    title: "Rows arrived and the primitive drew fewer than it was given",
    story:
      "Twelve rows came back and one of them has a column the primitive cannot read, so eleven were drawn.",
    audience: "wiring",
    fix: "Nothing on the page says so. The reader sees a shorter list. Both counts are on the diagnostic, so this is the one to watch after a change to the query behind the source.",
    produce: async () => {
      const tree = themedPage("unshown", (ids) => [
        buildElement(ids, {
          type: "loom.feed",
          props: { [DATA_PROP_KEY]: { entries: { source: "bench.mixed" } } },
          children: [],
        }),
      ])

      const registry = registryOfSources([
        sourceOf("bench.mixed", [{ title: "A post that reads" }, { headline: "One that does not" }]),
      ])

      return render(tree, { ...WIRED, data: await answered(tree, registry) })
    },
  },

  "unshown-unreadable": {
    title: "A primitive could not say what it dropped",
    story:
      "A component declares a reading of the answer it was handed, and the declaration threw or returned something that cannot describe an answer.",
    audience: "component",
    fix: "The one fault here that is neither your tree nor your wiring: the component's bookkeeping is wrong. The node rendered exactly as it would have, because a page lost to bookkeeping would be the worst trade available.",
    produce: async () => {
      const ids = sequentialIdFactory("broken")
      const tree = createTree(
        buildElement(ids, {
          type: "bench.broken-reporter",
          props: { [DATA_PROP_KEY]: { entries: { source: "bench.entries" } } },
          children: [],
        }),
        ids
      )

      const registry = registryOfSources([sourceOf("bench.entries", [{ title: "A row" }])])

      return render(tree, {
        resolver: brokenRegistry,
        validator: brokenRegistry,
        data: await answered(tree, registry),
      })
    },
  },

  "submit-misdeclared": {
    title: "`loom:submit` that is not an endpoint id",
    story: "A form declaring a URL where the seam wants the id of an endpoint your app registered.",
    audience: "tree",
    fix: "A form in a tree names a destination and never carries one. Put the id of a registered endpoint under `to` and let your own code decide what that resolves to.",
    produce: async () => {
      const tree = themedPage("submitbad", (ids) => [
        buildElement(ids, {
          type: "loom.form",
          props: { [SUBMIT_PROP_KEY]: { to: "https://forms.example.net/collect" } },
        }),
      ])

      /** Resolved for the reason `data-misdeclared` is: the problem travels with the resolution. */
      return render(tree, {
        ...WIRED,
        submissions: await resolveTreeSubmissions(tree, { registry: troubleEndpoints() }),
      })
    },
  },

  "submit-unavailable": {
    title: "A form whose endpoint could not give it a target",
    story: "The endpoint is registered and it refused this visitor, threw, or answered with a target the seam will not carry.",
    audience: "wiring",
    fix: "The page is still here and the form says it cannot be sent right now, which is the trade every diagnostic here makes. The reason is on the diagnostic rather than on the page, because none of the reasons is something a visitor could act on.",
    produce: async () => {
      const tree = themedPage("submitrefused", (ids) => [
        buildElement(ids, {
          type: "loom.form",
          props: { [SUBMIT_PROP_KEY]: { to: TROUBLE.refused } },
        }),
      ])

      return render(tree, {
        ...WIRED,
        submissions: await resolveTreeSubmissions(tree, { registry: troubleEndpoints() }),
      })
    },
  },

  "submit-unresolved": {
    title: "A form names an endpoint and this render has no target for it",
    story: "The data seam's twin, one node over: nothing resolved the tree's submissions before the walk.",
    audience: "wiring",
    fix: "Resolve with `resolveTreeSubmissions`, or render through `renderRequest`. Until then the form renders with nowhere to post, which is the failure the whole seam exists to prevent.",
    produce: async () =>
      render(
        themedPage("submitnone", (ids) => [
          buildElement(ids, {
            type: "loom.form",
            props: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
          }),
        ])
      ),
  },

  "frame-refused": {
    title: "A frame this deployment will not load",
    story: "No allowlist was wired, so every framable prop is refused. The seam fails closed.",
    audience: "wiring",
    fix: "Register the origins you are willing to frame. The registry is the allowlist, and a deployment that has not written one has not agreed to run anybody's script inside its pages.",
    produce: async () =>
      render(
        themedPage("framenone", (ids) => [
          buildElement(ids, {
            type: "loom.embed",
            props: { src: "https://video.example.com/loom", title: "Loom in ninety seconds" },
          }),
        ])
      ),
  },

  "frame-same-origin": {
    title: "A frame from your own origin, whose sandbox grants it nothing",
    story:
      "The document in the frame comes from the origin this deployment registered as its own, so `allow-scripts` beside `allow-same-origin` is a boundary between one origin and itself.",
    audience: "wiring",
    fix: "Not a refusal, and usually deliberate. It is reported because it is the one thing about a frame that looks contained and is not. The decision is yours to make knowingly rather than by default.",
    produce: async () =>
      render(
        themedPage("frameself", (ids) => [
          buildElement(ids, {
            type: "loom.embed",
            props: { src: `${SELF_ORIGIN}/demo`, title: "Our own demo" },
          }),
        ]),
        { ...WIRED, origins: ownOrigin }
      ),
  },

  "anchor-unusable": {
    title: "An anchor a link could not carry",
    story: "`loom:anchor` holding a sentence with spaces in it, rather than a slug.",
    audience: "tree",
    fix: "The node rendered exactly as it would have and is simply not a fragment target. The diagnostic says which rule the value broke: empty, too long, or spelled with something that does not survive a URL.",
    produce: async () =>
      render(
        themedPage("anchorbad", (ids) => [
          heading(ids, "Terms and conditions", { [ANCHOR_PROP_KEY]: "terms and conditions" }),
        ])
      ),
  },

  "anchor-claimed": {
    title: "Two nodes asking for the same anchor",
    story: "A page with two sections both called `terms`, which a deployment gets by duplicating a band.",
    audience: "tree",
    fix: "The first in document order keeps it. Two elements sharing an id is a document the browser resolves by its own rule, and a link that lands on whichever one the parser preferred is worse than one node that cannot be linked to.",
    produce: async () =>
      render(
        themedPage("anchortwice", (ids) => [
          heading(ids, "Terms", { [ANCHOR_PROP_KEY]: "terms" }),
          heading(ids, "Terms, again", { [ANCHOR_PROP_KEY]: "terms" }),
        ])
      ),
  },

  "behaviour-unnamed": {
    title: "A control left out because it had no name",
    story:
      "A dictionary answers one of a primitive's declared strings with blank space, and that string was what a control is announced by.",
    audience: "wiring",
    fix: "Fix the dictionary entry the diagnostic names. The control was left out rather than rendered unnamed, because a button a screen reader announces as “button” is worse than no button.",
    produce: async () => {
      const dictionary = textDictionarySchema.parse({
        locale: "en",
        messages: { "loom.code.copied": "   " },
      })

      return render(
        themedPage("unnamed", (ids) => [
          buildElement(ids, {
            type: "loom.code",
            props: { language: "ts" },
            children: [buildText(ids, "const tree = createTree(root, ids)")],
          }),
        ]),
        { ...WIRED, text: textResolverFor(docsRegistry, dictionary) }
      )
    },
  },

  "theme-values-unmounted": {
    title: "You asked for values and no theme mounted",
    story:
      "A render for a medium with no cascade, such as an image or an email, on a tree whose root mounted no theme.",
    audience: "wiring",
    fix: "Give the tree a theme, or do not ask for literals. Every reference on the page was left as written, and nothing outside a browser will resolve one.",
    produce: async () => {
      const ids = sequentialIdFactory("literals")

      return render(pageOf(ids, {}, [prose(ids, "No theme on this root.")]), {
        ...WIRED,
        themeValues: "literals",
      })
    },
  },

  "excerpt-absent": {
    title: "An excerpt of a node that is not there",
    story:
      "A review queue, a link in a record or a URL names a node, and an ordinary change removed it since.",
    audience: "wiring",
    fix: "The one case here where nothing rendered, because there was nothing to render. Treat it as a part that has moved on rather than as an error: the id was valid when somebody wrote it down.",
    produce: async () => {
      const tree = themedPage("excerpt", (ids) => [prose(ids, "The page is here. The part is not.")])

      return renderLoomExcerpt(tree, nodeIdSchema.parse("n_gone"), WIRED).diagnostics
    },
  },
}

/* -------------------------------------------------------------------------- */
/* The catalogue                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The codes the recipes cover, read off the recipes.
 *
 * The same twenty-four as `RENDER_DIAGNOSTIC_ORDER` and spelled a different
 * way, which is the point: the order list is hand-written and this is the
 * `Record` the compiler holds against the union. Two expressions of one number,
 * so a site count built on either has a second opinion that is not itself.
 */
export const renderDiagnosticCodes = (): readonly RenderDiagnosticCode[] =>
  Object.keys(RECIPES) as readonly RenderDiagnosticCode[]

export type ReportedDiagnostic = {
  readonly code: RenderDiagnosticCode
  readonly title: string
  readonly story: string
  readonly audience: DiagnosticAudience
  readonly fix: string
  /** `describeRenderDiagnostic`, on the diagnostic this run actually produced. */
  readonly line: string
}

/** Every code whose fault is the given audience's, in reading order. */
export const diagnosticsFor = (
  reported: readonly ReportedDiagnostic[],
  audience: DiagnosticAudience
): readonly ReportedDiagnostic[] => reported.filter((entry) => entry.audience === audience)

/**
 * Runs all twenty-four, in reading order.
 *
 * The assertion is the load-bearing line, and it is `endings.ts`'s: a recipe
 * that no longer produces its diagnostic throws here, which stops `next build`.
 * Printing whatever came back under the heading it was filed under is how a page
 * ends up describing one fault as another.
 */
export const produceRenderDiagnostics = async (): Promise<readonly ReportedDiagnostic[]> =>
  Promise.all(
    RENDER_DIAGNOSTIC_ORDER.map(async (code) => {
      const recipe = RECIPES[code]
      const diagnostics = await recipe.produce()
      const found = diagnostics.find((diagnostic) => diagnostic.code === code)

      if (found === undefined) {
        const got = diagnostics.map((diagnostic) => diagnostic.code).join(", ")

        throw new Error(
          `loom: the ${code} recipe reported ${got === "" ? "no diagnostics at all" : got}`
        )
      }

      return {
        code,
        title: recipe.title,
        story: recipe.story,
        audience: recipe.audience,
        fix: recipe.fix,
        line: describeRenderDiagnostic(found),
      }
    })
  )
