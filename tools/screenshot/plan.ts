import { z } from "zod"

import { MAX_WAIT_MS, type Shot } from "../specimen/capture.js"
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
  z.object({ wait: z.number().int().positive().max(MAX_WAIT_MS) }).strict(),
])

export const shotSchema = z
  .object({
    /** Appended to `baseUrl`, or a whole URL when there is no base. */
    path: z.string().min(1),
    /** The file to write, relative to `outDir`. `.png` is added if it is missing. */
    out: z.string().min(1),
    viewport: viewportSchema.default("wide"),
    /** A selector to wait for before the shutter. `Shot.waitFor` says why. */
    waitFor: z.string().min(1).optional(),
    /** What to press and how long to let it settle. `Shot.do` says why. */
    do: z.array(stepSchema).default([]),
    fullPage: z.boolean().default(false),
    /** A selector to photograph instead of the viewport. `CaptureTarget.clip`. */
    clip: z.string().min(1).optional(),
  })
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

/**
 * `file` stays relative to the list's `outDir`, which the capture loop joins on.
 * Resolving it here as well is how a picture ends up two directories deep in a
 * path that reads correctly in both halves.
 */
export const planShots = (list: ShotList): readonly Shot[] =>
  list.shots.map((shot) => ({
    name: nameOf(shot.out),
    url: urlFor(list, shot.path),
    file: withExtension(shot.out),
    viewport: typeof shot.viewport === "string" ? VIEWPORTS[shot.viewport] : shot.viewport,
    ...(shot.waitFor === undefined ? {} : { waitFor: shot.waitFor }),
    do: shot.do,
    fullPage: shot.fullPage,
    ...(shot.clip === undefined ? {} : { clip: shot.clip }),
  }))
