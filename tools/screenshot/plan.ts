import { z } from "zod"

import { MAX_WAIT_MS, type Approach, type Shot } from "../specimen/capture.js"
import { PHONE, WIDE, type SpecimenViewport } from "../specimen/specimen.js"

/**
 * What to photograph at an address, as a value rather than as a script.
 *
 * This is the second of the harness's two subjects. `pnpm specimen` renders a
 * tree and serves it; this one is handed pages something else is already
 * serving — a `next start`, a preview deployment, a static directory — and is
 * the only way to photograph a screen that needs a session or a database
 * behind it. What it does *not* do is start that server: running your
 * application is your lane's recipe, and it is the part that differs.
 *
 * Everything after the plan is shared: `../specimen/` finds the browser,
 * launches it, sizes the viewport, reduces motion, measures the overflow and
 * names the file, so the two subjects cannot drift apart on any of it.
 *
 * Zod rather than a hand-written type, because a shot list is input: it comes
 * from a JSON file a run wrote minutes ago, and the failure worth preventing is
 * a misspelled key photographing the wrong thing silently.
 */

/**
 * The sizes every lane has been taking pictures at, named rather than numeric.
 *
 * They are `../specimen/specimen.ts`'s, not this file's own. Two harnesses in
 * one repository disagreeing about what `wide` means is how two lanes' reports
 * stop being comparable while both look right, and it had already happened —
 * this file said 1440×900 and the specimen said 1280×900, which is the number
 * every report in the repository has actually been quoting.
 */
export const VIEWPORTS = { phone: PHONE, wide: WIDE } as const satisfies Record<
  string,
  SpecimenViewport
>

export type ViewportName = keyof typeof VIEWPORTS

const viewportSchema = z.union([
  z.enum(["phone", "wide"]),
  z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    /** Named for the file, like every other viewport in the harness. */
    label: z.string().min(1).default("custom"),
    deviceScaleFactor: z.number().positive().default(2),
    /**
     * Whether the pointer is a finger. `SpecimenViewport.touch` says what it
     * buys and `contextOptionsFor` says how it is emulated.
     *
     * A default rather than required, which is the one place this schema and
     * the type disagree, and on purpose: a size written into a shot list is a
     * lane reaching for a window the two named viewports do not cover, and a
     * window is what a desktop has. `"phone"` is how a lane asks for a phone,
     * and it has carried the answer since this field existed.
     */
    touch: z.boolean().default(false),
  }),
])

/**
 * One step of a `do` list, as a lane writes it in JSON.
 *
 * `strict` on both members is what makes a misspelling loud: `{ "clik": "..." }`
 * against a permissive object parses as an empty step, runs, does nothing, and
 * photographs the page the load produced — the silent wrong picture this whole
 * file is Zod rather than a hand-written type to prevent.
 */
const stepSchema = z.union([
  z.object({ click: z.string().min(1) }).strict(),
  /** `text` may be empty: clearing a field is a state a screen can be in. */
  z.object({ fill: z.string().min(1), text: z.string() }).strict(),
  z.object({ wait: z.number().int().positive().max(MAX_WAIT_MS) }).strict(),
  z.object({ waitFor: z.string().min(1) }).strict(),
  /** Bring an element into view without pressing it. `ShotStep.scrollTo`. */
  z.object({ scrollTo: z.string().min(1) }).strict(),
  /** Press a key at whatever holds focus. `ShotStep.key` says why it takes no selector. */
  z.object({ key: z.string().min(1) }).strict(),
])

/**
 * What the browser starts with, as a lane writes it in JSON.
 *
 * A union of two strict objects, for `stepSchema`'s reason and one more of its
 * own: the two members are opposite instructions, so a union refuses the pair
 * by construction rather than by a refinement written afterwards. `StartState`
 * says why this is a closed set of named states and not an `initScript`.
 */
const startSchema = z.union([
  z
    .object({
      storage: z
        .record(z.string().min(1), z.string())
        /**
         * An empty map is a lane that believes it seeded something. It parses,
         * runs, writes nothing and photographs the page an ordinary load
         * produces — which is the silent wrong picture, arriving through the
         * one field added to reach a state a load cannot.
         */
        .refine((entries) => Object.keys(entries).length > 0, {
          message: "needs at least one key: an empty map seeds nothing and photographs an ordinary load",
        }),
    })
    .strict(),
  /**
   * `true` and not a boolean. `storageBlocked: false` is a field that reads as
   * a decision and means nothing, and a lane that writes it has said something
   * it will believe later.
   */
  z.object({ storageBlocked: z.literal(true) }).strict(),
])

/**
 * An address and what is done at it — the shape a shot and its `before` share.
 *
 * Spread into both rather than extended, so the two cannot drift: a field
 * added to an approach is a field a `before` has, which is the property that
 * makes a sign-in expressible without the harness knowing the word.
 */
const approachShape = {
  /** Appended to `baseUrl`, or a whole URL when there is no base. */
  path: z.string().min(1),
  /** A selector to wait for once the page is open. `Approach.waitFor` says why. */
  waitFor: z.string().min(1).optional(),
  /** The document this approach's selectors resolve against. `Approach.frame`. */
  frame: z.string().min(1).optional(),
  /** What to press, type and wait for, in order. `Approach.do` says why. */
  do: z.array(stepSchema).default([]),
}

const approachSchema = z.object(approachShape).strict()

export const shotSchema = z
  .object({
    ...approachShape,
    /** The file to write, relative to `outDir`. `.png` is added if it is missing. */
    out: z.string().min(1),
    viewport: viewportSchema.default("wide"),
    /**
     * An approach made in this shot's own browser context, before its address
     * is opened and never photographed. `Shot.before` says why it is per shot.
     */
    before: approachSchema.optional(),
    /**
     * What the browser holds before anything loads, `before` included.
     * `Shot.start` says why it is per shot rather than per approach.
     */
    start: startSchema.optional(),
    fullPage: z.boolean().default(false),
    /** A selector to photograph instead of the viewport. `CaptureTarget.clip`. */
    clip: z.string().min(1).optional(),
    /**
     * Selectors to print a rectangle for. `Shot.measure` says why it prints
     * and never asserts.
     *
     * Resolved in this shot's `frame`, like every other selector it carries.
     * Any selector the driver understands, `text=` included — which is the
     * reason this reading goes through a locator rather than through a
     * `querySelectorAll` in the page.
     */
    measure: z.array(z.string().min(1)).default([]),
  })
  /**
   * Strict for the same reason each step is: a misspelled `frame` or `before`
   * on a permissive object is dropped in silence, and what comes back is a
   * correct picture of the wrong thing — which is the one failure this schema
   * exists to make loud.
   */
  .strict()
  /**
   * Refused rather than resolved by precedence. The two mean opposite things —
   * *all of the page* and *this one element* — so a shot asking for both is a
   * lane that believes something untrue about what it is about to get, and
   * picking a winner would hand it the picture it did not want without a word.
   */
  .refine((shot) => shot.clip === undefined || !shot.fullPage, {
    message: "cannot set both: clip photographs one element, fullPage photographs all of the page",
    path: ["clip"],
  })

/**
 * `z.string().url()` is not enough on its own: it accepts `localhost:3000`,
 * because that parses as a URL whose scheme is `localhost`. A base a browser
 * cannot fetch is the mistake worth catching here, so the scheme is checked
 * rather than assumed.
 */
const baseUrlSchema = z
  .string()
  .url()
  .refine((value) => /^https?:$/.test(new URL(value).protocol), {
    message: "must be an http:// or https:// address",
  })

export const shotListSchema = z.object({
  baseUrl: baseUrlSchema.optional(),
  outDir: z.string().min(1).default("."),
  shots: z.array(shotSchema).min(1),
})

export type ShotList = z.infer<typeof shotListSchema>

const withExtension = (out: string): string => (out.endsWith(".png") ? out : `${out}.png`)

const joinPath = (left: string, right: string): string =>
  `${left.replace(/\/+$/, "")}/${right.replace(/^\/+/, "")}`

/**
 * Resolves a shot's address against the list's base.
 *
 * A `path` that is already absolute wins, so a list can mix a page of the app
 * under test with one served from somewhere else without needing two lists.
 */
const urlFor = (list: ShotList, path: string): string => {
  if (/^https?:\/\//.test(path)) return path
  if (list.baseUrl === undefined) return path

  return joinPath(list.baseUrl, path)
}

/** A shot's name is its file without the extension, which is what a report quotes. */
const nameOf = (out: string): string => out.replace(/\.png$/, "")

type PlannedApproach = z.infer<typeof approachSchema>

/** One approach, with its address resolved the same way a shot's is. */
const approachOf = (list: ShotList, approach: PlannedApproach): Approach => ({
  url: urlFor(list, approach.path),
  ...(approach.waitFor === undefined ? {} : { waitFor: approach.waitFor }),
  ...(approach.frame === undefined ? {} : { frame: approach.frame }),
  do: approach.do,
})

/**
 * `file` stays relative to the list's `outDir`, which the capture loop joins on.
 * Resolving it here as well is how a picture ends up two directories deep in a
 * path that reads correctly in both halves.
 */
export const planShots = (list: ShotList): readonly Shot[] =>
  list.shots.map((shot) => ({
    ...approachOf(list, shot),
    name: nameOf(shot.out),
    file: withExtension(shot.out),
    viewport: typeof shot.viewport === "string" ? VIEWPORTS[shot.viewport] : shot.viewport,
    ...(shot.before === undefined ? {} : { before: approachOf(list, shot.before) }),
    ...(shot.start === undefined ? {} : { start: shot.start }),
    fullPage: shot.fullPage,
    ...(shot.clip === undefined ? {} : { clip: shot.clip }),
    measure: shot.measure,
  }))
